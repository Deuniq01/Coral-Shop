import { sitemapResponse } from '../../server/site.js';
export async function handler(event) {
  const result = await sitemapResponse();
  return {statusCode:result.status,headers:result.headers,body:result.body};
}
