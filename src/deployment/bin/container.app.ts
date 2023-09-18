#!/usr/bin/env node
import 'source-map-support/register';
import {App, Tags} from 'aws-cdk-lib';
import { BeanstalkStack } from '../lib/stack/beanstalk-stack';
import { ECSStack } from '../lib/stack/ecs-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new App();
new BeanstalkStack(app, 'beanstalk', {
  env: { 
    account: process.env.AWS_ACCOUNT,
    region: process.env.AWS_REGION,
  },
  owner: process.env.AWS_USERNAME || 'user',
});

new ECSStack(app, 'ecs', {
  env: {
    account: process.env.AWS_ACCOUNT,
    region: process.env.AWS_REGION || 'ap-southeast-1',
  },
});

// Add tag for cleanup and cost control
Tags.of(app).add('user:owner', process.env.AWS_USERNAME || 'user');
Tags.of(app).add('user:codinator', 'tiennpl');
Tags.of(app).add('user:cost-center', 'workshop');
