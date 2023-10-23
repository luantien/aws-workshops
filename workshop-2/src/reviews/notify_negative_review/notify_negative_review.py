import boto3, logging, os
from aws_xray_sdk.core import xray_recorder, patch_all
from common.error_handler import error_handler

email_from = os.getenv('SNS_EMAIL_FROM')
email_to = os.getenv('SNS_EMAIL_TO')

logger = logging.getLogger()
logger.setLevel(logging.INFO)
patch_all()

@error_handler
def handler(event, context):
    logger.info('Received event: %s', event)

    content = 'Sentiment analysis: {sentiment} review from user({reviewer}): "{message}".'
    result = content.format(
        sentiment=event['sentimentResult']['Payload']['Sentiment'],
        reviewer=event['reviewer'],
        message=event['message']
    )

    if email_from == '' or email_to == '':
        logger.error('No email address configured.')
        return {
            'statusCode': 400,
            'body': 'Cannot sent notification email, there may be a missing configuration.'
        }

    response = boto3.client('sesv2').send_email(
        FromEmailAddress=email_from,
        Destination={
            'ToAddresses': [email_to]},
        Content={
            'Simple': {
                'Subject': {
                    'Data': 'Review analysis result',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': result,
                        'Charset': 'UTF-8',
                    }
                },
            }
        }
    )
    logger.info('Email response: %s', response)
    return {
        'statusCode': 200,
        'body': 'Notification email sent.'
    }
