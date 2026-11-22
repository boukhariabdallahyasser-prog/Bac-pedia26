import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const scripts=['assets/bac-index.js','assets/discover.js','assets/student-launchpad.js','src/main.js','vite.config.js'];
for(const path of scripts){
 const checked=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
 assert.equal(checked.status,0,path+' syntax error: '+checked.stderr);
}
const env={window:{},URL,console};
vm.runInNewContext(file('assets/education-model.js'),env,{timeout:2000});
vm.runInNewContext(file('assets/subject-taxonomy.js'),env,{timeout:2000});
vm.runInNewContext(file('assets/bac-index.js'),env,{timeout:2000});
const {BacEducation:model,BacSubjectCatalog:taxonomy,BacIndex:engine}=env.window;
assert.ok(model&&taxonomy&&engine);
const raw=JSON.parse(file('resources.json'));
const indexed=engine.build(raw,model,taxonomy);
assert.ok(indexed.length>75,'Too few real indexed resources for search');
assert.equal(new Set(indexed.map(x=>x.id)).size,indexed.length,'Duplicate search identities');
assert.ok(indexed.every(x=>x.access==='unverified'),'Never imply public Drive access');
assert.ok(indexed.every(x=>x.url.startsWith('https://')),'Unsafe outbound URL');
assert.ok(indexed.every(x=>x.title&&x.subject&&x.group&&x.scopes?.length),'Incomplete indexed record');
assert.ok(indexed.every(x=>engine.safeUrl(x.url)===x.url),'Invalid canonical URL');
assert.equal(engine.normalize('رياضيات إسلامية'),'رياضيات اسلاميه');
assert.equal(engine.normalize('Équations  Physique'),'equations physique');
const branches=Object.keys(model.branches);
for(const branch of branches){
 const found=engine.search(indexed,{branch});
 assert.ok(found.length>0,'No indexed resources for branch '+branch);
 assert.ok(found.every(x=>x.scopes.some(s=>s.startsWith(branch+':'))),'Cross-branch result leak');
}
assert.ok(engine.search(indexed,{query:'physique'}).some(x=>x.subjectId.startsWith('physics')),'French search missing Physics');
assert.ok(engine.search(indexed,{query:'المتتاليات'}).some(x=>x.subjectId.startsWith('math')),'Arabic search missing sequences');
assert.ok(engine.search(indexed,{query:'رياضيات',branch:'math'}).every(x=>x.scopes.some(s=>s.startsWith('math:'))));
assert.ok(engine.search(indexed,{branch:'tech',specialization:'civil'}).every(x=>x.subjectId!=='tech_subject'),
 'Electrical-engineering resources cannot leak into Civil Engineering');
assert.ok(engine.search(indexed,{branch:'tech',specialization:'electrical'}).some(x=>x.subjectId==='tech_subject'),
 'Indexed electrical resource missing in its actual branch');
const noCross=engine.search(indexed,{branch:'literature',subjectId:'physics_math'});
assert.equal(noCross.length,0,'Forbidden mixed subject and branch results');
const pdfs=engine.search(indexed,{kind:'pdf'});
assert.ok(pdfs.every(x=>x.kind==='pdf'));
assert.ok(pdfs.length>0,'No PDF files indexed');
const dated=engine.search(indexed,{year:2025});
assert.ok(dated.every(x=>x.year===2025));
const examples=engine.search(indexed,{group:'bac'});
assert.ok(examples.length>0,'Official-paper archive is present in real catalog');
const sorted=engine.search(indexed,{sort:'year'});
assert.ok(sorted.slice(0,15).every((x,i,a)=>i===0||(a[i-1].year||0)>=(x.year||0)));
const known=engine.search(indexed,{branch:'math',sort:'az'});
assert.ok(known.every((x,i)=>i===0||known[i-1].title.localeCompare(x.title,'ar')<=0));
const counts=engine.facets(indexed);
assert.equal(counts.total,indexed.length);
assert.equal(Object.values(counts.groups).reduce((a,b)=>a+b,0),indexed.length);
const doc=file('discover/index.html');
for(const id of ['discoveryForm','discoveryQuery','discoveryResults','discoveryBranch','discoverySpecialization',
 'discoverySubject','discoveryGroup','discoveryKind','discoveryYear','discoverySort','discoveryShare','discoveryMore']){
 assert.ok(doc.includes('id="'+id+'"'),'Missing search control '+id);
}
assert.ok(doc.includes('data-portal="discover"'));
assert.ok(doc.includes('dir="rtl"'));
assert.ok(doc.includes('/assets/discover.css'));
assert.ok(doc.includes('/assets/bac-index.js'));
assert.ok(!doc.includes('service_role'));
assert.ok(!file('assets/discover.js').includes('getStudentAuth'),'Public search must never request private session');
assert.match(file('vite.config.js'),/discover:resolve\('discover\/index.html'\)/);
for(const role of ['index.html','login/index.html','student/index.html','contributor/index.html','admin/index.html'])
 assert.ok(file(role).includes('href="/discover/"'),'No public search entry on '+role);
assert.match(file('assets/student-launchpad.js'),/بحث شامل في الملفات/);
console.log('Public BAC search passed:',indexed.length,'real unique resources,',pdfs.length,'PDFs,',examples.length,'BAC archive items and all six branch checks.');
