from datetime import datetime
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
    logger.info("Processing event: %s", event)
    for record in event['Records']:
        event_data = json.loads(record['body'])['detail']

        response = db_client.query(
            TableName=db_config['table_name'],
            KeyConditions={
                'PK': {
                    'AttributeValueList': [{'S': event_data['content']['id']}],
                    'ComparisonOperator': 'EQ'
                }
            },
            QueryFilter={
                'EntityType': {
                    'AttributeValueList': [{'S': 'order'}, {'S': 'orderitem'}],
                    'ComparisonOperator': 'IN'
                },

            },
        )

        if 'Items' not in response:
            logger.info("Order '%s' not found!", event_data['content']['id'])
            return {
                'statusCode': 200,
                'body': json.dumps({ 'message': 'Order not found' })
            }

        order = None
        total = 0
        order_verified = False
        for item in response['Items']:
            if item['EntityType']['S'] == 'orderitem':
                total += float(item['Price']['S']) * int(item['Quantity']['N'])
            if item['EntityType']['S'] == 'order':
                order = item

        if total == float(event_data['content']['total']):
            order_verified = True
            logger.info("Order '%s' total amount verified!", item['PK']['S'])

        if order['Status']['S'] != OrderStatus.CREATED.value:
            logger.info("Order '%s' already processed!", event_data['content']['id'])
            return {
                'statusCode': 200,
                'body': json.dumps({ 'message': 'Order already processed' })
            }
        
        order['Status']['S'] = OrderStatus.CONFIRMED.value if order_verified else OrderStatus.CANCELLED.value
        order['UpdatedAt']['S'] = datetime.utcnow().isoformat()
        order['Note'] = {'S' : 'Order amount verified' } if order_verified else {'S' : 'Invalid order amount' }

        db_client.put_item(
            TableName=db_config['table_name'],
            Item=order
        )
        logger.info("Order '%s' updated as: %s", event_data['content']['id'], order['Status']['S'])

    return {
        'statusCode': 200,
        'body': json.dumps({ 'message': 'Order processed' })
    }
