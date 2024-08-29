// Stack Configuration
export const STACK_OWNER = process.env.AWS_USERNAME ?? 'anonymous';
export const STACK_REGION = process.env.AWS_REGION ?? 'ap-southeast-1';
export const STACK_ACCOUNT = process.env.AWS_ACCOUNT ?? '000000000000';

export const INFRA = {
    VPC_NAME: `${STACK_OWNER}-cws`,
    CIDR: '10.16.0.0/16',
    MAX_AZS: 2,
    NAT_GATEWAYS: process.env.INFRA_USE_NAT_GATEWAY === 'true' ? 1 : 0,
}