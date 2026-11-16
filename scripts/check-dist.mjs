import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const required=['index.html','login/index.html','student/index.html','contributor/index.html','admin/index.html','auth-config.js','resources.json','assets/legacy-app.js','assets/chapter-search.js','assets/chapters.js','assets/ai-format.js','assets/landing.js','assets/community.js'];
for(const name of required){
  const file=path.join(root,name);
  if(!fs.existsSync(file)||fs.statSync(file).size===0)throw Error('Build output missing: '+name);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const loginHtml=fs.readFileSync(path.join(root,'login/index.html'),'utf8');
const studentHtml=fs.readFileSync(path.join(root,'student/index.html'),'utf8');
const contributorHtml=fs.readFileSync(path.join(root,'contributor/index.html'),'utf8');
const adminHtml=fs.readFileSync(path.join(root,'admin/index.html'),'utf8');
for(const [name,markup,expected,excluded] of [
  ['landing',html,'publicLanding',['loginGate','page-home','page-admin','page-collaborate']],
  ['login',loginHtml,'loginGate',['publicLanding','page-home','page-admin','page-collaborate']],
  ['student',studentHtml,'page-home',['page-admin','page-collaborate']],
  ['contributor',contributorHtml,'page-collaborate',['page-admin','page-home','page-ai']],
  ['admin',adminHtml,'page-admin',['page-collaborate','page-home','page-ai']]
]){
  if(!markup.includes('id="'+expected+'"'))throw Error('Built '+name+' route missing its content');
  for(const id of excluded)if(markup.includes('id="'+id+'"'))throw Error('Built '+name+' route contains '+id);
  if(!markup.includes('data-portal="'+name+'"'))throw Error('Built '+name+' route has wrong role');
}

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
for(const selector of ['.landing','.lp-hero','.auth-role-switch','.comm-study-card','.comm-deck-grid','.portal-metrics','.sidebar .nav-btn'])if(!cssText.includes(selector))throw Error('Missing public/community style: '+selector);
if(!html.includes('id="publicLanding"')||html.includes('id="loginGate"'))throw Error('Public landing must not contain login form');
for(const marker of ['id="loginGate"','id="loginEmailInput"','id="signupEmailInput"','id="passwordRecoveryPanel"'])
  if(!loginHtml.includes(marker))throw Error('Missing login interface: '+marker);
const loginStylePaths=[...loginHtml.matchAll(/<link[^>]+href="([^"]+\\.css)"/g)]
  .map(m=>m[1]).filter(href=>href.startsWith('/'));
let loginStyles='';
for(const href of loginStylePaths){
  const filename=path.join(root,href.replace(/^\\//,''));
  if(!fs.existsSync(filename))throw Error('Login has a broken built stylesheet: '+href);
  loginStyles+=fs.readFileSync(filename,'utf8');
}
if(!loginStyles.includes('.auth-visual')||!loginStyles.includes('.auth-submit'))
  throw Error('Dedicated premium auth styles were not bundled');
for(const [role,markup] of [['student',studentHtml],['contributor',contributorHtml],['admin',adminHtml]])
  if(!markup.includes('class="app-shell"'))throw Error('Built '+role+' is missing app shell');

const resources=JSON.parse(fs.readFileSync(path.join(root,'resources.json'),'utf8'));
if(!resources.subjects||resources.schemaVersion!==1)throw Error('Generated resource index is invalid');
const jsFiles=fs.readdirSync(path.join(root,'assets')).filter(x=>x.endsWith('.js'));
if(jsFiles.length<4)throw Error('Missing bundled SDK or classic scripts');
const boot=jsFiles.filter(x=>/^main-[a-z0-9_-]+\.js$/i.test(x)||/^index-[a-z0-9_-]+\.js$/i.test(x));
if(!boot.length)throw Error('Bundled entry JavaScript not found');
const entry=fs.readFileSync(path.join(root,'assets',boot[0]),'utf8');
if(!entry.includes('legacy-app.js')||!entry.includes('chapter-search.js'))throw Error('Runtime bootstrap not present in compiled JS');
console.log('Vite production build verified: 5 independent HTML pages, '+required.length+' static resources and '+jsFiles.length+' JavaScript bundles.');
