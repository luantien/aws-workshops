def mapBookListItem(item):
    return {
        'id': item['PK']['S'],
        'title': item["Title"]['S'],
        'author': item["Author"]['S'],
        'publishedData': item["PublishedDate"]['S'],
    }

def mapBookDetail(item):
    return {
        'id': item['PK']['S'],
        'title': item["Title"]['S'],
        'author': item["Author"]['S'],
        'publishedData': item["PublishedDate"]['S'],
    }

def mapBookReview(item):
    return {
        'id': item['SK']['S'],
        'bookId': item['PK']['S'],
        'reviewer': item['Reviewer']['S'],
        'message': item['Message']['S'],
        'rating': item['Sentiment']['S'] if 'Sentiment' in item else 'N/A',
    }