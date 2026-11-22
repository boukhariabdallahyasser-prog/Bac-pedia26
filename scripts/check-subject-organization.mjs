import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const scope={window:{},URL,console};
vm.runInNewContext(get('assets/subject-taxonomy.js'),scope,{timeout:2000});
const catalog=scope.window.BacSubjectCatalog;
assert.ok(catalog,'taxonomy must be exposed for student navigation');
const manifest=JSON.parse(get('resources.json'));
assert.equal(catalog.matchFamily('مادة الرياضيات'),'math');
assert.equal(catalog.matchFamily('مادة اللغة الإنجليزية'),'english');
assert.equal(catalog.matchFamily('مادة الاجتماعيات'),'history');
assert.equal(catalog.filenameFamily('Compo1-Phys.pdf'),'physics');
assert.equal(catalog.filenameFamily('Devoir1-Ar.pdf'),'arabic');
assert.equal(catalog.filenameFamily('Devoir2-Maths.pdf'),'math');
assert.equal(catalog.groupFor('مواضيع المراجعة النهائية'),'tests');
assert.equal(catalog.groupFor('تمارين + بكالوريات'),'other');
assert.equal(catalog.groupFor('المتتاليات'),'lessons');
assert.equal(catalog.groupFor('منهجية'),'summaries');

const defs=[
 {id:'math_math',name:'الرياضيات',branches:['math','tech']},
 {id:'physics_math',name:'الفيزياء',branches:['math','tech']},
 {id:'natural_math',name:'العلوم الطبيعية',branches:['math','science']},
 {id:'arabic_sci',name:'اللغة العربية',branches:['math','science','tech']},
 {id:'french_sci',name:'اللغة الفرنسية',branches:['math','science','tech']},
 {id:'english_sci',name:'اللغة الإنجليزية',branches:['math','science','tech']},
 {id:'history_sci',name:'التاريخ والجغرافيا',branches:['math','science','tech']},
 {id:'islamic',name:'العلوم الإسلامية',branches:['math','science','tech','literature','languages','economy']},
 {id:'philo_sci',name:'الفلسفة',branches:['math','science','tech']},
 {id:'math_science',name:'الرياضيات',branches:['science']},
 {id:'physics_science',name:'الفيزياء',branches:['science']},
 {id:'tech_subject',name:'الهندسة الكهربائية',branches:['tech'],subBranches:['electrical']},
 {id:'exams',name:'اختبارات وفروض',branches:['math','science','tech'],special:true}
];
const math=catalog.build({manifest,branch:'math',subBranch:null,subjects:defs});
assert.ok(math.length>=8);
assert.ok(!math.some(x=>x.id==='bac_math'||x.id==='exams'),'resource collections must never be subjects');
const mathSubject=math.find(x=>x.id==='math_math');
assert.ok(mathSubject.items.some(x=>x.group==='lessons'&&x.title==='المتتاليات'));
const bacFolder=mathSubject.items.find(x=>x.origin==='bac_math');
assert.ok(bacFolder,'BAC collection must be attached to mathematics rather than added as separate subject');
assert.equal(bacFolder.group,'bac');
assert.ok(bacFolder.children.some(x=>x.year===2023),'BAC paper must retain its year label');
assert.ok(!mathSubject.items.some(x=>x.origin==='summaries_math'&&x.title==='فيزياء'),
 'physics summaries must not be assigned to math');
const english=math.find(x=>x.id==='english_sci');
assert.ok(english.items.some(x=>x.origin==='bac_math'),'English BAC papers must be grouped under English');
assert.ok(math.find(x=>x.id==='physics_math').items.some(x=>x.origin==='exams'&&x.title==='Devoir2-Phys.pdf'));

const science=catalog.build({manifest,branch:'science',subBranch:null,subjects:defs});
assert.ok(!science.some(x=>x.id==='math_math'||x.id==='tech_subject'),'foreign branch subjects must not leak');
assert.ok(!science.flatMap(x=>x.items).some(x=>x.origin==='bac_math'),
 'mathematics-track BAC archive must not leak to experimental sciences');
assert.ok(science.find(x=>x.id==='math_science').items.every(x=>x.origin!=='bac_math'));
const techElectrical=catalog.build({manifest,branch:'tech',subBranch:'electrical',subjects:defs});
assert.ok(techElectrical.find(x=>x.id==='tech_subject')?.items.length);
const techCivil=catalog.build({manifest,branch:'tech',subBranch:'civil',subjects:defs});
assert.ok(!techCivil.some(x=>x.id==='tech_subject'),'electrical resources cannot leak to civil engineering');
const economy=catalog.build({manifest,branch:'economy',subBranch:null,subjects:defs});
assert.ok(economy.every(x=>x.id==='islamic'),'only declared economics branch subjects can appear');
const pages=get('student/index.html');
assert.match(pages,/id="subjectOrganized"/);
assert.match(pages,/id="chapterAdvancedSearch"/);
assert.match(pages,/subject-organizer\.css/);
const shell=get('assets/legacy-app.js');
assert.match(shell,/openOrganizedSubject/);
assert.match(shell,/sidebar-nav-group/);
assert.match(shell,/let list=getNormalSubjects\(\)/);
const scripts=get('src/main.js');
assert.match(scripts,/subject-taxonomy\.js/);
assert.match(scripts,/subject-organizer\.js/);
assert.match(get('vite.config.js'),/subject-organizer\.js/);
assert.match(get('assets/study-hub.js'),/BacSubjectCatalog\.build/);
console.log('Subject-first navigation and actual catalog branch/subject tests passed');
