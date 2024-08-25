import { CfnOutput, Duration, NestedStack, NestedStackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as agw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as events from "aws-cdk-lib/aws-events";
import * as eventTargets from "aws-cdk-lib/aws-events-targets";
import * as lambdaSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from "aws-cdk-lib/aws-iam";

import { CognitoService } from "./cognito-stack";
import { DynamoDb } from "./component/dynamodb";
import { ORDER_CONFIG, STACK_OWNER } from "./config";
import { createLambdaHandler } from "./component/lambda-handler";
import { CfnPipe } from "aws-cdk-lib/aws-pipes";


export class OrderService extends NestedStack {
    private readonly gateway: agw.RestApi;
    private readonly dynamoDb: DynamoDb;
    private authorizer: agw.CognitoUserPoolsAuthorizer;

    constructor(scope: Construct, id: string, cognitoService: CognitoService, props?: NestedStackProps) {
        super(scope, id, props);

        // Initialize Cognito Authorizer
        if (!cognitoService.userPool) {
            throw new Error('Cognito is required for Orders Service');
        }
        this.authorizer = new agw.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
            authorizerName: `${cognitoService.userPoolName}Authorizer`,
            cognitoUserPools: [ cognitoService.userPool ],
        });

        // DynamoDB Table setup
        this.dynamoDb = new DynamoDb(this, 'OrdersTable', {
            tableName: ORDER_CONFIG.DYNAMODB_TABLE_NAME,
            readCapacity: ORDER_CONFIG.DYNAMODB_READ_CAPACITY,
            writeCapacity: ORDER_CONFIG.DYNAMODB_WRITE_CAPACITY,
            billingMode: ORDER_CONFIG.DYNAMODB_BILLING_MODE,
            maxCapacity: 10,
            globalSecondaryIndexes: [
                {
                    indexName: 'RequestIndex',
                    partitionKey: {
                        name: 'Request',
                        type: DynamoDb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'PK',
                        type: DynamoDb.AttributeType.STRING,
                    },
                    readCapacity: 5,
                    writeCapacity: 5,
                    projectionType: DynamoDb.ProjectionType.ALL,
                }
            ],
            stream: DynamoDb.StreamViewType.NEW_IMAGE,
        });

        // REST API Gateway setup
        this.gateway = new agw.RestApi(this, 'OrderRestAPI', {
            restApiName: `${STACK_OWNER}OrdersApi`,
            description: 'Order Service Rest APIs',
            cloudWatchRole: false,
            deployOptions: {
                // TODO: Need to test the access log destination customization
                // accessLogDestination: new agw.LogGroupLogDestination(new LogGroup(this, 'OrderApiLogGroup', {
                //     logGroupName: `/aws/apigateway/${STACK_OWNER}/order-rest-api`,
                //     retention: 1,
                // })),
                loggingLevel: agw.MethodLoggingLevel.INFO,
                tracingEnabled: true,
                stageName: 'v1',
            },
        });

        // Lambda Runtime Dependencies construction
        const lambdaOptions: lambda.FunctionOptions = {
            environment: {
                LAMBDA_ENV: ORDER_CONFIG.LAMBDA_ENV,
                DYNAMODB_TABLE: this.dynamoDb.table.tableName,
            },
            layers: [
                new lambda.LayerVersion(this, 'PackageLayer', {
                    code: lambda.Code.fromAsset(ORDER_CONFIG.LAMBDA_PACKAGE_LAYER_PATH),
                }),
                new lambda.LayerVersion(this, 'CommonLayer', {
                    code: lambda.Code.fromAsset(ORDER_CONFIG.LAMBDA_COMMON_LAYER_PATH),
                }),
            ],
        };

        // Provision Order Resource
        this.provisionOrderResource(lambdaOptions);

        if (ORDER_CONFIG.STACK_ORDER_PROCESSOR_ENABLED) {
            this.provisionOrderProcessor(lambdaOptions);
        }

        if (ORDER_CONFIG.STACK_ORDER_PIPE_ENABLED) {
            this.provisionOrderProcessingPipe(lambdaOptions);
        }

        this.generateCfnOutput();
    }

    public generateCfnOutput() {
        new CfnOutput(this, 'OrderApiDomain', {
            value: this.gateway.url,
            description: 'Order Service REST API',
            exportName: `${this.gateway.restApiName}Domain`
        });
    }

    protected provisionOrderResource(lambdaOptions: lambda.FunctionOptions) {
        const handlers = {
            getOrderDetailFn: createLambdaHandler(this, 'GetOrderDetailFunction', {
                name: `${STACK_OWNER}GetOrderDetailFunction`,
                runtime: ORDER_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/orders/get_order_detail'),
                handler: 'get_order_detail.handler',
                options: lambdaOptions,
            }),
            createOrderFn: createLambdaHandler(this, 'CreateOrderFunction', {
                name: `${STACK_OWNER}CreateOrderFunction`,
                runtime: ORDER_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/orders/create_order'),
                handler: 'create_order.handler',
                options: lambdaOptions,
                
            }),
            confirmOrderDeliveryFn: createLambdaHandler(this, 'ConfirmOrderDeliveryFunction', {
                name: `${STACK_OWNER}ConfirmOrderDeliveryFunction`,
                runtime: ORDER_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/orders/confirm_order_delivery'),
                handler: 'confirm_order_delivery.handler',
                options: lambdaOptions,
            }),
        }

        const orderResource = this.gateway.root.addResource('orders');
        orderResource.addMethod(
            'POST',
            new agw.LambdaIntegration(
                handlers.createOrderFn,
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT }
            ),
            {
                authorizer: this.authorizer,
                authorizationType: agw.AuthorizationType.COGNITO,
            }
        );

        const orderDetailResource = orderResource.addResource('{orderId}');        
        orderDetailResource.addMethod(
            'GET',
            new agw.LambdaIntegration(
                handlers.getOrderDetailFn,
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT }
            ),
            {
                authorizer: this.authorizer,
                authorizationType: agw.AuthorizationType.COGNITO,
            }
        );
        orderDetailResource.addResource('deliver').addMethod(
            'POST',
            new agw.LambdaIntegration(
                handlers.confirmOrderDeliveryFn,
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT }
            ),
            {
                authorizer: this.authorizer,
                authorizationType: agw.AuthorizationType.COGNITO,
            }
        );

        // Grant permissions to Lambda functions to access DynamoDB table
        this.dynamoDb.table.grantReadData(handlers.getOrderDetailFn);
        this.dynamoDb.table.grantReadWriteData(handlers.createOrderFn);
        this.dynamoDb.table.grantReadWriteData(handlers.confirmOrderDeliveryFn);
    }

    /** Lambda Processor is a highly recommented option for processing */
    protected provisionOrderProcessor(lambdaOptions: lambda.FunctionOptions) {
        if (!this.dynamoDb.table.tableStreamArn) {
            throw new Error('DynamoDB Stream is required for Order Processor');
        }

        const orderEventBus = new events.EventBus(this, 'OrderEventBus', {
            eventBusName: `${STACK_OWNER}OrderEventBus`,
        });

        const handlers = {
            processDynamoDbStreamFn: createLambdaHandler(this, 'ProcessDynamoDbStreamFunction', {
                name: `${STACK_OWNER}ProcessDynamoDbStreamFunction`,
                runtime: ORDER_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/orders/process_dynamodb_stream'),
                handler: 'process_dynamodb_stream.handler',
                options: {
                    environment: {
                        EVENT_BUS_ARN: orderEventBus.eventBusArn
                    },
                    layers: lambdaOptions.layers,
                },
                policies: [
                    new iam.PolicyStatement({
                        actions: ['events:PutEvents'],
                        resources: [orderEventBus.eventBusArn],
                    }),
                ]
            }),
            processOrderFn: createLambdaHandler(this, 'ProcessOrderFunction', {
                name: `${STACK_OWNER}ProcessOrderFunction`,
                runtime: ORDER_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/orders/process_order'),
                handler: 'process_order.handler',
                options: lambdaOptions,
            }),
        };

        const orderCreatedQueue = new sqs.Queue(this, 'OrderCreatedQueue', {
            queueName: `${STACK_OWNER}OrderCreatedQueue.fifo`,
            fifo: true,
            deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
            contentBasedDeduplication: true,
            deliveryDelay: Duration.seconds(30),
            deadLetterQueue: {
                maxReceiveCount: 3,
                queue: new sqs.Queue(this, 'OrderCreatedDLQ', {
                    queueName: `${STACK_OWNER}OrderCreatedDLQ.fifo`,
                    fifo: true,
                }),
            },
        });

        const orderCreatedEventRule = new events.Rule(this, 'OrderCreatedRule', {
            eventBus: orderEventBus,
            ruleName: `${STACK_OWNER}OrderCreatedRule`,
            description: 'Rule to capture order created events',
            targets: [
                new eventTargets.SqsQueue(orderCreatedQueue, {
                    messageGroupId: 'OrderCreated',
                    retryAttempts: 3, // Set the retry policy to 3 attempts
                    maxEventAge: Duration.seconds(300),  // Set the maxEventAge retry policy to 5 minutes
                    deadLetterQueue: new sqs.Queue(this, 'OrderCreatedRuleDLQ', {
                        queueName: `${STACK_OWNER}OrderCreatedRuleDLQ`,
                    }),
                }),
            ],
            // EventBride Event Structure
            // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html
            eventPattern: {
                detailType: ['OrderChanged'],
                source: ['service.order.dynamodb.stream'],
                detail: {
                    meta: {
                        eventName: ['ORDER_CREATED'],
                    },
                },
            },
        });

        const queuePolicy = new sqs.CfnQueuePolicy(this, 'OrderCreatedQueuePolicy', {
            policyDocument: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        principals: [new iam.ServicePrincipal('events.amazonaws.com')],
                        actions: ['sqs:SendMessage'],
                        resources: [orderCreatedQueue.queueArn],
                    }),
                ],
            }),
            queues: [orderCreatedQueue.queueUrl],
        });

        handlers.processDynamoDbStreamFn.addEventSourceMapping(
            'OrderTableEventSource',
            {
                eventSourceArn: this.dynamoDb.table.tableStreamArn,
                batchSize: 1,
                startingPosition: lambda.StartingPosition.LATEST,
                maxBatchingWindow: Duration.seconds(1),
                retryAttempts: 3,
                onFailure: new lambdaSources.SqsDlq(
                    new sqs.Queue(this, 'OrderEventDLQ', {
                        queueName: `${STACK_OWNER}OrderEventDLQ`,
                    })
                ),
                filters: [
                    {
                        pattern: `{
                            "eventName": ["INSERT"],
                            "dynamodb": {
                                "NewImage": {
                                    "EntityType": { "S": ["order"]}
                                }
                            }
                        }`
                    },
                ]
            }
        );
        handlers.processOrderFn.addEventSource(
            new lambdaSources.SqsEventSource(orderCreatedQueue, {
                batchSize: 1,
            })
        );

        this.dynamoDb.table.grantStreamRead(handlers.processDynamoDbStreamFn);
        this.dynamoDb.table.grantReadWriteData(handlers.processOrderFn);
    }

    /** EventBridge Pipe is preferred to send the events directly other Services using EventBridge, SNS, SQS, etc. */
    protected provisionOrderProcessingPipe(lambdaOptions: lambda.FunctionOptions) {
        if (!this.dynamoDb.table.tableStreamArn) {
            throw new Error('DynamoDB Stream is required for Order Processing Pipe');
        }
        const pipeDLQ = new sqs.Queue(this, 'PipeDLQ', {
            queueName: `${STACK_OWNER}PipeDLQ`,
        });

        const orderEventBus = new events.EventBus(this, 'OrderEventBus', {
            eventBusName: `${STACK_OWNER}OrderEventBus`,
        });

        const handlers = {
            enrichOrderEventFn: createLambdaHandler(this, 'EnrichOrderEventFunctionForPipe', {
                name: `${STACK_OWNER}EnrichOrderEventFunctionForPipe`,
                runtime: ORDER_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/orders/enrich_order_event'),
                handler: 'enrich_order_event.handler',
                options: {
                    layers: lambdaOptions.layers,
                },
            }),
            processOrderFn: createLambdaHandler(this, 'ProcessOrderFunctionForPipe', {
                name: `${STACK_OWNER}ProcessOrderFunctionForPipe`,
                runtime: ORDER_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/orders/process_order'),
                handler: 'process_order.handler',
                options: lambdaOptions
            }),
        };

        // Pipe Execution Role to access:
        // - DynamoDB Stream
        // - EventBridge Event Bus
        // - SQS Dead Letter Queue
        // - Enrichment Lambda Function
        const eventPipeRole = new iam.Role(this, 'OrderEventPipeRole', {
            roleName: `${STACK_OWNER}OrderEventPipeRole`,
            description: 'Role to allow Pipe to send events to EventBridge',
            assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
        });
        this.dynamoDb.table.grantStreamRead(eventPipeRole);
        orderEventBus.grantPutEventsTo(eventPipeRole);
        pipeDLQ.grantSendMessages(eventPipeRole);
        handlers.enrichOrderEventFn.grantInvoke(eventPipeRole);

        const eventPipe = new CfnPipe(this, 'OrderEventPipe', {
            name: `${STACK_OWNER}OrderEventPipe`,
            description: 'Pipe to connect Orders DynamoDB Table stream to EventBridge Event Bus',
            roleArn: eventPipeRole.roleArn,
            source: this.dynamoDb.table.tableStreamArn,
            sourceParameters: {
                dynamoDbStreamParameters: {
                    startingPosition: 'LATEST',
                    // Set the batch size to 1
                    batchSize: 1, 
                    // Set the maximum batch window
                    maximumBatchingWindowInSeconds: 1,
                    maximumRetryAttempts: 3,
                    deadLetterConfig: {
                        arn: pipeDLQ.queueArn,
                    }
                },
                filterCriteria: {
                    filters: [
                        {
                            pattern: `{
                                "eventName": ["INSERT"],
                                "dynamodb": {
                                    "NewImage": {
                                        "EntityType": { "S": ["order"]}
                                    }
                                }
                            }`
                        }
                    ]
                }
            },
            target: orderEventBus.eventBusArn,
            targetParameters: {
                eventBridgeEventBusParameters: {
                    detailType: 'OrderChanged',
                    source: 'service.order.dynamodb.stream',
                },
            },
            // DynamoDB Stream Record
            // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_Record.html
            enrichment: handlers.enrichOrderEventFn.functionArn,
            enrichmentParameters: {
                // Empty string to pass the entire record
                inputTemplate: ``,
            },
        });

        const orderCreatedQueue = new sqs.Queue(this, 'OrderCreatedQueueForPipe', {
            queueName: `${STACK_OWNER}OrderCreatedQueueForPipe.fifo`,
            fifo: true,
            deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
            contentBasedDeduplication: true,
            deliveryDelay: Duration.seconds(120),
            deadLetterQueue: {
                maxReceiveCount: 3,
                queue: new sqs.Queue(this, 'OrderCreatedDLQForPipe', {
                    queueName: `${STACK_OWNER}OrderCreatedDLQForPipe.fifo`,
                    fifo: true,
                }),
            },
        });

        handlers.processOrderFn.addEventSource(
            new lambdaSources.SqsEventSource(orderCreatedQueue, {
                batchSize: 1,
            })
        );
        this.dynamoDb.table.grantReadWriteData(handlers.processOrderFn);

        const queuePolicy = new sqs.CfnQueuePolicy(this, 'OrderCreatedQueueForPipePolicy', {
            policyDocument: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        principals: [new iam.ServicePrincipal('events.amazonaws.com')],
                        actions: ['sqs:SendMessage'],
                        resources: [orderCreatedQueue.queueArn],
                    }),
                ],
            }),
            queues: [orderCreatedQueue.queueUrl],
        });

        const orderCreatedEventRule = new events.Rule(this, 'OrderCreatedRuleForPipe', {
            eventBus: orderEventBus,
            ruleName: `${STACK_OWNER}OrderCreatedRuleForPipe`,
            description: 'Rule to capture order created events',
            targets: [
                new eventTargets.SqsQueue(orderCreatedQueue, {
                    messageGroupId: 'OrderCreated',
                    retryAttempts: 3, // Set the retry policy to 3 attempts
                    maxEventAge: Duration.seconds(300),  // Set the maxEventAge retry policy to 5 minutes
                    deadLetterQueue: pipeDLQ,
                }),
            ],
            // EventBride Event Structure
            // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html
            eventPattern: {
                detailType: ['OrderChanged'],
                source: ['service.order.dynamodb.stream'],
                detail: {
                    meta: {
                        eventName: ['ORDER_CREATED'],
                    },
                },
            },
        });
    }
}
