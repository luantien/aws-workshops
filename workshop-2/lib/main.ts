import {Stack, StackProps, Tags} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoService } from './cognito-stack';
import { BookService } from './book-stack';
import { OrdersService } from './services/orders';

import { STACK_OWNER, STACK_REGION } from './config';
import { DynamoDb } from './component/dynamodb';


export class MainStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        // Cognito Service (IdP)
        const cognitoService = new CognitoService(this, id, {
            userPoolName: `${STACK_OWNER}WorkshopUserPool`,
            domainPrefix: `${STACK_OWNER}-user-pool`,
        });
        Tags.of(cognitoService).add('name', `${STACK_OWNER}-cognito-service`);
        Tags.of(cognitoService).add('description', `Cognito Service created by ${STACK_OWNER}`);

        // Book REST APIs
        const bookService = new BookService(this, 'BookService', cognitoService);
        Tags.of(bookService).add('name', `${STACK_OWNER}-book-service`);
        Tags.of(bookService).add('description', `Books Rest APIs created by ${STACK_OWNER}`);

        // Order REST APIs
        // const orderService = new OrdersService(this, 'OrderService', {
        //     cognito: cognito,
        //     dynamodb: dynamodb,
        // });
        // Tags.of(orderService).add('name', `${STACK_OWNER}-order-service`);
        // Tags.of(orderService).add('description', `Orders Rest APIs created by ${STACK_OWNER}`);
    }
}
