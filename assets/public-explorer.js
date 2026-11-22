/* Public, read-only BAC discovery. Every result is traceable to resources.json.
   This page does not need an account or expose private data. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const create=(tag,cls,value)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(value!==undefined)element.textContent=String(value);
 return element;
};
const state={branch:'math',specialization:null,subjectId:null,query:'',manifest:null,loading:false,error:null};
const model=()=>window.BacEducation;
const taxonomy=()=>window.BacSubjectCatalog;
const iconByBranch={math:'fa-solid fa-square-root-variable',science:'fa-solid fa-flask',
 tech:'fa-solid fa-gears',literature:'fa-solid fa-feather',languages:'fa-solid fa-language',economy:'fa-solid fa-chart-line'};
function sourceLabel(item){
 if(item.origin==='published')return 'مورد منشور';
 return item.type==='folder'?'مجلد Drive':'ملف مفهرس';
}
function safeUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}
}
function button(label,onclick,cls='public-subject-button'){
 const element=create('button',cls,label);
 element.type='button';element.addEventListener('click',onclick);return element;
}
function link(url,label){
 const href=safeUrl(url);if(!href)return null;
 const a=create('a','public-source-link',label);
 a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function availableSubjects(){
 const m=model(),tax=taxonomy();
 if(!m)return [];
 const descriptors=m.list(state.branch,state.specialization);
 if(!state.manifest||!tax)return descriptors.map(s=>({...s,items:[],groups:[],indexed:false}));
 return tax.build({manifest:state.manifest,branch:state.branch,subBranch:state.specialization,subjects:descriptors});
}
function normalize(text){return taxonomy()?.normalize(text)||model()?.normalize(text)||String(text||'').toLowerCase()}
function branchName(){return model()?.branches[state.branch]?.name||'الشعبة'}
function statusElement(text,cls='public-explorer-note'){return create('p',cls,text)}
function control(){
 const wrap=create('div','public-subject-nav');
 const breadcrumb=create('nav','public-explorer-breadcrumb');
 breadcrumb.setAttribute('aria-label','مسار تصفح المواد');
 breadcrumb.append(button('كل مواد '+branchName(),()=>{state.subjectId=null;render()},'public-crumb'));
 const selected=availableSubjects().find(s=>s.id===state.subjectId);
 if(selected)breadcrumb.append(create('span','public-sep','/'),create('strong','',selected.name));
 wrap.append(breadcrumb);
 const subtypes=model()?.branches[state.branch]?.subspecialties||{};
 if(Object.keys(subtypes).length){
  if(!state.specialization||!subtypes[state.specialization])state.specialization=Object.keys(subtypes)[0];
  const spec=create('select','public-specialization-select');
  spec.setAttribute('aria-label',state.branch==='tech'?'تخصص تقني رياضي':'اللغة الأجنبية الثالثة');
  for(const [code,name] of Object.entries(subtypes)){
   const o=create('option','',name);o.value=code;spec.append(o);
  }
  spec.value=state.specialization;
  spec.addEventListener('change',event=>{state.specialization=event.target.value;state.subjectId=null;render()});
  const label=create('label','public-specialization-label',state.branch==='tech'?'التخصص الهندسي':'اللغة الثالثة');
  label.append(spec);wrap.append(label);
 }
 return wrap;
}
function cardForSubject(item){
 const card=create('article','public-subject-card');
 const heading=create('div','public-subject-heading');
 const icon=create('span','public-subject-icon');
 icon.append(create('i',item.icon||iconByBranch[state.branch]));heading.append(icon,create('h3','',item.name));
 card.append(heading);
 const n=item.items?.length||0;
 card.append(statusElement(n?n+' رابط أو مجلد مفهرس':'لم تُفهرس موارد لهذه المادة بعد','public-subject-note'));
 const actions=create('div','public-subject-actions');
 actions.append(button('عرض الموارد',()=>{
   state.subjectId=item.id;render();
   if(window.matchMedia('(max-width: 750px)').matches)
    $('publicExplorerDetail')?.scrollIntoView({block:'start',behavior:'auto'});
 },'public-primary'));
 const source=link(item.sourceUrl,'فتح مصدر المادة');
 if(source)actions.append(source);
 card.append(actions);
 return card;
}
function visibleResource(item){
 const query=normalize(state.query);
 return !query||normalize([item.title,item.context,...(item.children||[]).map(c=>c.title)].join(' ')).includes(query);
}
function resourceCard(item){
 const card=create('article','public-resource-row');
 const body=create('div','public-resource-copy');
 body.append(create('span','public-resource-type',sourceLabel(item)),create('strong','',item.title));
 if(item.context)body.append(create('small','',item.context));
 if(item.children?.length)body.append(create('small','',item.children.length+' ملف داخل هذا المجلد حسب الفهرس'));
 card.append(body);
 const actions=create('div','public-resource-actions');
 const primary=link(item.url,item.type==='folder'?'فتح المجلد':'فتح الملف');
 if(primary)actions.append(primary);
 if(item.children?.length){
  const details=create('details','public-resource-children');
  const summary=create('summary','','عرض الملفات المفهرسة');
  const list=create('div','public-resource-child-list');
  for(const child of item.children.slice(0,30)){
   const row=create('div','public-resource-child');
   row.append(create('span','',child.title));
   const a=link(child.url,'عرض');if(a)row.append(a);
   list.append(row);
  }
  if(item.children.length>30)list.append(statusElement('عرض أول 30 ملفاً فقط. افتح المجلد الأصلي لبقية الملفات.'));
  details.append(summary,list);actions.append(details);
 }
 card.append(actions);return card;
}
function renderSelected(host,selected){
 const heading=create('div','public-selection-heading');
 heading.append(create('h3','',selected.name),statusElement('موارد متاحة من الفهرس الحالي. ليست قائمة رسمية بكل وحدات المنهاج.'));
 host.append(heading);
 let n=0;
 for(const group of selected.groups||[]){
  const rows=group.items.filter(visibleResource);if(!rows.length)continue;
  const groupSection=create('section','public-resource-group');groupSection.append(create('h4','',group.name));
  for(const item of rows.slice(0,8)){groupSection.append(resourceCard(item));n++}
  if(rows.length>8)groupSection.append(statusElement('يوجد '+(rows.length-8)+' موارد إضافية. افتح المصدر الكامل أو استخدم بحث المادة.'));
  host.append(groupSection);
 }
 if(!n)host.append(statusElement(state.error?
  'تعذّر تحميل فهرس الموارد. أسماء المواد متاحة للمعاينة فقط.':
  'لم نجد روابط مطابقة في هذه المادة. جرّب اسماً آخر أو اختر مادة مختلفة.','public-explorer-empty'));
}
function render(){
 const container=$('publicExplorerDetail');
 if(!container||document.body.dataset.portal!=='landing')return;
 const branches=model()?.branches||{};
 for(const b of document.querySelectorAll('[data-public-branch]')){
  const active=b.dataset.publicBranch===state.branch;
  b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));
  b.disabled=!Object.hasOwn(branches,b.dataset.publicBranch);
 }
 const controls=control();container.replaceChildren(controls);
 const selected=availableSubjects().find(s=>s.id===state.subjectId);
 if(selected){renderSelected(container,selected);return}
 const subjects=availableSubjects();
 const query=normalize(state.query);
 const matching=subjects.filter(s=>!query||normalize(s.name+' '+s.desc).includes(query)||
  s.items?.some(item=>visibleResource(item)));
 const summary=create('div','public-selection-heading');
 summary.append(create('h3','','مواد شعبة '+branchName()),statusElement(
  subjects.length+' مادة في بنية الموقع. '+(state.error?'تعذّر قراءة تفاصيل الموارد.':'استعرض ما هو مفهرس بالفعل.')));
 container.append(summary);
 const grid=create('div','public-subject-grid');for(const item of matching)grid.append(cardForSubject(item));
 if(!matching.length)grid.append(statusElement('لا توجد مادة مطابقة لهذا البحث في الشعبة المختارة.','public-explorer-empty'));
 container.append(grid);
 if(state.loading)container.append(statusElement('جار تحميل تفاصيل الموارد...'));
 if(state.error)container.append(statusElement('تعذّر تحديث قائمة المصادر؛ ستظهر أسماء المواد فقط.','public-explorer-empty'));
}
async function loadManifest(){
 if(state.loading||state.manifest)return;
 state.loading=true;render();
 try{
  const response=await fetch('/resources.json',{cache:'force-cache'});
  if(!response.ok)throw Error('resource manifest fetch failed');
  const manifest=await response.json();
  if(manifest.schemaVersion!==1||!manifest.subjects)throw Error('unexpected manifest schema');
  state.manifest=manifest;state.error=null;
 }catch(error){console.warn('Public catalog preview unavailable:',error);state.error='unavailable'}
 finally{state.loading=false;render()}
}
function init(){
 if(document.body.dataset.portal!=='landing'||!$('publicBranchGrid'))return;
 const branches=model()?.branches||{};
 for(const item of document.querySelectorAll('[data-public-branch]')){
  const code=item.dataset.publicBranch;if(!Object.hasOwn(branches,code))continue;
  item.addEventListener('click',()=>{
   state.branch=code;state.subjectId=null;state.specialization=null;
   render();
   if(window.matchMedia('(max-width: 750px)').matches)
    $('publicExplorerDetail')?.scrollIntoView({block:'start',behavior:'auto'});
  });
 }
 $('publicExplorerSearch')?.addEventListener('input',e=>{state.query=e.target.value;render()});
 render();void loadManifest();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.BacPublicExplorer={init};
})();