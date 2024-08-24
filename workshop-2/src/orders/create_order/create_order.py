from datetime import datetime, timezone
import os, logging, json
from aws_xray_sdk.core import xray_recorder, patch_all
import common.dynamodb as db
from common.order_mappers import OrderStatus


logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()
lambda_env = os.getenv('LAMBDA_ENV', 'prod')
db_config = db.get_dynamodb_config()
db_client = db.dynamodb_client(env=lambda_env, logger=logger)


def handler(event, context):
    # Verify that the request token is not used
    token_id = event['headers']['Idempotency-Token'];
    logger.info("Verifing request token: %s", token_id);
    if not token_id:
        return {
            'statusCode': 400,
            'body': { 'message': 'Idempotency-Token header is required' }
        }
    
    order_id = f"o#{token_id}";
    item = db_client.get_item(
        TableName=db_config['table_name'],
        Key={
            'PK': {'S': order_id },
            'SK': {'S': order_id }
        }
    );
    if 'Item' in item:
        order = item['Item'];
        if order['Request']['S'] == event['body']:
            logger.info("Order already created: %s", order['PK']['S']);
            return {
                'statusCode': 201,
                "body": json.dumps({
                    "orderId": order['PK']['S'], 
                    "status": order['Status']['S'] 
                })
            }
        else:
            logger.warning("Request token already used: %s", token_id);
            return {
                'statusCode': 400,
                'body': json.dumps({ "message": "Token already used" })
            }

    
    data = json.loads(event['body']);
    
    # Verify that the total amount matches the sum of the items
    order_total = sum([item['price'] * item['quantity'] for item in data['items']]);
    if order_total != data['total']:
        logger.warning("Total amount does not match: %s != %s", order_total, data['total']);
        return {
            'statusCode': 400,
            'body': json.dumps({ "message": "Total amount does not match" })
        }
    
    # Create new order in DynamoDB
    write_actions = [
        {
            "Put": {
                "Item": {
                    "PK": { "S": order_id },
                    "SK": { "S": order_id },
                    "EntityType": { "S": "order" },
                    "Request": { "S": event['body'] },
                    "Customer": { "S": event['requestContext']['authorizer']['claims']['sub']},
                    "Status": { "S": OrderStatus.CREATED.value },
                    "TraceId": { "S": event['headers']['X-Amzn-Trace-Id'] },
                    "CreatedAt": { "S": str(datetime.now(timezone.utc)) },
                    "UpdatedAt": { "S": str(datetime.now(timezone.utc)) },
                    "Total": { "S": str(data['total']) },
                },
                "TableName": db_config['table_name'],
            }
        }
    ];
    for item in data['items']:
        write_actions.append({
            "Put": {
                "Item": {
                    "PK": { "S": order_id },
                    "SK": { "S": item['bookId'] },
                    "EntityType": { "S": "orderitem" },
                    "Price": { "S": str(item['price']) },
                    "Quantity": { "N": str(item['quantity']) },
                },
                "TableName": db_config['table_name'],
            }
        });

    db_client.transact_write_items(
        ClientRequestToken=token_id,
        ReturnConsumedCapacity='TOTAL',
        TransactItems=write_actions
    );
    logger.info("Created new order: %s", token_id);

    return {
        "statusCode": 201,
        "body": json.dumps({
            "orderId": order_id, 
            "status": OrderStatus.CREATED.value
        })
    }

