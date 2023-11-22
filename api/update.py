import json
import boto3
import os

def handler(event, context):
    print('request: {}'.format(json.dumps(event)))
    client = boto3.client('dynamodb')
    table = os.getenv('DDB_TABLE_NAME', 'undefined')
    key = event['key']
    value = event['value']
    response = response = client.put_item(
        Item={
            'Key': {
                'S': key,
            },
            'Value': {
                'S': value,
            },
        },
        TableName=table,
    )
    return json.dumps(response)