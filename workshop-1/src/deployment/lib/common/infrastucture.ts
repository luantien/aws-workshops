import { Construct } from "constructs";
import * as Ec2 from 'aws-cdk-lib/aws-ec2';

export interface InfrastructureProps {
    region: string;
    username: string;
}

export class Infrastructure extends Construct {
    public readonly vpc: Ec2.IVpc;
    public readonly ingressSecGroup: Ec2.ISecurityGroup;
    public readonly appSecGroup: Ec2.ISecurityGroup;
    public readonly dbSecGroup: Ec2.ISecurityGroup;

    constructor(scope: Construct, id: string, props: InfrastructureProps) {
        super(scope, id);

        this.vpc = new Ec2.Vpc(this, 'Vpc', {
            vpcName: `vpc-${props.region}-${props.username}-workshop`,
            cidr: '10.16.0.0/16',
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'ingress',
                    subnetType: Ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'application',
                    subnetType: Ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 28,
                    name: 'rds',
                    subnetType: Ec2.SubnetType.PRIVATE_ISOLATED,
                }
            ],
            gatewayEndpoints: {
                S3: {
                    service: Ec2.GatewayVpcEndpointAwsService.S3,
                },
            },
        });

        this.ingressSecGroup = new Ec2.SecurityGroup(this, 'IngressSecGroup', {
            vpc: this.vpc,
            securityGroupName: 'ingressSecGroup',
            description: 'Security Group for Ingress',
            allowAllOutbound: true,
        });
        this.ingressSecGroup.addIngressRule(Ec2.Peer.anyIpv4(), Ec2.Port.tcp(80), 'Allow HTTP traffic from internet');
        this.ingressSecGroup.addIngressRule(Ec2.Peer.anyIpv4(), Ec2.Port.tcp(443), 'Allow HTTPS traffic from internet');
        this.ingressSecGroup.addIngressRule(Ec2.Peer.anyIpv4(), Ec2.Port.tcp(22), 'Allow SSH traffic from internet');

        this.appSecGroup = new Ec2.SecurityGroup(this, 'AppSecGroup', {
            vpc: this.vpc,
            securityGroupName: 'appSecGroup',
            description: 'Security Group for Application',
            allowAllOutbound: true,
        });
        this.appSecGroup.addIngressRule(this.ingressSecGroup, Ec2.Port.tcp(80), 'Allow HTTP traffic from Ingress Security Group');
        this.appSecGroup.addIngressRule(this.ingressSecGroup, Ec2.Port.tcp(443), 'Allow HTTPS traffic from Ingress Security Group');
        this.appSecGroup.addIngressRule(this.ingressSecGroup, Ec2.Port.tcp(22), 'Allow SSH traffic from Ingress Security Group');
        
        this.dbSecGroup = new Ec2.SecurityGroup(this, 'DbSecGroup', {
            vpc: this.vpc,
            securityGroupName: 'dbSecGroup',
            description: 'Security Group for Database',
            allowAllOutbound: true,
        });
        this.dbSecGroup.addIngressRule(this.appSecGroup, Ec2.Port.tcp(3306), 'Allow TCP traffic from App Security Group to MySQL instance');
        this.dbSecGroup.addIngressRule(this.appSecGroup, Ec2.Port.tcp(5432), 'Allow TCP traffic from App Security Group to Postgres instance');
    }
}