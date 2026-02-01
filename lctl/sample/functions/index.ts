import axios from 'axios';
import _ from 'lodash';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// Load config (will be included in ZIP as additional file)
import config from './config.json';

interface ResponseBody {
  message: string;
  timestamp: string;
  requestId: string;
  config: typeof config;
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Example: using axios
    const response = await axios.get('https://httpbin.org/get', {
      timeout: config.timeout,
    });

    // Example: using lodash
    const data = _.pick(response.data, ['origin', 'url']);

    const body: ResponseBody = {
      message: 'Hello from TypeScript Lambda!',
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId,
      config,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, httpbinData: data }),
    };
  } catch (error) {
    console.error('Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
