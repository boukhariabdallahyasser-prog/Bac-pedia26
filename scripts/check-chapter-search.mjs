import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {normalize,score,search,suggest} = require('../assets/chapter-search.js');

assert.equal(normalize('الإحتمالات'), 'الاحتمالات');
assert.equal(normalize('Français'), 'francais');
assert.equal(normalize('الدَّوَال'), 'الدوال');
assert.equal(normalize('  ٢٠٢٧  '), '2027');
const items=[
  {id:'a',subjectId:'math_math',subjectName:'الرياضيات',title:'الدوال',categoryName:'رياضيات',type:'folder',url:'https://drive.google.com/drive/folders/example'},
  {id:'b',subjectId:'math_math',subjectName:'الرياضيات',title:'المتتاليات',type:'folder',url:'https://drive.google.com/drive/folders/example2'},
  {id:'c',subjectId:'physics_math',subjectName:'الفيزياء',title:'الوحدة 01 المتابعة الزمنية',type:'folder',url:'https://drive.google.com/drive/folders/example3'},
  {id:'d',subjectId:'math_math',subjectName:'الرياضيات',title:'تمارين الاحتمالات',type:'file',url:'https://drive.google.com/file/d/example/view'}
];
assert.equal(search(items,'fonctions')[0].title,'الدوال');
assert.equal(search(items,'math fonctions')[0].title,'الدوال');
assert.equal(search(items,'suites')[0].title,'المتتاليات');
assert.equal(search(items,'physique')[0].subjectId,'physics_math');
assert.equal(search(items,'الإحتمالات')[0].id,'d');
assert.equal(search(items,'dalwal').length,0);
assert.equal(search(items,'الرياضييات').length>0,true);
assert.equal(search(items,'الرياضيات',{subject:'physics_math'}).length,0);
assert.equal(search(items,'',{type:'file'}).length,1);
assert.equal(search(items,'',{favoritesOnly:true}).length,0);
assert.equal(search(items,'',{sort:'az'}).length,4);
assert.ok(score(items[0],'الدوال')>score(items[1],'الدوال'));
assert.ok(Array.isArray(suggest('المتتليات',items)));
console.log('Chapter search checks passed.');
