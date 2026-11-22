/* BAC 2026-2027: conservative 3AS track mapping, NOT an official coefficient table.
  Sources: https://www.education.gov.dz/2026/07/30/ (secondary-school changes);
  2026-09-10 decision no. 36 withdrew decision no. 20 on timetables/coefficients.
  This model separates verified track structure from editable resource coverage.
*/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BacEducation=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const year='2026-2027';
 const branches={
   math:{name:'رياضيات',overview:'تخصص رياضي، مع الفيزياء والعلوم الأساسية. الإعلام الآلي معلن في 3AS.',subspecialties:{}},
   science:{name:'علوم تجريبية',overview:'أولوية للعلوم الطبيعية والفيزياء والرياضيات.',subspecialties:{}},
   tech:{name:'تقني رياضي',overview:'الرياضيات والفيزياء ومادة هندسية تختلف باختلاف التخصص. أُعلن عن الإعلام الآلي.',subspecialties:{
     electrical:'الهندسة الكهربائية',mechanical:'الهندسة الميكانيكية',civil:'الهندسة المدنية',process:'هندسة الطرائق'}},
   literature:{name:'آداب وفلسفة',overview:'الآداب والفلسفة مع اللغات والتاريخ والجغرافيا.',subspecialties:{}},
   languages:{name:'لغات أجنبية',overview:'الفرنسية والإنجليزية واللغة الأجنبية الثالثة، التي تتغير باختيار التلميذ.',subspecialties:{
     german:'الألمانية',spanish:'الإسبانية',italian:'الإيطالية'}},
   economy:{name:'تسيير واقتصاد',overview:'التسيير المحاسبي والمالي، الاقتصاد والمناجمنت، القانون والرياضيات.',subspecialties:{}}
 };
 const subjectNames={
  math_math:'الرياضيات',math_science:'الرياضيات',math_lit:'الرياضيات',math_eco:'الرياضيات',
  physics_math:'الفيزياء',physics_science:'الفيزياء',natural_math:'علوم الطبيعة والحياة',
  arabic_sci:'اللغة العربية',arabic_lit:'اللغة العربية',
  french_sci:'اللغة الفرنسية',french_lit:'اللغة الفرنسية',
  english_sci:'اللغة الإنجليزية',english_lit:'اللغة الإنجليزية',
  history_sci:'التاريخ والجغرافيا',history_lit:'التاريخ والجغرافيا',
  islamic:'العلوم الإسلامية',philo_sci:'الفلسفة',philo_lit:'الفلسفة',philo_lang:'الفلسفة',
  tech_subject:'الهندسة',third_lang:'اللغة الأجنبية الثالثة',
  economy_subject:'الاقتصاد والمناجمنت',accounting_3as:'التسيير المحاسبي والمالي',
  math_eco:'الرياضيات',law:'القانون',computer_science_3as:'الإعلام الآلي'
 };
 const definitions={
  math:['math_math','physics_math','natural_math','computer_science_3as','arabic_sci','french_sci','english_sci','history_sci','islamic','philo_sci'],
  science:['natural_math','physics_science','math_science','arabic_sci','french_sci','english_sci','history_sci','islamic','philo_sci'],
  tech:['tech_subject','math_math','physics_math','computer_science_3as','arabic_sci','french_sci','english_sci','history_sci','islamic','philo_sci'],
  literature:['arabic_lit','philo_lit','history_lit','french_lit','english_lit','math_lit','islamic'],
  languages:['arabic_lit','french_lit','english_lit','third_lang','history_lit','philo_lang','math_lit','islamic'],
  economy:['accounting_3as','economy_subject','law','math_eco','arabic_lit','french_lit','english_lit','history_lit','islamic']
 };
 const branchLabels={};
 for(const [key,value] of Object.entries(branches))branchLabels[value.name]=key;
 const aliases={...subjectNames};
 function normalize(value){
   return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
     .replace(/[\u064b-\u065f]/g,'').replace(/[أآإ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
     .replace(/\s+/g,' ');
 }
 function inTrack(branch,specialization,id){
   if(!branches[branch]||!definitions[branch].includes(id))return false;
   if(id==='third_lang'&&branch==='languages')return !specialization||!!branches.languages.subspecialties[specialization];
   if(id==='tech_subject'&&branch==='tech')return !specialization||!!branches.tech.subspecialties[specialization];
   return true;
 }
 function list(branch,specialization){
   if(!branches[branch])return [];
   return definitions[branch].map(id=>({
     id,
     name:id==='tech_subject'&&specialization?branches.tech.subspecialties[specialization]||subjectNames[id]:
       id==='third_lang'&&specialization?'اللغة '+(branches.languages.subspecialties[specialization]||subjectNames[id]):subjectNames[id],
     branches:[branch],
     subBranches:id==='tech_subject'||id==='third_lang'?(specialization?[specialization]:undefined):undefined,
     icon:id==='computer_science_3as'?'fa-solid fa-laptop-code':'fa-solid fa-book-open',
     desc:id==='computer_science_3as'?'مادة الإعلام الآلي معلنة للثالثة ثانوي 2026–2027؛ مواردها تحتاج تدقيقاً في البرنامج التفصيلي.':'المحتوى الدراسي يعتمد على المصادر المفهرسة والتحقق الإداري.',
     educationalStatus:id==='computer_science_3as'?'minister-announced':'track-mapped'
   }));
 }
 function identityForLegacy(record,branch,specialization){
   if(record?.subject_key&&inTrack(branch,specialization,record.subject_key))return record.subject_key;
   // Legacy records can be displayed only if their subject name has a unique exact match in the branch.
   if(record?.subject_key)return null;
   const matches=list(branch,specialization).filter(x=>normalize(x.name)===normalize(record?.subject));
   return matches.length===1?matches[0].id:null;
 }
 function recordMatches(record,branch,specialization){
   if(!record||!branches[branch])return false;
   const selected=record.academic_branch||record.branch_code;
   if(selected&&selected!=='جميع الشعب'&&selected!==branches[branch].name&&selected!==branch)return false;
   if(record.specialization_code&&record.specialization_code!==specialization)return false;
   const key=identityForLegacy(record,branch,specialization);
   return Boolean(key);
 }
 function overlay(models,records=[],units=[],branch,specialization){
   if(!Array.isArray(models))return [];
   const groups=['lessons','exercises','summaries','tests','bac','other'];
   for(const model of models){
     const current=Array.isArray(model.items)?[...model.items]:[];
     const existing=new Set(current.filter(x=>x.url).map(x=>x.url));
     for(const record of records){
       if(record.status!=='approved'||!recordMatches(record,branch,specialization))continue;
       if(identityForLegacy(record,branch,specialization)!==model.id)continue;
       const url=typeof record.resource_url==='string'&&/^https:\/\//i.test(record.resource_url)?record.resource_url:null;
       if(!url||existing.has(url))continue;
       const group=groups.includes(record.content_group)?record.content_group:
          ({lesson:'lessons',exercise:'exercises',summary:'summaries',exam:'tests',video:'other'}[record.resource_kind]||'other');
       current.push({id:'db:'+record.id,title:record.title,url,type:'file',group,origin:'published',
         context:(record.unit_title||'')+' · منشور بمراجعة إدارية',children:[],year:record.exam_year||null});
       existing.add(url);
     }
     for(const unit of units){
       if(unit.is_published!==true||!recordMatches(unit,branch,specialization))continue;
       if(identityForLegacy(unit,branch,specialization)!==model.id)continue;
       current.push({id:'unit:'+unit.id,title:unit.title,url:null,type:'folder',group:'lessons',origin:'editorial-unit',
         context:'وحدة مضافة من الإدارة',children:current.filter(x=>x.origin==='published'&&x.context.startsWith(unit.title+' ·'))
           .map(x=>({title:x.title,url:x.url,type:'file',year:x.year})),year:null});
     }
     model.items=current;
     const types=(typeof window!=='undefined'&&window.BacSubjectCatalog?.types)||[
       {id:'lessons',name:'دروس'},{id:'exercises',name:'تمارين'},{id:'summaries',name:'ملخصات'},
       {id:'tests',name:'اختبارات'},{id:'bac',name:'بكالوريا'},{id:'other',name:'أخرى'}];
     model.groups=types.map(group=>({...group,items:current.filter(x=>x.group===group.id)})).filter(x=>x.items.length);
     model.count=current.reduce((n,x)=>n+1+(x.children?.length||0),0);
   }
   return models;
 }
 return {year,branches,subjectNames,definitions,branchLabels,inTrack,list,normalize,identityForLegacy,recordMatches,overlay};
});