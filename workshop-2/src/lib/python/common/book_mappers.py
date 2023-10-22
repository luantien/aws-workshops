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