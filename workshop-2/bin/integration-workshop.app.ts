#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main';


const app = new cdk.App();
const username = process.env.AWS_USERNAME || 'anonymous';


new MainStack(app, 'iws-main-stack', {
    stackName: `${username.toUpperCase()}-IntegrationWorkshop`,
    description: 'AWS Integration Workshop with EventBridge, SQS, SNS, and StepFunctions',
});

cdk.Tags.of(app).add('user:owner', username);
cdk.Tags.of(app).add('user:codinator', 'tiennguyenpl');
cdk.Tags.of(app).add('user:cost-center', 'aws-workshop');
