/* Admin library mirrors the student catalog while keeping database edits owner-only.
   Static Drive catalog: read-only. New records: authenticated and RLS-protected. */
(function(){
'use strict';
const get=id=>document.getElementById(id);
const E=(tag,cls,text)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);return el;
};
const state={branch:'math',specialization:'',subjectId:'',group:'all',manifest:null,records:[],units:[],files:[],editing:null,view:'library',version:0};
const resourceKind={lessons:'lesson',exercises:'exercise',summaries:'summary',tests:'exam',bac:'exam',other:'other'};
const contentLabels={lessons:'دروس',exercises:'تمارين',summaries:'ملخصات ومراجع',tests:'فروض واختبارات',bac:'مواضيع البكالوريا',other:'ملفات أخرى'};
const branchModel=()=>window.BacEducation;
const taxonomy=()=>window.BacSubjectCatalog;
function btn(name,fn,cls='subject-ui-btn'){const b=E('button',cls,name);b.type='button';b.addEventListener('click',fn);return b;}
function input(name,label,opts={}){
 const wrap=E('label','admin-library-field');
 wrap.append(E('span','',label));
 const field=opts.rows?E('textarea','admin-library-input'):E('input','admin-library-input');
 if(opts.rows)field.rows=opts.rows;else field.type=opts.type||'text';
 field.name=name;
 if(opts.required)field.required=true;
 if(opts.maxLength)field.maxLength=opts.maxLength;
 if(opts.minLength)field.minLength=opts.minLength;
 if(opts.value!==undefined&&opts.value!==null)field.value=String(opts.value);
 if(opts.placeholder)field.placeholder=opts.placeholder;
 if(opts.min!==undefined)field.min=opts.min;
 if(opts.max!==undefined)field.max=opts.max;
 wrap.append(field);
 return {wrap,field};
}
function labelSelect(label,options,value,change){
 const wrap=E('label','admin-library-field');
 wrap.append(E('span','',label));const select=E('select','admin-library-input');
 for(const [id,name] of options){const item=E('option','',name);item.value=id;select.append(item);}
 select.value=value;select.addEventListener('change',e=>change(e.target.value));
 wrap.append(select);return wrap;
}
function message(root,msg,kind='info'){
 root.querySelector('[data-library-status]')?.remove();
 const box=E('div','admin-library-message '+kind,msg);box.dataset.libraryStatus='true';root.prepend(box);
}
function link(url,title){
 if(!url)return E('span','admin-library-muted','لا يوجد رابط خارجي');
 const anchor=E('a','subject-ui-link',title);anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';return anchor;
}
function models(){
 const track=branchModel(),tax=taxonomy();
 if(!track||!tax||!state.manifest)return [];
 const list=track.list(state.branch,state.specialization||undefined);
 const bases=tax.build({manifest:state.manifest,branch:state.branch,subBranch:state.specialization||null,subjects:list});
 return track.overlay(bases,state.records,state.units,state.branch,state.specialization||null);
}
function sourceDescription(subject){
 return subject.items.length+' عناصر مفهرسة أو منشورة، '+(subject.indexed?'مجلد Drive مرتبط':'دون فهرس Drive خاص');
}
function nav(host){
 const track=branchModel();
 const nav=E('div','admin-library-filters');
 nav.append(labelSelect('الشعبة',Object.entries(track.branches).map(([code,b])=>[code,b.name]),state.branch,val=>{
  state.branch=val;state.specialization='';state.subjectId='';state.group='all';state.editing=null;draw(host);
 }));
 const subs=track.branches[state.branch]?.subspecialties||{};
 if(Object.keys(subs).length){
  if(state.branch==='tech'&&!state.specialization)state.specialization='electrical';
  if(state.branch==='languages'&&!state.specialization)state.specialization=Object.keys(subs)[0];
  nav.append(labelSelect('التخصص / اللغة الثالثة',Object.entries(subs),state.specialization,val=>{
   state.specialization=val;state.subjectId='';state.group='all';state.editing=null;draw(host);
  }));
 }
 const model=models().find(x=>x.id===state.subjectId);
 const path=E('div','subject-ui-breadcrumb');
 path.append(btn('جميع المواد',()=>{state.subjectId='';state.group='all';state.editing=null;draw(host)},'subject-ui-crumb'));
 if(model)path.append(E('span','',' / '),E('strong','',model.name));
 nav.append(path);
 host.append(nav);
}
function drawCards(host,subjects){
 const grid=E('div','admin-library-grid');
 for(const item of subjects){
  const card=E('article','subject-ui-card');
  card.append(E('h3','',item.name),E('p','subject-ui-hint',sourceDescription(item)));
  const tags=E('div','subject-ui-chips');
  for(const group of item.groups)tags.append(E('span','subject-ui-pill',group.name+' · '+group.items.length));
  if(!item.items.length)tags.append(E('span','subject-ui-pill is-empty','بانتظار موارد'));
  card.append(tags);
  card.append(btn('فتح المادة وإدارتها',()=>{
   state.subjectId=item.id;state.group='all';state.editing=null;draw(host);
  },'subject-ui-btn primary'));
  grid.append(card);
 }
 host.append(grid);
}
function groupTabs(host,model){
 const tabs=E('div','subject-ui-tabs');
 for(const [code,title] of [['all','الكل'],...Object.entries(contentLabels)]){
  const count=code==='all'?model.items.length:model.items.filter(x=>x.group===code).length;
  if(!count&&code!=='all')continue;
  tabs.append(btn(title+' · '+count,()=>{state.group=code;state.editing=null;draw(host)},'subject-ui-tab'+(state.group===code?' active':'')));
 }
 host.append(tabs);
}
function rowForResource(host,model,item){
 const row=E('article','subject-ui-resource');
 const info=E('div','subject-ui-resource-copy');
 const group=contentLabels[item.group]||'مورد';
 info.append(E('span','subject-ui-resource-kind',group+' · '+(item.origin==='published'?'مورد أضيف من الإدارة أو المساهمين':'من الفهرس الأصلي')));
 info.append(E('strong','',item.title));
 if(item.context)info.append(E('small','',item.context));
 if(item.year)info.append(E('small','','السنة المدونة: '+item.year));
 if(item.children?.length)info.append(E('small','',item.children.length+' ملفات داخل المجلد'));
 row.append(info);
 const actions=E('div','subject-ui-actions');
 if(item.url)actions.append(link(item.url,item.type==='folder'?'فتح مجلد Drive':'فتح المصدر'));
 if(item.children?.length)actions.append(btn('استعراض الملفات',()=>{
  const holder=E('div','admin-library-children');
  for(const file of item.children){
   const child=E('div','admin-library-child');
   child.append(E('span','',file.title));
   if(file.url)child.append(link(file.url,'فتح'));holder.append(child);
  }
  row.querySelector('.admin-library-children')?.remove();row.append(holder);
 }));
 if(item.id.startsWith('db:')){
  const original=state.records.find(r=>r.id===item.id.slice(3));
  if(original){
   if(original.contributor_id===(typeof studentAuthUser!=='undefined'?studentAuthUser?.id:null))actions.append(btn('تعديل البيانات',()=>{state.editing=original;state.view='resource';draw(host)},'subject-ui-btn'));
   const pdf=state.files.find(f=>f.resource_id===original.id);
   if(pdf)actions.append(btn('عرض PDF',()=>void signedPdf(host,pdf.storage_path)));
  }
 }
 row.append(actions);return row;
}
function renderRows(host,model){
 const items=state.group==='all'?model.items:model.items.filter(x=>x.group===state.group);
 const list=E('div','subject-ui-resources');
 for(const item of items)list.append(rowForResource(host,model,item));
 if(!items.length)list.append(E('p','admin-library-muted','لا توجد موارد منشورة لهذا القسم. يمكنك إضافة أول مورد.'));
 host.append(list);
}
function unitRows(host,model){
 const units=state.units.filter(u=>u.branch_code===state.branch&&u.subject_key===model.id&&
  (!u.specialization_code||u.specialization_code===state.specialization));
 if(!units.length)return;
 const section=E('section','admin-library-unit-list');
 section.append(E('h3','','الوحدات التي أُضيفت من الإدارة'));
 for(const item of units){
  const row=E('div','admin-library-child');
  row.append(E('strong','',item.title),E('small','',item.is_published?'منشورة':'مسودة غير منشورة'));
  row.append(btn(item.is_published?'إخفاء الوحدة عن الطالب':'نشر الوحدة',()=>void toggleUnit(host,item)));
  row.append(btn('تعديل الوحدة',()=>{state.editing=item;state.view='unit';draw(host)}));
  section.append(row);
 }
 host.append(section);
}
function detail(host,model){
 const intro=E('div','admin-library-subject-head');
 intro.append(E('h2','',model.name));
 intro.append(E('p','',sourceDescription(model)));
 host.append(intro);
 const actions=E('div','admin-library-action-row');
 actions.append(btn('إضافة مورد إلى هذه المادة',()=>{state.view='resource';state.editing=null;draw(host)},'subject-ui-btn primary'));
 actions.append(btn('إضافة وحدة / فصل',()=>{state.view='unit';state.editing=null;draw(host)}));
 if(model.sourceUrl)actions.append(link(model.sourceUrl,'مجلد المادة الأصلي'));
 host.append(actions);
 if(state.view==='resource'){host.append(resourceForm(host,model));return}
 if(state.view==='unit'){host.append(unitForm(host,model));return}
 groupTabs(host,model);renderRows(host,model);unitRows(host,model);
 host.append(E('p','subject-ui-notice','المجلدات القديمة من resources.json للقراءة فقط. يمكنك إضافة موارد جديدة من هنا، وتعديل موارد قاعدة البيانات دون تغيير مصدر Drive الأصلي.'));
}
function validateUrl(raw){
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.')||u.hostname==='localhost')return false;
  return raw.length<=2000;
 }catch{return false}
}
function resourceForm(host,model){
 const form=E('form','admin-library-editor');
 const editing=state.editing?.id?state.editing:null;
 form.append(E('h3','',editing?'تعديل المورد المنشور':'إضافة مورد جديد إلى '+model.name));
 const title=input('title','عنوان المورد',{required:true,minLength:4,maxLength:180,value:editing?.title});
 const unit=input('unit_title','الوحدة أو الفصل',{required:true,minLength:2,maxLength:120,value:editing?.unit_title,placeholder:'مثال: الدوال'});
 const desc=input('description','وصف ومحتوى المورد',{rows:3,required:true,minLength:12,maxLength:2000,value:editing?.description});
 const url=input('resource_url','رابط المصدر HTTPS',{required:true,type:'url',maxLength:2000,value:editing?.resource_url});
 const year=input('exam_year','سنة الامتحان إن كانت موثقة',{type:'number',min:1962,max:2035,value:editing?.exam_year});
 for(const field of [title,unit,desc,url,year])form.append(field.wrap);
 const groupDefault=editing?.content_group||Object.keys(resourceKind).find(x=>resourceKind[x]===editing?.resource_kind)||'lessons';
 const group=labelSelect('نوع المورد',Object.entries(contentLabels),groupDefault,()=>{});
 form.append(group);
 const groupSelect=group.querySelector('select');
 const file=input('pdf','ملف PDF اختياري (15 ميغابايت كحد أقصى)',{type:'file'});
 file.field.accept='.pdf,application/pdf';file.field.required=false;
 form.append(file.wrap);
 form.append(E('p','admin-library-muted','سيظهر المورد في نفس المادة والشعبة عند الطلاب بعد حفظه. رابط HTTPS مطلوب حتى عند إرفاق PDF. لا نغيّر الملفات الأصلية.'));
 const controls=E('div','admin-library-action-row');
 const save=btn(editing?'حفظ التعديلات':'نشر المورد',()=>{if(form.reportValidity())void saveResource(host,model,{
  title:title.field.value.trim(),unit_title:unit.field.value.trim(),description:desc.field.value.trim(),
  resource_url:url.field.value.trim(),content_group:groupSelect.value,exam_year:year.field.value,file:file.field.files?.[0]||null,editing
 })},'subject-ui-btn primary');
 controls.append(save,btn('إلغاء',()=>{state.view='library';state.editing=null;draw(host)}));
 form.append(controls);return form;
}
async function saveResource(host,model,data){
 if(!window.BacEducation?.inTrack(state.branch,state.specialization||null,model.id)){message(host,'هذه المادة غير متاحة ضمن الشعبة المحددة.','error');return;}
 if(!validateUrl(data.resource_url)||data.description.length<12||data.unit_title.length<2){
  message(host,'يرجى إدخال رابط HTTPS صحيح ووصف لا يقل عن 12 حرفًا ووحدة واضحة.','error');return;
 }
 const year=data.exam_year?Number(data.exam_year):null;
 if(year!==null&&(!Number.isInteger(year)||year<1962||year>2035)){
  message(host,'سنة الامتحان خارج المجال المحدد.','error');return;
 }
 const group=data.content_group;
 if(!Object.hasOwn(resourceKind,group)){message(host,'نوع المورد غير صالح.','error');return;}
 const user=(typeof studentAuthUser!=='undefined'?studentAuthUser:null),client=(typeof getStudentAuth==='function'?getStudentAuth():null);
 if(!user?.id||!client)return;
 const payload={title:data.title,unit_title:data.unit_title,description:data.description,
  resource_url:data.resource_url,content_group:group,resource_kind:resourceKind[group],
  exam_year:year,subject:model.name,subject_key:model.id,
  specialization_code:state.specialization||null,academic_branch:window.BacEducation.branches[state.branch].name};
 message(host,'جار حفظ المورد والتحقق من الصلاحيات...');
 try{
  let saved;
  if(data.editing){
   const {data:rows,error}=await client.from('collaborator_resources').update(payload)
    .eq('id',data.editing.id).eq('contributor_id',user.id).eq('status','approved').select('id').single();
   if(error)throw error;saved=rows;
  }else{
   const {data:rows,error}=await client.from('collaborator_resources')
    .insert({...payload,contributor_id:user.id,status:'approved'}).select('id').single();
   if(error)throw error;saved=rows;
  }
  if(data.file)await uploadPdf(client,user.id,saved.id,data.file);
  state.editing=null;state.view='library';await refresh(host);
  message(host,'تم حفظ المورد. سيظهر مع موارد المادة بعد تحميل الفهرس.','success');
 }catch(error){console.warn('Admin resource update failed',error);message(host,'تعذر حفظ العملية أو إرفاق الملف. تحقق من الصلاحيات ورابط الملف.','error')}
}
async function uploadPdf(client,userId,resourceId,file){
 if(file.size<10||file.size>15728640)throw Error('PDF size invalid');
 const magic=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());
 if(magic!=='%PDF-')throw Error('Not a PDF');
 const existing=state.files.find(f=>f.resource_id===resourceId);
 if(existing)throw Error('One PDF already attached. Remove it from storage before replacing.');
 const path=userId+'/'+resourceId+'/'+crypto.randomUUID()+'.pdf';
 const {error:uploaded}=await client.storage.from('bac-resource-pdfs').upload(path,file,{contentType:'application/pdf',upsert:false});
 if(uploaded)throw uploaded;
 const {error:linked}=await client.from('resource_pdf_attachments').insert({
  resource_id:resourceId,contributor_id:userId,storage_path:path,file_size:file.size
 });
 if(linked){await client.storage.from('bac-resource-pdfs').remove([path]);throw linked}
}
async function signedPdf(host,path){
 const client=(typeof getStudentAuth==='function'?getStudentAuth():null);if(!client)return;
 const {data,error}=await client.storage.from('bac-resource-pdfs').createSignedUrl(path,300);
 if(error||!data?.signedUrl){message(host,'ملف PDF غير متاح حالياً.','error');return}
 window.open(data.signedUrl,'_blank','noopener,noreferrer');
}
function unitForm(host,model){
 const form=E('form','admin-library-editor');
 const editing=state.editing?.id?state.editing:null;
 form.append(E('h3','',editing?'تعديل الوحدة':'إضافة وحدة جديدة إلى '+model.name));
 const title=input('title','اسم الوحدة أو الفصل',{required:true,minLength:3,maxLength:160,value:editing?.title});
 const description=input('description','ملاحظات / محتوى الوحدة',{rows:3,maxLength:800,value:editing?.description});
 const source=input('source_url','رابط توثيقي HTTPS (اختياري)',{type:'url',maxLength:1800,value:editing?.source_url});
 for(const f of [title,description,source])form.append(f.wrap);
 const publish=E('label','admin-library-switch');
 const toggle=E('input');toggle.type='checkbox';toggle.checked=editing?editing.is_published:false;
 publish.append(toggle,E('span','','نشر الوحدة للطلاب'));form.append(publish);
 form.append(E('p','admin-library-muted','هذه وحدة أنشأتها الإدارة. لا تُصنّف رسمية دون مرجع من الجهة المختصة، وسيظل فهرس Google Drive الأصلي محفوظًا.'));
 const actions=E('div','admin-library-action-row');
 actions.append(btn(editing?'حفظ الوحدة':'إنشاء الوحدة',()=>{if(form.reportValidity())void saveUnit(host,model,{
  title:title.field.value.trim(),description:description.field.value.trim(),source_url:source.field.value.trim(),is_published:toggle.checked,editing
 })},'subject-ui-btn primary'));
 actions.append(btn('إلغاء',()=>{state.view='library';state.editing=null;draw(host)}));
 form.append(actions);return form;
}
async function saveUnit(host,model,data){
 const user=(typeof studentAuthUser!=='undefined'?studentAuthUser:null),client=(typeof getStudentAuth==='function'?getStudentAuth():null);
 if(!user?.id||!client||!window.BacEducation?.inTrack(state.branch,state.specialization||null,model.id))return;
 if(data.source_url&&!validateUrl(data.source_url)){message(host,'رابط المصدر غير صالح.','error');return}
 if(data.title.length<3||data.title.length>160){message(host,'عنوان الوحدة غير صالح.','error');return}
 const payload={title:data.title,description:data.description,source_url:data.source_url||null,
  branch_code:state.branch,specialization_code:state.specialization||null,subject_key:model.id,
  academic_year:'2026-2027',source_type:'editorial',is_published:data.is_published};
 message(host,'جار حفظ الوحدة...');
 try{
  if(data.editing){
   const {error}=await client.from('bac_curriculum_units').update(payload).eq('id',data.editing.id);
   if(error)throw error;
  }else{
   const {error}=await client.from('bac_curriculum_units').insert({...payload,created_by:user.id});
   if(error)throw error;
  }
  state.view='library';state.editing=null;await refresh(host);message(host,'تم حفظ الوحدة.','success');
 }catch(error){console.warn('Admin unit update failed',error);message(host,'تعذر حفظ الوحدة. تأكد من الصلاحيات والاتصال.','error')}
}
async function toggleUnit(host,item){
 const client=(typeof getStudentAuth==='function'?getStudentAuth():null);if(!client)return;
 const {error}=await client.from('bac_curriculum_units').update({is_published:!item.is_published}).eq('id',item.id);
 if(error){message(host,'فشل تحديث حالة الوحدة.','error');return}await refresh(host);
}
function draw(host){
 if(!host||!window.BacEducation||!window.BacSubjectCatalog)return;
 host.replaceChildren();
 const header=E('div','admin-library-heading');
 header.append(E('h2','','مكتبة الطالب من منظور المدير'));
 header.append(E('p','','تصفح نفس الشعب والمواد والأقسام الظاهرة للطلاب، ثم أضف موارد أو وحدات مع التحكم في النشر.'));
 host.append(header);nav(host);
 const available=models();
 const selected=available.find(x=>x.id===state.subjectId);
 if(selected)detail(host,selected);
 else drawCards(host,available);
 const footer=E('p','subject-ui-notice','المواد معروضة بحسب هيكل Bac-pedia المعتمد حاليًا. لا تُضاف مواد جديدة تلقائيًا من إعلانات غير معتمدة، ومجلدات Drive الأصلية للقراءة فقط.');
 host.append(footer);
}
async function refresh(host){
 const request=++state.version;
 host.replaceChildren(E('p','admin-library-muted','جار تحميل فهرس المواد والموارد...'));
 const client=(typeof getStudentAuth==='function'?getStudentAuth():null);
 if(!client||!(typeof studentAuthUser!=='undefined'?studentAuthUser:null)?.id||window.BAC_PORTAL_ROLE!=='admin'){
  host.replaceChildren(E('p','admin-library-muted','هذه الصفحة مخصصة لحساب المدير المعتمد فقط.'));return;
 }
 try{
  if(!state.manifest){
   const response=await fetch('/resources.json',{cache:'no-store'});
   if(!response.ok)throw Error('Catalog unavailable');state.manifest=await response.json();
  }
  const [resources,units,attachments]=await Promise.all([
   client.from('collaborator_resources').select('id,contributor_id,title,subject,subject_key,specialization_code,academic_branch,resource_kind,content_group,unit_title,description,resource_url,exam_year,status').limit(1000),
   client.from('bac_curriculum_units').select('id,branch_code,specialization_code,subject_key,title,description,source_url,is_published,created_by').limit(700),
   client.from('resource_pdf_attachments').select('resource_id,storage_path').limit(1000)
  ]);
  if(request!==state.version)return;
  if(resources.error)throw resources.error;
  state.records=resources.data||[];
  state.units=units.error?[]:units.data||[];
  state.files=attachments.error?[]:attachments.data||[];
  if(units.error)console.warn('Optional curriculum units unavailable',units.error);
  draw(host);
 }catch(error){
  console.warn('Admin catalog load failed',error);
  host.replaceChildren(E('p','admin-library-muted','تعذر تحميل المكتبة. تحقق من صلاحية المدير أو الاتصال.'));
 }
}
window.BacAdminLibrary={render:host=>{void refresh(host)},refresh:host=>void refresh(host)};
})();