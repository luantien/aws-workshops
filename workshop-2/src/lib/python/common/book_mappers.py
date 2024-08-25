def map_book_list_item(item):
    return {
        'id': item['PK']['S'],
        'title': item["Title"]['S'],
        'author': item["Author"]['S'],
        'publishedDate': item["PublishedDate"]['S'],
    }

def map_book_detail(item):
    return {
        'id': item['PK']['S'],
        'title': item["Title"]['S'],
        'author': item["Author"]['S'],
        'publishedDate': item["PublishedDate"]['S'],
    }

def map_book_review(item):
    return {
        'id': item['SK']['S'],
        'bookId': item['PK']['S'],
        'reviewer': item['Reviewer']['S'],
        'message': item['Message']['S'],
        'rating': item['Sentiment']['S'] if 'Sentiment' in item else 'N/A',
    }