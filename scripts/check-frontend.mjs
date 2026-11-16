import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const html=fs.readFileSync('index.html','utf8');
const api=fs.readFileSync('api/ai.js','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
if(!scripts.length)throw Error('No inline JavaScript found');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bacpedia-check-'));
try{
  for(let i=0;i<scripts.length;i++){
    const file=path.join(dir,`inline-${i}.js`);
    fs.writeFileSync(file,scripts[i]);
    const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    if(result.status!==0)throw Error(`Inline script ${i} has a syntax error:\n${result.stderr}`);
  }
  const authRequirements=[
    'async function initStudentAuth()',
    'onAuthStateChange',
    'function userStorageKey(userId)',
    'async function saveRecoveredPassword()',
    'id="passwordRecoveryPanel"',
    'function togglePasswordVisibility(inputId,button)',
    'function updatePasswordStrength()',
    'let recoveryFlow=',
    'history.replaceState(null',
    'email_confirmed_at'
  ];
  for(const requirement of authRequirements)if(!html.includes(requirement))throw Error(`Missing authentication safeguard: ${requirement}`);
  // These are required protections, not forbidden patterns.
  const authSafeguards=[
    ['signup and login tabs remain available',/function switchLoginTab\\(tab\\)\\{[\\s\\S]{0,900}#loginMainTab/],
    ['busy-state buttons use scoped querySelectorAll',/document\\.querySelectorAll\\('#loginGate \\.login-form button/],
    ['auth input icons stay outside the text field',/#loginGate \\.login-field>i\\{position:static/],
    ['rate-limit errors provide feedback',/over_email_send_rate_limit/],
    ['signup cooldown protects against retries',/authCooldownUntil=Date\\.now\\(\\)\\+120000/],
    ['authenticated session renders before cloud hydration',/renderAll\\(\\);renderSession\\(\\);closeLoginGate\\(\\)/],
    ['signup handles email-confirmation pending state',/if\\(!data\\.session\\)\\{[\\s\\S]{0,650}showAuthNotice/],
    ['client session gates unconfirmed email',/if\\(!u\\.email_confirmed_at\\)/],
    ['new chapters hub exists',/id="page-chapters"/],
    ['chapter explorer script loaded',/assets\\/chapters\\.js/],
    ['chapter search index loaded',/assets\\/chapter-search\\.js/]
  ];
  for(const [name,pattern] of authSafeguards)if(!pattern.test(html))throw Error('Missing UI safeguard: '+name);
  if(html.includes('window.prompt('))throw Error('Browser prompt must not be used for authentication workflows');
  if(/sessionGeminiKey|x-goog-api-key|generativelanguage\.googleapis\.com|CONFIG\.aiApiKey/.test(html))throw Error('Gemini credentials or direct provider calls must not be present in browser code');
  if(!html.includes('callProxyAI(agentId,ctx)'))throw Error('Student AI requests must use the authenticated server proxy');
  if(html.includes('localStorage.getItem(CONFIG.storageKey)'))throw Error('Shared unscoped student cache must not be loaded');
  if(!html.includes('userStorageKey(studentAuthUser.id)'))throw Error('Student local cache is not scoped to the authenticated user');
  const apiCheck=spawnSync(process.execPath,['--input-type=module','--check'],{input:api,encoding:'utf8'});
  if(apiCheck.status!==0)throw Error(`AI API syntax error:\n${apiCheck.stderr}`);
  if(!api.includes('match(/^Bearer\\s+(.+)$/i)'))throw Error('AI API Bearer token parser is not using the expected whitespace matcher');
  if(!api.includes('/rest/v1/rpc/consume_ai_quota'))throw Error('AI API is missing the atomic student quota check');
  if(!api.includes('gemini-3.8-flash:generateContent')||api.includes('gemini-2.5-flash'))throw Error('AI API must use the current Gemini 3.8 Flash model for new projects');
  if(!api.includes('email_confirmed_at'))throw Error('AI API is missing verified-email enforcement');
  const chapterTest=spawnSync(process.execPath,['scripts/check-chapter-search.mjs'],{encoding:'utf8'});
  if(chapterTest.status!==0)throw Error('Chapter search tests failed:\\n'+(chapterTest.stderr||chapterTest.stdout));
  console.log((chapterTest.stdout||'').trim());
  console.log(`Frontend and AI API syntax valid: ${scripts.length} inline script(s) plus api/ai.js; security guards present.`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
