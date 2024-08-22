import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// Stack Configuration
export const STACK_OWNER = process.env.owner ?? 'anonymous';
export const STACK_NAME = process.env.stack_name ?? 'Integration-Workshop';
export const STACK_REGION = process.env.AWS_REGION ?? 'ap-southeast-1';
export const STACK_ACCOUNT = process.env.AWS_ACCOUNT ?? '000000000000';

export const STACK_BOOK_ENABLED = process.env.STACK_BOOK_ENABLED ?? false;
export const STACK_ORDER_ENABLED = process.env.STACK_ORDER_ENABLED ?? false;

// Cognito Service Configuration
export const COGNITO_USERPOOL_NAME = `${STACK_OWNER}UserPool`;
export const COGNITO_DOMAIN_PREFIX = `${STACK_OWNER}-user-pool`;

// Book Service Configuration
export const BOOK_CONFIG = {
    DYNAMODB_TABLE_NAME: 'BooksTable',
    DYNAMODB_READ_CAPACITY: 5,
    DYNAMODB_WRITE_CAPACITY: 5,
    DYNAMODB_BILLING_MODE: dynamodb.BillingMode.PROVISIONED,
    LAMBDA_ENV: process.env.LAMBDA_ENV ?? 'prod',
    LAMBDA_RUNTIME: lambda.Runtime.PYTHON_3_11,
    LAMBDA_SOURCE: 'src/books',
    LAMBDA_PACKAGE_LAYER_PATH: 'src/packages',
    LAMBDA_COMMON_LAYER_PATH: 'src/lib',
    GET_BOOKS_FUNC: 'get_books',
    GET_BOOK_DETAIL_FUNC: 'get_book_detail',
}



// Order Service Configuration

