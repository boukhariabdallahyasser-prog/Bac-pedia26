/* Read-only manifest audit; never edits resources or marks URLs as HTTP-broken without checking. */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(resolve(root,'resources.json'),'utf8'));
const reports={scanned:0,invalidUrls:[],duplicateIds:[],duplicateUrls:[],duplicateTitles:[],notCheckedOnline:true};
const ids=new Map(),urls=new Map(),titles=new Map();
function record(map,key,path,dest){
 if(!key)return;
 const prior=map.get(key);
 if(prior&&prior!==path)dest.push({first:prior,again:path});
 else map.set(key,path);
}
function visit(node,path,depth=0){
 if(!node||typeof node!=='object'||depth>12)return;
 const title=String(node.title||node.name||'').trim();
 if(title&&typeof node.url==='string'){
  reports.scanned++;
  let valid=false,normalized='';
  try{
   const u=new URL(node.url);
   valid=u.protocol==='https:'&&!!u.hostname&&(!u.username&&!u.password);
   normalized=u.origin+u.pathname.replace(/\/$/,'');
  }catch{}
  if(!valid)reports.invalidUrls.push({path,url:node.url.slice(0,250)});
  else record(urls,normalized,path,reports.duplicateUrls);
  record(ids,String(node.id||''),path,reports.duplicateIds);
  record(titles,path.split('/').slice(0,-1).join('/')+'::'+title.toLowerCase(),path,reports.duplicateTitles);
 }
 for(const field of ['categories','items','children','files','folders']){
  if(Array.isArray(node[field]))node[field].forEach((child,i)=>visit(child,path+'/'+field+'/'+i,depth+1));
 }
}
for(const [key,node] of Object.entries(manifest.subjects||{}))visit(node,'subjects/'+key);
console.log(JSON.stringify(reports,null,2));
if(reports.invalidUrls.length){console.error('Invalid URLs detected');process.exitCode=1;}
