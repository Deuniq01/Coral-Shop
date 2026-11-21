import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {landingMetadata} from '../scripts/landing-seo.mjs';
const origin='https://coral-shopping-phi.vercel.app';
for(const filename of ['index.html','privacy.html','terms.html','404.html']){
  test(filename+' has one heading, canonical URL and complete page-specific preview',async()=>{
    const html=await readFile(new URL('../landing/'+filename,import.meta.url),'utf8');
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert.equal((html.match(/<\/h1>/g)||[]).length,1);
    assert.equal((html.match(/<title>/g)||[]).length,1);
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
    for(const tag of ['og:title','og:description','og:url','og:image','og:image:alt','twitter:title','twitter:description','twitter:image'])assert.ok(html.includes(tag),tag);
    assert.match(html,/<head>\s*<meta charset="utf-8">/);
    const canonical=html.match(/rel="canonical" href="([^"]+)"/)[1];
    assert.equal(canonical,origin+(filename==='index.html'?'/':'/'+filename));
    assert.doesNotMatch(html,/coral-shopping.netlify.app|food12.jpg|Example value for/);
    assert.equal(html.includes('noindex, follow'),filename==='404.html');
    for(const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))JSON.parse(match[1]);
    for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
      const value=match[1];
      if(!value||/^(?:https?:|#|mailto:|tel:|\/shop)/.test(value))continue;
      const relative=value.split(/[?#]/)[0].replace(/^\//,'');
      if(relative)await access(new URL('../landing/'+relative,import.meta.url));
    }
    const regenerated=landingMetadata(html,filename,'https://new.example');
    assert.equal((regenerated.match(/rel="canonical"/g)||[]).length,1);
    assert.match(regenerated,/href="https:\/\/new.example/);
  });
}
test('homepage contains a main landmark, valid shop calls to action and no nested interactive buttons',async()=>{
  const html=await readFile(new URL('../landing/index.html',import.meta.url),'utf8');
  assert.equal((html.match(/<main\b/g)||[]).length,1);
  assert.equal((html.match(/id="hero"/g)||[]).length,1);
  assert.doesNotMatch(html,/<a\b[^>]*>\s*<button\b/);
  assert.doesNotMatch(html.slice(html.indexOf('<body>')),/<link\b[^>]*rel="stylesheet"/);
  assert.doesNotMatch(html,/href="https:\/\/coral-shopping-phi.vercel.app\/products/);
});
