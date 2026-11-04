import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.resolve(root,process.argv[2]||'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8','.woff2':'font/woff2'};
createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(base,`.${pathname}`);
  if(!file.startsWith(base+path.sep)&&file!==base)throw Error('invalid path');
  let info=await stat(file);
  if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}
  if(!info.isFile())throw Error('not a file');
  const headers={'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','accept-ranges':'bytes'};
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'content-range':`bytes */${info.size}`});res.end();return;}
   if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}
   else start=Math.max(0,info.size-Number(match[2]));
   if(start>end||start>=info.size){res.writeHead(416,{'content-range':`bytes */${info.size}`});res.end();return;}
   status=206;headers['content-range']=`bytes ${start}-${end}/${info.size}`;
  }
  headers['content-length']=Math.max(0,end-start+1);
  res.writeHead(status,headers);
  if(req.method==='HEAD'||!info.size){res.end();return;}
  const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
 }catch{
  try{const body=await readFile(path.join(base,'404.html'));res.writeHead(404,{'content-type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404);res.end('Not found');}
 }
}).listen(Number(process.env.PORT||4173),process.env.HOST || '0.0.0.0',()=>console.log(`Static preview: http://127.0.0.1:${process.env.PORT||4173}`));
