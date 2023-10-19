import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface WorkshopStackProps extends cdk.StackProps {
  owner: string | undefined;
}

export class WorkshopStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: WorkshopStackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'Workshop2Queue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
