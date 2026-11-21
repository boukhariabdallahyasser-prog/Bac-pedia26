import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=get('student/index.html'),legacy=get('assets/legacy-app.js');
const boot=get('src/main.js'),build=get('vite.config.js');
const js=get('assets/study-hub.js');
for(const id of ['page-papers','page-exercises','page-collections','page-quiz','page-coverage','studyQuizNotes','studyQuizGenerate'])
  assert.ok(html.includes('id="'+id+'"'),'missing RTL section: '+id);
assert.match(html,/<html lang="ar" dir="rtl">/);
for(const id of ['practice','papers','exercises','collections','quiz','coverage']){
  assert.ok(legacy.includes("'"+id+"'"),'missing student route '+id);
}
assert.match(boot,/\/assets\/study-hub\.js/);
assert.match(build,/assets\/study-hub\.js/);
const scope={document:{readyState:'loading',addEventListener(){}},console,URL};
scope.window=scope;
vm.runInNewContext(js,scope,{filename:'assets/study-hub.js',timeout:2000});
const api=scope.BacStudyHub;
assert.equal(typeof api.flatten,'function');
const items=api.flatten({subjects:{math:{title:'رياضيات',categories:[
  {id:'a',title:'مواضيع البكالوريا 2024',type:'folder',url:'https://drive.google.com/drive/folders/valid'},
  {id:'b',title:'سلسلة تمارين الدوال',type:'file',url:'https://drive.google.com/file/d/valid'},
  {id:'bad',title:'رابط ضار',url:'javascript:alert(1)'},
  {id:'a',title:'تكرار',url:'https://drive.google.com/file/d/duplicate'}
]}}});
assert.equal(items.length,2);
assert.ok(api.classify(items[0],'papers'));
assert.ok(api.classify(items[1],'exercises'));
assert.ok(api.sentences('في الدوال العددية ندرس الاستمرارية والتزايد والتناقص بشكل مفصل.').length);
console.log('Study hub integration and catalog classification checks passed');
