// Assemble the marketing site and the React shop under one production origin.
import {cp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {loadEnv} from 'vite';
import {landingMetadata} from './landing-seo.mjs';
import {siteOrigin,pageMetadata,replaceMetadata} from '../src/seo.js';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const landing=join(root,'landing'),dist=join(root,'dist');
const env=loadEnv('production',root,'');
const origin=siteOrigin(env.SITE_URL||env.VITE_SITE_URL);
await cp(landing,dist,{
  recursive:true,force:true,
  filter:src=>{
    const rel=src.slice(landing.length+1).replace(/\\/g,'/');
    return !['vercel.json','package.json','robots.txt','sitemap.xml'].includes(rel)&&!rel.startsWith('scripts/')&&!rel.startsWith('node_modules/')&&!rel.startsWith('.git/')&&!rel.startsWith('.output/');
  }
});
for(const filename of ['index.html','privacy.html','terms.html','404.html']){
  const file=join(dist,filename);
  await writeFile(file,landingMetadata(await readFile(file,'utf8'),filename,origin));
}
const shell=join(dist,'shop/index.html');
await writeFile(shell,replaceMetadata(await readFile(shell,'utf8'),pageMetadata('/shop/',origin)));
// These are the same public credentials already shipped in the browser bundle.
// Do not add service-role keys or any other secret to this deployment artifact.
await writeFile(join(dist,'seo-config.json'),JSON.stringify({origin,supabaseUrl:env.VITE_SUPABASE_URL||'',anonKey:env.VITE_SUPABASE_ANON_KEY||''}));
console.log('Assembled dist/: landing at /, shop at /shop, server-readable page template');
