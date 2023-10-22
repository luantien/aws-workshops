import os, logging, json, urllib, sys
from aws_xray_sdk.core import xray_recorder, patch_all
import common.dynamodb as db
import common.book_mappers as mappers


logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()

lambda_env = os.getenv('LAMBDA_ENV', 'prod')
db_config = db.get_dynamodb_config()
db_client = db.dynamodb_client(env=lambda_env, logger=logger)


def handler(event, context):
    book_id = urllib.parse.unquote(event['pathParameters']['bookId'])

    if book_id:
        logger.info("Query for book with partition key = %s", book_id)
        response = db_client.get_item(
            TableName=db_config['table_name'],
            Key={
                'PK': {'S': book_id},
                'SK': {'S': book_id}
            }
        )
        logger.info("DynamoDB Response: %s", response)
        if 'Item' in response:
            return {
                'statusCode': 200,
                'body': json.dumps(mappers.mapBookDetail(response['Item']))
            }
    
    return {
        'statusCode': 404,
        'body': 'Book not found'
    }
