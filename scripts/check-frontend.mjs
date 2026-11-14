import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const html=fs.readFileSync('index.html','utf8');
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
  console.log(`HTML JavaScript syntax valid: ${scripts.length} inline script(s).`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
