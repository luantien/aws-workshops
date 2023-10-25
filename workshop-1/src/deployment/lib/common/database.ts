import { Construct } from "constructs";
import { DatabaseInstance, IInstanceEngine, Credentials } from 'aws-cdk-lib/aws-rds';
import { ISecurityGroup, IVpc, InstanceType, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { RemovalPolicy } from "aws-cdk-lib";

export interface DatabaseProbs {
    id: string
    vpc: IVpc;
    dbName: string;
    engine: IInstanceEngine;
    instanceType: InstanceType;
    credential: Secret;
    securityGroup: ISecurityGroup;
}

export class RdsDatabase extends Construct {
    public readonly instance: DatabaseInstance;

    constructor(scope: Construct, id: string, props: DatabaseProbs) {
        super(scope, id);
        
        this.instance = new DatabaseInstance(this, 'instance', {
            vpc: props.vpc,
            engine: props.engine,
            databaseName: props.dbName,
            port: 5432,
            allocatedStorage: 20,
            instanceType: props.instanceType,
            multiAz: false,
            vpcSubnets: props.vpc.selectSubnets({
                onePerAz: true,
                subnetType: SubnetType.PRIVATE_ISOLATED,
            }),
            securityGroups: [props.securityGroup],
            // Generate the secret with credentials from secret manager
            credentials: Credentials.fromSecret(props.credential),
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }

}

export interface CredentialProbs {
    username: string;
    owner: string | undefined;
}

export class DbCredential extends Construct {
    public readonly credential: Secret;

    constructor(scope: Construct, id: string, prop?: CredentialProbs) {
        super(scope, id);
        const secretName = `${prop?.owner!}-db-credential`;

        this.credential = new Secret(this, 'secret',{
            description: 'Credential for DB',
            secretName: secretName,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: prop?.username || 'admin' }),
                generateStringKey: 'password',
                includeSpace: false,
                excludeCharacters: '"@/\\',
            },
        });
    }
}