#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main';

const app = new cdk.App();
const username = process.env.AWS_USERNAME || 'anonymous';
const stackId = `${username.toUpperCase()}-CWS`;

new MainStack(app, stackId, {
  stackName: stackId,
  description: 'AWS Container Workshop with Beanstalk, ECS, ECR, and Fargate',
});

cdk.Tags.of(app).add('user:owner', username);
cdk.Tags.of(app).add('user:codinator', 'tiennguyenpl');
cdk.Tags.of(app).add('user:cost-center', 'aws-workshop');
