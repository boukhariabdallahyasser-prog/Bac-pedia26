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
let drafts=[],feedback=[],pdfAttachments=new Map(),draftEditId=null,adminReviews=[],approvedReputation=0;
let ownerRole='student',request=null,resources=[],adminApplications=[],adminResources=[],adminNotifications=[],profiles=[],auditEntries=[],editId=null,adminTab='library',busy=false,identity=null,profileEditing=false,adminRealtimeChannel=null,adminRealtimeUser=null;
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
 try{
   const u=new URL(value);
   return u.protocol==='https:'&&u.hostname.includes('.')&&!u.username&&!u.password&&
     !['localhost','127.0.0.1','::1'].includes(u.hostname.toLowerCase())&&value.length<=2000;
 }catch{return false}
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
   // Never guess a student's role if the database could not verify access.
   // Remain on the access-check screen rather than showing the wrong portal.
   console.warn('Portal access check failed',error);
   const status=$('portalLoading');
   if(status)status.textContent='تعذّر التحقق من صلاحيات الحساب. أعد تحميل الصفحة.';
   else notify('تعذّر التحقق من صلاحيات الحساب. أعد المحاولة.','warning');
   return 'unverified';
 }
 if(user()?.id!==id)return ownerRole;
 window.BAC_PORTAL_ROLE=ownerRole;
 const expected=ownerRole==='admin'?'admin':
   ['contributor','applicant'].includes(ownerRole)?'contributor':'student';
 if(ownerRole!=='admin')stopAdminRealtime();
 const currentPortal=document.body.dataset.portal||'landing';
 // HTML and primary routes are physically separate, and the server-side
 // Supabase RLS checks above are the authority for each user's role.
 if(currentPortal!==expected){
   window.location.replace('/'+expected+'/');
   return ownerRole;
 }
 document.body.classList.add('portal-authorized');
 $('portalLoading')?.remove();
 if(typeof renderNavs==='function')renderNavs();
 const desired=expected==='admin'?'admin':expected==='contributor'?'collaborate':'home';
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
   const ids=(data||[]).map(x=>x.id);
   let verifiedIds=new Set();
   if(ids.length){
     const {data:verified,error:verifyError}=await db().from('resource_verifications')
       .select('resource_id').in('resource_id',ids).limit(200);
     if(!verifyError)verifiedIds=new Set((verified||[]).map(x=>x.resource_id));
   }
   grid.replaceChildren();
   if(!data?.length){grid.append(placeholder('لا توجد إضافات منشورة','ستظهر الملفات الجديدة بعد موافقة إدارة Bac-pedia.'));return;}
   for(const item of data){
     const card=el('article','portal-resource');
     if(verifiedIds.has(item.id))card.append(el('span','comm-state-tag approved','حل راجعه المشرف'));
     card.append(el('span','portal-type',kind[item.resource_kind]||'مورد'),
       el('h3','',item.title),el('p','',(item.academic_branch||'جميع الشعب')+' · '+item.subject+(item.unit_title?' · '+item.unit_title:'')),
       el('p','',item.description||''));
     if(validUrl(item.resource_url)){
       const a=el('a','portal-action','فتح المصدر الموثق');
       a.href=item.resource_url;a.rel='noopener noreferrer';a.target='_blank';card.append(a);
     }
     const actions=el('div','portal-resource-actions');
     actions.append(button('تقييم 1–5',()=>{
       const value=Number(window.prompt('أدخل تقييماً من 1 إلى 5'));
       if(Number.isInteger(value)&&value>=1&&value<=5)void submitResourceReview(item,'rating',value);
     }));
     actions.append(button('إبلاغ عن مشكلة',()=>{
       const reason=window.prompt('نوع البلاغ: broken_link / incorrect_solution / copyright / inappropriate / other','broken_link');
       if(['broken_link','incorrect_solution','copyright','inappropriate','other'].includes(reason))void submitResourceReview(item,'report_reason',reason);
     }));
     actions.append(button('PDF المرفق إن وجد',()=>void openPDF(item.id)));
     card.append(actions);
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
     .select('id,contributor_id,title,subject,subject_key,specialization_code,content_group,academic_branch,description,resource_url,resource_kind,unit_title,status,created_at')
     .eq('contributor_id',id).order('created_at',{ascending:false}).limit(200);
   if(result.error)throw result.error;
   if(user()?.id!==id)return;
   resources=result.data||[];
   // Optional until the additive SQL migration is installed.
   const [draftResult,feedbackResult,pdfResult]=await Promise.all([
     db().from('contributor_drafts').select('*').eq('contributor_id',id).order('updated_at',{ascending:false}).limit(60),
     db().from('contributor_private_feedback').select('id,resource_id,message,created_at').eq('contributor_id',id).order('created_at',{ascending:false}).limit(100),
     db().from('resource_pdf_attachments').select('resource_id,storage_path').eq('contributor_id',id).limit(200)
   ]);
   if(user()?.id!==id)return;
   drafts=draftResult.error?[]:(draftResult.data||[]);
   feedback=feedbackResult.error?[]:(feedbackResult.data||[]);
   pdfAttachments=new Map((pdfResult.error?[]:(pdfResult.data||[])).map(x=>[x.resource_id,x.storage_path]));
   const rep=await db().from('contributor_reputation').select('approved_contributions,reputation_points')
     .eq('contributor_id',id).maybeSingle();
   approvedReputation=rep.error?0:(rep.data?.reputation_points||0);
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
   panel.append(el('p','',active?'حسابك معتمد. يمكنك إضافة روابط Google Drive وOneDrive وDropbox وYouTube وغيرها من المصادر الآمنة قبل النشر.':
     request.status==='pending'?'طلبك مسجّل، في انتظار مراجعة الإدارة.':'تم إيقاف صلاحية المساهمة. يمكنك التواصل مع الإدارة.'));
 }
 if(request&&['pending','rejected'].includes(request.status))panel.append(button('تعديل بياناتي',()=>editContributorProfile(),'portal-action'));
 if(request?.status==='rejected')panel.append(button('إعادة تقديم الطلب',()=>void resubmitContributorApplication(),'portal-action success'));
 apply.classList.toggle('hidden',!!request&&!profileEditing);
 submit.classList.toggle('hidden',!active);
 const action=$('contributorNextAction');
 if(action){
  action.replaceChildren();
  const info=el('div','contributor-next-copy');
  info.append(el('strong','',!request?'ابدأ بطلب المساهمة':
    active?'أضف مورداً موثوقاً إلى المادة الصحيحة':
    request.status==='pending'?'طلبك قيد المراجعة':'حدّث بياناتك قبل إعادة التقديم'));
  info.append(el('p','',!request?'قدّم بيانات مختصرة ليتمكن المشرف من مراجعة طلبك.':
    active?'اختر الشعبة، ثم المادة والوحدة. ستظهر الموارد للطالب بعد موافقة الإدارة.':
    request.status==='pending'?'لا يمكنك النشر قبل اعتماد الحساب، ويمكنك متابعة الحالة هنا.':
    'راجع ملفك وأعد تقديم الطلب إذا كان ذلك متاحاً.'));
  const actions=el('div','contributor-next-buttons');
  const target=active?'collabSubmitPanel':!request?'collaboratorApplyPanel':'collaboratorStatusPanel';
  actions.append(button(active?'إضافة مورد جديد':!request?'تقديم طلب':'متابعة حالتي',()=>{
   $(target)?.scrollIntoView({behavior:'smooth',block:'start'});
  },'portal-action success'));
  if(active){
   actions.append(button('مواردي',()=>$('#contributorMyResources')?.scrollIntoView({behavior:'smooth'})));
   actions.append(button('مسوداتي',()=>$('#contributorMyDrafts')?.scrollIntoView({behavior:'smooth'})));
  }
  action.append(info,actions);
 }
 panel.append(el('p','muted','نقاط السمعة: '+approvedReputation+' (10 نقاط لكل مورد منشور، دون تقييم ذاتي).'));
 metric('contributorMetrics',[
   resources.length,
   resources.filter(x=>x.status==='pending').length,
   resources.filter(x=>x.status==='approved').length,
   resources.filter(x=>x.status==='rejected').length
 ]);
 grid.replaceChildren();
 if(!resources.length){grid.append(placeholder('لم ترسل موارد بعد','عندما يصبح الحساب معتمداً يمكنك رفع روابط موثقة للمراجعة.'));renderDrafts();return;}
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
     if(item.status==='pending'&&!pdfAttachments.has(item.id)){
       const upload=el('input');upload.type='file';upload.accept='.pdf,application/pdf';
       upload.style.maxWidth='220px';upload.setAttribute('aria-label','ارفع ملف PDF خاصاً بالمورد');
       const send=button('رفع PDF',()=>{if(upload.files?.[0])void uploadPDF(item,upload.files[0]);else notify('اختر ملف PDF أولاً','warning')});
       tools.append(upload,send);
     }
     if(pdfAttachments.has(item.id))tools.append(button('عرض PDF',()=>void openPDF(item.id)));
     tools.append(button('سجل النسخ',()=>void viewVersions(item,card)));
     if(item.status!=='approved')tools.append(button('تعديل',()=>editResource(item)));
     if(item.status==='rejected')tools.append(button('إعادة إرسال',()=>void resubmitResource(item.id),'portal-action success'));
     tools.append(button('حذف',()=>void removeResource(item),'portal-action danger'));
   }
   for(const note of feedback.filter(x=>x.resource_id===item.id).slice(0,3)){
     card.append(el('p','portal-notice','تعليق خاص من الإدارة · '+date(note.created_at)+' : '+note.message));
   }
   card.append(tools);grid.append(card);
 }
 renderDrafts();
}
function editResource(item){
 editId=item.id;
 $('collabResourceTitle').value=item.title;
 $('collabResourceBranch').value=item.academic_branch||'جميع الشعب';
 if(window.BacContributorGuide?.hydrate)window.BacContributorGuide.hydrate(item);
 $('collabResourceSubject').value=item.subject;
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
 editId=null;$('collabResourceForm')?.reset();window.BacContributorGuide?.refresh();
 if($('collabEditorTitle'))$('collabEditorTitle').textContent='أضف مورداً تعليمياً';
 if($('collabSaveResource'))$('collabSaveResource').textContent='إرسال للمراجعة';
 $('collabCancelEdit')?.classList.add('hidden');
}
function draftFields(){
 return {title:txt($('collabResourceTitle')?.value),subject:txt($('collabResourceSubject')?.value),
 academic_branch:$('collabResourceBranch')?.value||'جميع الشعب',resource_kind:$('collabResourceKind')?.value||'other',
 unit_title:txt($('collabResourceUnit')?.value),resource_url:txt($('collabResourceUrl')?.value),
 description:txt($('collabResourceDescription')?.value)};
}
async function saveDraft(){
 if(busy||ownerRole!=='contributor'||request?.status!=='approved'||!user())return;
 const fields=draftFields();
 if(!fields.title&&!fields.subject&&!fields.description&&!fields.resource_url){
   notify('اكتب جزءاً من محتوى المسودة أولاً','warning');return;
 }
 busy=true;
 try{
   const row={...fields,contributor_id:user().id,updated_at:new Date().toISOString()};
   if(draftEditId)row.id=draftEditId;
   const {error}=await db().from('contributor_drafts').upsert(row);
   if(error)throw error;
   draftEditId=null;await loadContributor();notify('تم حفظ المسودة لحسابك','success');
 }catch(e){failed(e,'حفظ المسودة');}finally{busy=false}
}
function renderDrafts(){
 const grid=$('collabDraftsGrid');if(!grid)return;grid.replaceChildren();
 if(!drafts.length){grid.append(el('p','muted','لا توجد مسودات محفوظة.'));return}
 for(const draft of drafts){
   const card=el('article','portal-resource');
   card.append(el('h3','',draft.title||'مسودة بلا عنوان'),el('p','',draft.subject||'المادة غير محددة'));
   card.append(button('فتح المسودة',()=>{
     draftEditId=draft.id;editId=null;
     $('collabResourceBranch').value=draft.academic_branch||'';
     window.BacContributorGuide?.hydrate(draft);
     for(const [field,id] of [['title','collabResourceTitle'],['subject','collabResourceSubject'],
      ['resource_kind','collabResourceKind'],['unit_title','collabResourceUnit'],
      ['resource_url','collabResourceUrl'],['description','collabResourceDescription']]){
       const elmt=$(id);if(elmt)elmt.value=draft[field]||'';
     }
     $('collabSubmitPanel')?.scrollIntoView({behavior:'smooth'});
   }));
   card.append(button('حذف المسودة',async()=>{
     if(!window.confirm('حذف المسودة؟'))return;
     const {error}=await db().from('contributor_drafts').delete().eq('id',draft.id).eq('contributor_id',user().id);
     if(error)failed(error,'حذف المسودة');else{if(draftEditId===draft.id)draftEditId=null;await loadContributor()}
   },'portal-action danger'));
   grid.append(card);
 }
}
async function viewVersions(item,card){
 const {data,error}=await db().from('contributor_resource_versions')
   .select('old_fields,changed_at').eq('resource_id',item.id).order('changed_at',{ascending:false}).limit(12);
 if(error){failed(error,'قراءة الإصدارات');return}
 card.querySelector('.resource-history')?.remove();
 const section=el('div','resource-history');
 section.append(el('h4','','سجل النسخ السابقة'));
 if(!data?.length)section.append(el('p','muted','لا توجد نسخ سابقة بعد.'));
 else for(const v of data){const details=el('details');
   details.append(el('summary','',date(v.changed_at)+' · '+(v.old_fields?.title||'نسخة سابقة')),
     el('p','',v.old_fields?.description||''),el('p','',v.old_fields?.resource_url||''));
   section.append(details);
 }
 card.append(section);
}
async function uploadPDF(item,file){
 if(busy||ownerRole!=='contributor'||request?.status!=='approved'||item.status!=='pending')return;
 if(file.size<5||file.size>15728640){notify('حجم PDF يجب أن يكون أقل من 15 ميغابايت','warning');return}
 const magic=Array.from(new Uint8Array(await file.slice(0,5).arrayBuffer())).map(x=>String.fromCharCode(x)).join('');
 if(magic!=='%PDF-'){notify('الملف ليس PDF صالحاً','warning');return}
 busy=true;
 const id=user().id,path=id+'/'+item.id+'/'+crypto.randomUUID()+'.pdf';
 try{
   const {error:uploadError}=await db().storage.from('bac-resource-pdfs').upload(path,file,{upsert:false,contentType:'application/pdf'});
   if(uploadError)throw uploadError;
   const {error:recordError}=await db().from('resource_pdf_attachments').insert({
     resource_id:item.id,contributor_id:id,storage_path:path,file_size:file.size
   });
   if(recordError){
     await db().storage.from('bac-resource-pdfs').remove([path]);throw recordError;
   }
   await loadContributor();notify('تم إرفاق PDF خاص بالمورد، وسيظهر للطلاب بعد النشر.','success');
 }catch(e){failed(e,'رفع PDF');}finally{busy=false}
}
async function openPDF(resourceId){
 if(!user())return;
 const {data:attachment,error}=await db().from('resource_pdf_attachments')
   .select('storage_path').eq('resource_id',resourceId).maybeSingle();
 if(error||!attachment?.storage_path){notify('ملف PDF غير متاح','warning');return}
 const {data,error:signError}=await db().storage.from('bac-resource-pdfs').createSignedUrl(attachment.storage_path,300);
 if(signError||!data?.signedUrl){notify('تعذر إنشاء رابط PDF الآمن','warning');return}
 location.assign(data.signedUrl);
}
async function verifyHumanSolution(item){
 if(ownerRole!=='admin'||!user()||!['exercise','exam'].includes(item.resource_kind))return;
 const note=window.prompt('اكتب سبب التحقق البشري ومصدر الحل (15 إلى 1200 حرف):');
 if(note===null)return;
 if(note.trim().length<15||note.length>1200){notify('يرجى توثيق التحقق جيداً','warning');return;}
 const {error}=await db().from('resource_verifications').upsert({
   resource_id:item.id,verified_by:user().id,verification_note:note.trim()
 });
 if(error)failed(error,'توثيق الحل');else notify('تم توثيق مراجعة الحل بشرياً','success');
}
async function sendPrivateFeedback(item){
 if(ownerRole!=='admin'||!user())return;
 const message=window.prompt('تعليق خاص للمساهم حول هذا المورد (5 إلى 2000 حرف):');
 if(message===null)return;
 if(message.trim().length<5||message.length>2000){notify('طول التعليق غير صالح','warning');return}
 const {error}=await db().from('contributor_private_feedback').insert({
   resource_id:item.id,contributor_id:item.contributor_id,admin_id:user().id,message:message.trim()
 });
 if(error)failed(error,'إرسال تعليق خاص');else notify('تم إرسال التعليق الخاص إلى المساهم','success');
}
async function submitResourceReview(item,field,value){
 if(ownerRole!=='student'||!user())return;
 const uid=user().id;
 const {data:existing,error:lookupError}=await db().from('resource_reviews')
   .select('id').eq('reviewer_id',uid).eq('resource_id',item.id).maybeSingle();
 if(lookupError){failed(lookupError,'التحقق من التقييم');return}
 let request;
 if(existing?.id)request=db().from('resource_reviews').update({[field]:value,updated_at:new Date().toISOString()})
   .eq('id',existing.id).eq('reviewer_id',uid);
 else request=db().from('resource_reviews').insert({resource_id:item.id,reviewer_id:uid,[field]:value});
 const {error}=await request;
 if(error)failed(error,'إرسال التقييم أو البلاغ');else notify('تم تسجيل رأيك للمراجعة','success');
}
async function saveResource(event){
 event.preventDefault();
 if(busy||ownerRole!=='contributor'||request?.status!=='approved')return;
 const guided=window.BacContributorGuide?.data();
 if(!guided){notify('اختر الشعبة والمادة من القائمة قبل إرسال المورد','warning');return;}
 const data={
   title:txt($('collabResourceTitle').value),
   subject:guided.subject,
   subject_key:guided.subject_key,
   specialization_code:guided.specialization_code,
   content_group:guided.content_group,
   academic_branch:$('collabResourceBranch').value,
   resource_kind:$('collabResourceKind').value,
   unit_title:txt($('collabResourceUnit').value),
   resource_url:txt($('collabResourceUrl').value),
   description:txt($('collabResourceDescription').value)
 };
 if(data.title.length<4||data.subject.length<2||!branchValid(data.academic_branch)||
    data.unit_title.length<2||data.description.length<12||!validUrl(data.resource_url)){
   notify('الشعبة والمادة والوحدة والوصف ورابط HTTPS كلها مطلوبة','warning');return;
 }
 busy=true;
 try{
   const client=db(),result=editId?
     await client.from('collaborator_resources').update(data).eq('id',editId).eq('contributor_id',user().id):
     await client.from('collaborator_resources').insert({...data,contributor_id:user().id});
   if(result.error)throw result.error;
   cancelEdit();await loadContributor();notify('تم إرسال المورد إلى لوحة الإدارة للمراجعة. ستصلك حالة الطلب هنا.','success');
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
function stopAdminRealtime(){
 if(adminRealtimeChannel&&db())void db().removeChannel(adminRealtimeChannel);
 adminRealtimeChannel=null;adminRealtimeUser=null;
}
function updateAdminNotificationBadge(){
 const unread=adminNotifications.filter(item=>!item.is_read).length;
 for(const id of ['adminNotificationsBadge','adminNotificationCount']){
   const badge=$(id);if(!badge)continue;
   badge.textContent=unread>99?'99+':String(unread);
   badge.hidden=unread===0;
 }
 $('adminNotificationsButton')?.setAttribute('aria-label','الإشعارات، '+unread+' غير مقروءة');
}
function subscribeAdminNotifications(id){
 const client=db();if(!client||ownerRole!=='admin')return;
 if(adminRealtimeChannel&&adminRealtimeUser===id)return;
 stopAdminRealtime();adminRealtimeUser=id;
 adminRealtimeChannel=client.channel('bac-admin-resource-inbox-'+id)
   .on('postgres_changes',{
     event:'INSERT',schema:'public',table:'admin_notifications',
     filter:'recipient_id=eq.'+id
   },payload=>{
     const incoming=payload.new;
     if(!incoming||ownerRole!=='admin'||user()?.id!==id)return;
     if(!adminNotifications.some(item=>item.id===incoming.id))adminNotifications.unshift(incoming);
     updateAdminNotificationBadge();
     notify('وصل مورد جديد من '+(incoming.contributor_name||'مساهم')+' إلى صندوق الإدارة','success');
     void loadAdmin();
   })
   .subscribe(status=>{
     if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')
       console.warn('Admin resource notification channel:',status);
   });
}
async function markNotificationRead(id){
 if(ownerRole!=='admin'||!user())return;
 try{
   const {error}=await db().from('admin_notifications').update({is_read:true})
     .eq('id',id).eq('recipient_id',user().id);
   if(error)throw error;
   const item=adminNotifications.find(row=>row.id===id);if(item)item.is_read=true;
   updateAdminNotificationBadge();renderAdmin();
 }catch(error){failed(error,'تحديث الإشعار');}
}
async function markAllNotificationsRead(){
 if(ownerRole!=='admin'||!user())return;
 try{
   const {error}=await db().from('admin_notifications').update({is_read:true})
     .eq('recipient_id',user().id).eq('is_read',false);
   if(error)throw error;
   adminNotifications.forEach(item=>{item.is_read=true;});
   updateAdminNotificationBadge();renderAdmin();
   notify('تم تحديد جميع الإشعارات كمقروءة','success');
 }catch(error){failed(error,'تحديث الإشعارات');}
}
async function loadAdmin(){
 if(ownerRole!=='admin'||!user())return;
 const marker=$('adminStatusNote');if(marker)marker.textContent='جار تحميل البيانات...';
 const id=user().id;
 try{
   const client=db();
   subscribeAdminNotifications(id);
   const [applications,proposals,students,audit,notifications,reviews]=await Promise.all([
     client.from('collaborator_applications')
       .select('user_id,display_name,organization,contribution_type,motivation,academic_branch,status,created_at').order('created_at',{ascending:false}).limit(250),
     client.from('collaborator_resources')
       .select('id,contributor_id,title,subject,academic_branch,description,resource_url,unit_title,resource_kind,status,created_at').order('created_at',{ascending:false}).limit(400),
     client.from('student_profiles')
       .select('user_id,full_name,email,branch,created_at,last_activity_at').order('created_at',{ascending:false}).limit(250),
     client.from('moderation_audit').select('id,action,target_id,decision,created_at').order('created_at',{ascending:false}).limit(100),
     client.from('admin_notifications')
       .select('id,resource_id,contributor_id,contributor_name,event_type,resource_title,resource_subject,resource_description,resource_url,resource_kind,unit_title,academic_branch,is_read,created_at')
       .order('created_at',{ascending:false}).limit(200),
     client.from('resource_reviews').select('id,resource_id,reviewer_id,rating,report_reason,report_detail,created_at').not('report_reason','is',null).order('created_at',{ascending:false}).limit(250)
   ]);
   for(const q of [applications,proposals,students,audit,notifications,reviews])if(q.error)throw q.error;
   if(user()?.id!==id||ownerRole!=='admin')return;
   adminApplications=applications.data||[];
   adminResources=proposals.data||[];
   profiles=students.data||[];
   auditEntries=audit.data||[];
   adminNotifications=notifications.data||[];
   adminReviews=reviews.data||[];
   updateAdminNotificationBadge();
   for(const [id,count] of [
    ['resources',adminResources.filter(x=>x.status==='pending').length],
    ['applications',adminApplications.filter(x=>x.status==='pending').length],
    ['reports',adminReviews.filter(x=>x.report_reason).length]
   ]){const badge=document.querySelector('[data-admin-count="'+id+'"]');if(badge)badge.textContent=count?count+' يحتاج مراجعة':'';}
   metric('adminMetrics',[
     profiles.length,adminApplications.filter(x=>x.status==='pending').length,
     adminApplications.filter(x=>x.status==='approved').length,
     adminResources.filter(x=>x.status==='pending').length
   ]);
   if(marker)marker.textContent='كل رابط يرسله المساهم يصل تلقائياً إلى هذا المركز، مع إشعار فوري وسجل محفوظ للمراجعة.';
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
   const joined=[x.display_name,x.organization,x.academic_branch,x.title,x.subject,x.resource_url,
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
   field('resource_url','رابط المصدر (HTTPS)',item.resource_url,{url:true,max:2000});
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
     notify('أدخل رابط HTTPS صالحاً ووحدة ووصفاً واضحاً','warning');return;
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
 const current=$('adminCurrentTask');
 const names={library:'مكتبة المواد',resources:'مراجعة الموارد',applications:'طلبات المساهمين',
  reports:'البلاغات',students:'حسابات الطلاب',notifications:'الإشعارات',audit:'السجل',analytics:'التحليلات',ai:'فحص AI'};
 if(current)current.textContent=names[adminTab]||'الإدارة';
 for(const quick of document.querySelectorAll('[data-admin-shortcut]')){
  const active=quick.dataset.adminShortcut===adminTab;quick.classList.toggle('active',active);
  quick.setAttribute('aria-pressed',String(active));
 }
 const more=$('adminMoreSections');
 if(more&&(!['library','resources','applications','reports'].includes(adminTab)))more.open=true;
 const filters=$('adminFilters');if(filters)filters.hidden=!['applications','resources','students'].includes(adminTab);
 document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===adminTab));
 if(adminTab==='library'){
   if(ownerRole!=='admin'||!user())return;
   if(window.BacAdminLibrary?.render)window.BacAdminLibrary.render(root);
   else root.append(el('p','muted','تعذر تحميل أدوات المكتبة. حدّث الصفحة.'));
   return;
 }
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
   const toolbar=el('div','portal-notification-toolbar');
   toolbar.append(el('span','','يمكن اختيار 20 مورداً معلقاً كحد أقصى في عملية واحدة.'));
   toolbar.append(button('نشر المحددة',async()=>{
     if(ownerRole!=='admin'||busy)return;
     const ids=[...root.querySelectorAll('input[data-bulk-resource]:checked')].map(n=>n.value).slice(0,20);
     if(!ids.length){notify('اختر موارد قيد المراجعة أولاً','warning');return;}
     if(!window.confirm('تأكيد نشر '+ids.length+' مورداً؟'))return;
     busy=true;let approved=0,failedCount=0;
     try{
       for(const id of ids){
         const {data,error}=await db().rpc('review_collaborator_resource',{p_resource_id:id,p_decision:'approved'});
         if(error||data!==true)failedCount++;else approved++;
       }
     }finally{
       busy=false;await loadAdmin();
       notify('تم نشر '+approved+' مورد؛ تعذر نشر '+failedCount,failedCount?'warning':'success');
     }
   },'portal-action success'));
   root.append(toolbar);
   if(!proposals.length){root.append(placeholder('لا توجد موارد مطابقة','جرّب كلمة أخرى أو اختر حالة مختلفة.'));return;}
   for(const item of proposals){
     const card=el('article','portal-admin-entry');
     const main=el('div','portal-admin-entry-text');
     main.append(el('strong','',item.title),el('span','',(item.academic_branch||'جميع الشعب')+' · '+item.subject+' · '+(kind[item.resource_kind]||'مورد')+
       (item.unit_title?' · '+item.unit_title:'')),el('p','',item.description||''));
     const actions=el('div','portal-admin-actions');actions.append(statusPill(item.status));
     if(item.status==='pending'){
       const label=el('label','portal-action');
       const checkbox=el('input');checkbox.type='checkbox';checkbox.value=item.id;
       checkbox.setAttribute('data-bulk-resource','');checkbox.setAttribute('aria-label','اختيار '+item.title);
       label.append(checkbox,document.createTextNode(' تحديد'));actions.append(label);
     }
     actions.append(button('تعديل الرابط والحقول',()=>openAdminEditor('resource',item)));
     actions.append(button('تعليق خاص للمساهم',()=>void sendPrivateFeedback(item)));
     if(['exercise','exam'].includes(item.resource_kind))
       actions.append(button('اعتماد الحل بعد المراجعة',()=>void verifyHumanSolution(item)));
     actions.append(button('عرض PDF إن وجد',()=>void openPDF(item.id)));
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
 }else if(adminTab==='notifications'){
   const rows=adminVisible(adminNotifications.map(item=>({
     ...item,title:item.resource_title,subject:item.resource_subject,
     description:item.resource_description,display_name:item.contributor_name
   })));
   const unread=adminNotifications.filter(item=>!item.is_read).length;
   const toolbar=el('div','portal-notification-toolbar');
   toolbar.append(el('span','',unread+' إشعار غير مقروء · تُحفظ الإشعارات حتى بعد تسجيل الخروج'));
   if(unread)toolbar.append(button('تحديد الكل كمقروء',()=>void markAllNotificationsRead(),'portal-action success'));
   root.append(toolbar);
   if(!rows.length){root.append(placeholder('صندوق الإشعارات فارغ','ستظهر هنا تلقائياً روابط Drive والملفات والمصادر التي يرسلها المساهمون.'));return;}
   for(const item of rows){
     const card=el('article','portal-admin-entry portal-notification-entry'+(item.is_read?'':' is-unread'));
     const main=el('div','portal-admin-entry-text');
     const heading=item.event_type==='resource_resubmitted'?'أُعيد إرسال مورد للمراجعة':
       item.event_type==='resource_updated'?'تم تعديل مورد قيد المراجعة':'مورد جديد وصل للمراجعة';
     main.append(el('strong','',heading+' · '+item.resource_title),
       el('span','',item.contributor_name+' · '+(item.academic_branch||'جميع الشعب')+' · '+item.resource_subject+' · '+date(item.created_at)),
       el('p','',item.resource_description||'لا يوجد وصف'));
     const actions=el('div','portal-admin-actions');
     if(validUrl(item.resource_url)){
       const a=el('a','portal-action','فتح المصدر');a.href=item.resource_url;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);
     }
     if(item.resource_id&&adminResources.some(resource=>resource.id===item.resource_id))
       actions.append(button('مراجعة المورد',()=>{adminTab='resources';$('adminSearch').value=item.resource_title;if($('adminReviewFilter'))$('adminReviewFilter').value='all';renderAdmin();},'portal-action success'));
     if(!item.is_read)actions.append(button('تحديد كمقروء',()=>void markNotificationRead(item.id)));
     actions.append(el('span','comm-state-tag '+(item.is_read?'approved':'pending'),item.is_read?'مقروء':'جديد'));
     card.append(main,actions);root.append(card);
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
 }else if(adminTab==='reports'){
   const complaints=adminReviews.filter(x=>x.report_reason);
   if(!complaints.length){root.append(placeholder('لا توجد بلاغات','سيظهر هنا ما يبلّغ عنه الطلاب.'));return}
   for(const report of complaints){
     const resource=adminResources.find(x=>x.id===report.resource_id);
     const card=el('article','portal-admin-entry');
     const title=resource?.title||'مورد غير موجود';
     card.append(el('strong','',title),el('p','',report.report_reason+' · '+date(report.created_at)),
       el('p','',report.report_detail||'لا توجد تفاصيل إضافية'));
     if(resource)card.append(button('مراجعة المورد',()=>{
       adminTab='resources';if($('adminSearch'))$('adminSearch').value=title;
       renderAdmin();
     }));
     root.append(card);
   }
 }else if(adminTab==='analytics'){
   const now=Date.now(),week=7*86400000,month=30*86400000;
   const recent=(rows,span)=>rows.filter(x=>{const t=Date.parse(x.created_at);return Number.isFinite(t)&&now-t<=span&&now>=t}).length;
   const card=(heading,content)=>{
     const section=el('article','portal-admin-entry');
     section.append(el('h3','',heading),el('p','',content));root.append(section);
   };
   card('الحسابات المسجلة','في السجلات المحملة: '+profiles.length+' حساباً؛ آخر 7 أيام: '+recent(profiles,week)+'؛ آخر 30 يوماً: '+recent(profiles,month));
   card('المساهمون','طلبات: '+adminApplications.length+'؛ مقبول: '+adminApplications.filter(x=>x.status==='approved').length+'؛ قيد المراجعة: '+adminApplications.filter(x=>x.status==='pending').length);
   card('موارد المساهمين','إجمالي السجلات المحملة: '+adminResources.length+'؛ منشور: '+adminResources.filter(x=>x.status==='approved').length+'؛ معلق: '+adminResources.filter(x=>x.status==='pending').length+'؛ مرفوض: '+adminResources.filter(x=>x.status==='rejected').length);
   card('التفاعل الإداري','إجراءات محفوظة ضمن السجلات المحملة: '+auditEntries.length+'؛ إشعارات غير مقروءة: '+adminNotifications.filter(x=>!x.is_read).length);
   const subjects=new Map();
   adminResources.forEach(x=>{const key=x.subject||'غير محدد';subjects.set(key,(subjects.get(key)||0)+1)});
   const section=el('article','portal-admin-entry');
   section.append(el('h3','','توزيع الموارد حسب المادة'));
   [...subjects.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([name,count])=>section.append(el('p','',name+' : '+count)));
   if(!subjects.size)section.append(el('p','','لا توجد موارد مساهمين بعد'));
   root.append(section);
   root.append(el('p','muted','هذه إحصائيات أولية من السجلات المحملة فقط (حد أقصى: 250 طالباً و250 طلباً و400 مورد و100 إجراء و200 إشعار). ليست قياسات كاملة لكل الزيارات أو المنهاج.'));
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
 stopAdminRealtime();
 drafts=[];feedback=[];pdfAttachments.clear();draftEditId=null;adminReviews=[];approvedReputation=0;
  identity=null;request=null;resources=[];adminApplications=[];adminResources=[];adminNotifications=[];profiles=[];auditEntries=[];ownerRole='student';
 window.BAC_PORTAL_ROLE='student';document.body.classList.remove('portal-authorized');cancelEdit();resetContributorProfileForm();
}
window.refreshPortalRole=refreshPortalRole;
window.renderCommunity=()=>{if(user()&&['contributor','applicant'].includes(ownerRole))void loadContributor();};
window.renderApprovedResources=()=>{if(user()&&ownerRole==='student')void loadApprovedResources();};
window.renderAdmin=()=>{if(user()&&ownerRole==='admin')void loadAdmin();};
window.onCommunityAuthChanged=()=>{if(!user()){resetSession();if(!['landing','login'].includes(document.body.dataset.portal))window.location.replace('/');return;}void refreshPortalRole();};
$('collaboratorApplyForm')?.addEventListener('submit',event=>void sendApplication(event));
$('collabResourceForm')?.addEventListener('submit',event=>void saveResource(event));
$('collabSaveDraft')?.addEventListener('click',()=>void saveDraft());
$('collabCancelEdit')?.addEventListener('click',cancelEdit);
$('collabProfileCancel')?.addEventListener('click',resetContributorProfileForm);
$('collabRefresh')?.addEventListener('click',()=>void loadContributor());
$('adminReload')?.addEventListener('click',()=>void loadAdmin());
$('adminSearch')?.addEventListener('input',()=>renderAdmin());
$('adminReviewFilter')?.addEventListener('change',()=>renderAdmin());
document.querySelectorAll('[data-admin-tab]').forEach(button=>button.addEventListener('click',()=>{adminTab=button.dataset.adminTab;renderAdmin();}));
document.querySelectorAll('[data-admin-shortcut]').forEach(button=>button.addEventListener('click',()=>{
 if(ownerRole!=='admin')return;
 adminTab=button.dataset.adminShortcut;renderAdmin();
 $('adminList')?.scrollIntoView({behavior:'smooth',block:'start'});
}));
if(user())void refreshPortalRole(); // Handles sessions restored before this classic script was loaded.
})();
