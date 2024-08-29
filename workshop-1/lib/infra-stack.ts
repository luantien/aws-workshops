import { NestedStack, NestedStackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { STACK_OWNER, INFRA } from './config';


export class InfraStack extends NestedStack {
    public readonly vpc: ec2.IVpc;
    public readonly ingressSecGroup: ec2.ISecurityGroup;
    public readonly appSecGroup: ec2.ISecurityGroup;
    public readonly dbSecGroup: ec2.ISecurityGroup;
    
    constructor(scope: Construct, id: string, props?: NestedStackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, 'VPC', {
            vpcName: INFRA.VPC_NAME,
            ipAddresses: ec2.IpAddresses.cidr(INFRA.CIDR),
            maxAzs: INFRA.MAX_AZS,
            natGateways: INFRA.NAT_GATEWAYS,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Ingress',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'App',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 28,
                    name: 'Db',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                }
            ],
            gatewayEndpoints: {
                S3: {
                    service: ec2.GatewayVpcEndpointAwsService.S3,
                },
            },
        });

        this.ingressSecGroup = new ec2.SecurityGroup(this, 'IngressSG', {
            vpc: this.vpc,
            securityGroupName: `${INFRA.VPC_NAME}-ingress`,
            description: 'Security Group for Ingress',
            allowAllOutbound: true,
        });
        this.ingressSecGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from internet');
        this.ingressSecGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic from internet');
        // this.ingressSecGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH traffic from internet');
        Tags.of(this.ingressSecGroup).add('Name', `${INFRA.VPC_NAME.toUpperCase()} Ingress SecGroup`);

        this.appSecGroup = new ec2.SecurityGroup(this, 'AppSG', {
            vpc: this.vpc,
            securityGroupName: `${INFRA.VPC_NAME}-app`,
            description: 'Security Group for Application',
            allowAllOutbound: true,
        });
        this.appSecGroup.addIngressRule(this.ingressSecGroup, ec2.Port.tcp(80), 'Allow HTTP traffic from Ingress Security Group');
        this.appSecGroup.addIngressRule(this.ingressSecGroup, ec2.Port.tcp(443), 'Allow HTTPS traffic from Ingress Security Group');
        // this.appSecGroup.addIngressRule(this.ingressSecGroup, ec2.Port.tcp(22), 'Allow SSH traffic from Ingress Security Group');
        Tags.of(this.appSecGroup).add('Name', `${INFRA.VPC_NAME.toUpperCase()} App SecGroup`);

        this.dbSecGroup = new ec2.SecurityGroup(this, 'DbSG', {
            vpc: this.vpc,
            securityGroupName: `${INFRA.VPC_NAME}-db`,
            description: 'Security Group for Database',
            allowAllOutbound: true
        });
        this.dbSecGroup.addIngressRule(this.appSecGroup, ec2.Port.tcp(3306), 'Allow TCP traffic from App Security Group to MySQL instance');
        this.dbSecGroup.addIngressRule(this.appSecGroup, ec2.Port.tcp(5432), 'Allow TCP traffic from App Security Group to Postgres instance');
        Tags.of(this.dbSecGroup).add('Name', `${INFRA.VPC_NAME.toUpperCase()} DB SecGroup`);
    }
}