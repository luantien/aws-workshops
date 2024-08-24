import { CfnOutput, NestedStack, NestedStackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import * as agw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { CognitoService } from "./cognito-stack";
import { DynamoDb } from "./component/dynamodb";
import { ORDER_CONFIG, STACK_OWNER } from "./config";
import { create } from "domain";
import { createLambdaHandler } from "./component/lambda-handler";


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
            ]
        });

        // REST API Gateway setup
        this.gateway = new agw.RestApi(this, 'OrderRestAPI', {
            restApiName: `${STACK_OWNER}OrdersApi`,
            description: 'Order Service Rest APIs',
            cloudWatchRole: true,
            deployOptions: {
                loggingLevel: agw.MethodLoggingLevel.INFO,
                dataTraceEnabled: false,
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

        // Provision Order Resources
        this.provisionOrderResource(lambdaOptions);


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
}
