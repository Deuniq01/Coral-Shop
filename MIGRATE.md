# Migration & deployment notes

1. Environment variables to set in Netlify site settings

- NETLIFY_DATABASE_URL - the full Postgres connection string for your Neon DB (preferred name)
- NETLIFY_FUNCTIONS_API_KEY - set a secret API key (optional but recommended). If set, functions require a matching x-api-key header.

2. Schema

You can either let the function create the `objects` table automatically on first run, or run `neon_schema.sql` manually using psql or Neon console.

3. Import CSV data (local)

Install dependencies locally and run the importer:

    npm install
    npm run import-db

Make sure `NETLIFY_DATABASE_URL` is set in your environment when running the import script.

4. Deploy

Push to your Git repo and let Netlify deploy. Netlify will install dependencies and deploy functions under `netlify/functions`.

5. Testing

From the browser or terminal, POST to `/.netlify/functions/api` with a JSON body like { action: 'list', resource: 'product', limit: 5 }.
If `NETLIFY_FUNCTIONS_API_KEY` is set, include the header `x-api-key: <your-key>`.
