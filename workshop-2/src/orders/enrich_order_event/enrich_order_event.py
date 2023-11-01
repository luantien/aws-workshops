import logging, json
from aws_xray_sdk.core import xray_recorder, patch_all


logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()


def handler(event, context):
    
    result = []
    # Event sent as a list of records
    for record in event:
        logger.info("Enriching event: %s", record)
        enriched_event = {
            'meta': {
                'eventID': record['eventID'],
                "eventName": f"ORDER_{record['eventName']}",
                "eventSource": record['eventSource'],
                "eventSourceARN": record['eventSourceARN'],
                "awsRegion": record['awsRegion'],
            },
            'content': {
                'id': record['dynamodb']['Keys']['PK']['S'],
                'type': record['dynamodb']['NewImage']['EntityType']['S'],
                'status': record['dynamodb']['NewImage']['Status']['S'],
                'total': float(record['dynamodb']['NewImage']['Total']['S']),
            },
        }
        logger.info("Enriched record: %s", enriched_event)
        result.append(enriched_event)

    return result
