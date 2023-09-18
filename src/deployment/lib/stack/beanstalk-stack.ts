import {Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { Infrastructure } from '../common/infrastucture';
import { DbCredential, RdsDatabase } from '../common/database';
import { DatabaseInstanceEngine, PostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType } from 'aws-cdk-lib/aws-ec2';

import * as Beanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';

export interface BeanstalkStackProps extends StackProps {
    owner: string | undefined;
}

export class BeanstalkStack extends Stack {
  constructor(scope: Construct, id: string, props?: BeanstalkStackProps) {
    super(scope, id, props);
    ;
    // Infrastructure Environment
    const infra = new Infrastructure(this, 'infrastructure', {
      region: props?.env?.region,
      username: props?.owner,
    });
    
    const dbCredential = new DbCredential(this, 'dbcredential', { username: 'postgres' });

    
    const database = new RdsDatabase(this, 'rds', {
        id: `rds-${props?.owner}`,
        engine: DatabaseInstanceEngine.postgres({
            version: PostgresEngineVersion.VER_14,
        }),
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
        dbName: 'bookstore',
        credential: dbCredential.credential,
        vpc: infra.vpc!, // ! means that we are sure that vpc is not undefined
    });

    // Beanstalk App Version

    // Beanstalk App
    const appVersion = new Beanstalk.CfnApplicationVersion(this, 'AppVersion', {
        applicationName: `${props?.owner}-bookstore`,
        sourceBundle: {
            s3Bucket: 'codinator-workshop',
            s3Key: 'bookstore.zip',
        },
    })
    
    // Create new ECR private repo
    // const repo = new ecr.Repository(this, "EcrRepository", {});
    
    // const artifact = new DockerImageAsset(this, "BookstoreAppImage", {
    //   directory: "../src/store",
    //   buildArgs: {},
    //   buildSecrets: {}
    // });
    // IAM Instance profile and role

    // Storage for Beanstalk

  }
}
