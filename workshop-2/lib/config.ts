import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// Stack Configuration
export const STACK_OWNER = process.env.AWS_USERNAME ?? 'anonymous';
export const STACK_REGION = process.env.AWS_REGION ?? 'ap-southeast-1';
export const STACK_ACCOUNT = process.env.AWS_ACCOUNT ?? '000000000000';

// Cognito Service Configuration
export const COGNITO_CONFIG = {
    USERPOOL_NAME: `${STACK_OWNER}UserPool`,
    DOMAIN_PREFIX: `${STACK_OWNER}-user-pool`,
    CALLBACK_URL: process.env.COGNITO_CALLBACK_URL ?? 'https://localhost',
    LOGOUT_URL: process.env.COGNITO_LOGOUT_URL ?? 'https://localhost',
}

// Book Service Configuration
export const BOOK_CONFIG = {
    // Stack Configuration
    STACK_ENABLED: process.env.STACK_BOOK_ENABLED === "true",
    REVIEW_FEATURE_ENABLED: process.env.STACK_BOOK_REVIEW_ENABLED === "true",
    // DynamoDB Configuration
    DYNAMODB_TABLE_NAME: `${STACK_OWNER}Books`,
    DYNAMODB_READ_CAPACITY: 5,
    DYNAMODB_WRITE_CAPACITY: 5,
    DYNAMODB_BILLING_MODE: dynamodb.BillingMode.PROVISIONED,
    // Lambda Configuration
    LAMBDA_ENV: process.env.LAMBDA_ENV ?? 'prod',
    LAMBDA_RUNTIME: lambda.Runtime.PYTHON_3_11,
    LAMBDA_PACKAGE_LAYER_PATH: 'src/packages',
    LAMBDA_COMMON_LAYER_PATH: 'src/lib',
    // Email Configuration
    SES_EMAIL_FROM: process.env.SES_EMAIL_FROM ?? '',
    SES_EMAIL_TO: process.env.SES_EMAIL_TO ?? '',
}

// Order Service Configuration
export const ORDER_CONFIG = {
    // Stack Configuration
    STACK_ENABLED : process.env.STACK_ORDER_ENABLED === "true",
    STACK_ORDER_PIPELINE_ENABLED: process.env.STACK_ORDER_PIPELINE_ENABLED === "true",
    STACK_ORDER_PROCESSOR_ENABLED: process.env.STACK_ORDER_PROCESSOR_ENABLED === "true",
    // DynamoDB Configuration
    DYNAMODB_TABLE_NAME: `${STACK_OWNER}Orders`,
    DYNAMODB_READ_CAPACITY: 5,
    DYNAMODB_WRITE_CAPACITY: 5,
    DYNAMODB_BILLING_MODE: dynamodb.BillingMode.PROVISIONED,
    // Lambda Configuration
    LAMBDA_ENV: process.env.LAMBDA_ENV ?? 'prod',
    LAMBDA_RUNTIME: lambda.Runtime.PYTHON_3_11,
    LAMBDA_PACKAGE_LAYER_PATH: 'src/packages',
    LAMBDA_COMMON_LAYER_PATH: 'src/lib',
}
