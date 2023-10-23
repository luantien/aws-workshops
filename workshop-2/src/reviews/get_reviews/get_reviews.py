import os, logging, json, urllib
from aws_xray_sdk.core import xray_recorder, patch_all

import common.dynamodb as db
import common.book_mappers as mappers
from common.error_handler import error_handler


logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()

lambda_env = os.getenv('LAMBDA_ENV', 'prod')
db_config = db.get_dynamodb_config()
db_client = db.dynamodb_client(env=lambda_env, logger=logger)

@error_handler
def handler(event, context):
    book_id = urllib.parse.unquote(event['pathParameters']['bookId'])

    if book_id:
        logger.info("Query for reviews of book with id = %s", book_id)
        response = db_client.query(
            TableName=db_config['table_name'],
            KeyConditions = {
                'PK': {
                    'AttributeValueList': [{ 'S': book_id }],
                    'ComparisonOperator': 'EQ'
                },
            },
            QueryFilter={
                'EntityType': {
                    'AttributeValueList': [{ 'S': 'review' }],
                    'ComparisonOperator': 'EQ'
                }
            }
        )
        return {
            'statusCode': 200,
            'body': json.dumps([*map(mappers.mapBookReview, response['Items'])]),
        }
    
    return {
        'statusCode': 400,
        'body': 'Invalid book information received',
    }
