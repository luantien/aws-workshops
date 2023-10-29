import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { UserPoolClient } from 'aws-cdk-lib/aws-cognito';
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

        
        this.provistionOrderResources(lambdaOptions, authorizer);

        this.generateCfnOutput();
    }

    protected provistionOrderResources(
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
        this.orderResource.addResource('{orderId}').addMethod(
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

        this.dynamodb.table.grantReadData(handlers.getOrderDetail.function);
        this.dynamodb.table.grantWriteData(handlers.createOrder.function);
        this.dynamodb.table.grantReadData(handlers.createOrder.function);
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