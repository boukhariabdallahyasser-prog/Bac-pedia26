/* Optional network check. Read-only; 404/410 alone are marked broken.
   Never sends credentials, and rejects private or unapproved hosts. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(resolve(root,'resources.json'),'utf8'));
const allowed=new Set(['drive.google.com','docs.google.com','www.youtube.com','youtube.com','youtu.be']);
const links=new Set();
function scan(node,depth=0){
 if(!node||typeof node!=='object'||depth>12)return;
 if(typeof node.url==='string'){
  try{const u=new URL(node.url);if(u.protocol==='https:'&&allowed.has(u.hostname))links.add(u.toString())}catch{}
 }
 for(const key of ['categories','items','children','files','folders'])
  if(Array.isArray(node[key]))node[key].forEach(item=>scan(item,depth+1));
}
Object.values(manifest.subjects||{}).forEach(scan);
const max=Math.min(100,Math.max(1,Number(process.env.MAX_LINKS)||30));
const urls=[...links].slice(0,max);
const results=[];let index=0;
async function check(url){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),7000);
 try{
  const res=await fetch(url,{method:'HEAD',redirect:'manual',signal:ac.signal,
   headers:{'User-Agent':'BacPediaLinkAudit/1.0'}});
  const code=res.status;
  return {url,status:code,result:[404,410].includes(code)?'broken':code>=200&&code<400?'responding':'unverified'};
 }catch(error){return {url,status:null,result:'unverified',reason:error.name==='AbortError'?'timeout':'network_error'}}
 finally{clearTimeout(timer)}
}
async function worker(){
 while(index<urls.length){const next=index++;results[next]=await check(urls[next]);}
}
await Promise.all(Array.from({length:Math.min(4,urls.length)},worker));
const stats={totalCatalogLinks:links.size,checked:urls.length,responding:0,broken:0,unverified:0};
for(const row of results)stats[row.result]++;
console.log(JSON.stringify({stats,results},null,2));
console.log('A 403/429 response does not prove that a link is broken. Google Drive sharing must be checked manually.');
