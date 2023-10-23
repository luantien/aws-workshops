import logging, uuid
from aws_xray_sdk.core import xray_recorder, patch_all
from common.error_handler import error_handler


logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()

@error_handler
def handler(event, context):
    logger.info('Received event: %s', event)
    recordId = str(uuid.uuid4())
    logger.info('Generated UUID: {}'.format(recordId))

    return 'r#{}'.format(recordId)
