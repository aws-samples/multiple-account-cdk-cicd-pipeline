import json
import boto3
import os

def handler(event, context):
    print('request: {}'.format(json.dumps(event)))
    client = boto3.client('dynamodb')
    table = os.getenv('DDB_TABLE_NAME', 'undefined')
    key = event['key']
    response = client.get_item(
        Key={
            'Key': {
                'S': key,
            },
        },
        TableName=table,
    )
    return json.dumps(response)