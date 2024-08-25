import os, logging, boto3, json
from aws_xray_sdk.core import xray_recorder, patch_all
import common.order_mappers as mappers

logger = logging.getLogger()
logger.setLevel(logging.INFO)
# apply the XRay handler to all clients.
patch_all()

events_client = boto3.client('events')
event_bus_arn = os.getenv('EVENT_BUS_ARN')

def handler(event, context):
    logger.info("Retrieved lambda event: %s", event)
    entry_list = []

    for rec in event['Records']:
        logger.info("Processing record: %s", rec)
        
        event_entry = {
            'Source': 'service.order.dynamodb.stream',
            'DetailType': 'OrderChanged',
            'EventBusName': event_bus_arn,
            'Detail': json.dumps(mappers.map_order_dynamodb_stream_event(rec)),
        };
        
        logger.info("Enriched record: %s", event_entry)
        
        entry_list.append(event_entry)
    
    # Min 1 entry, max 10 entries
    response = events_client.put_events(Entries=entry_list)
    
    return response
