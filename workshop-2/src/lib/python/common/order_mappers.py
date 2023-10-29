from enum import Enum


class OrderStatus(Enum):
    CREATED = 'CREATED'
    CONFIRMED = 'CONFIRMED'
    CANCELLED = 'CANCELLED'
    DELIVERED = 'DELIVERED'

def mapOrderDetail(items):
    result = {
        'items': [],
    };

    for item in items:
        if item['EntityType']['S'] == 'order':
            result['id'] = item['PK']['S']
            result['status'] = item['Status']['S']
            result['customer'] = item['Customer']['S']
            result['total'] = float(item['Total']['S'])
            result['createdDate'] = item['CreatedDate']['S']
            result['updatedDate'] = item['UpdatedDate']['S']
        elif item['EntityType']['S'] == 'orderitem':
            result['items'].append({
                'bookId': item['SK']['S'],
                'quantity': int(item['Quantity']['N']),
                'price': float(item['Price']['S']),
            })

    return result
