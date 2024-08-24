import logging, json
from aws_xray_sdk.core import xray_recorder, patch_all


logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()


def handler(event, context):
    logger.info("Processing event: %s", event)
    for rec in event['Records']:
        logger.info("Processing record: %s", rec)
