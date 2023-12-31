import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as lambdaSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { CfnPipe } from 'aws-cdk-lib/aws-pipes';
// Common Resource Templates
import { LambdaFunctionProps, LambdaHandler } from '../templates/lambda-handler';
import { DynamoDb } from '../templates/dynamodb';
// Dependencies
import { CognitoService } from './cognito';

export interface OrdersServiceProps {
    owner: string;
    cognito: CognitoService | undefined;
}

export class OrdersService extends Construct {
    private readonly owner: string;
    private readonly dynamodb: DynamoDb;
    private readonly gateway: agw.RestApi;
    private readonly userPoolClient: UserPoolClient;
    private orderResource: agw.Resource | undefined;
    private orderDetailResource: agw.Resource | undefined;

    constructor(scope: Construct, id: string, props: OrdersServiceProps) {
        super(scope, id);
        this.owner = props.owner;
        
        // Setup Cognito Authorizer
        let authorizer = undefined;
        if (props.cognito !== undefined) {
            authorizer = new agw.CognitoUserPoolsAuthorizer(this, 'UserPoolAuthorizer', {
                authorizerName: `${props.cognito.userPoolName}Authorizer`,
                cognitoUserPools: [props.cognito.userPool],
            });
        }
        
        // Create DynamoDB table
        this.dynamodb = new DynamoDb(this, 'OrdersTable', {
            tableName: `${props.owner}Orders`,
            readCapacity: 5,
            writeCapacity: 5,
            billingMode: DynamoDb.BillingMode.PROVISIONED,
            autoScaling: false,
            maxCapacity: 50,
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

        const lambdaOptions = {
            environment: {
                LAMBDA_ENV: process.env.LAMBDA_ENV ?? 'prod',
                DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? '',
                DYNAMODB_TABLE: this.dynamodb.table.tableName,
            },
            layers: [
                new lambda.LayerVersion(this, 'PackageLayer', {
                    compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
                    code: lambda.Code.fromAsset('src/packages'),
                    description: 'Package Layer',
                }),
                new lambda.LayerVersion(this, 'CommonLayer', {
                    compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
                    code: lambda.Code.fromAsset('src/lib'),
                    description: 'Common Layer',
                }),
            ]
        };

        this.gateway = new agw.RestApi(this, 'OrdersApi', {
            restApiName: `${props.owner}OrdersApi`,
            description: 'Orders API',
            cloudWatchRole: true,
            deployOptions: {
                loggingLevel: agw.MethodLoggingLevel.INFO,
                tracingEnabled: true,
                dataTraceEnabled: false,
                stageName: 'v1',
            },
        });

        if (props.cognito !== undefined) {
            this.userPoolClient = props.cognito.addNewClient({
                name: `${props.owner}OderApiClient`,
                callbackUrls: ['https://localhost'],
                logoutUrls: ['https://localhost'],
            });
        }

        // this.provisionOrderResources(lambdaOptions, authorizer);

        // this.provisionDownStreamPipeline(lambdaOptions);

        this.generateCfnOutput();
    }

    protected provisionOrderResources(
        lambdaOptions: LambdaFunctionProps, 
        authorizer?: agw.CognitoUserPoolsAuthorizer
    ) {
        // Lambda Handlers construction
        const handlers = {
            getOrderDetail: new LambdaHandler(this, 'GetOrderDetailHandler', {
                name: `${this.owner}GetOrderDetailFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/orders/get_order_detail'),
                handler: 'get_order_detail.handler',
                options: lambdaOptions,
            }),
            createOrder: new LambdaHandler(this, 'CreateOrderHandler', {
                name: `${this.owner}CreateOrderFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/orders/create_order'),
                handler: 'create_order.handler',
                options: lambdaOptions,
            }),
            confirmOrderDelivery: new LambdaHandler(this, 'ConfirmOrderDeliveryHandler', {
                name: `${this.owner}ConfirmOrderDeliveryFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/orders/confirm_order_delivery'),
                handler: 'confirm_order_delivery.handler',
                options: lambdaOptions,
            }),
        };
        // Generate Order Resources
        this.orderResource = this.gateway.root.addResource('orders');
        this.orderResource.addMethod(
            'POST',
            new agw.LambdaIntegration(
                handlers.createOrder.function,
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT, }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer 
                    ? agw.AuthorizationType.COGNITO 
                    : agw.AuthorizationType.NONE,
            }
        );
        this.orderDetailResource = this.orderResource.addResource('{orderId}');
        this.orderDetailResource.addMethod(
            'GET',
            new agw.LambdaIntegration(
                handlers.getOrderDetail.function,
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT, }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer
                    ? agw.AuthorizationType.COGNITO
                    : agw.AuthorizationType.NONE,
            }
        );
        this.orderDetailResource.addResource('deliver').addMethod(
            'POST',
            new agw.LambdaIntegration(
                handlers.confirmOrderDelivery.function,
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT, }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer
                    ? agw.AuthorizationType.COGNITO
                    : agw.AuthorizationType.NONE,
            }
        );

        this.dynamodb.table.grantReadData(handlers.getOrderDetail.function);
        this.dynamodb.table.grantReadWriteData(handlers.createOrder.function);
        this.dynamodb.table.grantReadWriteData(handlers.confirmOrderDelivery.function);
    }

    protected provisionDownStreamPipeline(lambdaOptions: LambdaFunctionProps) {
        const pipeDLQ = new sqs.Queue(this, 'PipeDLQ', {
            queueName: `${this.owner}PipeDLQ`,
        });

        const orderEventBus = new events.EventBus(this, 'OrderEventBus', {
            eventBusName: `${this.owner}OrderEventBus`,
        });

        const handlers = {
            enrichOrderEvent: new LambdaHandler(this, 'EnrichOrderEventHandler', {
                name: `${this.owner}EnrichOrderEventFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/orders/enrich_order_event'),
                handler: 'enrich_order_event.handler',
                options: {
                    environment: {},
                    layers: lambdaOptions.layers,
                },
            }),
            processeOrder: new LambdaHandler(this, 'ProcessOrderHandler', {
                name: `${this.owner}ProcessOrderFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/orders/process_order'),
                handler: 'process_order.handler',
                options: lambdaOptions,
            }),
        };

        const eventPipeRole = new iam.Role(this, 'EventBridgePipeRole', {
            roleName: `${this.owner}EventBridgePipeRole`,
            description: 'Role to allow Pipes to send events to EventBridge',
            assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com'),
        });
        this.dynamodb.table.grantStreamRead(eventPipeRole);
        orderEventBus.grantPutEventsTo(eventPipeRole);
        pipeDLQ.grantSendMessages(eventPipeRole);
        handlers.enrichOrderEvent.function.grantInvoke(eventPipeRole);

        const eventPipe = new CfnPipe(this, 'EventBridgePipe', {
            name: `${this.owner}EventBridgePipe`,
            description: 'Pipe to connect Orders DynamoDB Table stream to EventBridge Event Bus',
            roleArn: eventPipeRole.roleArn,
            source: this.dynamodb.table.tableStreamArn!,
            sourceParameters: {
                dynamoDbStreamParameters: {
                    startingPosition: 'LATEST',
                    batchSize: 1, // Set the batch size to 1
                    maximumBatchingWindowInSeconds: 120, // Set the maximum batch window to 60 seconds
                    deadLetterConfig: {
                        arn: pipeDLQ.queueArn,
                    },
                    maximumRetryAttempts: 3, // Set the retry policy to 3 attempts
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
                        },
                    ],
                },
            },
            target: orderEventBus.eventBusArn,
            targetParameters: {
                eventBridgeEventBusParameters: {
                    detailType: 'OrderChanged',
                    source: 'order.event',
                },
            },
            // DynamoDB Stream Record
            // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_Record.html
            enrichment: handlers.enrichOrderEvent.function.functionArn,
            enrichmentParameters: {
                inputTemplate: ``, // Empty string to pass the entire record
            },
        });
        
        const orderCreatedQueue = new sqs.Queue(this, 'OrderCreatedQueue', {
            queueName: `${this.owner}OrderCreatedQueue.fifo`,
            fifo: true,
            deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
            contentBasedDeduplication: true,
            deliveryDelay: cdk.Duration.seconds(120),
            deadLetterQueue: {
                maxReceiveCount: 3,
                queue: new sqs.Queue(this, 'OrderCreatedDLQ', {
                    queueName: `${this.owner}OrderCreatedDLQ.fifo`,
                    fifo: true,
                }),
            },
        });
        handlers.processeOrder.function.addEventSource(
            new lambdaSources.SqsEventSource(orderCreatedQueue, {
                batchSize: 1,
            })
        );
        this.dynamodb.table.grantReadWriteData(handlers.processeOrder.function);

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

        const orderCreatedEventRule = new events.Rule(this, 'OrderCreatedRule', {
            eventBus: orderEventBus,
            ruleName: `${this.owner}OrderCreatedRule`,
            description: 'Rule to capture order created events',
            targets: [
                new eventTargets.SqsQueue(orderCreatedQueue, {
                    messageGroupId: 'OrderInserted',
                    retryAttempts: 3, // Set the retry policy to 3 attempts
                    maxEventAge: cdk.Duration.seconds(300),  // Set the maxEventAge retry policy to 5 minutes
                    deadLetterQueue: pipeDLQ,
                }),
            ],
            // EventBride Event Structure
            // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html
            eventPattern: {
                detailType: ['OrderChanged'],
                source: ['order.event'],
                detail: {
                    meta: {
                        eventName: ['ORDER_INSERT'],
                    },
                },
            },
        });
    }

    public generateCfnOutput() {
        new cdk.CfnOutput(this, 'OrderApiDomain', {
            value: this.gateway.url,
            description: 'Order REST API Domain',
            exportName: `${this.gateway.restApiName}Domain`,
        });
        new cdk.CfnOutput(this, 'OrderApiUserPoolClientId', {
            value: this.userPoolClient?.userPoolClientId ?? '',
            description: 'Order REST API User Pool Client Id',
            exportName: `${this.gateway.restApiName}UserPoolClientId`,
        });
    }
}