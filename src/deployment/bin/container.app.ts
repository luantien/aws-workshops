#!/usr/bin/env node
import 'source-map-support/register';
import {App, Tags} from 'aws-cdk-lib';
import { BeanstalkStack } from '../lib/stack/beanstalk-stack';
import { ECSStack } from '../lib/stack/ecs-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new App();
const username = process.env.AWS_USERNAME || 'anonymous';

new BeanstalkStack(app, 'beanstalk', {
  stackName: `${username}-beanstalk-workshop`,
  env: { 
    account: process.env.AWS_ACCOUNT,
    region: process.env.AWS_REGION,
  },
  owner: username,
  minSize: 1,
  maxSize: 1,
  appKey: process.env.LARAVEL_APP_KEY || 'app_key',
});

new ECSStack(app, 'ecs', {
  stackName: `${username}-ecs-workshop`,
  env: {
    account: process.env.AWS_ACCOUNT,
    region: process.env.AWS_REGION || 'ap-southeast-1',
  },
});

// Add tag for cleanup and cost control
Tags.of(app).add('user:owner', username);
Tags.of(app).add('user:codinator', 'tiennpl');
Tags.of(app).add('user:cost-center', 'workshop');
