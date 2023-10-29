import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from 'aws-cdk-lib/aws-iam';
import { UserPoolClient } from "aws-cdk-lib/aws-cognito";
// Common Resource Templates
import { LambdaHandler, LambdaFunctionProps } from "../templates/lambda-handler";
import { DynamoDb } from "../templates/dynamodb";
// Dependencies
import { CognitoService } from "./cognito";


export interface BooksServiceProps {
    owner: string;
    cognito: CognitoService | undefined;
}

export class BooksService extends Construct {
    private readonly owner: string;
    private readonly dynamodb: DynamoDb;
    private readonly gateway: agw.RestApi;
    private readonly userPoolClient: UserPoolClient;
    private bookResource: agw.Resource | undefined;
    private reviewResource: agw.Resource | undefined;

    constructor(scope: Construct, id: string, props: BooksServiceProps) {
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

        // Setup DynamoDB
        this.dynamodb = new DynamoDb(this, 'BooksTable', {
            tableName: `${props.owner}Books`,
            readCapacity: 5,
            writeCapacity: 5,
            billingMode: DynamoDb.BillingMode.PROVISIONED,
            autoScaling: false,
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

        // Lambda Runtime Dependencies construction
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
                new lambda.LayerVersion(this, 'CommonPackageLayer', {
                    compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
                    code: lambda.Code.fromAsset('src/lib'),
                    description: 'Common Layer',
                }),
            ]
        };

        // Setup API Gateway
        this.gateway = new agw.RestApi(this, 'BooksApi', {
            restApiName: `${props.owner}BooksApi`,
            description: 'Books API',
            cloudWatchRole: true,
            deployOptions: {
                loggingLevel: agw.MethodLoggingLevel.INFO,
                dataTraceEnabled: false,
                tracingEnabled: true,
                stageName: 'v1'
            },
        });

        if (props.cognito !== undefined) {
            this.userPoolClient = props.cognito.addNewClient({
                name: `${props.owner}BookApiClient`,
                callbackUrls: ['https://localhost'],
                logoutUrls: ['https://localhost'],
            });
        }
        this.provisionBookResources(lambdaOptions, authorizer);

        // this.provisionReviewResources(lambdaOptions, authorizer);
        
        this.generateCfnOutput();
    }

