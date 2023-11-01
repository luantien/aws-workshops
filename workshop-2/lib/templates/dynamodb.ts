import { RemovalPolicy } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DatabaseProps {
    tableName: string;
    readCapacity: number;
    writeCapacity: number;
    billingMode: dynamodb.BillingMode;
    autoScaling: boolean;
    maxCapacity: number;
    globalSecondaryIndexes?: dynamodb.GlobalSecondaryIndexProps[];
    stream?: dynamodb.StreamViewType;
}

export class DynamoDb extends Construct {
    static readonly ProjectionType = dynamodb.ProjectionType;
    static readonly AttributeType = dynamodb.AttributeType;
    static readonly BillingMode = dynamodb.BillingMode;
    static readonly StreamViewType = dynamodb.StreamViewType;
    public readonly table: dynamodb.Table;

    constructor(scope: Construct, id: string, props: DatabaseProps) {
        super(scope, id);

        const table = new dynamodb.Table(this, 'Table', {
            tableName: props.tableName,
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: props.readCapacity ?? 5,
            writeCapacity: props.writeCapacity ?? 5,
            removalPolicy: RemovalPolicy.DESTROY,
            stream: props.stream ?? undefined,
        });

        if (props.autoScaling) {
            table
                .autoScaleReadCapacity({
                    minCapacity: props.readCapacity * 2 ?? 10,
                    maxCapacity: props.maxCapacity ?? 50,
                })
                .scaleOnUtilization({ targetUtilizationPercent: 75 });
            table
                .autoScaleWriteCapacity({
                    minCapacity: props.writeCapacity ?? 5,
                    maxCapacity: props.maxCapacity ?? 50,
                })
                .scaleOnUtilization({ targetUtilizationPercent: 75 });
        }

        if (props.globalSecondaryIndexes) {
            props.globalSecondaryIndexes.forEach((index) => {
                table.addGlobalSecondaryIndex(index);
            });
        }

        this.table = table;
    }
}
