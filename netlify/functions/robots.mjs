import { robotsResponse } from '../../server/site.js';
export async function handler(event) {
  const result = await robotsResponse();
  return {statusCode:result.status,headers:result.headers,body:result.body};
}
