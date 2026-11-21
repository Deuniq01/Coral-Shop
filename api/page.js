import { pageResponse } from '../server/site.js';
export default async function handler(request, response) {
  const query = new URL(request.url, 'https://local.invalid').searchParams;
  const result = await pageResponse({path:request.query?.path ?? query.get('path') ?? '',query:request.query?.q ?? query.get('q') ?? ''});
  for (const [key,value] of Object.entries(result.headers)) response.setHeader(key,value);
  response.status(result.status).send(result.body);
}
