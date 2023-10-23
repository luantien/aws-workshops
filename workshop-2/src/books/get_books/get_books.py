import os, logging, json
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
    query_params = event['queryStringParameters']
    logger.info('Query params: %s', query_params)

    if query_params:
        # Query for books by filter and value
        logger.info('Query for books by filter %s', query_params['filter'])
        data = db_client.query(
            TableName=db_config['table_name'],
            IndexName=query_params['filter'] + 'Index',
            KeyConditions = {
                query_params['filter']: {
                    'AttributeValueList': [{ 'S': query_params['value'] }],
                    'ComparisonOperator': 'EQ'
                },
            },
            QueryFilter={
                'EntityType': {
                    'AttributeValueList': [{ 'S': 'book' }],
                    'ComparisonOperator': 'EQ'
                },
            }
        )
    else:
        logger.info('Scanning table for top latest books')
        data = db_client.scan(
            TableName=db_config['table_name'],
            Limit=10,
            ScanFilter={
                'EntityType': {
                    'AttributeValueList': [{ 'S': 'book' }],
                    'ComparisonOperator': 'EQ'
                }
            }
        )
    
    return {
        'statusCode': 200,
        'body': json.dumps([*map(mappers.mapBookListItem, data['Items'])])
    }