    protected provisionBookResources(
        lambdaOptions: LambdaFunctionProps, 
        authorizer?: agw.CognitoUserPoolsAuthorizer
        ) {
        // Lambda Handlers constructions
        const handlers = {
            getBooks: new LambdaHandler(this, 'GetBooksHandler', {
                name: `${this.owner}GetBooksFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/books/get_books'),
                handler: 'get_books.handler',
                options: lambdaOptions,
            }),
            getBookDetail: new LambdaHandler(this, 'GetBookDetailHandler', {
                name: `${this.owner}GetBookDetailFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/books/get_book_detail'),
                handler: 'get_book_detail.handler',
                options: lambdaOptions,
            }),
        };
        // Generate Book Resources
        this.bookResource = this.gateway.root.addResource('books');
        this.bookResource.addMethod(
            'GET',
            new agw.LambdaIntegration(
                handlers.getBooks.function, 
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT, }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer 
                    ? agw.AuthorizationType.COGNITO 
                    : agw.AuthorizationType.NONE,
            }
        );
        this.bookResource.addResource('{bookId}').addMethod(
            'GET',
            new agw.LambdaIntegration(
                handlers.getBookDetail.function,
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT, }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer 
                    ? agw.AuthorizationType.COGNITO 
                    : agw.AuthorizationType.NONE,
            }
        );
        this.dynamodb.table.grantReadData(handlers.getBooks.function);
        this.dynamodb.table.grantReadData(handlers.getBookDetail.function);
    }

    protected provisionReviewResources(
        lambdaOptions: LambdaFunctionProps, 
        authorizer?: agw.CognitoUserPoolsAuthorizer
        ) {
        // Lambda Handlers constructions
        const handlers = {
            getReviews: new LambdaHandler(this, 'GetBookReviewsHandler', {
                name: `${this.owner}GetBookReviewsFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/reviews/get_reviews'),
                handler: 'get_reviews.handler',
                options: lambdaOptions,
            }),
            detectSentiment: new LambdaHandler(this, 'DetectSentimentHandler', {
                name: `${this.owner}DetectSentimentFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/reviews/detect_sentiment'),
                handler: 'detect_sentiment.handler',
                options: lambdaOptions,
                policies: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['comprehend:DetectSentiment'],
                        resources: ['*'],
                    }),
                ],
            }),
            generateReviewId: new LambdaHandler(this, 'GenerateReviewIdHandler', {
                name: `${this.owner}GenerateReviewIdFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/reviews/generate_review_id'),
                handler: 'generate_review_id.handler',
                options: lambdaOptions,
            }),
            notifyNegativeReview: new LambdaHandler(this, 'NotifyNegativeReviewHandler', {
                name: `${this.owner}NotifyNegativeReviewFunction`,
                runtime: lambda.Runtime.PYTHON_3_11,
                codeAsset: lambda.Code.fromAsset('src/reviews/notify_negative_review'),
                handler: 'notify_negative_review.handler',
                options: {
                    environment: {
                        SNS_EMAIL_FROM: process.env.SNS_EMAIL_FROM ?? '',
                        SNS_EMAIL_TO: process.env.SNS_EMAIL_TO ?? '',
                    },
                    layers: lambdaOptions.layers,
                },
                policies: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['ses:SendEmail'],
                        resources: ['*'],
                    }),
                ],
            }),
        };


        const workflowDefinition = sfn.Chain.start(
                new tasks.LambdaInvoke(this, 'DetectSentiment', {
                lambdaFunction: handlers.detectSentiment.function,
                resultPath: '$.sentiment',
            }))
            .next(new tasks.LambdaInvoke(this, 'GenerateReviewId', {
                lambdaFunction: handlers.generateReviewId.function,
                resultPath: '$.reviewId',
            }))
            .next(new tasks.DynamoPutItem(this, 'PutReviewToDynamo', {
                table: this.dynamodb.table,
                item: {
                    PK: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.bookId')),
                    SK: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.reviewId.Payload')),
                    EntityType: tasks.DynamoAttributeValue.fromString('review'),
                    Reviewer: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.reviewer')),
                    Message: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.message')),
                    Sentiment: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.sentiment.Payload.Sentiment')),
                },
                resultPath: sfn.JsonPath.DISCARD,
            }))
            .next(new sfn.Choice(this, 'IsNegativeReview?')
                .when(sfn.Condition.stringEquals(
                        sfn.JsonPath.stringAt('$.sentiment.Payload.Sentiment'),
                        'NEGATIVE',
                    ),
                    new tasks.LambdaInvoke(this, 'NotifyNegativeReview', {
                        lambdaFunction: handlers.notifyNegativeReview.function,
                        resultPath: sfn.JsonPath.DISCARD,
                    })  
                )
                .otherwise(new sfn.Succeed(this, 'PositiveReview'))
            );
        
        const workflowStateMachine = new sfn.StateMachine(this, 'ReviewStateMachine', {
            stateMachineName: `${this.owner}ReviewSentimentAnalysis`,
            definitionBody: sfn.DefinitionBody.fromChainable(workflowDefinition),

            stateMachineType: sfn.StateMachineType.EXPRESS,
            timeout: cdk.Duration.seconds(300),
            tracingEnabled: true,
            logs: {
                destination: new logs.LogGroup(this, 'ReviewSentimentAnalysisLogGroup', {
                    retention: logs.RetentionDays.ONE_WEEK,
                }),
                level: sfn.LogLevel.ALL,
            },
        });
        // Generate Review Resources
        this.reviewResource = this.bookResource?.getResource("{bookId}")?.addResource('reviews');

        if (this.reviewResource === undefined) {
            throw new Error('Unable to create "review resources"');
        }
        this.reviewResource.addMethod(
            'GET',
            new agw.LambdaIntegration(
                handlers.getReviews.function, 
                { contentHandling: agw.ContentHandling.CONVERT_TO_TEXT, }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer 
                    ? agw.AuthorizationType.COGNITO 
                    : agw.AuthorizationType.NONE,
            }
        );
        this.reviewResource.addMethod(
            'POST',
            agw.StepFunctionsIntegration.startExecution(
                workflowStateMachine,
                {
                    passthroughBehavior: agw.PassthroughBehavior.NEVER,
                    requestParameters: {
                        'integration.request.header.Content-Type': "'application/json'",
                    },
                    requestTemplates: {
                        'application/json': `
                            #set($inputRoot = $input.path('$'))
                            #set($inputRoot.bookId = "$util.urlDecode($input.params('bookId'))")
                            {
                                "input": "$util.escapeJavaScript($input.json('$'))",
                                "stateMachineArn": "${workflowStateMachine.stateMachineArn}"
                            }`,
                    },
                    integrationResponses: [
                        {
                            'statusCode': '200',
                            'responseTemplates': {
                                'application/json': `
                                    #set($output = $util.parseJson($input.path('$.output')))
                                    {
                                        "message": "Review submitted successfully",
                                        "reviewId": "$output.reviewId.Payload"
                                    }`,
                            },
                        }
                    ]
                }
            ),
            {
                authorizer: authorizer,
                authorizationType: authorizer 
                    ? agw.AuthorizationType.COGNITO 
                    : agw.AuthorizationType.NONE,
            }
        );

        // Allow this StepFunction StateMachine to write to DynamoDB
        this.dynamodb.table.grantWriteData(workflowStateMachine);
        this.dynamodb.table.grantReadData(handlers.getReviews.function);
    }


    public generateCfnOutput() {
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
