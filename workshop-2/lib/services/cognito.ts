import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";


export interface UserPoolClientProps {
    name: string;
    callbackUrls: string[];
    logoutUrls: string[];
}

export interface CognitoServiceProps {
    userPoolName: string;
    domainPrefix: string;
    region: string;
}

export class CognitoService extends Construct {
    public readonly userPoolName: string;
    public readonly userPoolDomain: cognito.UserPoolDomain;
    public readonly region: string;

    public readonly userPool: cognito.UserPool;

    constructor(scope: Construct, id: string, props: CognitoServiceProps) {
        super(scope, id);

        this.userPoolName = props.userPoolName ?? 'SampleUserPool';
        this.region = props.region ?? 'ap-southeast-1';
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: this.userPoolName,
            removalPolicy: RemovalPolicy.DESTROY,
            selfSignUpEnabled: true,
        });
        this.userPoolDomain = this.userPool.addDomain('UserPoolDomain', {
            cognitoDomain: { domainPrefix: props.domainPrefix },
        });

        this.generateCfnOutput();
    }

    protected generateCfnOutput() {
        new CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'User Pool Id',
            exportName: `${this.userPoolName}Id`,
        });

        new CfnOutput(this, 'UserPoolArn', {
            value: this.userPool.userPoolArn,
            description: 'User Pool ARN',
            exportName: `${this.userPoolName}Arn`,
        });

        new CfnOutput(this, 'UserPoolDomain', {
            value: `https://${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
            description: 'User Pool Domain',
            exportName: `${this.userPoolName}Domain`,
        });
    }

    public addNewClient(client: UserPoolClientProps): cognito.UserPoolClient {
        return this.userPool.addClient(`${client.name}UserPoolClient`, {
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [cognito.OAuthScope.OPENID],
                callbackUrls: client.callbackUrls,
                logoutUrls: client.logoutUrls,
            }
        });
    }
}
