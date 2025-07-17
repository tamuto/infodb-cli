
def handler(event, context):
    """
    Lambda function handler to process the event and return a response.

    Args:
        event (dict): The event data passed to the Lambda function.
        context (LambdaContext): The context object providing runtime information.

    Returns:
        dict: A response containing the status code and message.
    """
    # Process the event data
    print("Received event:", event)

    # Return a response
    return {
        'statusCode': 200,
        'body': 'Hello from Lambda!'
    }
