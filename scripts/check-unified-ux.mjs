import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const scripts=['assets/student-launchpad.js','assets/contributor-guide.js','assets/study-hub.js',
  'assets/subject-organizer.js','assets/admin-library.js','assets/legacy-app.js','assets/community.js'];
for(const script of scripts){
 const result=spawnSync(process.execPath,['--check',script],{encoding:'utf8'});
 assert.equal(result.status,0,script+' syntax: '+result.stderr);
}
const student=read('student/index.html'),admin=read('admin/index.html'),contributor=read('contributor/index.html');
assert.match(student,/id="studyLaunchpad"/);
assert.match(student,/id="homeMoreTools"/);
assert.match(student,/assets\/student-launchpad\.css/);
assert.match(admin,/data-admin-shortcut="library"/);
assert.match(admin,/data-admin-shortcut="resources"/);
assert.match(admin,/id="adminMoreSections"/);
assert.match(admin,/id="adminCurrentTask"/);
assert.match(contributor,/id="collabResourceSubject" required/);
assert.match(contributor,/id="collabResourceSpecialization"/);
assert.match(contributor,/id="contributorNextAction"/);
assert.match(contributor,/id="contributorMyDrafts"/);
assert.match(contributor,/id="contributorMyResources"/);
assert.doesNotMatch(contributor,/id="collabResourceSubject"[^>]*\btype="text"/);
const community=read('assets/community.js');
assert.match(community,/BacContributorGuide\?\.data/);
assert.match(community,/subject_key:guided\.subject_key/);
assert.match(community,/specialization_code:guided\.specialization_code/);
assert.match(community,/adminTab='library'/);
assert.match(community,/data-admin-shortcut/);
const adminCode=read('assets/admin-library.js');
assert.match(adminCode,/adminLibrarySearch/);
assert.match(adminCode,/admin-library-preview/);
assert.match(adminCode,/const duplicate=model\.items\.find/);
assert.match(adminCode,/admin-library-advanced/);
const organizer=read('assets/subject-organizer.js');
assert.match(organizer,/subjectContentSearch/);
assert.match(organizer,/subjectContentSort/);
assert.match(organizer,/expandedGroups/);
assert.match(organizer,/goalKey='all'/);
const bookmarks=read('assets/study-hub.js');
assert.match(bookmarks,/stableKey/);
assert.match(bookmarks,/readPending/);
assert.match(bookmarks,/pending\[item\.key\]=enabled/);
assert.match(bookmarks,/mutateRemoteBookmark/);
assert.match(bookmarks,/BacEducation\.overlay/);
const start=read('assets/student-launchpad.js');
assert.match(start,/rememberBacSubject/);
assert.match(start,/recentKey/);
assert.match(start,/study-launcher-subject/);
for(const path of ['assets/student-launchpad.js','assets/contributor-guide.js']){
 assert.ok(read('src/main.js').includes('/'+path));
 assert.ok(read('vite.config.js').includes("'"+path+"'"));
}
assert.doesNotMatch(read('assets/education-model.js'),/computer_science_3as|accounting_3as/);
const scope={window:{},document:{readyState:'loading',addEventListener(){}},URL,console};
scope.window=scope;
vm.runInNewContext(read('assets/education-model.js'),scope,{timeout:2000});
vm.runInNewContext(read('assets/subject-taxonomy.js'),scope,{timeout:2000});
vm.runInNewContext(read('assets/study-hub.js'),scope,{timeout:2000});
const manifest=JSON.parse(read('resources.json'));
const models=scope.BacEducation.list('math');
const items=scope.BacStudyHub.flatten(manifest,{branch:'math',subBranch:null,subjects:models});
assert.ok(items.length>10,'Actual Maths branch must have indexed resources');
assert.ok(items.every(x=>x.key.length<=24),'Stable bookmark identifiers must fit RLS key limits');
assert.equal(new Set(items.map(x=>x.key)).size,items.length,'No two indexed resources should share the same key');
assert.ok(items.some(x=>x.group==='bac'));
const tech=scope.BacStudyHub.flatten(manifest,{
 branch:'tech',subBranch:'civil',subjects:scope.BacEducation.list('tech','civil')
});
assert.ok(!tech.some(x=>x.subjectId==='tech_subject'),'Electrical resources must not leak to Civil Engineering');
// Verify contributor's select options are derived from the same academic model, with exact specialization metadata.
class FakeSelect{
 constructor(){this.options=[];this.value='';this.disabled=false;this.listeners={};this.selectedOptions=[]}
 replaceChildren(...children){this.options=[...children];this.value='';this.selectedOptions=[]}
 append(child){this.options.push(child)}
 addEventListener(name,fn){this.listeners[name]=fn}
}
const elements={
 collabResourceBranch:new FakeSelect(),collabResourceSubject:new FakeSelect(),collabResourceSpecialization:new FakeSelect(),
 contributorSpecializationWrap:{hidden:true},contributorSubjectHint:{textContent:''},collabResourceKind:{value:'exercise'}
};
elements.collabResourceBranch.value='رياضيات';
const doc={
 readyState:'loading',addEventListener(){},
 getElementById(id){return elements[id]||null},
 createElement(tag){return {tagName:tag,value:'',textContent:'',dataset:{}}}
};
const ctx={window:{BacEducation:scope.BacEducation},document:doc,console};
vm.runInNewContext(read('assets/contributor-guide.js'),ctx,{timeout:2000});
ctx.window.BacContributorGuide.refresh();
const selected=elements.collabResourceSubject.options.find(x=>x.dataset.subjectKey==='math_math');
assert.ok(selected,'Mathematics subject option must exist when Maths branch selected');
elements.collabResourceSubject.value=selected.value;
elements.collabResourceSubject.selectedOptions=[selected];
assert.equal(ctx.window.BacContributorGuide.data().subject_key,'math_math');
assert.equal(ctx.window.BacContributorGuide.data().content_group,'exercises');
elements.collabResourceBranch.value='تقني رياضي';
ctx.window.BacContributorGuide.refresh();
elements.collabResourceSpecialization.value='civil';
ctx.window.BacContributorGuide.refresh();
assert.ok(!elements.collabResourceSubject.options.some(x=>x.dataset.subjectKey==='tech_subject'));
console.log('Unified UX, contributor taxonomy, student goals and saved-resource safety checks passed.');
