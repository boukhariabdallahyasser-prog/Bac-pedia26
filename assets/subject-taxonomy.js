/* Bac-pedia: subject -> unit -> content kind. All classifications remain traceable to resources.json. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BacSubjectCatalog=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const types=[
  {id:'lessons',name:'الدروس والوحدات',description:'وحدات المنهاج والمجلدات التعليمية'},
  {id:'exercises',name:'التمارين والتطبيقات',description:'سلاسل وتطبيقات للتدريب'},
  {id:'summaries',name:'الملخصات والمراجع',description:'كتب ومراجعات ومنهجيات'},
  {id:'tests',name:'الفروض والاختبارات',description:'اختبارات فصلية ومواضيع تدريبية'},
  {id:'bac',name:'مواضيع البكالوريا',description:'مواضيع مفهرسة حسب المادة والسنوات المتاحة'},
  {id:'other',name:'موارد أخرى',description:'ملفات لا يسمح عنوانها بتصنيف أدق'}
];
const family={
 math_math:'math',math_science:'math',math_lit:'math',math_eco:'math',
 physics_math:'physics',physics_science:'physics',
 natural_math:'natural',natural_science:'natural',
 arabic_sci:'arabic',arabic_lit:'arabic',
 french_sci:'french',french_lit:'french',
 english_sci:'english',english_lit:'english',
 history_sci:'history',history_lit:'history',
 islamic:'islamic',philo_sci:'philo',philo_lit:'philo',philo_lang:'philo',philo_tech:'philo',
 tech_subject:'tech',third_lang:'third',economy_subject:'economy',law:'law'
};
function normalize(value){
 return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064b-\u065f]/g,'')
   .replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
}
function safeUrl(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}
 catch{return null}
}
function groupFor(title,forced){
 if(forced)return forced;
 const text=normalize(title);
 if(/بكالوريا|بكالوريات|bac blanc|annale|sujet bac/.test(text))return 'bac';
 if(/تمارين|تمرين|تطبيق|انشطه|سلسله|exercices?|exercises?|td\b/.test(text))return 'exercises';
 if(/ملخص|مراجعه|كتاب|كتب|مراجع|مصطلحات|منهجيه|method|paragraph|بروتوكول|نصوص علميه|مكتسبات|تحويلات/.test(text))return 'summaries';
 if(/مواضيع|فروض|فرض|اختبارات|اختبار|مراقبه|امتحانات|examens?|compo\b|devoir/.test(text))return 'tests';
 if(/درس|دروس|الوحده|الوحدة|دوال|متتاليات|الاحتمالات|اعداد مركبه|قسمه|الظواهر|المتابعه|علوم طبيعيه/.test(text))return 'lessons';
 return 'other';
}
function matchFamily(value){
 const t=normalize(value).replace(/^مادة\s+/, '').replace(/^ماده\s+/,'').trim();
 if(/^(الرياضيات|رياضيات|maths?|mathematiques?)$/.test(t))return 'math';
 if(/^(الفيزياء|فيزياء|physique|physics|العلوم الفيزيائيه)$/.test(t))return 'physics';
 if(/^(العلوم الطبيعيه|علوم الطبيعه والحياه|علوم|sciences|science|svt)$/.test(t))return 'natural';
 if(/^(الاجتماعيات|تاريخ وجغرافيا|التاريخ والجغرافيا|اجتماعيات)$/.test(t))return 'history';
 if(/^(اللغه العربيه وادابها|اللغه العربيه|عربيه|العربيه|arabe)$/.test(t))return 'arabic';
 if(/^(اللغه الفرنسيه|فرنسيه|الفرنسيه|francais|francese)$/.test(t))return 'french';
 if(/^(اللغه الانجليزيه|انجليزيه|الانجليزيه|english)$/.test(t))return 'english';
 if(/^(الشريعه الاسلاميه|العلوم الاسلاميه|شريعه|اسلاميه)$/.test(t))return 'islamic';
 if(/^(الفلسفه|فلسفه|philosophie)$/.test(t))return 'philo';
 if(/^(الهندسه الكهربائيه|تكنولوجيا|التكنولوجيا)$/.test(t))return 'tech';
 return null;
}
function filenameFamily(name){
 const t=normalize(name);
 const suffix=t.match(/(?:devoir|compo|bacblanc)[0-9]*\s+(ar|fr|ang|maths|phys|sci|islam|hg)(?:\.pdf)?$/);
 if(suffix)return {ar:'arabic',fr:'french',ang:'english',maths:'math',phys:'physics',sci:'natural',islam:'islamic',hg:'history'}[suffix[1]];
 const matches=[
  ['math',/رياضيات|matheux|maths?|mathem/],['physics',/فيزياء|physique|physics/],
  ['natural',/علوم طبيعيه|علوم الطبيعه|sciences 3as/],['arabic',/اللغه العربيه/],
  ['english',/اللغه الانجليزيه|english/],['french',/اللغه الفرنسيه|francais|francese/],
  ['history',/تاريخ و جغرافيا|تاريخ وجغرافيا/],['islamic',/اسلاميه|شريعه/],
  ['philo',/فلسفه/],['tech',/هندسه كهربائيه/]
 ].filter(([,re])=>re.test(t)).map(x=>x[0]);
 return matches.length===1?matches[0]:null;
}
function applies(root,branch,subBranch){
 return !!root&&(!Array.isArray(root.branches)||root.branches.includes(branch))&&
   (!Array.isArray(root.subBranches)||root.subBranches.includes(subBranch));
}
function build({manifest,branch,subBranch,subjects=[]}){
 const roots=manifest?.subjects||{};
 const visible=subjects.filter(x=>x&&!x.special&&(!x.branches||x.branches.includes(branch))&&
   (!Array.isArray(x.subBranches)||x.subBranches.includes(subBranch)));
 const result=visible.map(x=>({id:x.id,name:x.name,icon:x.icon||'fa-solid fa-book',family:family[x.id]||x.id,
   description:x.desc||'',sourceUrl:safeUrl(roots[x.id]?.url)||safeUrl(x.url),
   indexed:Boolean(roots[x.id]),items:[],count:0}));
 const byFamily=new Map();
 for(const item of result)if(!byFamily.has(item.family))byFamily.set(item.family,item);
 const dedup=new Set();
 function attach(target,raw,group,origin,context){
   if(!target||!raw||typeof raw!=='object'||!raw.title)return;
   const url=safeUrl(raw.url);
   if(!url&&!Array.isArray(raw.items)&&!Array.isArray(raw.categories))return;
   const title=String(raw.title).trim();
   const key=target.id+'|'+(url||String(raw.id||title))+'|'+group;
   if(dedup.has(key))return;
   dedup.add(key);
   const children=[...(raw.categories||[]),...(raw.items||[])].filter(x=>safeUrl(x?.url)).map(x=>({
     title:String(x.title||'مورد'),url:safeUrl(x.url),type:x.type==='file'||x.type==='shortcut'?'file':'folder',
     year:/^(19|20)\d{2}(?:\s*\.pdf)?$/i.test(String(x.title||''))?Number(String(x.title).slice(0,4)):null
   }));
   const entry={id:String(raw.id||raw.driveId||title),title,url,group:group||groupFor(title),type:raw.type==='file'||raw.type==='shortcut'?'file':'folder',
      origin,context:context||'',children,year:/^(19|20)\d{2}(?:\s*\.pdf)?$/i.test(title)?Number(title.slice(0,4)):null};
   target.items.push(entry);target.count+=1+children.length;
 }
 for(const subject of result){
   const root=roots[subject.id];if(!applies(root,branch,subBranch))continue;
   for(const c of [...(root.categories||[]),...(root.items||[])])attach(subject,c,groupFor(c.title),'subject','');
 }
 function special(id){
  const root=roots[id];return applies(root,branch,subBranch)?root:null;
 }
 const bac=special('bac_math');
 if(bac&&branch==='math'){
  for(const category of bac.categories||[]){
    const group=byFamily.get(matchFamily(category.title));
    attach(group,category,'bac','bac_math','شعبة رياضيات · مادة '+(group?.name||category.title));
  }
 }
 const summary=special('summaries_math');
 if(summary){
  for(const category of summary.categories||[]){
   const target=byFamily.get(matchFamily(category.title));
   attach(target,category,'summaries','summaries_math','ملخصات شعبة رياضيات');
  }
 }
 const tech=special('summaries_tech');
 if(tech&&branch==='tech'&&subBranch==='electrical'){
  for(const item of tech.items||[])attach(byFamily.get('tech'),item,'summaries','summaries_tech','الهندسة الكهربائية');
 }
 const exams=special('exams');
 if(exams){
  for(const item of exams.items||[]){
   // General exam names are attached only when the filename unambiguously identifies the subject.
   const target=byFamily.get(filenameFamily(item.title));
   if(target)attach(target,item,'tests','exams','فروض واختبارات عامة');
  }
 }
 const mocks=special('mock_bac');
 if(mocks){
  for(const item of mocks.items||[]){
   const target=byFamily.get(filenameFamily(item.title));
   if(target)attach(target,item,groupFor(item.title,'tests'),'mock_bac','بكالوريات تجريبية أو ملفات مراجعة');
  }
 }
 for(const subject of result){
   subject.items.sort((a,b)=>types.findIndex(t=>t.id===a.group)-types.findIndex(t=>t.id===b.group));
   subject.groups=types.map(type=>({...type,items:subject.items.filter(item=>item.group===type.id)})).filter(x=>x.items.length);
 }
 return result;
}
return {types,family,normalize,safeUrl,groupFor,matchFamily,filenameFamily,build};
});
