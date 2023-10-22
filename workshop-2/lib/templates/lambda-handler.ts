import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';


export interface LambdaHandlerProps {
    name: string;
    runtime: lambda.Runtime;
    codeAsset: lambda.Code;
    handler: string;
    memorySize?: number;
    environment?: { [key: string]: string };
    layers?: lambda.ILayerVersion[];
}

export class LambdaHandler extends Construct {
    public readonly function: lambda.IFunction;

    constructor(scope: Construct, id: string, props: LambdaHandlerProps) {
        super(scope, id);

        this.function = new lambda.Function(scope, props.name, {
            functionName: props.name,
            runtime: props.runtime,
            handler: props.handler,
            code: props.codeAsset,
            environment: props.environment ?? {},
            memorySize: props.memorySize ?? 128,
            tracing: lambda.Tracing.ACTIVE,
            layers: props.layers ?? [],
        });
    }
}
