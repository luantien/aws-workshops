import { Construct } from 'constructs';
import { CognitoService } from './cognito';
import { DynamoDb } from '../templates/dynamodb';


export interface OrdersServiceProps {
    owner: string;
    cognito: CognitoService | undefined;
}

export class OrdersService extends Construct {
    private readonly dynamodb: DynamoDb;
    constructor(scope: Construct, id: string, props: OrdersServiceProps) {
        super(scope, id);
        
        // Create DynamoDB table
        this.dynamodb = new DynamoDb(this, 'OrdersTable', {
            tableName: `${props.owner}Orders`,
            readCapacity: 5,
            writeCapacity: 5,
            billingMode: DynamoDb.BillingMode.PROVISIONED,
            autoScaling: false,
            maxCapacity: 50,
        });

        const lambdaOptions = {};
    }
}