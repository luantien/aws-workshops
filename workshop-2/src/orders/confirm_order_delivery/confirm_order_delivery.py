from datetime import datetime
import os, logging, json, urllib, uuid
from aws_xray_sdk.core import patch_all
import common.dynamodb as db
import common.order_mappers as mappers


logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()

lambda_env = os.getenv('LAMBDA_ENV', 'prod')
db_config = db.get_dynamodb_config()
db_client = db.dynamodb_client(env=lambda_env, logger=logger)


def handler(event, context):
    order_id = urllib.parse.unquote(event['pathParameters']['orderId'])

    if order_id:
        logger.info("Query for order with partition key = %s", order_id)
        response = db_client.get_item(
            TableName=db_config['table_name'],
            Key={
                'PK': {'S': order_id },
                'SK': {'S': order_id }
            }
        )

        if 'Item' not in response:
            logger.warning("Order '%s' not found!", order_id)
            return {
                'statusCode': 404,
                'body': json.dumps({ 'message': 'Order not found' })
            }

        if (response['Item']['Status']['S'] != mappers.OrderStatus.CONFIRMED.value):
            return {
                'statusCode': 400,
                'body': json.dumps({ 'message': 'Order need to be processed before delivery' })
            }
        
        order = response['Item']
        order['Status'] = { 'S': mappers.OrderStatus.DELIVERED.value }
        order['UpdatedAt'] = { 'S': str(datetime.utcnow()) }

        write_actions = [
            {
                "Put": {
                    "Item": order,
                    "TableName": db_config['table_name']
                }
            },
            {
                "Put": {
                    "Item": {
                        "PK": { "S": order_id },
                        "SK": { "S": f"i#{uuid.uuid4()}" },
                        "EntityType": { "S": "orderinvoice" },
                        "Customer": { "S": order['Customer']['S'] },
                        "InvoiceDate": { "S": str(datetime.utcnow()) },
                        "Amount": { "S": order['Total']['S'] },
                        "IsPaid": { "BOOL": True },
                        "PaymentMethod": { "S": "COD" },
                    },
                    "TableName": db_config['table_name']
                }
            }
        ]
        db_client.transact_write_items(
            ReturnConsumedCapacity='TOTAL',
            TransactItems=write_actions
        );
        logger.info("Order delivered with invoice created : %s", order_id);
    
        return {
            'statusCode': 201,
            'body': json.dumps({ 'message': 'Order delivered, invoice created.' })
        }
            
    return {
        'statusCode': 422,
        'body': json.dumps({ 'message': 'Invalid request data' })
    }

    
