import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';

const root=fileURLToPath(new URL('../',import.meta.url));
const chrome=process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
await access(chrome);
const freePort=()=>new Promise(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const port=await freePort(),debugPort=await freePort();
const origin='http://127.0.0.1:'+port;
const out=join(root,'test-results');
await mkdir(out,{recursive:true});
const preview=spawn(process.execPath,[join(root,'scripts/seo-preview.mjs')],{cwd:root,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
preview.stdout.on('data',data=>process.stdout.write(data));preview.stderr.on('data',data=>process.stderr.write(data));
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-renderer-backgrounding','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--remote-debugging-port='+debugPort,'--user-data-dir='+join(out,'chrome-profile-'+debugPort),'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){
  const start=Date.now();
  while(Date.now()-start<30000){try{const result=await fn();if(result)return result;}catch{}await sleep(200);}
  throw new Error('Timed out: '+label);
}
let socket;
try{
  await until(async()=>{const response=await fetch(origin+'/shop/products/s1',{signal:AbortSignal.timeout(3000)});return response.ok;},'preview');
  const raw=await (await fetch(origin+'/shop/products/s1')).text();
  assert.match(raw,/<title>Premium Basmati Rice \(50kg\) \| Coral Shopping<\/title>/);
  assert.match(raw,/<h1>Premium Basmati Rice \(50kg\)<\/h1>/);
  assert.match(await(await fetch(origin+'/sitemap.xml')).text(),/\/shop\/products\/s8/);
  console.log('Preview HTTP and server metadata ready');
  const page=await until(async()=>{const response=await fetch('http://127.0.0.1:'+debugPort+'/json/new?about:blank',{method:'PUT',signal:AbortSignal.timeout(3000)});return response.json();},'Chrome');
  console.log('Chrome HTTP ready');
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('WebSocket connection timeout')),10000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});socket.addEventListener('error',reject,{once:true});});
  console.log('Chrome debugging connected');
  let id=0;const pending=new Map(),exceptions=[];
  socket.addEventListener('message',event=>{
    const data=JSON.parse(event.data);
    if(data.id){const task=pending.get(data.id);pending.delete(data.id);if(data.error)task.reject(new Error(data.error.message));else task.resolve(data.result);}
    if(data.method==='Runtime.exceptionThrown')exceptions.push(data.params.exceptionDetails.text);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;const timer=setTimeout(()=>reject(Error('Chrome command timeout: '+method)),15000);pending.set(requestId,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});socket.send(JSON.stringify({id:requestId,method,params}));});
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
    if(result.exceptionDetails)throw Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Runtime.enable');await send('Page.enable');console.log('Chrome ready for navigation');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:origin+'/shop/products/s1'});
  await until(()=>evaluate("document.querySelector('.product-detail-info h1')?.textContent==='Premium Basmati Rice (50kg)'"),'first product');
  await until(()=>evaluate("document.title==='Premium Basmati Rice (50kg) | Coral Shopping'"),'first product SEO');
  assert.equal(await evaluate("document.querySelector('link[rel=canonical]').href"),'https://coral-shopping-phi.vercel.app/shop/products/s1');
  assert.equal(await evaluate("document.querySelectorAll('.share-product-button').length"),1);console.log('First product and metadata ready');
  await evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__sharedProduct=data;}});document.querySelector('.share-product-button').click()");
  await until(()=>evaluate("document.querySelector('.share-status').textContent==='Shared'"),'native share');
  const shared=await evaluate('window.__sharedProduct');
  assert.equal(shared.url,origin+'/shop/products/s1');
  assert.match(shared.text,/Premium Basmati Rice.*85,000/);
  await evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async url=>{window.__copiedProduct=url}}});document.querySelector('.share-product-button').click()");
  await until(()=>evaluate("document.querySelector('.share-status').textContent==='Link copied'"),'copy fallback');
  assert.equal(await evaluate('window.__copiedProduct'),origin+'/shop/products/s1');
  console.log('Native share and copy checks passed');
  await writeFile(join(out,'product-share-desktop.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  await evaluate("document.querySelector('.back-link').click()");
  await until(()=>evaluate("document.querySelectorAll('.product.card').length===8"),'catalog navigation');
  assert.equal(await evaluate("document.querySelectorAll('.share-product-button').length"),8);
  await evaluate("document.querySelector('.product-media-link[href=\"/shop/products/s2\"]').click()");
  await until(()=>evaluate("document.querySelector('.product-detail-info h1')?.textContent==='Brown Beans (10kg)'"),'second product');
  await until(()=>evaluate("document.title==='Brown Beans (10kg) | Coral Shopping'"),'second product SEO');
  const head=await evaluate("({canonical:document.querySelector('link[rel=canonical]').href,description:document.querySelector('meta[name=description]').content,count:document.querySelectorAll('meta[property=\"og:title\"]').length})");
  assert.equal(head.canonical,'https://coral-shopping-phi.vercel.app/shop/products/s2');assert.match(head.description,/12,000/);assert.equal(head.count,1);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await until(()=>evaluate("document.querySelector('.shop-sidebar').getBoundingClientRect().right<=1 && document.querySelector('.main-col').getBoundingClientRect().left<=1"),'mobile layout transition');
  assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'mobile layout overflows');
  await evaluate("document.querySelector('.share-product-button').scrollIntoView({block:'center'})");
  await sleep(350);
  await writeFile(join(out,'product-share-mobile.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  console.log('Desktop and mobile screenshots saved');
  await send('Page.navigate',{url:origin+'/'});
  await until(()=>evaluate("document.querySelector('main')&&document.querySelectorAll('h1').length===1"),'marketing homepage');
  assert.equal(await evaluate("document.querySelector('link[rel=canonical]').href"),'https://coral-shopping-phi.vercel.app/');
  const forms=await evaluate("document.querySelectorAll('a button').length");assert.equal(forms,0);
  assert.deepEqual(exceptions,[]);
  console.log('Browser checks passed: native share, copy fallback, catalog buttons, client navigation metadata, desktop and mobile layout, homepage structure.');
}finally{
  socket?.close();browser.kill();preview.kill();
}
