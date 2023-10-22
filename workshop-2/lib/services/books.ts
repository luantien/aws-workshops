import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as ApiGateway from 'aws-cdk-lib/aws-apigateway';
import { UserPoolClient } from "aws-cdk-lib/aws-cognito"
// Common Resource Templates
import { LambdaHandler } from "../templates/lambda-handler";
import { DynamoDb } from "../templates/dynamodb";
// Dependencies
import { CognitoService } from "./cognito";



export interface BooksServiceProps {
    cognito: CognitoService | undefined;
}

export class BooksService extends Construct {
    public readonly dynamodb: DynamoDb;
    public readonly gateway: ApiGateway.RestApi;
    public readonly userPoolClient: UserPoolClient | undefined;

    constructor(scope: Construct, id: string, props: BooksServiceProps) {
        super(scope, id);

        // Setup Cognito Authorizer
        let authorizer = undefined;
        if (props.cognito !== undefined) {
            authorizer = new ApiGateway.CognitoUserPoolsAuthorizer(this, 'UserPoolAuthorizer', {
                authorizerName: `${props.cognito.userPoolName}Authorizer`,
                cognitoUserPools: [props.cognito.userPool],
            });
        }

        // Setup DynamoDB
        this.dynamodb = new DynamoDb(this, 'BooksTable', {
            tableName: 'Books',
            readCapacity: 5,
            writeCapacity: 5,
            billingMode: DynamoDb.BillingMode.PROVISIONED,
            autoScaling: true,
            maxCapacity: 50,
            globalSecondaryIndexes: [
                {
                    indexName: 'AuthorIndex',
                    partitionKey: {
                        name: 'Author',
                        type: DynamoDb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'PK',
                        type: DynamoDb.AttributeType.STRING,
                    },
                    readCapacity: 5,
                    writeCapacity: 5,
                    projectionType: DynamoDb.ProjectionType.ALL,
                },
            ],
        });

        // Lambda Handlers constructions
        const lambdaEnv = {
            LAMBDA_ENV: process.env.LAMBDA_ENV ?? 'prod',
            DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? '',
            DYNAMODB_TABLE: this.dynamodb.table.tableName,
        }
        const packageLayer = new Lambda.LayerVersion(this, 'PackageLayer', {
            compatibleRuntimes: [Lambda.Runtime.PYTHON_3_11],
            code: Lambda.Code.fromAsset('src/packages'),
            description: 'Package Layer',
        });
        const libraryLayer = new Lambda.LayerVersion(this, 'CommonPackageLayer', {
            compatibleRuntimes: [Lambda.Runtime.PYTHON_3_11],
            code: Lambda.Code.fromAsset('src/lib'),
            description: 'Common Layer',
        });
        const lambdaHandlers = {
            getBooks: new LambdaHandler(this, 'GetBooksHandler', {
                name: 'GetBooksFunction',
                runtime: Lambda.Runtime.PYTHON_3_11,
                codeAsset: Lambda.Code.fromAsset('src/books/get_books'),
                handler: 'get_books.handler',
                environment: lambdaEnv,
                layers: [packageLayer, libraryLayer],
                
            }),
            getBookDetail: new LambdaHandler(this, 'GetBookDetailHandler', {
                name: 'GetBookDetailFunction',
                runtime: Lambda.Runtime.PYTHON_3_11,
                codeAsset: Lambda.Code.fromAsset('src/books/get_book_detail'),
                handler: 'get_book_detail.handler',
                environment: lambdaEnv,
                layers: [packageLayer, libraryLayer],
            }),
        };

        // Setup API Gateway
        this.gateway = new ApiGateway.RestApi(this, 'BooksApi', {
            restApiName: 'BooksApi',
            description: 'Books API',
            cloudWatchRole: true,
            deployOptions: {
                loggingLevel: ApiGateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: false,
                tracingEnabled: true,
                stageName: 'v1'
            },
        });

        // Generate Book Resources
        const booksResource = this.gateway.root.addResource('books');
        booksResource.addMethod(
            'GET',
            new ApiGateway.LambdaIntegration(
                lambdaHandlers.getBooks.function, 
                {
                    contentHandling: ApiGateway.ContentHandling.CONVERT_TO_TEXT,
                }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer 
                    ? ApiGateway.AuthorizationType.COGNITO 
                    : ApiGateway.AuthorizationType.NONE,
            }
        );
        booksResource.addResource('{bookId}').addMethod(
            'GET',
            new ApiGateway.LambdaIntegration(
                lambdaHandlers.getBookDetail.function, 
                {
                    contentHandling: ApiGateway.ContentHandling.CONVERT_TO_TEXT,
                }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer 
                    ? ApiGateway.AuthorizationType.COGNITO 
                    : ApiGateway.AuthorizationType.NONE,
            }
        );
        if (props.cognito !== undefined) {
            this.userPoolClient = props.cognito.addNewClient({
                name: 'BookApiClient',
                callbackUrls: ['https://localhost'],
                logoutUrls: ['https://localhost'],
            });
        }


        this.dynamodb.table.grantReadData(lambdaHandlers.getBooks.function);
        this.dynamodb.table.grantReadData(lambdaHandlers.getBookDetail.function);

        this.generateCfnOutput();
    }

    protected generateCfnOutput() {
        new cdk.CfnOutput(this, 'BookApiDomain', {
            value: this.gateway.url,
            description: 'Book REST API Domain',
            exportName: `${this.gateway.restApiName}Domain`,
        });
        new cdk.CfnOutput(this, 'BookApiUserPoolClientId', {
            value: this.userPoolClient?.userPoolClientId ?? '',
            description: 'Book REST API User Pool Client Id',
            exportName: `${this.gateway.restApiName}UserPoolClientId`,
        });
    }
}
