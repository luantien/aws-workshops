import {Stack, StackProps, Tags} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoService } from './cognito-stack';
import { BookService } from './book-stack';

import { STACK_OWNER, BOOK_CONFIG } from './config';


export class MainStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        // Cognito Service (IdP)
        const cognitoService = new CognitoService(this, 'CognitoService', {
            userPoolName: `${STACK_OWNER}UserPool`,
            domainPrefix: `${STACK_OWNER}-user-pool`,
            description: `Cognito Service created by ${STACK_OWNER}`,
        });
        Tags.of(cognitoService).add('name', `${STACK_OWNER}-cognito-service`);
        Tags.of(cognitoService).add('description', `Cognito Service created by ${STACK_OWNER}`);

        // Book REST APIs
        if (BOOK_CONFIG.STACK_ENABLED) {
            const bookService = new BookService(this, 'BookService', cognitoService, {
                description: `Books Rest APIs created by ${STACK_OWNER}`,
            });
            Tags.of(bookService).add('name', `${STACK_OWNER}-book-service`);
            Tags.of(bookService).add('description', `Books Rest APIs created by ${STACK_OWNER}`);
        }

        // Order REST APIs
        // const orderService = new OrdersService(this, 'OrderService', {
        //     cognito: cognito,
        //     dynamodb: dynamodb,
        // });
        // Tags.of(orderService).add('name', `${STACK_OWNER}-order-service`);
        // Tags.of(orderService).add('description', `Orders Rest APIs created by ${STACK_OWNER}`);
    }
}
