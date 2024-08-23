import { Construct } from 'constructs';
import { NestedStack, NestedStackProps, RemovalPolicy } from 'aws-cdk-lib';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import { UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { CognitoService } from './cognito-stack';
import { COGNITO_CONFIG, BOOK_CONFIG, STACK_OWNER } from './config';
import { DynamoDb } from './component/dynamodb';
import { createLambdaHandler } from './component/lambda-handler';


export class BookService extends NestedStack {
    private readonly gateway: agw.RestApi;
    private readonly dynamodb: DynamoDb;
    private authorizer: agw.CognitoUserPoolsAuthorizer;

    constructor(scope: Construct, id: string, cognitoService: CognitoService, props?: NestedStackProps) {
        super(scope, id, props);
        // Initialize Cognito Authorizer
        if (!cognitoService.userPool) {
            throw new Error('Cognito is required for Books Service');
        }
        this.authorizer = new agw.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
            authorizerName: `${COGNITO_CONFIG.USERPOOL_NAME}Authorizer`,
            cognitoUserPools: [ cognitoService.userPool ],
        });

        // DynamoDB Table setup
        this.dynamodb = new DynamoDb(this, 'BooksTable', {
            tableName: BOOK_CONFIG.DYNAMODB_TABLE_NAME,
            readCapacity: BOOK_CONFIG.DYNAMODB_READ_CAPACITY,
            writeCapacity: BOOK_CONFIG.DYNAMODB_WRITE_CAPACITY,
            billingMode: BOOK_CONFIG.DYNAMODB_BILLING_MODE,
            maxCapacity: 10,
            globalSecondaryIndexes: [
                {
                    indexName: 'AuthorIndex',
                    readCapacity: BOOK_CONFIG.DYNAMODB_READ_CAPACITY,
                    writeCapacity: BOOK_CONFIG.DYNAMODB_WRITE_CAPACITY,
                    projectionType: DynamoDb.ProjectionType.ALL,
                    partitionKey: {
                        name: 'Author',
                        type: DynamoDb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'PK',
                        type: DynamoDb.AttributeType.STRING,
                    },
                },
            ]
        });

        // Lambda Runtime Dependencies construction
        const lambdaOptions: lambda.FunctionOptions = {
            environment: {
                LAMBDA_ENV: BOOK_CONFIG.LAMBDA_ENV,
                DYNAMODB_TABLE: this.dynamodb.table.tableName,
            },
            layers: [
                new lambda.LayerVersion(this, 'PackageLayer', {
                    code: lambda.Code.fromAsset(BOOK_CONFIG.LAMBDA_PACKAGE_LAYER_PATH),
                }),
                new lambda.LayerVersion(this, 'CommonLayer', {
                    code: lambda.Code.fromAsset(BOOK_CONFIG.LAMBDA_COMMON_LAYER_PATH),
                }),
            ]
        }

        // REST API Gateway setup
        this.gateway = new agw.RestApi(this, 'BooksRestAPI', {
            restApiName: `${STACK_OWNER}BooksApi`,
            description: 'Book Service Rest APIs',
            cloudWatchRole: true,
            deployOptions: {
                loggingLevel: agw.MethodLoggingLevel.INFO,
                dataTraceEnabled: false, 
                tracingEnabled: true,
                stageName: 'v1',
            },
        });

        // Provision Book Resources
        this.provisionBookResources(lambdaOptions);
    }

    protected provisionBookResources(lambdaOptions: lambda.FunctionOptions) {
        const handlers = {
            getBooksFn: createLambdaHandler(this, 'GetBooksFunction', {
                name: `${STACK_OWNER}GetBooksFunction`,
                runtime: BOOK_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset(`${BOOK_CONFIG.LAMBDA_SOURCE}/${BOOK_CONFIG.GET_BOOKS_FUNC}`),
                handler: `${BOOK_CONFIG.GET_BOOKS_FUNC}.handler`,
                memorySize: 128,
                options: lambdaOptions,
            }),
            getBookDetailFn: createLambdaHandler(this, 'GetBookDetailFunction', {
                name: `${STACK_OWNER}GetBookDetailFunction`,
                runtime: BOOK_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset(`${BOOK_CONFIG.LAMBDA_SOURCE}/${BOOK_CONFIG.GET_BOOK_DETAIL_FUNC}`),
                handler: `${BOOK_CONFIG.GET_BOOK_DETAIL_FUNC}.handler`,
                memorySize: 128,
                options: lambdaOptions,
            }),
        }

        const bookResource = this.gateway.root.addResource('books');

        bookResource.addMethod('GET',
            new agw.LambdaIntegration(handlers.getBooksFn, {
                    contentHandling: agw.ContentHandling.CONVERT_TO_TEXT 
                }),
            {
                authorizer: this.authorizer,
                authorizationType: agw.AuthorizationType.COGNITO,
            }
        );

        bookResource.addResource('{bookId}').addMethod('GET',
            new agw.LambdaIntegration(handlers.getBookDetailFn, {
                    contentHandling: agw.ContentHandling.CONVERT_TO_TEXT 
                }),
            {
                authorizer: this.authorizer,
                authorizationType: agw.AuthorizationType.COGNITO,
            }
        );

        // Grant permissions to Lambda functions to access DynamoDB table
        this.dynamodb.table.grantReadData(handlers.getBooksFn);
        this.dynamodb.table.grantReadData(handlers.getBookDetailFn);
    }

    protected provisionReviewResource() {
    }
}