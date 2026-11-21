import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {join, resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pageResponse, sitemapResponse, robotsResponse} from '../server/site.js';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const dist=resolve(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/shop')&&!extname(url.pathname)&&!url.pathname.startsWith('/shop/assets/')){
      const result=await pageResponse({path:url.pathname.slice('/shop'.length),query:url.searchParams.get('q')||''});
      res.writeHead(result.status,result.headers);return res.end(result.body);
    }
    if(['/robots.txt','/sitemap.xml'].includes(url.pathname)){
      const result=await (url.pathname==='/robots.txt'?robotsResponse():sitemapResponse());
      res.writeHead(result.status,result.headers);return res.end(result.body);
    }
    let path=resolve(dist,'.'+decodeURIComponent(url.pathname));
    if(path!==dist&&!path.startsWith(dist+String.fromCharCode(92))&&!path.startsWith(dist+'/')){res.writeHead(400);return res.end();}
    try{if((await stat(path)).isDirectory())path=join(path,'index.html');}catch{}
    try{const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(body);}
    catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(join(dist,'404.html')));}
  }catch(error){console.error(error.message);res.writeHead(500);res.end('Preview unavailable');}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('SEO preview: http://127.0.0.1:'+(process.env.PORT||4173)));
