import { Stack, StackProps, Tags} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InfraStack } from './infra-stack';
import { STACK_OWNER } from './config';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class MainStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Baseline Infrastructure
        const infas = new InfraStack(this, 'Infra', {
            description: 'This stack creates the infrastructure for the workshop',
        })
        Tags.of(infas).add('name', `${STACK_OWNER}-base-infra`);
        Tags.of(infas).add('description', `Baseline infrastructure created by ${STACK_OWNER}`);

        // TODO: Beanstalk Stack Logic with Feature Flags

        // TODO: ECS Stack Logic with Feature Flags
    }
}
