/* Public BAC resource finder. Never reads or writes private accounts. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const node=(tag,cls,value)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(value!==undefined)el.textContent=String(value);
 return el;
};
const keys=['query','branch','specialization','subjectId','group','kind','year','sort'];
const params={query:'q',branch:'branch',specialization:'spec',subjectId:'subject',
 group:'type',kind:'format',year:'year',sort:'sort'};
const filters={query:'',branch:'',specialization:'',subjectId:'',group:'',kind:'',year:'',sort:'relevance'};
let items=[],results=[],pageSize=24,current=24,loading=false,error=null,request=0;
const index=()=>window.BacIndex;
const model=()=>window.BacEducation;
function option(value,label){
 const el=node('option','',label);el.value=value;return el;
}
function setOptions(el,rows,selected){
 el.replaceChildren(...rows.map(([key,label])=>option(key,label)));
 el.value=rows.some(x=>x[0]===selected)?selected:'';
}
function readUrl(){
 const url=new URL(location.href);
 for(const key of keys)filters[key]=(url.searchParams.get(params[key])||'').slice(0,key==='query'?120:90);
 if(!['relevance','az','year'].includes(filters.sort))filters.sort='relevance';
 if(!Object.hasOwn(model()?.branches||{},filters.branch))filters.branch='';
 const options=model()?.branches[filters.branch]?.subspecialties||{};
 if(!Object.hasOwn(options,filters.specialization))filters.specialization='';
}
function saveUrl(){
 const url=new URL(location.href);
 for(const key of keys){
  const value=filters[key];
  if(value&&(key!=='sort'||value!=='relevance'))url.searchParams.set(params[key],value);
  else url.searchParams.delete(params[key]);
 }
 history.replaceState({},'',url.pathname+url.search);
}
function renderControls(){
 $('discoveryQuery').value=filters.query;
 const branches=model()?.branches||{};
 setOptions($('discoveryBranch'),[['','جميع الشعب'],...Object.entries(branches).map(([key,val])=>[key,val.name])],filters.branch);
 const opts=branches[filters.branch]?.subspecialties||{};
 const hasSub=Object.keys(opts).length>0;
 $('discoverySpecializationWrap').hidden=!hasSub;
 setOptions($('discoverySpecialization'),[['','جميع التخصصات'],...Object.entries(opts)],filters.specialization);
 const descriptor=filters.branch?model()?.list(filters.branch,filters.specialization||null)||[]:[];
 $('discoverySubject').disabled=!filters.branch;
 setOptions($('discoverySubject'),[['','جميع المواد'],...descriptor.map(s=>[s.id,s.name])],filters.subjectId);
 setOptions($('discoveryGroup'),[['','جميع الأنواع'],...Object.entries(index()?.groupTitles||{})],filters.group);
 setOptions($('discoveryKind'),[['','الملفات والمجلدات'],['pdf','PDF'],['file','ملف'],['folder','مجلد']],filters.kind);
 $('discoverySort').value=filters.sort;
}
function assignFromControls(){
 filters.query=$('discoveryQuery').value.trim().slice(0,120);
 filters.branch=$('discoveryBranch').value;
 filters.specialization=$('discoverySpecializationWrap').hidden?'':$('discoverySpecialization').value;
 filters.subjectId=$('discoverySubject').disabled?'':$('discoverySubject').value;
 filters.group=$('discoveryGroup').value;filters.kind=$('discoveryKind').value;
 filters.year=$('discoveryYear').value;filters.sort=$('discoverySort').value;
}
function syncYearOptions(){
 // Year selections are derived solely from filenames, not verified official exam dates.
 const withoutYear=index().search(items,{...filters,year:''});
 const years=Object.keys(index().facets(withoutYear).years).map(Number).sort((a,b)=>b-a);
 const values=[['','كل السنوات'],...years.map(y=>[String(y),y+' مذكورة في العنوان'])];
 if(filters.year&&!years.some(y=>String(y)===filters.year))filters.year='';
 setOptions($('discoveryYear'),values,filters.year);
}
function summary(count){
 if(error)return 'تعذّر تحميل فهرس المصادر؛ حاول تحديث الصفحة.';
 if(loading)return 'جار تحميل الفهرس والبحث بين الملفات...';
 const scope=filters.branch?' ضمن شعبة '+(model()?.branches[filters.branch]?.name||''):' عبر جميع الشعب';
 if(!count)return 'لم يُعثر على موارد تطابق الفلاتر'+scope+'. جرّب كلمات أقل أو وسّع نطاق البحث.';
 return count+' نتيجة من ملفات ومجلدات الفهرس'+scope+'. قد يشير الرابط إلى ملف خاص أو مجلد يتطلب إذن الدخول.';
}
function makeResourceCard(item){
 const card=node('article','discovery-card');
 const meta=node('div','discovery-card-meta');
 meta.append(node('span','discovery-type',index().groupTitles[item.group]||'مورد'),
  node('span','discovery-format',item.kind==='pdf'?'PDF':item.kind==='folder'?'مجلد':'ملف'));
 if(item.year)meta.append(node('span','discovery-year',String(item.year)+' (في الاسم)'));
 card.append(meta,node('h3','',item.title),
  node('p','discovery-hierarchy',item.subject+(item.parent?' / '+item.parent:'')));
 const scopes=[...new Set(item.scopes.map(k=>k.split(':')[0]))];
 const branchLine=node('div','discovery-card-branches');
 for(const code of scopes.slice(0,3))
  branchLine.append(node('span','',model()?.branches[code]?.name||code));
 if(scopes.length>3)branchLine.append(node('span','','+'+(scopes.length-3)));
 card.append(branchLine);
 const footer=node('div','discovery-card-footer');
 footer.append(node('small','','المصدر: فهرس روابط خارجي · الوصول العام غير مؤكد'));
 const link=node('a','discovery-open',item.kind==='folder'?'فتح المجلد':'فتح المصدر');
 link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
 link.setAttribute('aria-label','فتح المصدر الخارجي: '+item.title);
 footer.append(link);card.append(footer);
 return card;
}
function renderResults(){
 const host=$('discoveryResults');host.replaceChildren();
 if(loading){host.append(node('div','discovery-empty','جار تجهيز الفهرس...'));return}
 if(error){host.append(node('div','discovery-empty',summary(0)));return}
 $('discoveryCount').textContent=String(results.length);
 $('discoverySummary').textContent=summary(results.length);
 if(!results.length){
  const empty=node('div','discovery-empty');
  empty.append(node('strong','','لا توجد نتائج مطابقة'),
    node('p','','جرّب إزالة السنة أو تغيير الشعبة، أو ابحث بالكلمة الأساسية فقط.'));
  const btn=node('button','discovery-reset-inline','عرض كل الموارد');
  btn.type='button';btn.addEventListener('click',reset);empty.append(btn);host.append(empty);
 }else{
  for(const item of results.slice(0,current))host.append(makeResourceCard(item));
 }
 const more=$('discoveryMore');
 more.hidden=results.length<=current;
 if(!more.hidden)more.textContent='عرض '+Math.min(24,results.length-current)+' نتيجة أخرى';
}
function update(updateUrl=true){
 if(!items.length&&loading){renderResults();return}
 syncYearOptions();
 results=index().search(items,filters);
 current=pageSize;
 if(updateUrl)saveUrl();
 renderResults();
}
function reset(){
 Object.assign(filters,{query:'',branch:'',specialization:'',subjectId:'',group:'',kind:'',year:'',sort:'relevance'});
 renderControls();update();$('discoveryQuery').focus({preventScroll:true});
}
function change(){assignFromControls();update()}
async function share(){
 saveUrl();const url=location.href,button=$('discoveryShare');const old=button.textContent;
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
  await navigator.clipboard.writeText(url);
  button.textContent='تم نسخ رابط البحث';
 }catch{button.textContent='انسخ الرابط من شريط المتصفح';$('discoveryQuery').focus()}
 setTimeout(()=>{button.textContent=old},2400);
}
async function initIndex(){
 if(loading)return;loading=true;error=null;
 $('discoveryCount').textContent='...';$('discoverySummary').textContent=summary(0);renderResults();
 const id=++request;
 try{
  const response=await fetch('/resources.json',{cache:'force-cache'});
  if(!response.ok)throw new Error('Resource catalog HTTP '+response.status);
  const manifest=await response.json();
  if(!index()||!model())throw new Error('Search index scripts not loaded');
  const built=index().build(manifest,model(),window.BacSubjectCatalog);
  if(!Array.isArray(built))throw new Error('Invalid index');
  if(id!==request)return;
  items=built;loading=false;error=null;renderControls();update(false);
 }catch(e){
  console.warn('BAC resource index load error',e);
  error=e;loading=false;$('discoveryCount').textContent='0';$('discoverySummary').textContent=summary(0);renderResults();
 }
}
function init(){
 if(document.body?.dataset.portal!=='discover'||!$('discoveryForm'))return;
 readUrl();renderControls();
 $('discoveryForm').addEventListener('submit',event=>{event.preventDefault();change()});
 for(const id of ['discoveryBranch','discoverySpecialization','discoveryGroup','discoveryKind','discoveryYear','discoverySort']){
  $(id).addEventListener('change',()=>{
   assignFromControls();
   if(id==='discoveryBranch'){filters.subjectId='';filters.specialization='';renderControls()}
   if(id==='discoverySpecialization'){filters.subjectId='';renderControls()}
   update();
  });
 }
 $('discoverySubject').addEventListener('change',change);
 $('discoveryReset').addEventListener('click',reset);
 $('discoveryShare').addEventListener('click',()=>void share());
 $('discoveryMore').addEventListener('click',()=>{current+=pageSize;renderResults()});
 for(const e of document.querySelectorAll('[data-example]'))
  e.addEventListener('click',()=>{filters.query=e.dataset.example;renderControls();update()});
 document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
   event.preventDefault();$('discoveryQuery').focus();$('discoveryQuery').select();
  }
  if(event.key==='Escape'&&document.activeElement===$('discoveryQuery'))$('discoveryQuery').blur();
 });
 addEventListener('popstate',()=>{readUrl();renderControls();update(false)});
 void initIndex();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.BacDiscovery={reset,search:()=>index()?.search(items,filters)||[],getCount:()=>items.length};
})();