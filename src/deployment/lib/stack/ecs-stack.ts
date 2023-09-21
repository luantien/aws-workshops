import { Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Infrastructure } from '../common/infrastucture';
import { DbCredential, RdsDatabase } from '../common/database';
import { DatabaseInstanceEngine, PostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { InstanceClass, InstanceSize, InstanceType, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { AsgCapacityProvider, AwsLogDriver, Cluster, ContainerImage, Ec2TaskDefinition, EcsOptimizedImage, FargateService, FargateTaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export interface EcsStackProps extends StackProps {
  owner: string | undefined;
  minSize: number;
  maxSize: number;
  appKey: string;
}

export class ECSStack extends Stack {
    constructor(scope: Construct, id: string, props?: EcsStackProps) {
        super(scope, id, props);

        // Infrastructure Environment
        const infra = new Infrastructure(this, 'Infrastructure', {
        region: props?.env?.region,
        username: props?.owner,
        });
        
        // const dbCredential = new DbCredential(this, 'dbcredential', { username: 'postgres', owner: props?.owner });
        // const dbName = 'bookstore';
        // ! means that we are sure that resources is not undefined
        // const database = new RdsDatabase(this, 'rds', {
        //     id: `rds-${props?.owner}`,
        //     engine: DatabaseInstanceEngine.postgres({
        //         version: PostgresEngineVersion.VER_14,
        //     }),
        //     instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
        //     dbName: dbName,
        //     credential: dbCredential.credential,
        //     vpc: infra.vpc!,
        //     securityGroup: infra.dbSecGroup!,
        // });

        // ECS Cluster
        const cluster = new Cluster(this, 'Cluster', {
        vpc: infra.vpc!,
        });

        const autoScalingGroup = new AutoScalingGroup(this, 'ASG', {
        vpc: infra.vpc!,
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
        machineImage: EcsOptimizedImage.amazonLinux2(),
        minCapacity: props?.minSize,
        desiredCapacity: props?.minSize,
        maxCapacity: props?.maxSize,
        securityGroup: infra.appSecGroup!,
        });

        const capacityProvider = new AsgCapacityProvider(this, 'AsgCapacityProvider', {
        autoScalingGroup: autoScalingGroup
        });
        cluster.addAsgCapacityProvider(capacityProvider);

        // ECS Task Definition
        const taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
            cpu: 1024, // 1 vCPU
            family: 'BookstoreTaskDefinition',
            memoryLimitMiB: 2048,
        });

        const ecrRepo = Repository.fromRepositoryName(this, 'k0n3v4i4', 'workshop/containerization');

        // Add container to task definition
        taskDefinition.addContainer('NginxContainer', {
            containerName: 'Nginx',
            image: ContainerImage.fromEcrRepository(ecrRepo, 'store-nginx-1'),
            memoryLimitMiB: 256,
            memoryReservationMiB: 128,
            cpu: 256, // 0.25 vCPU
            environment: {},
            essential: true,
            portMappings: [{ containerPort: 80 }],
            logging: new AwsLogDriver({ streamPrefix: 'BookstoreNginxContainer' }),
        });

        taskDefinition.addContainer('PhpFpmContainer', {
            containerName: 'Laravel-PhpFpm',
            image: ContainerImage.fromEcrRepository(ecrRepo, 'store-php-1'),
            cpu: 512, // 0.5 vCPU
            memoryLimitMiB: 512,
            memoryReservationMiB: 256,
            environment: {
                // DB_HOST: database.instance.dbInstanceEndpointAddress,
                // DB_USER: dbCredential.credential.secretValueFromJson('username').unsafeUnwrap(),
                // DB_PASSWORD: dbCredential.credential.secretValueFromJson('password').unsafeUnwrap(),
                // DB_NAME: dbName,
                APP_KEY: props?.appKey!,
            },
            essential: true,
            portMappings: [{ containerPort: 9000 }],
            logging: new AwsLogDriver({ streamPrefix: 'BookstorePHPContainer' }),
        });

        // ECS Service
        const fargateService = new FargateService(this, 'FargateService', {
            cluster: cluster,
            taskDefinition: taskDefinition,
            desiredCount: props?.minSize,
            securityGroups: [infra.appSecGroup!],
        });

        // Create Application Load Balancer
        const alb = new ApplicationLoadBalancer(this, 'ALB', {
            vpc: infra.vpc!,
            internetFacing: true,
            securityGroup: infra.ingressSecGroup!,
            vpcSubnets: infra.vpc?.selectSubnets({
                onePerAz: true,
                subnetType: SubnetType.PUBLIC,
            }),
        });

        const albListener = alb.addListener('Listener', {
            port: 80,
            open: true,
        });

        albListener.addTargets('Target', {
            port: 80,
            targets: [fargateService]
        });
    }
}
