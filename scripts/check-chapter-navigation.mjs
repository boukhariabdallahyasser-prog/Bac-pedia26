import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const manifest=JSON.parse(fs.readFileSync('resources.json','utf8'));
const listed=Object.entries(manifest.subjects).map(([id,item])=>({
  id,name:item.title,desc:'',url:item.url,icon:'fa-solid fa-book',special:false
}));
const location={hash:'#/chapters'};
const win={__BAC_TEST__:true,addEventListener(){}};
const doc={getElementById(){return null},querySelectorAll(){return []},addEventListener(){}};
const globals={
  window:win,document:doc,location,studentAuthUser:null,
  getSubjects:()=>listed,
  resourceManifest:manifest,
  canonicalDriveFolders:{},
  isDriveResourceUrl:url=>{try{const p=new URL(url);return p.protocol==='https:'&&p.hostname==='drive.google.com'}catch{return false}},
  escapeHtml:String,
  getStudentAuth:()=>null,
  userStorageKey:()=>'',state:{branch:'math',subBranch:null},
  localStorage:{getItem:()=>null,setItem(){}},
  showToast(){},showPage(){},
  requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  setTimeout(){},console,
  BacSearch:{search:x=>x,suggest:()=>[]}
};
vm.runInNewContext(fs.readFileSync('assets/chapters.js','utf8'),globals,{filename:'chapters.js'});
const explorer=win.__bacChapterTest;
assert.ok(explorer,'Test-only chapter catalog hook must be defined');
explorer.rebuild();
const subjects=explorer.subjects();
assert.equal(subjects.length,listed.length);
assert.ok(subjects.some(x=>x.id==='math_math'));
assert.ok(subjects.some(x=>x.id==='physics_math'));
assert.ok(subjects.some(x=>x.id==='tech_subject'));
const maths=subjects.find(x=>x.id==='math_math');
assert.ok(maths.children.length>=5,'Maths subject must have unit folders');
const functions=maths.children.find(x=>x.title.includes('الدوال'));
assert.ok(functions,'Functions unit is in the verified catalog');
assert.equal(functions.type,'folder');
assert.equal(functions.subjectId,'math_math');
assert.ok(functions.url.startsWith('https://drive.google.com/'));
location.hash='#/chapters/math_math/'+functions.id;
const current=explorer.resolveCurrent();
assert.equal(current.subject.id,'math_math');
assert.equal(current.node.id,functions.id);
assert.equal(current.parents.length,2);
location.hash='#/chapters/math_math';
assert.equal(explorer.resolveCurrent().node.id,'math_math');
location.hash='#/chapters';
assert.equal(explorer.resolveCurrent().node,null);
assert.ok(explorer.flat().length>listed.length);
const bac=subjects.find(x=>x.id==='bac_math');
assert.ok(bac?.children.some(x=>x.children.length>0),'Exam categories must include indexed PDF files');
const firstExam=bac.children.find(x=>x.children.length>0);
assert.ok(firstExam.children[0].url.startsWith('https://drive.google.com/'));
console.log('Nested chapter navigation checks passed: '+subjects.length+' subjects, '+explorer.flat().length+' indexed entries.');
