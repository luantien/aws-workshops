import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoService } from './services/cognito';
import { BooksService } from './services/books';


export interface MainStackProps extends cdk.StackProps {
    owner: string;
}

export class MainStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: MainStackProps) {
        super(scope, id, props);

        // Cognito Service (IdP)
        // const cognito = new CognitoService(this, 'CognitoService', {
        //     userPoolName: `${props.owner}WorkshopUserPool`,
        //     domainPrefix: `${process.env.AWS_USERNAME ?? Date.now()}-user-pool`,
        //     region: process.env.AWS_REGION ?? 'ap-southeast-1',
        // });
        // cdk.Tags.of(cognito).add('name', `${props.owner ?? 'anonymous'}-cognito-service`);
        // cdk.Tags.of(cognito).add('description', `Cognito Service created by ${props.owner ?? 'anonymous'}`);

        // Book REST APIs
        // const bookService = new BooksService(this, 'BookService', {
        //     cognito: cognito,
        //     owner: props.owner,
        // });
        // cdk.Tags.of(bookService).add('name', `${props.owner ?? 'anonymous'}-books-service`);
        // cdk.Tags.of(bookService).add('description', `Books Rest APIs created by ${props.owner ?? 'anonymous'}`);

    }
}
