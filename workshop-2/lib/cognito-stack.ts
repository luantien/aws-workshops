import { Construct } from "constructs";
import { NestedStack, NestedStackProps, CfnOutput, RemovalPolicy} from "aws-cdk-lib";
import { UserPoolClient, UserPool, UserPoolDomain, OAuthScope } from "aws-cdk-lib/aws-cognito";
import { COGNITO_CONFIG, STACK_OWNER, STACK_REGION } from "./config";


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
    public readonly userPoolClient: UserPoolClient;

    constructor(scope: Construct, id: string, props: CognitoServiceProps) {
        super(scope, id, props);
        this.userPoolName = COGNITO_CONFIG.USERPOOL_NAME;
        
        this.userPool = new UserPool(this, 'UserPool', {
            userPoolName: COGNITO_CONFIG.USERPOOL_NAME,
            removalPolicy: RemovalPolicy.DESTROY,
            selfSignUpEnabled: true,
            
        });
        this.userPoolDomain = this.userPool.addDomain('Domain', {
            cognitoDomain: { domainPrefix: COGNITO_CONFIG.DOMAIN_PREFIX },
            
        });

        this.userPoolClient = this.addNewClient('WebApiClient', {
            name: `${STACK_OWNER}WebApiClient`,
            callbackUrls: [ COGNITO_CONFIG.CALLBACK_URL ],
            logoutUrls: [ COGNITO_CONFIG.LOGOUT_URL ],
        });

        this.generateCfnOutput();
    }

    protected generateCfnOutput() {
        new CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'User Pool Id',
            exportName: `${COGNITO_CONFIG.USERPOOL_NAME}Id`,
        });

        new CfnOutput(this, 'UserPoolArn', {
            value: this.userPool.userPoolArn,
            description: 'User Pool ARN',
            exportName: `${COGNITO_CONFIG.USERPOOL_NAME}Arn`,
        });

        new CfnOutput(this, 'UserPoolDomain', {
            value: `https://${this.userPoolDomain.domainName}.auth.${STACK_REGION}.amazoncognito.com`,
            description: 'User Pool Domain',
            exportName: `${COGNITO_CONFIG.USERPOOL_NAME}Domain`,
        });

        new CfnOutput(this, 'UserPoolJWKSUrl', {
            value: `https://cognito-idp.${STACK_REGION}.amazonaws.com/${this.userPool.userPoolId}/.well-known/jwks.json`,
            description: 'User Pool JWKS URL',
            exportName: `${COGNITO_CONFIG.USERPOOL_NAME}JWKSUrl`,
        });

        new CfnOutput(this, 'WebApiPoolClientId', {
            value: this.userPoolClient?.userPoolClientId ?? '',
            description: 'Order REST API User Pool Client Id',
            exportName: `${COGNITO_CONFIG.USERPOOL_NAME}ClientId`,
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
