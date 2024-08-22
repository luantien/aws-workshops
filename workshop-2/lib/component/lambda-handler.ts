import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';


export interface LambdaHandlerProps {
    name: string;
    runtime: lambda.Runtime;
    codeAsset: lambda.Code;
    handler: string;
    memorySize?: number;
    options?: lambda.FunctionOptions;
    policies?: iam.PolicyStatement[];
}

export function createLambdaHandler(scope: Construct, id: string, props: LambdaHandlerProps): lambda.IFunction {
    const fn = new lambda.Function(scope, id, {
        functionName: props.name,
        runtime: props.runtime,
        code: props.codeAsset,
        handler: props.handler,
        memorySize: props.memorySize ?? 128,
        tracing: lambda.Tracing.ACTIVE,
        environment: props.options?.environment ?? {},
        layers: props.options?.layers ?? [],
    });

    if (props.policies) {
        props.policies.forEach((policy) => {
            fn.addToRolePolicy(policy);
        });
    }

    return fn;
}

// // Function to create Lambda layers
// export function createLambdaLayers(scope: Construct): lambda.LayerVersion[] {
//     return [
//         new lambda.LayerVersion(scope, 'PackageLayer', {
//             compatibleRuntimes: [LAMBDA_RUNTIME],
//             code: lambda.Code.fromAsset(PACKAGE_LAYER_PATH),
//             description: 'Package Layer',
//         }),
//         new lambda.LayerVersion(scope, 'CommonPackageLayer', {
//             compatibleRuntimes: [LAMBDA_RUNTIME],
//             code: lambda.Code.fromAsset(COMMON_LAYER_PATH),
//             description: 'Common Layer',
//         }),
//     ];
// }

// // Function to create Lambda options
// export function createLambdaOptions(
//     layers: lambda.LayerVersion[],
//     dynamodbTableName: string): lambda.FunctionOptions {
//         return {
//             environment: {
//                 LAMBDA_ENV: process.env.LAMBDA_ENV ?? DEFAULT_ENV,
//                 DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? '',
//                 DYNAMODB_TABLE: dynamodbTableName,
//             },
//             layers: layers,
//         };
// }
