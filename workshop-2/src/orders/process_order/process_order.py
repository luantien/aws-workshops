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
    return {
        'statusCode': 200,
        'body': { 'message': 'Hello from process_order' }
    }