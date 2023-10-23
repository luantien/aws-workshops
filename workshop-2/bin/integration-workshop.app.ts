#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main';


const app = new cdk.App();
const username = process.env.AWS_USERNAME || 'anonymous';


new MainStack(app, 'iws-main-stack', {
    stackName: `${username}-Integration-Workshop`,
    description: 'AWS Integration Workshop with EventBridge, SQS, SNS, and StepFunctions',
    env: { 
        account: process.env.AWS_ACCOUNT,
        region: process.env.AWS_REGION,
    },
    owner: username,
});
