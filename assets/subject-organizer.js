/* Student subject-first navigation. All cards originate in the existing verified-format catalog. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const h=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const branchNames={math:'رياضيات',science:'علوم تجريبية',tech:'تقني رياضي',literature:'آداب وفلسفة',languages:'لغات أجنبية',economy:'تسيير واقتصاد'};
let manifest=null,models=[],branchKey='',selected='',kind='all',opened=null,query='',loading=null;
let availablePdfPaths=new Map();
function isStudent(){return document.body?.dataset.portal==='student'}
function button(label,fn,className){
 const el=h('button',className||'subject-ui-btn',label);el.type='button';el.addEventListener('click',fn);return el;
}
function external(url,label){
 if(!url)return null;
 const a=h('a','subject-ui-link',label||'فتح المصدر في Google Drive');
 a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
async function fetchCatalog(){
 if(manifest)return manifest;
 if(loading)return loading;
 loading=fetch('/resources.json',{cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('فهرس الموارد غير متاح');return r.json()})
   .then(json=>{if(json.schemaVersion!==1||!json.subjects)throw Error('تنسيق الفهرس غير صالح');manifest=json;return json})
   .finally(()=>{loading=null});
 return loading;
}
function definitions(){
 return typeof getNormalSubjects==='function'?getNormalSubjects():[];
}
function currentBranch(){
 const branch=typeof state!=='undefined'?state.branch:'math';
 const sub=typeof state!=='undefined'?state.subBranch:null;
 return branch+':'+sub;
}
function counts(subject){
 return BacSubjectCatalog.types.map(type=>{
  const n=subject.groups?.find(x=>x.id===type.id)?.items.length||0;
  return {name:type.name,n};
 }).filter(x=>x.n>0);
}
function describe(subject){
 if(!subject.items.length)return 'لا توجد روابط مصنفة لهذه المادة في الفهرس الحالي';
 const chunks=counts(subject).slice(0,3).map(x=>x.name+': '+x.n);
 return chunks.join(' · ');
}
function breadcrumb(host,model){
 host.replaceChildren();
 host.append(button('كل مواد '+(branchNames[state.branch]||'الشعبة'),()=>{
  selected='';kind='all';opened=null;render();
 },'subject-ui-crumb'));
 if(model){
  host.append(h('span','subject-ui-sep','/'),h('strong','',''+model.name));
  if(opened)host.append(h('span','subject-ui-sep','/'),h('strong','',opened.title));
 }
}
function choose(id){
 if(!models.some(x=>x.id===id))return;
 selected=id;kind='all';opened=null;query='';
 if($('subjectOrganizedSearch'))$('subjectOrganizedSearch').value='';
 render();
 $('subjectOrganized')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function subjectCard(model){
 const card=h('article','subject-ui-card');
 const heading=h('div','subject-ui-card-header');
 const emblem=h('span','subject-ui-emblem');
 const icon=h('i',model.icon);emblem.append(icon);
 heading.append(emblem,h('h3','',model.name));
 card.append(heading);
 const hasAny=model.items.length>0;
 card.append(h('p','subject-ui-hint',hasAny?describe(model):
  'المادة ظاهرة ضمن شعبتك، لكن ليس لها محتوى مفهرس بعد.'));
 const chips=h('div','subject-ui-chips');
 const present=counts(model);
 for(const entry of present){
  chips.append(h('span','subject-ui-pill',entry.name+' · '+entry.n));
 }
 if(!present.length)chips.append(h('span','subject-ui-pill is-empty','بانتظار محتوى موثوق'));
 card.append(chips);
 const footer=h('div','subject-ui-footer');
 footer.append(h('span','subject-ui-footnote',model.indexed?'مصادر مفهرسة':'لا توجد بيانات مفهرسة'));
 footer.append(button('ادخل المادة',()=>choose(model.id),'subject-ui-btn primary'));
 card.append(footer);
 return card;
}
function rowItem(item,model){
 const article=h('article','subject-ui-resource');
 const body=h('div','subject-ui-resource-copy');
 const folder=item.type==='folder';
 body.append(h('span','subject-ui-resource-kind',folder?'مجلد / وحدة':'ملف أو رابط'));
 body.append(h('strong','',item.title));
 if(item.context)body.append(h('small','',item.context));
 if(item.children?.length)body.append(h('small','',item.children.length+' عناصر مفهرسة داخل هذا المجلد'));
 else if(folder)body.append(h('small','',item.origin==='editorial-unit'?
  'وحدة أضافتها الإدارة، ولا توجد روابط مفهرسة داخلها بعد.':
  'افتح المجلد الأصلي لعرض محتوياته على Google Drive'));
 article.append(body);
 const actions=h('div','subject-ui-actions');
 if(item.children?.length){
  actions.append(button('استعرض المحتوى',()=>{
   opened=item;render();
   $('subjectOrganized')?.scrollIntoView({behavior:'smooth',block:'start'});
  },'subject-ui-btn primary'));
 }
 const link=external(item.url,folder?'فتح المجلد':'فتح الملف');
 if(link)actions.append(link);
 if(item.id.startsWith('db:')&&availablePdfPaths.has(item.id.slice(3)))actions.append(button('قراءة PDF المرفق',async()=>{
   const client=typeof getStudentAuth==='function'?getStudentAuth():null;
   if(!client)return;
   const {data,error}=await client.storage.from('bac-resource-pdfs').createSignedUrl(availablePdfPaths.get(item.id.slice(3)),300);
   if(error||!data?.signedUrl){alert('ملف PDF غير متاح أو لا تملك صلاحية الوصول إليه.');return}
   window.location.assign(data.signedUrl);
 },'subject-ui-btn'));
 article.append(actions);
 return article;
}
function folderDetail(model){
 const section=h('section','subject-ui-folder-panel');
 const head=h('div','subject-ui-detail-heading');
 head.append(button('العودة للأقسام',()=>{opened=null;render()},'subject-ui-btn'));
 head.append(h('h3','',opened.title));section.append(head);
 section.append(h('p','subject-ui-notice','المحتوى أدناه هو الملفات المذكورة في الفهرس فقط. قد يحتوي مجلد Google Drive على ملفات إضافية.'));
 const link=external(opened.url,'فتح المجلد الكامل في Google Drive');
 if(link)section.append(link);
 if(opened.children.length){
  const results=h('div','subject-ui-resources');
  const children=[...opened.children].sort((a,b)=>{
   if(a.year&&b.year)return b.year-a.year;
   return a.title.localeCompare(b.title,'ar');
  });
  for(const item of children){
   const row=h('article','subject-ui-resource');
   const text=h('div','subject-ui-resource-copy');
   text.append(h('strong','',item.title));if(item.year)text.append(h('small','','السنة كما تظهر في اسم الملف: '+item.year));
   row.append(text);
   const l=external(item.url,item.type==='folder'?'فتح المجلد':'عرض الملف');
   if(l)row.append(l);results.append(row);
  }
  section.append(results);
 }else{
  section.append(h('p','subject-ui-notice','لا توجد ملفات فردية مفهرسة لهذا المجلد. استخدم الرابط الأصلي.'));
 }
 return section;
}
function subjectDetail(model){
 const wrap=h('div','subject-ui-detail');
 const title=h('div','subject-ui-detail-heading');
 title.append(button('الرجوع إلى المواد',()=>{selected='';opened=null;kind='all';render()},'subject-ui-btn'));
 title.append(h('h2','',model.name));wrap.append(title);
 wrap.append(h('p','subject-ui-hint','الشعبة: '+(branchNames[state.branch]||state.branch)+'. اختر نوع المحتوى أولاً، ثم الوحدة أو الملف.'));
 if(opened){wrap.append(folderDetail(model));return wrap;}
 if(!model.items.length){
  wrap.append(h('div','subject-ui-empty','لا توجد ملفات مفهرسة أو موارد منشورة لهذه المادة حالياً، ولا يعني ظهور المادة اكتمال محتواها.'));
  const link=external(model.sourceUrl,'فتح مجلد المادة إن كان متاحاً');
  if(link)wrap.append(link);
  return wrap;
 }
 const tabs=h('div','subject-ui-tabs');
 tabs.setAttribute('role','group');tabs.setAttribute('aria-label','نوع المحتوى');
 for(const t of [{id:'all',name:'الكل'},...BacSubjectCatalog.types]){
  const n=t.id==='all'?model.items.length:(model.groups.find(x=>x.id===t.id)?.items.length||0);
  if(!n)continue;
  const tab=button(t.name+' ('+n+')',()=>{kind=t.id;opened=null;render()},'subject-ui-tab'+(kind===t.id?' active':''));
  tab.setAttribute('aria-pressed',String(kind===t.id));tabs.append(tab);
 }
 wrap.append(tabs);
 const groups=kind==='all'?model.groups:model.groups.filter(x=>x.id===kind);
 for(const group of groups){
   const section=h('section','subject-ui-group');
   const sectionHeading=h('div','subject-ui-group-heading');
   sectionHeading.append(h('h3','',group.name),h('span','',group.items.length+' رابط / مجلد'));
   section.append(sectionHeading);
   section.append(h('p','subject-ui-group-hint',group.description));
   const rows=h('div','subject-ui-resources');
   for(const item of group.items)rows.append(rowItem(item,model));
   section.append(rows);wrap.append(section);
 }
 const source=external(model.sourceUrl,'تصفح مجلد المادة الكامل');
 if(source)wrap.append(source);
 wrap.append(h('p','subject-ui-notice','التصنيف مستنتج من أسماء المجلدات. تواريخ الاختبارات وصحة الحلول وصلاحيات الوصول تحتاج تحققاً مستقلاً.'));
 return wrap;
}
function render(){
 const host=$('subjectOrganized');if(!host||!isStudent())return;
 const branch=branchNames[state.branch]||'الشعبة المختارة';
 host.replaceChildren();
 const header=h('div','subject-ui-header');
 header.append(h('span','subject-ui-overline','مكتبة المواد · مسار واضح'));
 header.append(h('h2','',selected?'اختر محتوى المادة':'مواد شعبة '+branch));
 header.append(h('p','',selected?'اختر درساً، تمريناً، ملخصاً أو موضوع بكالوريا داخل المادة فقط.':
   'اختر مادة من شعبتك أولاً. لن نخلط ملفات المواد والاختبارات العامة مع أسماء المواد.'));
 host.append(header);
 const crumbs=h('nav','subject-ui-breadcrumb');
 crumbs.setAttribute('aria-label','مسار التصفح');
 const model=models.find(x=>x.id===selected);
 breadcrumb(crumbs,model);host.append(crumbs);
 if(model){host.append(subjectDetail(model));return;}
 const search=h('input','subject-ui-search');
 search.id='subjectOrganizedSearch';search.type='search';search.placeholder='ابحث عن مادة في شعبتك...';search.value=query;
 search.setAttribute('aria-label','البحث عن المواد');search.addEventListener('input',e=>{query=e.target.value;const pos=e.target.selectionStart;render();const next=$('subjectOrganizedSearch');if(next){next.focus();next.setSelectionRange(pos,pos)}});
 host.append(search);
 const norm=BacSubjectCatalog.normalize(query);
 const visible=models.filter(x=>BacSubjectCatalog.normalize(x.name+' '+x.description).includes(norm));
 const grid=h('div','subject-ui-grid');
 for(const item of visible)grid.append(subjectCard(item));
 if(!visible.length)grid.append(h('p','subject-ui-empty','لا توجد مادة مطابقة للاسم في هذه الشعبة.'));
 host.append(grid);
 const note=h('p','subject-ui-notice');
 note.textContent='المواد المعروضة تعتمد على الشعبة المختارة. ظهور المادة لا يعني أن ملفاتها مكتملة أو متاحة للجميع.';
 host.append(note);
}
async function refresh(){
 const host=$('subjectOrganized');
 if(!isStudent()||!host)return;
 const next=currentBranch();
 if(next!==branchKey){
  selected='';kind='all';opened=null;query='';branchKey=next;
 }
 if(!manifest){
  host.replaceChildren(h('p','subject-ui-notice','جار تحميل فهرس مواد شعبتك...'));
  try{await fetchCatalog()}catch(e){
   host.replaceChildren(h('p','subject-ui-empty','تعذر قراءة فهرس الموارد حالياً. أعد فتح الصفحة أو تحقق من الاتصال.'));return
  }
 }
 if(next!==currentBranch())return;
 models=BacSubjectCatalog.build({manifest,branch:state.branch,subBranch:state.subBranch,subjects:definitions()});
 // Published additions are filtered both by the existing RLS policies and academic scope.
 const client=typeof getStudentAuth==='function'?getStudentAuth():null;
 if(client&&window.BacEducation){
   const branchName=window.BacEducation.branches[state.branch]?.name||'جميع الشعب';
   const [published,extraUnits,attachments]=await Promise.all([
     client.from('collaborator_resources')
       .select('id,title,subject,subject_key,specialization_code,academic_branch,resource_kind,content_group,unit_title,resource_url,exam_year,status')
       .eq('status','approved').in('academic_branch',[branchName,'جميع الشعب']).limit(1000),
     client.from('bac_curriculum_units')
       .select('id,title,subject_key,specialization_code,branch_code,is_published')
       .eq('branch_code',state.branch).eq('is_published',true).limit(400),
     client.from('resource_pdf_attachments').select('resource_id,storage_path').limit(1000)
   ]);
   if(next!==currentBranch())return;
   if(published.error||extraUnits.error)console.warn('Academic content overlay unavailable',published.error||extraUnits.error);
   models=window.BacEducation.overlay(models,published.error?[]:published.data||[],
      extraUnits.error?[]:extraUnits.data||[],state.branch,state.subBranch);
   availablePdfPaths=new Map((attachments.error?[]:attachments.data||[]).map(x=>[x.resource_id,x.storage_path]));
 }
 if(selected&&!models.some(x=>x.id===selected)){selected='';opened=null;kind='all'}
 render();
}
function open(id){
 if(!isStudent())return;
 if(typeof showPage==='function')showPage('chapters');
 void refresh().then(()=>choose(id));
}
window.renderSubjectOrganizer=()=>{void refresh()};
window.openOrganizedSubject=open;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void refresh(),{once:true});
else void refresh();
})();