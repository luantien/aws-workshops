import boto3, logging
from aws_xray_sdk.core import xray_recorder, patch_all
from common.error_handler import error_handler

logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()


@error_handler
def handler(event, context):
    logger.info('Received event: %s', event)

    response = boto3.client('comprehend').detect_sentiment(
        Text=event['message'],
        LanguageCode='en')

    logger.info('Retrieved sentiment: %s', response)

    return response
