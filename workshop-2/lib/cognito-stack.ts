import { Construct } from "constructs";
import { NestedStack, NestedStackProps, CfnOutput, RemovalPolicy} from "aws-cdk-lib";
import { UserPoolClient, UserPool, UserPoolDomain, OAuthScope } from "aws-cdk-lib/aws-cognito";
import { COGNITO_DOMAIN_PREFIX, COGNITO_USERPOOL_NAME, STACK_REGION } from "./config";


export interface UserPoolClientProps {
    name: string;
    callbackUrls: string[];
    logoutUrls: string[];
}

export interface CognitoServiceProps extends NestedStackProps {
    userPoolName: string;
    domainPrefix: string;
}

export class CognitoService extends NestedStack {
    public readonly userPoolName: string;
    public readonly userPool: UserPool;
    public readonly userPoolDomain: UserPoolDomain;

    constructor(scope: Construct, id: string, props: CognitoServiceProps) {
        super(scope, id, props);
        this.userPoolName = COGNITO_USERPOOL_NAME;
        
        this.userPool = new UserPool(this, 'UserPool', {
            userPoolName: COGNITO_USERPOOL_NAME,
            removalPolicy: RemovalPolicy.DESTROY,
            selfSignUpEnabled: true,
            
        });
        this.userPoolDomain = this.userPool.addDomain('UserPoolDomain', {
            cognitoDomain: { domainPrefix: COGNITO_DOMAIN_PREFIX },
            
        });

        this.generateCfnOutput();
    }

    protected generateCfnOutput() {
        new CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'User Pool Id',
            exportName: `${COGNITO_USERPOOL_NAME}Id`,
        });

        new CfnOutput(this, 'UserPoolArn', {
            value: this.userPool.userPoolArn,
            description: 'User Pool ARN',
            exportName: `${COGNITO_USERPOOL_NAME}Arn`,
        });

        new CfnOutput(this, 'UserPoolDomain', {
            value: `https://${this.userPoolDomain.domainName}.auth.${STACK_REGION}.amazoncognito.com`,
            description: 'User Pool Domain',
            exportName: `${COGNITO_USERPOOL_NAME}Domain`,
        });
    }

    public addNewClient(id: string, client: UserPoolClientProps): UserPoolClient {
        return this.userPool.addClient(id, {
            userPoolClientName: client.name,
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [OAuthScope.OPENID],
                callbackUrls: client.callbackUrls,
                logoutUrls: client.logoutUrls,
            }
        });
    }
}
