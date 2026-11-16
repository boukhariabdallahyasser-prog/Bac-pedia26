/* Role-separated owner, contributor and student portals. Database RLS is authoritative. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const db=()=>typeof getStudentAuth==='function'?getStudentAuth():null;
const user=()=>typeof studentAuthUser==='undefined'?null:studentAuthUser;
const txt=v=>String(v??'').trim();
const labels={pending:'قيد المراجعة',approved:'منشور / مقبول',rejected:'مرفوض'};
const kind={lesson:'درس',summary:'ملخص',exercise:'تمارين',exam:'موضوع امتحان',video:'فيديو',other:'آخر'};
const branchChoices=['جميع الشعب','رياضيات','علوم تجريبية','تقني رياضي','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية'];
const branchValid=value=>branchChoices.includes(value);
let ownerRole='student',request=null,resources=[],adminApplications=[],adminResources=[],profiles=[],auditEntries=[],editId=null,adminTab='applications',busy=false,identity=null,profileEditing=false;
window.BAC_PORTAL_ROLE='student';
function el(tag,className,text){
 const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=String(text);return n;
}
function button(name,fn,cls='portal-action'){
 const b=el('button',cls,name);b.type='button';b.addEventListener('click',fn);return b;
}
function notify(message,type='info'){if(typeof showToast==='function')showToast(message,type)}
function failed(error,action){console.warn('Bac-pedia '+action,error);notify('تعذّر '+action+'، تأكد من الاتصال وحاول مرة أخرى.','warning')}
function date(value){return value?new Date(value).toLocaleDateString('ar-DZ'):''}
function statusLabel(value){return labels[value]||value}
function roleText(value){return value==='admin'?'المالك':value==='contributor'?'مساهم معتمد':value==='applicant'?'طلب مساهمة':'طالب'}
function validUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='drive.google.com'&&/^\/(drive\/folders\/|file\/d\/)/.test(u.pathname)}
 catch{return false}
}
function placeholder(title,description){
 const n=el('div','portal-empty');n.append(el('i','fa-solid fa-folder-open'),el('h3','',title),el('p','',description));return n;
}
function metric(root,values){
 $(root)?.querySelectorAll('strong').forEach((x,i)=>x.textContent=String(values[i]??0));
}
function statusPill(status){return el('span','comm-state-tag '+status,statusLabel(status))}
async function loadMyApplication(id){
 const d=db();if(!d)return null;
 const {data,error}=await d.from('collaborator_applications')
   .select('user_id,display_name,organization,contribution_type,motivation,academic_branch,status,created_at')
   .eq('user_id',id).maybeSingle();
 if(error)throw error;return data||null;
}
async function refreshPortalRole(){
 const current=user(),id=current?.id;
 if(!id){
   identity=null;request=null;resources=[];ownerRole='student';
   window.BAC_PORTAL_ROLE='student';return 'student';
 }
 identity=id;
 try{
   const client=db();
   const [role,application]=await Promise.all([
     client.from('platform_roles').select('role').eq('user_id',id).maybeSingle(),
     client.from('collaborator_applications').select('user_id,display_name,organization,contribution_type,motivation,status,created_at').eq('user_id',id).maybeSingle()
   ]);
   if(role.error)throw role.error;
   if(application.error)throw application.error;
   if(user()?.id!==id)return ownerRole;
   let verifiedOwner=role.data?.role==='admin';
   // The private database checks the exact reserved email, verified status,
   // and single-owner constraint. No client-provided email or signup metadata
   // is trusted for authorization.
   if(!verifiedOwner&&current.email_confirmed_at){
     const claim=await client.rpc('claim_owner_access');
     if(claim.error)console.warn('Owner activation unavailable',claim.error);
     else verifiedOwner=claim.data===true;
   }
   if(user()?.id!==id)return ownerRole;
   request=application.data||null;
   // User metadata selects onboarding UI only; no publication permission.
   const intendsContribution=current.user_metadata?.signup_intent==='collaborator';
   ownerRole=verifiedOwner?'admin':(request||intendsContribution)?'applicant':'student';
   if(!verifiedOwner&&request?.status==='approved')ownerRole='contributor';
 }catch(error){
   console.warn('Portal access check failed',error);
   ownerRole='student';request=null;
 }
 if(user()?.id!==id)return ownerRole;
 window.BAC_PORTAL_ROLE=ownerRole;
 if(typeof renderNavs==='function')renderNavs();
 const desired=ownerRole==='admin'?'admin':ownerRole==='contributor'||ownerRole==='applicant'?'collaborate':'home';
 if(typeof showPage==='function')showPage(desired);
 if(ownerRole==='admin')void loadAdmin();
 if(ownerRole==='student')void loadApprovedResources();
 if(['contributor','applicant'].includes(ownerRole))void loadContributor();
 return ownerRole;
}
async function loadApprovedResources(){
 if(!user()||ownerRole!=='student')return;
 const grid=$('approvedResourceGrid');if(!grid)return;
 const id=user().id;
 try{
   const {data,error}=await db().from('collaborator_resources')
     .select('id,title,subject,academic_branch,description,resource_url,resource_kind,unit_title,status')
     .eq('status','approved').order('created_at',{ascending:false}).limit(100);
   if(error)throw error;
   if(user()?.id!==id||ownerRole!=='student')return;
   grid.replaceChildren();
   if(!data?.length){grid.append(placeholder('لا توجد إضافات منشورة','ستظهر الملفات الجديدة بعد موافقة إدارة Bac-pedia.'));return;}
   for(const item of data){
     const card=el('article','portal-resource');
     card.append(el('span','portal-type',kind[item.resource_kind]||'مورد'),
       el('h3','',item.title),el('p','',(item.academic_branch||'جميع الشعب')+' · '+item.subject+(item.unit_title?' · '+item.unit_title:'')),
       el('p','',item.description||''));
     if(validUrl(item.resource_url)){
       const a=el('a','portal-action','فتح المصدر الموثق');
       a.href=item.resource_url;a.rel='noopener noreferrer';a.target='_blank';card.append(a);
     }
     grid.append(card);
   }
 }catch(error){grid.replaceChildren(placeholder('تعذر تحميل الملفات','تحقق من الاتصال وأعد المحاولة.'));console.warn(error);}
}
async function loadContributor(){
 if(!user()||!['contributor','applicant'].includes(ownerRole))return;
 const id=user().id;
 try{
   request=await loadMyApplication(id);
   const result=await db().from('collaborator_resources')
     .select('id,contributor_id,title,subject,academic_branch,description,resource_url,resource_kind,unit_title,status,created_at')
     .eq('contributor_id',id).order('created_at',{ascending:false}).limit(200);
   if(result.error)throw result.error;
   if(user()?.id!==id)return;
   resources=result.data||[];
   renderContributor();
 }catch(error){failed(error,'تحميل مساحة المساهمة');}
}
function renderContributor(){
 const panel=$('collaboratorStatusPanel'),apply=$('collaboratorApplyPanel'),submit=$('collabSubmitPanel'),grid=$('collabResourcesGrid');
 if(!panel||!apply||!submit||!grid)return;
 panel.replaceChildren(el('h3','','حالة العضوية'));
 const active=request?.status==='approved';
 if(!request){
   panel.append(el('p','','قدّم طلباً للمساهمة ليتم مراجعته. لا تمنح استمارة التسجيل أي صلاحية نشر.'));
 }else{
   panel.append(statusPill(request.status),el('p','',request.display_name+' · '+request.organization+' · '+(request.academic_branch||'الشعبة غير محددة')));
   panel.append(el('p','',active?'حسابك معتمد. يمكنك إضافة روابط Google Drive وتعديل المقترحات قبل النشر.':
     request.status==='pending'?'طلبك مسجّل، في انتظار مراجعة الإدارة.':'تم إيقاف صلاحية المساهمة. يمكنك التواصل مع الإدارة.'));
 }
 if(request&&['pending','rejected'].includes(request.status))panel.append(button('تعديل بياناتي',()=>editContributorProfile(),'portal-action'));
 if(request?.status==='rejected')panel.append(button('إعادة تقديم الطلب',()=>void resubmitContributorApplication(),'portal-action success'));
 apply.classList.toggle('hidden',!!request&&!profileEditing);
 submit.classList.toggle('hidden',!active);
 metric('contributorMetrics',[
   resources.length,
   resources.filter(x=>x.status==='pending').length,
   resources.filter(x=>x.status==='approved').length,
   resources.filter(x=>x.status==='rejected').length
 ]);
 grid.replaceChildren();
 if(!resources.length){grid.append(placeholder('لم ترسل موارد بعد','عندما يصبح الحساب معتمداً يمكنك رفع روابط موثقة للمراجعة.'));return;}
 for(const item of resources){
   const card=el('article','portal-resource');
   const top=el('div','portal-resource-top');
   top.append(el('span','portal-type',kind[item.resource_kind]||'مورد'),statusPill(item.status));
   card.append(top,el('h3','',item.title));
   card.append(el('p','',item.subject+(item.unit_title?' · '+item.unit_title:'')));
   card.append(el('p','',item.description||'لا يوجد وصف'));
   const tools=el('div','portal-resource-actions');
   if(validUrl(item.resource_url)){
     const a=el('a','portal-action','فتح الرابط');a.href=item.resource_url;a.target='_blank';a.rel='noopener noreferrer';tools.append(a);
   }
   if(active){
     if(item.status!=='approved')tools.append(button('تعديل',()=>editResource(item)));
     if(item.status==='rejected')tools.append(button('إعادة إرسال',()=>void resubmitResource(item.id),'portal-action success'));
     tools.append(button('حذف',()=>void removeResource(item),'portal-action danger'));
   }
   card.append(tools);grid.append(card);
 }
}
function editResource(item){
 editId=item.id;
 $('collabResourceTitle').value=item.title;
 $('collabResourceSubject').value=item.subject;
 $('collabResourceBranch').value=item.academic_branch||'جميع الشعب';
 $('collabResourceKind').value=item.resource_kind||'other';
 $('collabResourceUnit').value=item.unit_title||'';
 $('collabResourceUrl').value=item.resource_url;
 $('collabResourceDescription').value=item.description||'';
 $('collabEditorTitle').textContent='تعديل المورد';
 $('collabSaveResource').textContent='حفظ التعديلات';
 $('collabCancelEdit').classList.remove('hidden');
 $('collabSubmitPanel').scrollIntoView({behavior:'smooth'});
}
function cancelEdit(){
 editId=null;$('collabResourceForm')?.reset();
 if($('collabEditorTitle'))$('collabEditorTitle').textContent='أضف مورداً تعليمياً';
 if($('collabSaveResource'))$('collabSaveResource').textContent='إرسال للمراجعة';
 $('collabCancelEdit')?.classList.add('hidden');
}
async function saveResource(event){
 event.preventDefault();
 if(busy||ownerRole!=='contributor'||request?.status!=='approved')return;
 const data={
   title:txt($('collabResourceTitle').value),
   subject:txt($('collabResourceSubject').value),
   academic_branch:$('collabResourceBranch').value,
   resource_kind:$('collabResourceKind').value,
   unit_title:txt($('collabResourceUnit').value),
   resource_url:txt($('collabResourceUrl').value),
   description:txt($('collabResourceDescription').value)
 };
 if(data.title.length<4||data.subject.length<2||!branchValid(data.academic_branch)||
    data.unit_title.length<2||data.description.length<12||!validUrl(data.resource_url)){
   notify('الشعبة، المادة، الوحدة، الوصف المفيد ورابط Google Drive جميعها مطلوبة','warning');return;
 }
 busy=true;
 try{
   const client=db(),result=editId?
     await client.from('collaborator_resources').update(data).eq('id',editId).eq('contributor_id',user().id):
     await client.from('collaborator_resources').insert({...data,contributor_id:user().id});
   if(result.error)throw result.error;
   cancelEdit();await loadContributor();notify('تم حفظ المورد في قاعدة البيانات','success');
 }catch(error){failed(error,'حفظ المورد');}finally{busy=false;}
}
async function removeResource(item){
 if(busy||ownerRole!=='contributor'||!window.confirm('حذف هذا المورد من حسابك؟'))return;
 busy=true;
 try{
   const result=await db().from('collaborator_resources').delete().eq('id',item.id).eq('contributor_id',user().id);
   if(result.error)throw result.error;
   if(editId===item.id)cancelEdit();
   await loadContributor();notify('تم حذف الرابط','success');
 }catch(error){failed(error,'حذف المورد');}finally{busy=false;}
}
function editContributorProfile(){
 if(!request||!['pending','rejected'].includes(request.status))return;
 profileEditing=true;
 $('collabName').value=request.display_name||'';
 $('collabOrg').value=request.organization||'';
 $('collabType').value=request.contribution_type||'student';
 $('collabBranch').value=request.academic_branch||'جميع الشعب';
 $('collabMotivation').value=request.motivation||'';
 $('collabProfileFormTitle').textContent='تعديل بيانات المساهمة';
 $('collabProfileSave').textContent='حفظ البيانات';
 $('collabProfileCancel').classList.remove('hidden');
 $('collaboratorApplyPanel').classList.remove('hidden');
 $('collaboratorApplyPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function resetContributorProfileForm(){
 profileEditing=false;
 $('collaboratorApplyForm')?.reset();
 if($('collabProfileFormTitle'))$('collabProfileFormTitle').textContent='بياناتك كمساهم';
 if($('collabProfileSave'))$('collabProfileSave').textContent='إرسال الطلب للمراجعة';
 $('collabProfileCancel')?.classList.add('hidden');
 if(request)$('collaboratorApplyPanel')?.classList.add('hidden');
}
async function resubmitContributorApplication(){
 if(busy||!user()||request?.status!=='rejected')return;
 busy=true;
 try{
   const result=await db().rpc('resubmit_collaborator_application');
   if(result.error)throw result.error;
   if(result.data!==true)throw new Error('This application is not eligible for resubmission');
   resetContributorProfileForm();
   await loadContributor();
   notify('تمت إعادة إرسال طلبك للمراجعة','success');
 }catch(error){failed(error,'إعادة تقديم طلب المساهمة');}
 finally{busy=false;}
}
async function resubmitResource(id){
 if(busy||ownerRole!=='contributor'||request?.status!=='approved')return;
 busy=true;
 try{
   const result=await db().rpc('resubmit_contributor_resource',{p_resource_id:id});
   if(result.error)throw result.error;
   if(result.data!==true)throw new Error('Resource cannot be resubmitted');
   await loadContributor();
   notify('أُعيد إرسال الرابط للمراجعة','success');
 }catch(error){failed(error,'إعادة إرسال المورد');}
 finally{busy=false;}
}
async function sendApplication(event){
 event.preventDefault();if(busy||!user()||(request&&!profileEditing))return;
 const row={
   user_id:user().id,display_name:txt($('collabName').value),organization:txt($('collabOrg').value),
   contribution_type:$('collabType').value,motivation:txt($('collabMotivation').value),
   academic_branch:$('collabBranch').value
 };
 if(row.display_name.length<2||row.organization.length<2||row.motivation.length<15||!branchValid(row.academic_branch)){notify('الاسم والمؤسسة والشعبة ووصف المساهمة مطلوبة','warning');return;}
 busy=true;
 try{
   const result=profileEditing&&request?
     await db().from('collaborator_applications').update({
       display_name:row.display_name,organization:row.organization,
       contribution_type:row.contribution_type,motivation:row.motivation,
       academic_branch:row.academic_branch
     }).eq('user_id',user().id):
     await db().from('collaborator_applications').insert(row);
   if(result.error)throw result.error;
   profileEditing=false;resetContributorProfileForm();
   request=await loadMyApplication(user().id);await loadContributor();
   notify('تم حفظ بياناتك للمراجعة','success');
 }catch(error){failed(error,'تقديم طلب المساهمة');}finally{busy=false;}
}
async function loadAdmin(){
 if(ownerRole!=='admin'||!user())return;
 const marker=$('adminStatusNote');if(marker)marker.textContent='جار تحميل البيانات...';
 const id=user().id;
 try{
   const client=db();
   const [applications,proposals,students,audit]=await Promise.all([
     client.from('collaborator_applications')
       .select('user_id,display_name,organization,contribution_type,motivation,academic_branch,status,created_at').order('created_at',{ascending:false}).limit(250),
     client.from('collaborator_resources')
       .select('id,contributor_id,title,subject,academic_branch,description,resource_url,unit_title,resource_kind,status,created_at').order('created_at',{ascending:false}).limit(400),
     client.from('student_profiles')
       .select('user_id,full_name,email,branch,created_at,last_activity_at').order('created_at',{ascending:false}).limit(250),
     client.from('moderation_audit').select('id,action,target_id,decision,created_at').order('created_at',{ascending:false}).limit(100)
   ]);
   for(const q of [applications,proposals,students,audit])if(q.error)throw q.error;
   if(user()?.id!==id||ownerRole!=='admin')return;
   adminApplications=applications.data||[];
   adminResources=proposals.data||[];
   profiles=students.data||[];
   auditEntries=audit.data||[];
   metric('adminMetrics',[
     profiles.length,adminApplications.filter(x=>x.status==='pending').length,
     adminApplications.filter(x=>x.status==='approved').length,
     adminResources.filter(x=>x.status==='pending').length
   ]);
   if(marker)marker.textContent='تُطبّق موافقات الإدارة في قاعدة البيانات مباشرة. لا يمكن لمساهم منح نفسه صلاحيات.';
   renderAdmin();
 }catch(error){
   if(marker)marker.textContent='تعذر تحميل بيانات الإدارة.';
   failed(error,'تحميل لوحة الإدارة');
 }
}
async function inspectOwnerAI(){
 if(ownerRole!=='admin'||adminTab!=='ai')return;
 const root=$('adminList');if(!root)return;
 root.replaceChildren(el('p','portal-ai-status','جار فحص خادم الذكاء الاصطناعي...'));
 try{
   const response=await fetch('/api/ai',{method:'GET',cache:'no-store'});
   const info=await response.json();
   if(ownerRole!=='admin'||adminTab!=='ai')return;
   const connected=response.ok&&info.provider==='deploy'&&info.ready===true;
   const section=el('section','portal-ai-panel');
   section.append(el('h3','','مساعد Deploy.com'));
   section.append(el('p','portal-ai-status',connected?
     'مفتاح API موجود في الخادم. لم يتم التأكد من صلاحية المفتاح أو إنتاج إجابة حتى الآن.':
     'الربط غير مكتمل. تحقّق من DEPLOY_API_KEY في إعدادات Cloudflare.'));
   section.append(el('p','portal-ai-footnote',
     'ملاحظة: حالة الربط لا تعرض المفتاح ولا تُثبت نجاح توليد الإجابات. اختبار الإجابة يستهلك طلباً واحداً من رصيدك اليومي.'));
   const actions=el('div','portal-admin-actions');
   actions.append(button('إعادة الفحص',()=>void inspectOwnerAI()));
   if(connected)actions.append(button('اختبار إجابة حقيقية',()=>void testOwnerAI(),'portal-action success'));
   section.append(actions);
   root.replaceChildren(section);
 }catch(error){
   console.warn('Owner AI health check failed',error);
   root.replaceChildren(placeholder('خادم AI لا يستجيب','تأكد من تشغيل Cloudflare Worker وفتح الرابط الصحيح.'));
 }
}
async function testOwnerAI(){
 if(ownerRole!=='admin'||adminTab!=='ai')return;
 const root=$('adminList');if(!root)return;
 const result=el('p','portal-ai-status','جار اختبار إجابة من Deploy.com...');
 root.append(result);
 try{
   const session=await db().auth.getSession();
   const token=session.data?.session?.access_token;
   if(!token){result.textContent='يرجى تسجيل الدخول مرة أخرى.';return;}
   const response=await fetch('/api/ai',{
     method:'POST',
     headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
     body:JSON.stringify({
       agent:'smart_tutor',
       prompt:'اكتب جملة ترحيب واحدة موجزة لطالب يستعد لبكالوريا الجزائر 2027.'
     })
   });
   const body=await response.json();
   if(ownerRole!=='admin'||adminTab!=='ai')return;
   result.textContent=response.ok&&typeof body.answer==='string'?
     'نجح الاتصال! ردّ النموذج: '+body.answer.slice(0,500):
     'تعذر إنشاء الإجابة ('+response.status+'): '+String(body.error||'خطأ غير معروف').slice(0,250);
 }catch(error){
   console.warn('Owner AI generation test failed',error);
   result.textContent='فشل الاتصال بالخادم أو قراءة الرد. تحقّق من إعدادات Cloudflare.';
 }
}
function adminVisible(rows){
 const search=txt($('adminSearch')?.value).toLocaleLowerCase();
 const status=txt($('adminReviewFilter')?.value)||'all';
 return rows.filter(x=>{
   if(status!=='all'&&x.status&&x.status!==status)return false;
   if(!search)return true;
   const joined=[x.display_name,x.organization,x.academic_branch,x.title,x.subject,
     x.unit_title,x.description,x.motivation,x.email].filter(Boolean).join(' ').toLocaleLowerCase();
   return joined.includes(search);
 });
}
function openAdminEditor(type,item){
 if(ownerRole!=='admin')return;
 const root=$('adminList');if(!root)return;
 const filters=$('adminFilters');if(filters)filters.hidden=true;
 const form=el('form','portal-editor');
 form.append(el('h3','',type==='resource'?'تعديل الملف أو المجلد':'تعديل بيانات المساهم'));
 form.append(el('p','portal-editor-hint','تحفظ التعديلات مباشرة في قاعدة البيانات، وتسجل في سجل الإدارة.'));
 const controls={};
 function field(name,title,value,options={}){
   const wrapper=el('label','portal-editor-field');
   wrapper.append(el('span','',title+' *'));
   const input=options.choices?el('select'):el(options.multiline?'textarea':'input');
   input.name=name;input.required=true;
   if(options.max)input.maxLength=options.max;
   if(options.min)input.minLength=options.min;
   if(options.url)input.type='url';
   else if(!options.multiline&&!options.choices)input.type='text';
   if(options.multiline)input.rows=4;
   if(options.choices){
     for(const v of options.choices){
       const opt=el('option','',typeof v==='string'?v:v.label);
       opt.value=typeof v==='string'?v:v.value;
       input.append(opt);
     }
   }
   input.value=value||'';
   wrapper.append(input);controls[name]=input;form.append(wrapper);
 }
 if(type==='resource'){
   field('title','عنوان المورد',item.title,{min:4,max:180});
   field('academic_branch','الشعبة',item.academic_branch||'جميع الشعب',{choices:branchChoices});
   field('subject','المادة',item.subject,{min:2,max:100});
   field('resource_kind','نوع المورد',item.resource_kind||'other',
     {choices:Object.entries(kind).map(([value,label])=>({value,label}))});
   field('unit_title','الوحدة أو الفصل',item.unit_title,{min:2,max:120});
   field('resource_url','رابط Google Drive',item.resource_url,{url:true,max:2000});
   field('description','محتويات المجلد أو الملف',item.description,{min:12,max:2000,multiline:true});
 }else{
   field('display_name','اسم المساهم',item.display_name,{min:2,max:100});
   field('organization','المؤسسة أو النادي',item.organization,{min:2,max:150});
   field('academic_branch','الشعبة',item.academic_branch||'جميع الشعب',{choices:branchChoices});
   field('contribution_type','الصفة',item.contribution_type||'student',
     {choices:[{value:'student',label:'طالب'},{value:'teacher',label:'أستاذ'},
       {value:'club',label:'نادي'},{value:'organization',label:'مؤسسة'},{value:'other',label:'آخر'}]});
   field('motivation','وصف المساهمة',item.motivation,{min:15,max:2000,multiline:true});
 }
 const actions=el('div','portal-editor-actions');
 const save=el('button','btn primary','حفظ التعديلات');save.type='submit';
 actions.append(save,button('إلغاء',()=>renderAdmin()));
 form.append(actions);
 form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(busy||ownerRole!=='admin')return;
   const data=Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,txt(v.value)]));
   if(!branchValid(data.academic_branch)){notify('اختر الشعبة المطلوبة','warning');return;}
   if(type==='resource'&&(data.description.length<12||data.unit_title.length<2||!validUrl(data.resource_url))){
     notify('أدخل رابط Google Drive ووحدة ووصفاً واضحاً','warning');return;
   }
   if(type==='application'&&data.motivation.length<15){notify('وصف المساهمة قصير جداً','warning');return;}
   busy=true;save.disabled=true;
   try{
     const result=type==='resource'?
       await db().rpc('admin_update_curated_resource',{
         p_resource_id:item.id,p_title:data.title,p_academic_branch:data.academic_branch,
         p_subject:data.subject,p_resource_kind:data.resource_kind,
         p_unit_title:data.unit_title,p_description:data.description,p_resource_url:data.resource_url
       }):
       await db().rpc('admin_update_contributor_profile',{
         p_user_id:item.user_id,p_display_name:data.display_name,
         p_organization:data.organization,p_contribution_type:data.contribution_type,
         p_motivation:data.motivation,p_academic_branch:data.academic_branch
       });
     if(result.error)throw result.error;
     if(result.data!==true)throw new Error('No editable record found');
     notify('تم حفظ التعديلات في قاعدة البيانات','success');
     await loadAdmin();
   }catch(error){failed(error,'تحديث المعلومات');}
   finally{busy=false;save.disabled=false;}
 });
 root.replaceChildren(form);
 root.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderAdmin(){
 const root=$('adminList');if(!root)return;root.replaceChildren();
 const filters=$('adminFilters');if(filters)filters.hidden=!['applications','resources','students'].includes(adminTab);
 document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===adminTab));
 if(adminTab==='applications'){
   const applications=adminVisible(adminApplications);
   if(!applications.length){root.append(placeholder('لا توجد طلبات مطابقة','جرّب مسح البحث أو تغيير حالة الطلب.'));return;}
   for(const item of applications){
     const card=el('article','portal-admin-entry');
     const text=el('div','portal-admin-entry-text');
     text.append(el('strong','',item.display_name),el('span','',(item.academic_branch||'جميع الشعب')+' · '+item.organization+' · '+(item.contribution_type||'')),
       el('p','',item.motivation));
     const actions=el('div','portal-admin-actions');
     actions.append(statusPill(item.status));
     actions.append(button('تعديل البيانات',()=>openAdminEditor('application',item)));
     if(item.status!=='approved')actions.append(button('قبول',()=>void moderate('application',item.user_id,'approved'),'portal-action success'));
     if(item.status!=='rejected')actions.append(button(item.status==='approved'?'سحب صلاحية المساهم':'رفض الطلب',
       ()=>void moderate('application',item.user_id,'rejected'),'portal-action danger'));
     card.append(text,actions);root.append(card);
   }
 }else if(adminTab==='resources'){
   const proposals=adminVisible(adminResources);
   if(!proposals.length){root.append(placeholder('لا توجد موارد مطابقة','جرّب كلمة أخرى أو اختر حالة مختلفة.'));return;}
   for(const item of proposals){
     const card=el('article','portal-admin-entry');
     const main=el('div','portal-admin-entry-text');
     main.append(el('strong','',item.title),el('span','',(item.academic_branch||'جميع الشعب')+' · '+item.subject+' · '+(kind[item.resource_kind]||'مورد')+
       (item.unit_title?' · '+item.unit_title:'')),el('p','',item.description||''));
     const actions=el('div','portal-admin-actions');actions.append(statusPill(item.status));
     actions.append(button('تعديل الرابط والحقول',()=>openAdminEditor('resource',item)));
     if(validUrl(item.resource_url)){
       const a=el('a','portal-action','فحص الرابط');a.href=item.resource_url;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);
     }
     if(item.status!=='approved')actions.append(button('نشر',()=>void moderate('resource',item.id,'approved'),'portal-action success'));
     if(item.status!=='rejected')actions.append(button('رفض',()=>void moderate('resource',item.id,'rejected'),'portal-action danger'));
     actions.append(button('حذف نهائي',()=>void moderate('delete_resource',item.id,'deleted'),'portal-action danger'));
     card.append(main,actions);root.append(card);
   }
 }else if(adminTab==='students'){
   const students=adminVisible(profiles);
   if(!students.length){root.append(placeholder('لا توجد حسابات مطابقة','جرّب بحثاً آخر.'));return;}
   for(const p of students){
     const card=el('article','portal-admin-entry');
     const main=el('div','portal-admin-entry-text');
     main.append(el('strong','',p.full_name||'طالب'),el('span','',p.email||'بريد غير متاح'),
       el('p','','الشعبة: '+(p.branch||'غير محددة')+' · التسجيل: '+date(p.created_at)));
     card.append(main);root.append(card);
   }
 }else if(adminTab==='audit'){
   if(!auditEntries.length){root.append(placeholder('لا توجد إجراءات','ستظهر قرارات الموافقة والرفض والحذف هنا.'));return;}
   for(const entry of auditEntries){
     const card=el('article','portal-admin-entry');
     const main=el('div','portal-admin-entry-text');
     main.append(el('strong','',entry.action==='application'?'قرار حول مساهم':entry.action==='resource'?'قرار حول مورد':'حذف مورد'),
       el('span','',statusLabel(entry.decision)+' · '+date(entry.created_at)),
       el('p','',entry.target_id));
     card.append(main);root.append(card);
   }
 }else if(adminTab==='ai'){
   void inspectOwnerAI();
 }
}
async function moderate(type,id,decision){
 if(busy||ownerRole!=='admin')return;
 if((decision==='rejected'||decision==='deleted')&&!window.confirm(
   decision==='deleted'?'حذف هذا المورد نهائياً؟':'تأكيد الرفض أو سحب صلاحية المساهمة؟'))return;
 busy=true;
 try{
   const name=type==='application'?'review_collaborator_application':
     type==='resource'?'review_collaborator_resource':'admin_delete_contributor_resource';
   const args=type==='application'?{p_user_id:id,p_decision:decision}:
     type==='resource'?{p_resource_id:id,p_decision:decision}:{p_resource_id:id};
   const {data,error}=await db().rpc(name,args);
   if(error)throw error;
   if(data!==true)throw new Error('Target was not found');
   await loadAdmin();notify('تم تحديث الحالة وحفظها في قاعدة البيانات','success');
 }catch(error){failed(error,'مراجعة العنصر');}finally{busy=false;}
}
function resetSession(){
 identity=null;request=null;resources=[];adminApplications=[];adminResources=[];profiles=[];auditEntries=[];ownerRole='student';
 window.BAC_PORTAL_ROLE='student';cancelEdit();resetContributorProfileForm();
}
window.refreshPortalRole=refreshPortalRole;
window.renderCommunity=()=>{if(user()&&['contributor','applicant'].includes(ownerRole))void loadContributor();};
window.renderApprovedResources=()=>{if(user()&&ownerRole==='student')void loadApprovedResources();};
window.renderAdmin=()=>{if(user()&&ownerRole==='admin')void loadAdmin();};
window.onCommunityAuthChanged=()=>{if(!user()){resetSession();return;}void refreshPortalRole();};
$('collaboratorApplyForm')?.addEventListener('submit',event=>void sendApplication(event));
$('collabResourceForm')?.addEventListener('submit',event=>void saveResource(event));
$('collabCancelEdit')?.addEventListener('click',cancelEdit);
$('collabProfileCancel')?.addEventListener('click',resetContributorProfileForm);
$('collabRefresh')?.addEventListener('click',()=>void loadContributor());
$('adminReload')?.addEventListener('click',()=>void loadAdmin());
$('adminSearch')?.addEventListener('input',()=>renderAdmin());
$('adminReviewFilter')?.addEventListener('change',()=>renderAdmin());
document.querySelectorAll('[data-admin-tab]').forEach(button=>button.addEventListener('click',()=>{adminTab=button.dataset.adminTab;renderAdmin();}));
if(user())void refreshPortalRole(); // Handles sessions restored before this classic script was loaded.
})();
