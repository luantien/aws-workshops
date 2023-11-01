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
