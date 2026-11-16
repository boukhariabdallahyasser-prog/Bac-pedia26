import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const required=['index.html','auth-config.js','resources.json','assets/legacy-app.js','assets/chapter-search.js','assets/chapters.js','assets/landing.js','assets/community.js'];
for(const name of required){
  const file=path.join(root,name);
  if(!fs.existsSync(file)||fs.statSync(file).size===0)throw Error('Build output missing: '+name);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!/<script[^>]+type="module"[^>]+src="\/assets\//.test(html)&&!/<script[^>]+src="\/assets\/[^"]+"[^>]+type="module"/.test(html)){
  throw Error('No bundled JS module in built HTML');
}
if(/\/src\/main\.js/.test(html))throw Error('Uncompiled Vite entrypoint in build');
const cssPaths=[...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(m=>m[1]).filter(p=>p.startsWith('/'));
if(!cssPaths.length)throw Error('No independently loadable production CSS link');
let cssText='';
for(const asset of cssPaths){
  const stylesheet=path.join(root,asset.replace(/^\//,''));
  if(!fs.existsSync(stylesheet))throw Error('Generated CSS link is broken: '+asset);
  cssText+=fs.readFileSync(stylesheet,'utf8');
}
if(!cssText.includes('.chapter-context')||!cssText.includes('.login-gate'))throw Error('Missing chapter or login styles in compiled CSS');
for(const selector of ['.landing','.lp-hero','.lp-demo-card','.auth-role-switch','.comm-study-card','.comm-deck-grid'])if(!cssText.includes(selector))throw Error('Missing public/community style: '+selector);
for(const marker of ['id="publicLanding"','id="page-flashcards"','id="page-collaborate"','id="loginGate"'])if(!html.includes(marker))throw Error('Missing release-critical UI: '+marker);

const resources=JSON.parse(fs.readFileSync(path.join(root,'resources.json'),'utf8'));
if(!resources.subjects||resources.schemaVersion!==1)throw Error('Generated resource index is invalid');
const jsFiles=fs.readdirSync(path.join(root,'assets')).filter(x=>x.endsWith('.js'));
if(jsFiles.length<4)throw Error('Missing bundled SDK or classic scripts');
const boot=jsFiles.filter(x=>/^main-[a-z0-9_-]+\.js$/i.test(x)||/^index-[a-z0-9_-]+\.js$/i.test(x));
if(!boot.length)throw Error('Bundled entry JavaScript not found');
const entry=fs.readFileSync(path.join(root,'assets',boot[0]),'utf8');
if(!entry.includes('legacy-app.js')||!entry.includes('chapter-search.js'))throw Error('Runtime bootstrap not present in compiled JS');
console.log('Vite production build verified: '+required.length+' static resources and '+jsFiles.length+' JavaScript bundles.');
