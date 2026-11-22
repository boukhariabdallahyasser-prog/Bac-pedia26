/* CI-only visual smoke check. Renders public & login pages in Chromium and
   rejects 390px horizontal overflow, inaccessible major content or broken public catalog.
   Does not require any account and does not ship the temporary audit document. */
import {writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const file='dist/__bac_visual_audit.html';
const html=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CI visual audit</title><style>body{margin:0}iframe{width:100vw;height:100vh;border:0;display:block}</style>
</head><body><iframe id="target" title="Page under test"></iframe><output id="status" data-result="pending"></output>
<script>
const type=new URLSearchParams(location.search).get('target')==='login'?'login':'landing';
const frame=document.getElementById('target');
const output=document.getElementById('status');
frame.src=type==='login'?'/login/':'/';
let completed=false;
function finish(result,stats){
 if(completed)return;
 completed=true;
 output.dataset.result=result?'pass':'fail';
 output.dataset.stats=JSON.stringify(stats);
 output.textContent=JSON.stringify(stats);
}
const timer=setInterval(()=>{
 if(completed){clearInterval(timer);return}
 const d=frame.contentDocument,w=frame.contentWindow;
 if(!d||!w||!d.body)return;
 const doc=d.documentElement;
 const ready=type==='landing'?
   (d.querySelectorAll('#publicBranchGrid [data-public-branch]').length===6 &&
    d.querySelectorAll('#publicExplorerDetail .public-subject-card').length>0):
   !!d.querySelector('#loginEmailInput');
 if(!ready)return;
 const main=type==='landing'?d.querySelector('#lpHeroTitle'):d.querySelector('.login-card');
 const rect=main?.getBoundingClientRect();
 const stats={type,width:w.innerWidth,documentWidth:doc.scrollWidth,
  mainWidth:rect?.width||0,mainHeight:rect?.height||0,
  publicBranches:d.querySelectorAll('#publicBranchGrid [data-public-branch]').length,
  subjectCards:d.querySelectorAll('#publicExplorerDetail .public-subject-card').length,
  scrollable:d.documentElement.scrollHeight>d.documentElement.clientHeight};
 finish(doc.scrollWidth<=w.innerWidth+3&&rect?.width>40&&rect?.height>20,stats);
 clearInterval(timer);
},250);
setTimeout(()=>finish(false,{type,reason:'timed out before interactive content loaded'}),9000);
</script></body></html>\`;
writeFileSync(file,html,'utf8');
const browser=process.env.CHROME_BIN||'google-chrome';
try{
 for(const width of [390,1440]){
  for(const type of ['landing','login']){
   const url='http://127.0.0.1:4173/__bac_visual_audit.html?target='+type;
   const out=spawnSync(browser,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
      '--disable-background-networking','--window-size='+width+',900',
      '--virtual-time-budget=11500','--dump-dom',url],{
      encoding:'utf8',timeout:30000,maxBuffer:14*1024*1024
   });
   assert.equal(out.status,0,'Chrome failed for '+type+' '+width+': '+out.stderr.slice(-900));
   const match=out.stdout.match(/<output[^>]*data-result="([^"]+)"[^>]*>/);
   assert.ok(match,'Audit output absent for '+type+' '+width);
   assert.equal(match[1],'pass','Layout audit failed for '+type+' '+width+': '+out.stdout.slice(out.stdout.indexOf('<output'),out.stdout.indexOf('</output>')+9));
   console.log('Visual audit passed',type,width);
  }
 }
}finally{if(existsSync(file))unlinkSync(file)}
