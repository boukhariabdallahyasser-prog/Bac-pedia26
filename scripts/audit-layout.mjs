/* CI-only visual smoke check. Renders the minimal public home, guided library,
   and login pages in Chromium. Rejects 390px overflow or missing primary content. */
import {writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const file='dist/__bac_visual_audit.html';
const html=[
'<!doctype html><html lang="en"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>CI visual audit</title><style>body{margin:0}iframe{width:100vw;height:100vh;border:0;display:block}</style>',
'</head><body><iframe id="target" title="Page under test"></iframe><output id="status" data-result="pending"></output>',
'<script>',
"const requested=new URLSearchParams(location.search).get('target');",
"const type=['login','library'].includes(requested)?requested:'landing';",
"const frame=document.getElementById('target');",
"const output=document.getElementById('status');",
"frame.src=type==='login'?'/login/':type==='library'?'/library/':'/';",
'let completed=false;',
'function finish(result,stats){if(completed)return;completed=true;output.dataset.result=result?"pass":"fail";output.dataset.stats=JSON.stringify(stats);output.textContent=JSON.stringify(stats);}',
'const timer=setInterval(()=>{',
' if(completed){clearInterval(timer);return}',
' const d=frame.contentDocument,w=frame.contentWindow;if(!d||!w||!d.body)return;',
' const doc=d.documentElement;',
" const ready=type==='landing'?(!!d.querySelector('#lpHeroTitle')&&!d.querySelector('#publicBranchGrid')&&!!d.querySelector('.lp-hero-actions a[href=\"/library/\"]')):type==='library'?(d.querySelectorAll('#publicBranchGrid [data-public-branch]').length===6&&d.querySelectorAll('#publicExplorerDetail .public-subject-card').length>0):!!d.querySelector('#loginEmailInput');",
" if(!ready)return;const main=type==='landing'?d.querySelector('#lpHeroTitle'):type==='library'?d.querySelector('#publicExploreTitle'):d.querySelector('.login-card');",
' const rect=main?.getBoundingClientRect();',
" const stats={type,width:w.innerWidth,documentWidth:doc.scrollWidth,mainWidth:rect?.width||0,mainHeight:rect?.height||0,publicBranches:d.querySelectorAll('#publicBranchGrid [data-public-branch]').length,subjectCards:d.querySelectorAll('#publicExplorerDetail .public-subject-card').length,scrollable:doc.scrollHeight>doc.clientHeight};",
' finish(doc.scrollWidth<=w.innerWidth+3&&rect?.width>40&&rect?.height>20,stats);clearInterval(timer);',
'},250);',
"setTimeout(()=>{const d=frame.contentDocument,w=frame.contentWindow;finish(false,{type,reason:'timed out before primary content loaded',portal:d?.body?.dataset?.portal,branchCards:d?.querySelectorAll('#publicBranchGrid [data-public-branch]').length,subjectCards:d?.querySelectorAll('#publicExplorerDetail .public-subject-card').length,detailText:d?.querySelector('#publicExplorerDetail')?.textContent?.slice(0,180),hasModel:!!w?.BacEducation,hasTaxonomy:!!w?.BacSubjectCatalog,explorer:typeof w?.BacPublicExplorer,readyState:d?.readyState,scripts:[...(d?.scripts||[])].map(x=>x.src).filter(Boolean)});},12000);",
'</script></body></html>'
].join('');
writeFileSync(file,html,'utf8');
const browser=process.env.CHROME_BIN||'google-chrome';
try{
 for(const width of [390,1440]){
  for(const type of ['landing','library','login']){
   const url='http://127.0.0.1:4173/__bac_visual_audit.html?target='+type;
   const out=spawnSync(browser,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
      '--disable-background-networking','--window-size='+width+',900',
      '--virtual-time-budget=14500','--dump-dom',url],{
      encoding:'utf8',timeout:35000,maxBuffer:14*1024*1024
   });
   assert.equal(out.status,0,'Chrome failed for '+type+' '+width+': '+out.stderr.slice(-900));
   const match=out.stdout.match(/<output[^>]*data-result="([^"]+)"[^>]*>/);
   assert.ok(match,'Audit output absent for '+type+' '+width);
   assert.equal(match[1],'pass','Layout audit failed for '+type+' '+width+': '+out.stdout.slice(out.stdout.indexOf('<output'),out.stdout.indexOf('</output>')+9));
   console.log('Visual audit passed',type,width);
  }
 }
}finally{if(existsSync(file))unlinkSync(file)}
