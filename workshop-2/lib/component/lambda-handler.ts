import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';


export interface LambdaHandlerProps {
    name: string;
    runtime: lambda.Runtime;
    codeAsset: lambda.Code;
    handler: string;
    memorySize?: number;
    options?: lambda.FunctionOptions;
    policies?: iam.PolicyStatement[];
}

export function createLambdaHandler(scope: Construct, id: string, 
    props: LambdaHandlerProps): lambda.IFunction {
    const fn = new lambda.Function(scope, id, {
        functionName: props.name,
        runtime: props.runtime,
        code: props.codeAsset,
        handler: props.handler,
        memorySize: props.memorySize ?? 128,
        tracing: lambda.Tracing.ACTIVE,
        environment: props.options?.environment ?? {},
        layers: props.options?.layers ?? [],
        logRetention: RetentionDays.ONE_DAY,
    });

    if (props.policies) {
        props.policies.forEach((policy) => {
            fn.addToRolePolicy(policy);
        });
    }

    return fn;
}
