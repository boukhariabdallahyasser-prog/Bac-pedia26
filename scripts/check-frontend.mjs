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
    'email_confirmed_at'
  ];
  for(const requirement of authRequirements)if(!html.includes(requirement))throw Error(`Missing authentication safeguard: ${requirement}`);
  if(html.includes('window.prompt('))throw Error('Browser prompt must not be used for authentication workflows');
  if(/sessionGeminiKey|x-goog-api-key|generativelanguage\.googleapis\.com|CONFIG\.aiApiKey/.test(html))throw Error('Gemini credentials or direct provider calls must not be present in browser code');
  if(!html.includes('callProxyAI(agentId,ctx)'))throw Error('Student AI requests must use the authenticated server proxy');
  if(html.includes('localStorage.getItem(CONFIG.storageKey)'))throw Error('Shared unscoped student cache must not be loaded');
  if(!html.includes('userStorageKey(studentAuthUser.id)'))throw Error('Student local cache is not scoped to the authenticated user');
  const apiCheck=spawnSync(process.execPath,['--input-type=module','--check'],{input:api,encoding:'utf8'});
  if(apiCheck.status!==0)throw Error(`AI API syntax error:\n${apiCheck.stderr}`);
  if(!api.includes('match(/^Bearer\\s+(.+)$/i)'))throw Error('AI API Bearer token parser is not using the expected whitespace matcher');
  if(!api.includes('/rest/v1/rpc/consume_ai_quota'))throw Error('AI API is missing the atomic student quota check');
  if(!api.includes('email_confirmed_at'))throw Error('AI API is missing verified-email enforcement');
  console.log(`Frontend and AI API syntax valid: ${scripts.length} inline script(s) plus api/ai.js; security guards present.`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
