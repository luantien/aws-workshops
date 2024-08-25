import logging
from aws_xray_sdk.core import xray_recorder, patch_all
import common.order_mappers as mappers

logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()


def handler(event, context):
    logger.info("Retrieved lambda event: %s", event)
    result = []

    # Event sent as a list of records
    for record in event:
        logger.info("Processing record: %s", record)
        
        enriched_event = mappers.map_order_dynamodb_stream_event(record)
        
        logger.info("Enriched record: %s", enriched_event)
        
        result.append(enriched_event)

    return result
