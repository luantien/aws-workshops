import { Construct } from "constructs";
import { IVpc, Vpc, IpAddresses, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Bucket } from "aws-cdk-lib/aws-s3";

export interface InfrastructureProps {
    region: string | undefined;
    username: string | undefined;
}

export class Infrastructure extends Construct {
    public readonly vpc: IVpc | undefined;
    public readonly s3Bucket: Bucket | undefined;
    public readonly ecrRepo: string | undefined;

    constructor(scope: Construct, id: string, props?: InfrastructureProps) {
        super(scope, id);

        this.vpc = new Vpc(this, 'vpc', {
            vpcName: `vpc-${props?.region}-${props?.username}-workshop`,
            ipAddresses: IpAddresses.cidr('10.16.0.0/16'),
            availabilityZones: [`${props?.region}a`, `${props?.region}b`],
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'ingress',
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'application',
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 28,
                    name: 'rds',
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                }
            ],
        });

        this.s3Bucket = new Bucket(this, 's3bucket', {
    }
}
