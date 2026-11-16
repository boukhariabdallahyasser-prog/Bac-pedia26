/* Contributor application and approved resource submissions. Existing saved study data is preserved. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const status=(message,type='info')=>{if(typeof showToast==='function')showToast(message,type)};
 const client=()=>typeof getStudentAuth==='function'?getStudentAuth():null;
 const uid=()=>typeof studentAuthUser==='undefined'?null:studentAuthUser?.id||null;
 const normalize=value=>String(value||'').trim();
 let activeUser=null,applicant=null,submissions=[],collabBusy=false;
 function element(tag,cls,text){
   const item=document.createElement(tag);if(cls)item.className=cls;if(text!=null)item.textContent=String(text);return item;
 }
 function empty(title,desc){
   const item=element('div','comm-empty');
   item.append(element('i','fa-solid fa-folder-open'),element('h3','',title),element('p','',desc));return item;
 }
 function safeError(error,context){console.warn('[Bac-pedia] '+context,error);status('تعذر '+context+'. تحقق من الاتصال وحاول مرة أخرى.','warning');}
 function ownsSession(expected){return expected&&uid()===expected;}
  async function loadCollaboration(){
    const user=uid(),sup=client();
    if(!user||!sup)return;
    try{
      const [application,resources]=await Promise.all([
        sup.from('collaborator_applications')
          .select('display_name,organization,contribution_type,motivation,status,created_at')
          .eq('user_id',user).maybeSingle(),
        sup.from('collaborator_resources')
          .select('id,title,subject,description,resource_url,status,contributor_id,created_at')
          .order('created_at',{ascending:false}).limit(60)
      ]);
      if(application.error)throw application.error;
      if(resources.error)throw resources.error;
      if(!ownsSession(user))return;
      applicant=application.data||null;
      submissions=resources.data||[];
      renderCollaboration();
    }catch(error){safeError(error,'تحميل مساهمات المجتمع');}
  }
  function renderCollaboration(){
    const statusPanel=$('collaboratorStatusPanel'),form=$('collaboratorApplyPanel'),resourceForm=$('collabSubmitPanel'),grid=$('collabResourcesGrid');
    if(!statusPanel||!form||!resourceForm||!grid)return;
    statusPanel.replaceChildren();
    statusPanel.append(element('h3','','حالة طلبك'));
    if(!applicant){
      statusPanel.append(element('p','','يمكنك التسجيل كمساهم بعد إنشاء حساب طالب موثّق. دور المساهم يُمنح بعد مراجعة الطلب، وليس تلقائياً.'));
      form.classList.remove('hidden');
      resourceForm.classList.add('hidden');
    }else{
      const labels={pending:'قيد المراجعة',approved:'مقبول',rejected:'غير مقبول'};
      const tag=element('span','comm-state-tag '+applicant.status,labels[applicant.status]||applicant.status);
      statusPanel.append(tag,element('p','',applicant.organization+' · '+applicant.display_name));
      statusPanel.append(element('p','',applicant.status==='approved'?
        'يمكنك إرسال مصادر تعليمية الآن. ستُنشر بعد مراجعتها.':
        applicant.status==='pending'?'وصل طلبك بنجاح. ستظهر نتيجة المراجعة هنا.':'يمكنك التواصل مع الإدارة لمزيد من المعلومات.'));
      form.classList.add('hidden');
      resourceForm.classList.toggle('hidden',applicant.status!=='approved');
    }
    grid.replaceChildren();
    if(!submissions.length){
      grid.append(empty('لا توجد موارد منشورة بعد','الموارد المقترحة تظهر هنا بعد مراجعة فريق المنصة.'));
      return;
    }
    for(const entry of submissions){
      const card=element('article','comm-deck');
      const glyph=element('div','comm-deck-symbol');glyph.append(element('i','fa-solid fa-file-lines'));
      card.append(glyph,element('h4','',entry.title),element('p','',entry.description||entry.subject));
      const row=element('div','comm-deck-footer');
      row.append(element('small','comm-resource-status',entry.status==='approved'?'مورد مقبول':entry.status==='pending'?'قيد المراجعة':'لم تتم الموافقة'));
      if(entry.status==='approved'&&/^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/)/.test(entry.resource_url)){
        const a=element('a','comm-resource-link','فتح المصدر');
        a.href=entry.resource_url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);
      }
      card.append(row);grid.append(card);
    }
  }
  async function applyCollaboration(event){
    event.preventDefault();if(collabBusy||!uid())return;
    const row={
      user_id:uid(),display_name:normalize($('collabName').value),
      organization:normalize($('collabOrg').value),
      contribution_type:$('collabType').value,
      motivation:normalize($('collabMotivation').value)
    };
    if(row.display_name.length<2||row.organization.length<2||row.motivation.length<15){
      status('أكمل بيانات طلب المساهمة','warning');return;
    }
    collabBusy=true;
    try{
      const result=await client().from('collaborator_applications').insert(row);
      if(result.error)throw result.error;
      await loadCollaboration();status('تم إرسال طلبك للمراجعة','success');
    }catch(error){safeError(error,'إرسال طلب المساهمة');}
    finally{collabBusy=false;}
  }
  async function submitResource(event){
    event.preventDefault();if(collabBusy||!uid()||applicant?.status!=='approved')return;
    const url=normalize($('collabResourceUrl').value);
    if(!/^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/)/.test(url)){
      status('يجب تقديم رابط Google Drive صحيح','warning');return;
    }
    const row={
      contributor_id:uid(),title:normalize($('collabResourceTitle').value),
      subject:normalize($('collabResourceSubject').value),
      resource_url:url,
      description:normalize($('collabResourceDescription').value)
    };
    collabBusy=true;
    try{
      const result=await client().from('collaborator_resources').insert(row);
      if(result.error)throw result.error;
      $('collabResourceForm').reset();
      await loadCollaboration();status('تم إرسال المورد للمراجعة قبل النشر','success');
    }catch(error){safeError(error,'اقتراح المورد');}
    finally{collabBusy=false;}
  }

  async function onAuthChanged(){
    const user=uid();
    if(!user){activeUser=null;applicant=null;submissions=[];const grid=$('collabResourcesGrid');if(grid)grid.replaceChildren();return;}
    if(user===activeUser)return;
    activeUser=user;await loadCollaboration();
  }
  window.renderCommunity=()=>{if(uid()&&activeUser!==uid())void onAuthChanged();else if(uid())void loadCollaboration();};
  window.onCommunityAuthChanged=()=>void onAuthChanged();
  $('collaboratorApplyForm')?.addEventListener('submit',event=>void applyCollaboration(event));
  $('collabResourceForm')?.addEventListener('submit',event=>void submitResource(event));
  if(uid())void onAuthChanged();
})();
