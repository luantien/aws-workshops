import os
import boto3


def dynamodb_client(env='prod', region_name='ap-southeast-1', logger=None, endpoint_url=None):
    '''
        Returns a DynamoDB client based on the environment
    '''
    client = None
    if env == 'prod':
        logger.info('Using dynamodb in region: %s\n', region_name)
        client = boto3.client('dynamodb', region_name)
    else:
        logger.info("Using dynamodb local: %s\n", endpoint_url)
        client = boto3.client('dynamodb', endpoint_url)

    return client

def get_dynamodb_config():

    return {
        'region_name': os.getenv('AWS_REGION', 'ap-southeast-1'),
        'endpoint_url': os.getenv('DYNAMODB_ENDPOINT', None),
        'table_name': os.getenv('DYNAMODB_TABLE', None),
    }
