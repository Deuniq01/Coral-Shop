import { pageResponse } from '../../server/site.js';
export async function handler(event) {
  const result = await pageResponse({path:event.queryStringParameters?.path || '',query:event.queryStringParameters?.q || ''});
  return {statusCode:result.status,headers:result.headers,body:result.body};
}
