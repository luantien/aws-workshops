def error_handler(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            return {
                'statusCode': 400,
                'body': str(e)
            }
    return wrapper
