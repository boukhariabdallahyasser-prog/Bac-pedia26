/* BAC-PEDIA: source-backed searchable catalog.
   No scraping, no assumed official curricula, and no claims that Drive links are public.
   Pure functions support browser usage and Node regression tests. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.BacIndex=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const branchTitles={math:'رياضيات',science:'علوم تجريبية',tech:'تقني رياضي',
  literature:'آداب وفلسفة',languages:'لغات أجنبية',economy:'تسيير واقتصاد'};
 const groupTitles={lessons:'دروس ووحدات',exercises:'تمارين وتطبيقات',summaries:'ملخصات ومراجع',
   tests:'فروض واختبارات',bac:'مواضيع بكالوريا',other:'موارد أخرى'};
 const aliases={
  math_math:'رياضيات math mathematics maths mathematiques',math_science:'رياضيات math mathematics maths',
  math_lit:'رياضيات math maths',math_eco:'رياضيات math maths',
  physics_math:'فيزياء علوم فيزيائية physique physics',physics_science:'فيزياء علوم فيزيائية physique physics',
  natural_math:'علوم طبيعية علوم الطبيعة والحياة svt biology sciences',
  arabic_sci:'لغة عربية arabe arabic',arabic_lit:'لغة عربية arabe arabic',
  french_sci:'فرنسية français francais french',french_lit:'فرنسية français francais french',
  english_sci:'إنجليزية انجليزية anglais english',english_lit:'إنجليزية انجليزية anglais english',
  history_sci:'تاريخ جغرافيا histoire geographie',history_lit:'تاريخ جغرافيا histoire geographie',
  islamic:'اسلامية تربية إسلامية شريعة islamique',
  philo_sci:'فلسفة philosophie philo',philo_lit:'فلسفة philosophie philo',philo_lang:'فلسفة philosophie philo',
  tech_subject:'تكنولوجيا هندسة كهربائية engineering electrique electrical technology',
  third_lang:'اللغة الثالثة المانية اسبانية ايطالية allemand allemand espagnol italiano',
  economy_subject:'تسيير اقتصاد محاسبة gestion economie management',
  law:'القانون droit law'
 };
 function normalize(raw){
  return String(raw??'').normalize('NFKD').toLowerCase()
   .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,'')
   .replace(/[أإآٱ]/g,'ا').replace(/[ى]/g,'ي').replace(/ة/g,'ه')
   .replace(/[_.,،:;!?'"“”(){}\[\]/\\\u200c\u200f\u200e-]+/g,' ')
   .replace(/[\s-]+/g,' ').trim();
 }
 function safeUrl(value){
  try{
   const u=new URL(value);
   if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.'))return null;
   return u.href;
  }catch{return null}
 }
 function detectYear(text){
  const all=String(text||'').match(/(?:19|20)\d{2}/g)||[];
  const y=all.map(Number).find(v=>v>=1990&&v<=2027);
  return y||null;
 }
 const scopesFor=(b,s)=>b+':'+(s||'');
 function build(manifest,education,taxonomy){
  if(!manifest||manifest.schemaVersion!==1||!manifest.subjects||
     !education?.branches||typeof education.list!=='function'||
     typeof taxonomy?.build!=='function')return [];
  const indexed=new Map();
  for(const branch of Object.keys(education.branches)){
   const specializations=education.branches[branch].subspecialties||{};
   const specKeys=Object.keys(specializations);
   const options=specKeys.length?specKeys:[null];
   for(const spec of options){
    const models=taxonomy.build({
     manifest,branch,subBranch:spec,subjects:education.list(branch,spec)
    });
    for(const model of models){
     for(const resource of model.items||[]){
      const sources=[resource,...(resource.children||[]).map(child=>({
       ...child,origin:resource.origin,group:resource.group,
       context:resource.context,parent:resource.title,year:child.year||resource.year
      }))];
      for(const s of sources){
       const url=safeUrl(s.url);if(!url)continue;
       const key=model.id+'|'+url+'|'+(s.group||'other');
       let existing=indexed.get(key);
       if(!existing){
        const title=String(s.title||'').trim();
        const parent=String(s.parent||'').trim();
        const kind=s.type==='folder'?'folder':
         /\.pdf$/i.test(title)||/\.pdf(?:$|\?)/i.test(url)?'pdf':'file';
        existing={
         id:key,title,url,subjectId:model.id,subject:model.name,
         group:s.group||'other',kind,context:String(s.context||''),parent,
         year:s.year||detectYear(title)||detectYear(parent),
         source:'drive-index',access:'unverified',scopes:[],
         searchText:''
        };
        indexed.set(key,existing);
       }
       const scope=scopesFor(branch,spec);
       if(!existing.scopes.includes(scope))existing.scopes.push(scope);
      }
     }
    }
   }
  }
  const items=[...indexed.values()];
  for(const item of items){
   const branchNames=item.scopes.map(x=>branchTitles[x.split(':')[0]]||x).join(' ');
   item.searchText=normalize([item.title,item.subject,aliases[item.subjectId]||'',item.parent,
    item.context,groupTitles[item.group]||'',branchNames,item.year||''].join(' '));
  }
  return items;
 }
 function matchesScope(item,branch,spec){
  if(!branch)return true;
  return item.scopes.some(scope=>{
   const [b,s]=scope.split(':');
   return b===branch&&(!spec||s===spec);
  });
 }
 function search(items,filters={}){
  if(!Array.isArray(items))return [];
  const query=normalize(filters.query||'');
  const terms=query.split(' ').filter(Boolean);
  const sort=['relevance','az','year'].includes(filters.sort)?filters.sort:'relevance';
  const out=[];
  for(const item of items){
   if(!matchesScope(item,filters.branch,filters.specialization))continue;
   if(filters.subjectId&&item.subjectId!==filters.subjectId)continue;
   if(filters.group&&item.group!==filters.group)continue;
   if(filters.kind&&item.kind!==filters.kind)continue;
   if(filters.year&&Number(item.year)!==Number(filters.year))continue;
   const text=item.searchText||normalize(item.title+' '+item.subject+' '+item.parent);
   if(!terms.every(term=>text.includes(term)))continue;
   let score=0;
   if(query){
    const title=normalize(item.title),subject=normalize(item.subject),parent=normalize(item.parent);
    if(title===query)score+=100;
    else if(title.startsWith(query))score+=65;
    else if(title.includes(query))score+=48;
    if(subject===query)score+=34;
    else if(subject.includes(query))score+=18;
    if(parent.includes(query))score+=15;
    for(const term of terms)if(title.includes(term))score+=5;
   }
   // Direct indexed PDFs get a small advantage over broad folders only when searching.
   if(query&&item.kind==='pdf')score+=3;
   out.push({...item,score});
  }
  if(sort==='az')out.sort((a,b)=>a.title.localeCompare(b.title,'ar'));
  else if(sort==='year')out.sort((a,b)=>(b.year||0)-(a.year||0)||b.score-a.score||a.title.localeCompare(b.title,'ar'));
  else out.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'ar'));
  return out;
 }
 function facets(items){
  const groups={},kinds={},years={};
  for(const item of items){
   groups[item.group]=(groups[item.group]||0)+1;
   kinds[item.kind]=(kinds[item.kind]||0)+1;
   if(item.year)years[item.year]=(years[item.year]||0)+1;
  }
  return {total:items.length,groups,kinds,years};
 }
 return {normalize,safeUrl,detectYear,build,search,facets,branchTitles,groupTitles,aliases};
});