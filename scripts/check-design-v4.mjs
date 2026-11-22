import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const docs=[
 ['index.html','landing','welcome'],
 ['login/index.html','login','loginGate'],
 ['student/index.html','student','mainContent'],
 ['contributor/index.html','contributor','mainContent'],
 ['admin/index.html','admin','mainContent']
];

const visual=read('assets/design-system-v4.css');
assert.match(visual,/:root\s*\{/);
assert.match(visual,/body\.light-mode\s*\{/);
assert.match(visual,/--bg-main:/);
assert.match(visual,/--text-main:/);
assert.match(visual,/\[hidden\]\s*\{\s*display:\s*none!important/);
assert.match(visual,/\.skip-link:focus-visible/);
assert.match(visual,/prefers-reduced-motion/);
for(const selector of ['.landing','.sidebar','.main','.topbar','.card','.btn','.portal-panel',
 '.subject-ui-header','.lp-simple-preview','.public-branch-card','.public-resource-row','body[data-portal="login"]']){
 assert.ok(visual.includes(selector),'Missing coherent style for '+selector);
}
for(const bp of ['980px','840px','720px','560px','360px']){
 assert.ok(visual.includes('@media(max-width:'+bp+')'),'Missing responsive width '+bp);
}
for(const [path,role,target] of docs){
 const html=read(path);
 assert.match(html,/<html lang="ar" dir="rtl">/);
 assert.ok(html.includes('data-portal="'+role+'"'));
 assert.ok(html.includes('href="/assets/design-system-v4.css"'),'Missing design stylesheet '+path);
 assert.ok(html.includes('href="#'+target+'"'),'Skip target not linked: '+path);
 assert.ok(html.includes('id="'+target+'"'),'Skip target nonexistent: '+path);
 assert.ok(html.indexOf('href="/assets/design-system-v4.css"')>html.indexOf('href="/assets/app.css"'),
  'Theme styles should win over legacy '+path);
 assert.ok(html.includes('IBM+Plex+Sans+Arabic'),'Font not loaded '+path);
 assert.match(html,/<meta name="viewport"/);
 const assets=[...html.matchAll(/<link[^>]*href="([^"]+\.css)"/g)].map(x=>x[1]);
 assert.equal(assets.filter(x=>x==='/assets/design-system-v4.css').length,1,'Duplicate visual CSS '+path);
}
const landing=read('index.html');
const branchIds=[...landing.matchAll(/data-public-branch="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(branchIds,['math','science','tech','literature','languages','economy']);
assert.match(landing,/id="publicExplorerSearch"/);
assert.match(landing,/id="publicExplorerDetail"/);
assert.match(landing,/id="publicBranchGrid"/);
assert.match(landing,/lp-simple-steps/);
assert.doesNotMatch(landing,/lp-mini-metrics|lp-mini-dashboard/);
const boot=read('src/main.js');
assert.ok(boot.includes("'/assets/public-explorer.js'"));
assert.ok(boot.indexOf("'/assets/education-model.js'")<boot.indexOf("'/assets/public-explorer.js'"));
assert.ok(boot.indexOf("'/assets/subject-taxonomy.js'")<boot.indexOf("'/assets/public-explorer.js'"));
const config=read('vite.config.js');
assert.match(config,/assets\/public-explorer\.js/);
assert.match(config,/assets\/design-system-v4\.css/);
const legacy=read('assets/legacy-app.js');
assert.match(legacy,/function closeSidebarMobileOnly/);
assert.match(legacy,/function selectBranch/);
assert.match(legacy,/document\.addEventListener\('keydown'/);
const choose=legacy.slice(legacy.indexOf('function selectBranch(id)'),legacy.indexOf('function renderFilters()',legacy.indexOf('function selectBranch(id)')));
assert.match(choose,/closeSidebarMobileOnly\(\)/);
assert.doesNotMatch(choose,/closeSidebar\(\)/);
const resize=legacy.slice(legacy.indexOf("window.addEventListener('resize',()=>{"),legacy.indexOf("function renderBranches(){"));
assert.doesNotMatch(resize,/if\(!isMobileSidebar\(\)\)\s*closeSidebar\(\)/);
for(const js of ['assets/public-explorer.js','assets/legacy-app.js']){
 const check=spawnSync(process.execPath,['--check',js],{encoding:'utf8'});
 assert.equal(check.status,0,'Bad JS syntax '+js+': '+check.stderr);
}
const c={window:{},document:{readyState:'loading',addEventListener(){}},console,URL};
vm.runInNewContext(read('assets/public-explorer.js'),c,{timeout:2000});
assert.equal(typeof c.window.BacPublicExplorer.init,'function');
const manifest=JSON.parse(read('resources.json'));
assert.equal(manifest.schemaVersion,1);
const mctx={window:{},URL,console};
vm.runInNewContext(read('assets/education-model.js'),mctx,{timeout:2000});
vm.runInNewContext(read('assets/subject-taxonomy.js'),mctx,{timeout:2000});
for(const branch of branchIds){
 const sub=branch==='tech'?'electrical':branch==='languages'?'german':null;
 const subjects=mctx.window.BacEducation.list(branch,sub);
 const items=mctx.window.BacSubjectCatalog.build({manifest,branch,subBranch:sub,subjects});
 assert.ok(subjects.length>0,'No subjects for '+branch);
 assert.ok(items.every(i=>subjects.some(s=>s.id===i.id)),'Cross-branch subject leak: '+branch);
}
console.log('All five public and private routes share the visual system; public explorer, responsive and navigation regression checks passed.');
