import os, logging, json, urllib
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
        response = db_client.query(
            TableName=db_config['table_name'],
            KeyConditions={
                'PK': {
                    'AttributeValueList': [{'S': order_id}],
                    'ComparisonOperator': 'EQ'
                }
            },
            QueryFilter={
                'EntityType': {
                    'AttributeValueList': [
                        {'S': 'order'}, {'S': 'orderitem'}, {'S': 'orderinvoice'}
                    ],
                    'ComparisonOperator': 'IN'
                },
            },
        )
        logger.info("DynamoDB Response: %s", response)
        
        if 'Items' in response:
            return {
                'statusCode': 200,
                'body': json.dumps(mappers.mapOrderDetail(response['Items']))
            }
        
    return {
        'statusCode': 404,
        'body': json.dumps({ 'message': 'Order not found' })
    }
