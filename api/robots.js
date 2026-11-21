import { robotsResponse } from '../server/site.js';
export default async function handler(request, response) {
  const result = await robotsResponse();
  for (const [key,value] of Object.entries(result.headers)) response.setHeader(key,value);
  response.status(result.status).send(result.body);
}
