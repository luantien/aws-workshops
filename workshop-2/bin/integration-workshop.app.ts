#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WorkshopStack } from '../lib/integration-workshop.stack';
import * as dotenv from 'dotenv';

const app = new cdk.App();
const username = process.env.AWS_USERNAME || 'anonymous';


new WorkshopStack(app, 'IntegrationWorkshopStack', {
    stackName: `${username}-integration-workshop`,
    env: { 
        account: process.env.AWS_ACCOUNT,
        region: process.env.AWS_REGION,
    },
    owner: username,
});
