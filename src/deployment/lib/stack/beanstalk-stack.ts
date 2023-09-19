import {CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { Infrastructure } from '../common/infrastucture';
import { DbCredential, RdsDatabase } from '../common/database';
import { DatabaseInstanceEngine, PostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType } from 'aws-cdk-lib/aws-ec2';

import * as Beanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Role, CfnInstanceProfile, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import path = require('path');

export interface BeanstalkStackProps extends StackProps {
    owner: string | undefined;
    minSize: number;
    maxSize: number;
    appKey: string;
}

export class BeanstalkStack extends Stack {
  constructor(scope: Construct, id: string, props?: BeanstalkStackProps) {
    super(scope, id, props);
    ;
    // Infrastructure Environment
    const infra = new Infrastructure(this, 'Infrastructure', {
      region: props?.env?.region,
      username: props?.owner,
    });
    
    // const dbCredential = new DbCredential(this, 'dbcredential', { username: 'postgres' });

    
    // const database = new RdsDatabase(this, 'rds', {
    //     id: `rds-${props?.owner}`,
    //     engine: DatabaseInstanceEngine.postgres({
    //         version: PostgresEngineVersion.VER_14,
    //     }),
    //     instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    //     dbName: 'bookstore',
    //     credential: dbCredential.credential,
    //     vpc: infra.vpc!, // ! means that we are sure that vpc is not undefined
    // });
    
    const applicationName = `${props?.owner}-bookstore`;

    // Beanstalk App
    const beanstalkApp = new Beanstalk.CfnApplication(this, 'BeanstalkApp', {
        applicationName: applicationName,
    });

    const appZipAsset = new Asset(this, 'AppZipAsset', {
        path: '../store/artifacts/source.zip',
    });

    const appVersion = new Beanstalk.CfnApplicationVersion(this, 'AppVersion', {
        applicationName: applicationName,
        sourceBundle: {
            s3Bucket: appZipAsset.s3BucketName,
            s3Key: appZipAsset.s3ObjectKey,
        },
    });
    appVersion.addDependency(beanstalkApp);

    // Create Instance Profile
    const appRole = new Role(this, `Ec2Role`, {
        assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
        roleName: `${applicationName}-ec2-role`,
        managedPolicies: [
            ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'),
            ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'),
        ],
    });

    const instanceProfile = new CfnInstanceProfile(this, `InstanceProfile`, {
        instanceProfileName: `${applicationName}-instance-profile`,
        roles: [ appRole.roleName ],
    });


    // Beanstalk Environment
    const environment = new Beanstalk.CfnEnvironment(this, 'BeanstalkEnvironment', {
        environmentName: `${applicationName}-env`,
        applicationName: applicationName,
        solutionStackName: '64bit Amazon Linux 2 v3.5.11 running PHP 8.1',
        optionSettings: [
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'IamInstanceProfile',
                value: instanceProfile.instanceProfileName,
            },
            {
                namespace: 'aws:ec2:instances',
                optionName: 'InstanceTypes',
                value: [
                    InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
                    InstanceType.of(InstanceClass.T2, InstanceSize.MICRO)
                ].join(','), // join array to string
            },
            {
                namespace: 'aws:autoscaling:launchconfiguration',
                optionName: 'SecurityGroups',
                value: infra.appSecGroup!.securityGroupId,
            },
            {
                namespace: 'aws:elasticbeanstalk:application',
                optionName: 'Application Healthcheck URL',
                value: '/',
            },
            {
                namespace: 'aws:autoscaling:asg',
                optionName: 'MinSize',
                value: props?.maxSize.toString() ?? '1',
            },
            {
                namespace: 'aws:autoscaling:asg',
                optionName: 'MaxSize',
                value: props?.maxSize.toString() ?? '5',
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'VPCId',
                value: infra.vpc!.vpcId,
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'Subnets',
                value: infra.vpc!.privateSubnets.map(subnet => subnet.subnetId).join(','), // join array to string
            },
            {
                namespace: 'aws:ec2:vpc',
                optionName: 'ELBSubnets',
                value: infra.vpc!.publicSubnets.map(subnet => subnet.subnetId).join(','), // join array to string
            },
            {
                namespace: 'aws:elasticbeanstalk:environment',
                optionName: 'LoadBalancerType',
                value: 'application',
            },
            {
                namespace:'aws:elbv2:loadbalancer',
                optionName: 'ManagedSecurityGroup',
                value: infra.ingressSecGroup!.securityGroupId,
            },
            {
                namespace:'aws:elbv2:loadbalancer',
                optionName: 'SecurityGroups',
                value: infra.ingressSecGroup!.securityGroupId,
            },
            {
                namespace: 'aws:elasticbeanstalk:xray',
                optionName: 'XRayEnabled',
                value: 'true',
            },
            {
                namespace: 'aws:elasticbeanstalk:application:environment',
                optionName: 'APP_KEY',
                value: props?.appKey,
            }
            // {
            //     namespace: 'aws:rds:dbinstance',
            //     optionName: 'HasCoupledDatabase',
            //     value: 'false',
            // },
            // {
            //     namespace: 'aws:elasticbeanstalk:application:environment',
            //     optionName: 'AWS_SECRET_ID',
            //     value: dbCredential.credential.secretArn,
            // }

            // {
            //     namespace: 'aws:elasticbeanstalk:application:environment',
            //     optionName: 'RDS_HOSTNAME',
            //     value: database.instance.dbInstanceEndpointAddress,
            // },
            // {
            //     namespace: 'aws:elasticbeanstalk:application:environment',
            //     optionName: 'RDS_DB_NAME',
            //     value: 'bookstore',
            // },
            // {
            //     namespace: 'aws:elasticbeanstalk:application:environment',
            //     optionName: 'RDS_USERNAME',
            //     value: dbCredential.credential.secretValueFromJson('username').toString(),
            // },
            // {
            //     namespace: 'aws:elasticbeanstalk:application:environment',
            //     optionName: 'RDS_PASSWORD',
            //     value: dbCredential.credential.secretValueFromJson('password').toString(),
            // },
            // {
            //     namespace: 'aws:elasticbeanstalk:application:environment',
            //     optionName: 'RDS_PORT',
            //     value: '5432',
            // }
        ],
        // versionLabel: appVersion.ref,
    });

  }
}
