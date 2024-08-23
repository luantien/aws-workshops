import { Construct } from 'constructs';
import { NestedStack, NestedStackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from "aws-cdk-lib/aws-logs";

import { CognitoService } from './cognito-stack';
import { COGNITO_CONFIG, BOOK_CONFIG, STACK_OWNER } from './config';
import { DynamoDb } from './component/dynamodb';
import { createLambdaHandler } from './component/lambda-handler';


interface BookReviewWorkflowProps {
    handlers: {
        getReviewsFn: lambda.IFunction,
        detectSentimentFn: lambda.IFunction,
        generateReviewIdFn: lambda.IFunction,
        notifyNegativeReviewFn: lambda.IFunction,
    }
}

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

        // Provision Book Resources
        this.provisionBookResources(lambdaOptions);

        if (BOOK_CONFIG.REVIEW_FEATURE_ENABLED) {
            this.provisionReviewResource(lambdaOptions);
        }

        this.generateCfnOutput();
    }

    public generateCfnOutput() {
        new CfnOutput(this, 'BookApiDomain', {
            value: this.gateway.url,
            description: 'Book Service REST API',
            exportName: `${this.gateway.restApiName}Domain`,
        })
    }

    protected provisionBookResources(lambdaOptions: lambda.FunctionOptions) {
        const handlers = {
            getBooksFn: createLambdaHandler(this, 'GetBooksFunction', {
                name: `${STACK_OWNER}GetBooksFunction`,
                runtime: BOOK_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/books/get_books'),
                handler: 'get_books.handler',
                options: lambdaOptions,
            }),
            getBookDetailFn: createLambdaHandler(this, 'GetBookDetailFunction', {
                name: `${STACK_OWNER}GetBookDetailFunction`,
                runtime: BOOK_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/books/get_book_detail'),
                handler: 'get_book_detail.handler',
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

    protected provisionReviewResource(lambdaOptions: lambda.FunctionOptions) {
        const handlers = {
            getReviewsFn: createLambdaHandler(this, 'GetReviewsFunction', {
                name: `${STACK_OWNER}GetReviewsFunction`,
                runtime: BOOK_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/reviews/get_reviews'),
                handler: 'get_reviews.handler',
                options: lambdaOptions,
            }),
            detectSentimentFn: createLambdaHandler(this, 'DetectSentimentFunction', {
                name: `${STACK_OWNER}DetectSentimentFunction`,
                runtime: BOOK_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/reviews/detect_sentiment'),
                handler: 'detect_sentiment.handler',
                options: lambdaOptions,
                policies: [ 
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['comprehend:DetectSentiment'],
                        resources: ['*'],
                    })
                ]
            }),
            generateReviewIdFn: createLambdaHandler(this, 'GenerateReviewIdFunction', {
                name: `${STACK_OWNER}GenerateReviewIdFunction`,
                runtime: BOOK_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/reviews/generate_review_id'),
                handler: 'generate_review_id.handler',
                options: lambdaOptions,
            }),
            notifyNegativeReviewFn: createLambdaHandler(this, 'NotifyNegativeReviewFunction', {
                name: `${STACK_OWNER}NotifyNegativeReviewFunction`,
                runtime: BOOK_CONFIG.LAMBDA_RUNTIME,
                codeAsset: lambda.Code.fromAsset('src/reviews/notify_negative_review'),
                handler: 'notify_negative_review.handler',
                options: {
                    environment: {
                        SES_EMAIL_FROM: BOOK_CONFIG.SES_EMAIL_FROM,
                        SES_EMAIL_TO: BOOK_CONFIG.SES_EMAIL_TO,
                    },
                    layers: lambdaOptions.layers,
                },
                policies: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['ses:SendEmail'],
                        resources: ['*'],
                    }),
                ]
            }),
        }
        // Provision Book Review State Machine
        const workflowStateMachine = this.provisionBookReviewStateMachine({handlers: handlers});

        // Generate Review Resource
        const reviewResource = this.gateway.root.getResource('books')?.getResource('{bookId}')?.addResource('reviews');
        if (reviewResource === undefined) {
            throw new Error('Unable to create "book review resources"');
        }
        reviewResource.addMethod('GET', new agw.LambdaIntegration(handlers.getReviewsFn, { 
                contentHandling: agw.ContentHandling.CONVERT_TO_TEXT 
            }),
            {
                authorizer: this.authorizer,
                authorizationType: agw.AuthorizationType.COGNITO,
            }
        );
        reviewResource.addMethod('POST', agw.StepFunctionsIntegration.startExecution(workflowStateMachine, {
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
            integrationResponses: [{
                'statusCode': '200',
                'responseTemplates': {
                    'application/json': `
                        #set($output = $util.parseJson($input.path('$.output')))
                        {
                            "message": "Review submitted successfully",
                            "reviewId": "$output.reviewId.Payload"
                        }`,
                },
            }]
        }));

        // Allow this StepFunction StateMachine to write to DynamoDB
        this.dynamodb.table.grantWriteData(workflowStateMachine);
        this.dynamodb.table.grantReadData(handlers.getReviewsFn);
    }

    protected provisionBookReviewStateMachine(props: BookReviewWorkflowProps) {
        const workflowDefinition = sfn.Chain
        .start(new tasks.LambdaInvoke(this, 'DetectSentiment', {
            lambdaFunction: props.handlers.detectSentimentFn,
            resultPath: '$.sentiment',
        }))
        .next(new tasks.LambdaInvoke(this, 'GenerateReviewId', {
            lambdaFunction: props.handlers.generateReviewIdFn,
            resultPath: '$.reviewId',
        }))
        .next(new tasks.DynamoPutItem(this, 'SaveReview', {
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
                    lambdaFunction: props.handlers.notifyNegativeReviewFn,
                    resultPath: sfn.JsonPath.DISCARD,
                }))
            .otherwise(new sfn.Succeed(this, 'PositiveReview'))
        );
    
        return new sfn.StateMachine(this, 'ReviewStateMachine', {
            stateMachineName: `${STACK_OWNER}BookReviewAnalysis`,
            definitionBody: sfn.DefinitionBody.fromChainable(workflowDefinition),
            stateMachineType: sfn.StateMachineType.EXPRESS,
            timeout: Duration.seconds(30),
            tracingEnabled: true,
            logs: {
                destination: new logs.LogGroup(this, 'LogGroup', {
                    logGroupName: `/aws/stepfunctions/${STACK_OWNER}BookReviewAnalysis`,
                    removalPolicy: RemovalPolicy.DESTROY,
                }),
                level: sfn.LogLevel.ALL,
            }
        });
    }
}
