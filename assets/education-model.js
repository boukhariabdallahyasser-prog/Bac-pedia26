/* Existing Bac-pedia educational tracks. Educational metadata is editorial:
   no inference of new subjects, official yearly coefficients, or unverified curricula. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.BacEducation=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const branches={
 math:{name:'رياضيات',subspecialties:{}},
 science:{name:'علوم تجريبية',subspecialties:{}},
 tech:{name:'تقني رياضي',subspecialties:{electrical:'هندسة كهربائية',mechanical:'هندسة ميكانيكية',civil:'هندسة مدنية',process:'هندسة الطرائق'}},
 literature:{name:'آداب وفلسفة',subspecialties:{}},
 languages:{name:'لغات أجنبية',subspecialties:{german:'الألمانية',spanish:'الإسبانية',italian:'الإيطالية'}},
 economy:{name:'تسيير واقتصاد',subspecialties:{}}
};
const subjectNames={
 math_math:'الرياضيات',math_science:'الرياضيات',math_lit:'الرياضيات',math_eco:'الرياضيات',
 physics_math:'الفيزياء',physics_science:'الفيزياء',natural_math:'العلوم الطبيعية',
 arabic_sci:'اللغة العربية',arabic_lit:'اللغة العربية',french_sci:'اللغة الفرنسية',
 french_lit:'اللغة الفرنسية',english_sci:'اللغة الإنجليزية',english_lit:'اللغة الإنجليزية',
 history_sci:'التاريخ والجغرافيا',history_lit:'التاريخ والجغرافيا',islamic:'العلوم الإسلامية',
 philo_sci:'الفلسفة',philo_lit:'الفلسفة',philo_lang:'الفلسفة',
 tech_subject:'الهندسة الكهربائية',third_lang:'اللغة الأجنبية الثالثة',
 economy_subject:'التسيير والاقتصاد',math_eco:'الرياضيات',law:'القانون'
};
const definitions={
 math:['math_math','physics_math','natural_math','arabic_sci','french_sci','english_sci','history_sci','islamic','philo_sci'],
 science:['math_science','physics_science','natural_math','arabic_sci','french_sci','english_sci','history_sci','islamic','philo_sci'],
 tech:['math_math','physics_math','tech_subject','arabic_sci','french_sci','english_sci','history_sci','islamic','philo_sci'],
 literature:['arabic_lit','philo_lit','history_lit','french_lit','english_lit','math_lit','islamic'],
 languages:['arabic_lit','french_lit','english_lit','third_lang','history_lit','philo_lang','math_lit','islamic'],
 economy:['economy_subject','law','math_eco','arabic_lit','french_lit','english_lit','history_lit','islamic']
};
function normalize(value){
 return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .replace(/[\u064b-\u065f]/g,'').replace(/[أآإ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ');
}
function inTrack(branch,specialization,id){
 if(!definitions[branch]?.includes(id))return false;
 if(id==='tech_subject')return specialization==='electrical';
 if(id==='third_lang')return !specialization||Object.hasOwn(branches.languages.subspecialties,specialization);
 return true;
}
function list(branch,specialization){
 if(!branches[branch])return [];
 return definitions[branch].filter(id=>inTrack(branch,specialization,id)).map(id=>({
  id,name:id==='third_lang'&&specialization?'اللغة '+branches.languages.subspecialties[specialization]:subjectNames[id],
  branches:[branch],icon:'fa-solid fa-book',desc:'المادة موجودة في بنية الموقع، وتحتاج مصادر موثوقة ومفهرسة.'
 }));
}
function identityForLegacy(record,branch,specialization){
 if(record?.subject_key)return inTrack(branch,specialization,record.subject_key)?record.subject_key:null;
 const matches=list(branch,specialization).filter(x=>normalize(x.name)===normalize(record?.subject));
 return matches.length===1?matches[0].id:null;
}
function recordMatches(record,branch,specialization){
 if(!record||!branches[branch])return false;
 const scoped=record.academic_branch||record.branch_code;
 if(scoped&&scoped!=='جميع الشعب'&&scoped!==branches[branch].name&&scoped!==branch)return false;
 if(record.specialization_code&&record.specialization_code!==specialization)return false;
 return !!identityForLegacy(record,branch,specialization);
}
function overlay(models,resources=[],units=[],branch,specialization){
 if(!Array.isArray(models))return [];
 const types=(typeof window!=='undefined'&&window.BacSubjectCatalog?.types)||[
   {id:'lessons',name:'الدروس'},{id:'exercises',name:'التمارين'},{id:'summaries',name:'الملخصات'},
   {id:'tests',name:'الاختبارات'},{id:'bac',name:'البكالوريا'},{id:'other',name:'أخرى'}];
 for(const model of models){
  const items=[...(model.items||[])];
  const seen=new Set(items.filter(x=>x.url).map(x=>x.url));
  for(const r of resources){
   if(r.status!=='approved'||!recordMatches(r,branch,specialization)||identityForLegacy(r,branch,specialization)!==model.id)continue;
   const url=typeof r.resource_url==='string'&&/^https:\/\//.test(r.resource_url)?r.resource_url:null;
   if(!url||seen.has(url))continue;
   const group=types.some(x=>x.id===r.content_group)?r.content_group:
    ({lesson:'lessons',summary:'summaries',exercise:'exercises',exam:'tests'}[r.resource_kind]||'other');
   items.push({id:'db:'+r.id,title:r.title,url,type:'file',group,origin:'published',
    context:(r.unit_title||'')+' · مورد منشور',children:[],year:r.exam_year||null});
   seen.add(url);
  }
  for(const u of units){
   if(u.is_published!==true||!recordMatches(u,branch,specialization)||identityForLegacy(u,branch,specialization)!==model.id)continue;
   items.push({id:'unit:'+u.id,title:u.title,url:null,type:'folder',group:'lessons',
    origin:'editorial-unit',context:'وحدة أضافتها الإدارة',children:items.filter(x=>x.origin==='published'&&x.context.startsWith(u.title+' ·'))
      .map(x=>({title:x.title,url:x.url,type:'file',year:x.year})),year:null});
  }
  model.items=items;
  model.groups=types.map(type=>({...type,items:items.filter(x=>x.group===type.id)})).filter(g=>g.items.length);
  model.count=items.reduce((n,x)=>n+1+(x.children?.length||0),0);
 }
 return models;
}
return {branches,definitions,subjectNames,normalize,inTrack,list,identityForLegacy,recordMatches,overlay};
});