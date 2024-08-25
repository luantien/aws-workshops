from enum import Enum


class OrderStatus(Enum):
    CREATED = 'CREATED'
    CONFIRMED = 'CONFIRMED'
    CANCELLED = 'CANCELLED'
    DELIVERED = 'DELIVERED'

def map_order_detail(items):
    result = {
        'items': [],
    };

    for item in items:
        if item['EntityType']['S'] == 'order':
            result['id'] = item['PK']['S']
            result['status'] = item['Status']['S']
            result['customer'] = item['Customer']['S']
            result['total'] = float(item['Total']['S'])
            result['createdAt'] = item['CreatedAt']['S']
            result['updatedAt'] = item['UpdatedAt']['S']
            result['note'] = item['Note']['S'] if 'Note' in item else ''
        elif item['EntityType']['S'] == 'orderitem':
            result['items'].append({
                'bookId': item['SK']['S'],
                'quantity': int(item['Quantity']['N']),
                'price': float(item['Price']['S']),
            })
        elif item['EntityType']['S'] == 'orderinvoice':
            result['invoice'] = {
                'id': item['SK']['S'],
                'invoiceDate': item['InvoiceDate']['S'],
                'amount': float(item['Amount']['S']),
                'isPaid': bool(item['IsPaid']['BOOL']),
                'paymentMethod': item['PaymentMethod']['S'],
            }
    return result

def map_order_dynamodb_stream_event(record):
    enriched_event = {
        'meta': {
            'eventID': record['eventID'],
            "eventName": f"ORDER_{'CREATED' if record['eventName'] == 'INSERT' else record['eventName']}",
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
    return enriched_event
