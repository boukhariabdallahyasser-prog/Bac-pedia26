import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const code=read('assets/education-model.js'),tax=read('assets/subject-taxonomy.js'),admin=read('assets/admin-library.js');
for(const file of ['assets/education-model.js','assets/admin-library.js','assets/subject-organizer.js','assets/community.js']){
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 assert.equal(result.status,0,file+' syntax: '+result.stderr);
}
const context={window:{},URL,console};
vm.runInNewContext(code,context,{timeout:2000});
vm.runInNewContext(tax,context,{timeout:2000});
const model=context.window.BacEducation;
assert.ok(model);
assert.deepEqual(Object.keys(model.branches).sort(),['economy','languages','literature','math','science','tech'].sort());
assert.ok(model.list('math').some(s=>s.id==='math_math'));
assert.ok(model.list('science').some(s=>s.id==='natural_math'));
assert.ok(model.list('economy').some(s=>s.id==='economy_subject'));
assert.ok(!model.list('math').some(s=>s.id==='computer_science_3as'),'Do not infer unrequested 2026 subject changes');
assert.ok(!model.list('economy').some(s=>s.id==='accounting_3as'),'Do not auto-add new subjects');
assert.ok(model.list('tech','electrical').some(s=>s.id==='tech_subject'));
assert.ok(!model.list('tech','civil').some(s=>s.id==='tech_subject'),'Existing catalog has only electrical specialization');
assert.ok(model.list('languages','german').some(s=>s.name.includes('الألمانية')));
assert.ok(model.inTrack('math',null,'math_math'));
assert.ok(!model.inTrack('math',null,'tech_subject'));
assert.ok(!model.recordMatches({subject_key:'math_math',academic_branch:'علوم تجريبية'},'math',null));
assert.ok(!model.recordMatches({subject_key:'tech_subject',academic_branch:'تقني رياضي',specialization_code:'electrical'},'tech','civil'));
const catalog=JSON.parse(read('resources.json'));
const subjectCatalog=context.window.BacSubjectCatalog;
const base=subjectCatalog.build({manifest:catalog,branch:'math',subBranch:null,subjects:model.list('math')});
const maths=base.find(x=>x.id==='math_math');
assert.ok(maths?.items.some(x=>x.group==='lessons'&&x.title==='المتتاليات'));
const models=model.overlay(base,[{
 id:'00000000-0000-4000-8000-000000000001',
 subject_key:'math_math',academic_branch:'رياضيات',resource_kind:'exercise',
 content_group:'exercises',status:'approved',title:'تمرين إضافي',unit_title:'المتتاليات',
 resource_url:'https://example.com/math.pdf'
}],[], 'math',null);
assert.ok(models.find(x=>x.id==='math_math').items.some(x=>x.title==='تمرين إضافي'));
assert.ok(!models.find(x=>x.id==='physics_math').items.some(x=>x.title==='تمرين إضافي'));
const resources=read('admin/index.html');
assert.match(resources,/data-admin-tab="library"/);
assert.match(resources,/admin-library\.css/);
assert.match(read('assets/community.js'),/adminTab==='library'/);
assert.match(admin,/window\.BacAdminLibrary/);
assert.match(admin,/subject_key:model\.id/);
assert.match(admin,/status:'approved'/);
assert.match(admin,/resource_pdf_attachments/);
assert.match(admin,/getStudentAuth/);
assert.doesNotMatch(admin,/window\.studentAuthUser/);
const student=read('assets/subject-organizer.js');
assert.match(student,/BacEducation\.overlay/);
assert.match(student,/resource_pdf_attachments/);
const migration=read('supabase/migrations/20261122132000_bac2027_academic_admin.sql');
for(const policy of ['Verified owner inserts published academic resources','Verified owner edits own published resource','Owner inserts curriculum units','Owner edits curriculum units','Admin uploads approved resource PDF']){
 assert.ok(migration.includes(policy),policy);
}
assert.match(migration,/enable row level security/);
assert.doesNotMatch(migration,/computer_science_3as|accounting_3as/);
assert.doesNotMatch(migration,/drop\s+table|truncate\s+table|delete\s+from\s+public\./i);
console.log('Admin library and established track scope checks passed.');
