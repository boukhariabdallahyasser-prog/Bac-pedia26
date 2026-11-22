/* Contributor subject picker: branch -> specialization -> real subject.
   Purely editorial convenience; RLS still authorizes every submission server-side. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const allBranches='جميع الشعب';
const common=['اللغة العربية','اللغة الفرنسية','اللغة الإنجليزية','التاريخ والجغرافيا','العلوم الإسلامية'];
const kindGroup={lesson:'lessons',summary:'summaries',exercise:'exercises',exam:'tests',video:'other',other:'other'};
const info=()=>window.BacEducation;
let current=null;
function option(value,label,key){
 const item=document.createElement('option');item.value=value;item.textContent=label;
 if(key)item.dataset.subjectKey=key;
 return item;
}
function fillSubjectOptions(prefer=null){
 const branch=$('collabResourceBranch'),subject=$('collabResourceSubject'),spec=$('collabResourceSpecialization');
 if(!branch||!subject)return;
 const code=Object.keys(info()?.branches||{}).find(key=>info().branches[key].name===branch.value);
 const options=code?info().list(code,spec?.value||null).map(s=>({key:s.id,label:s.name})):
   branch.value===allBranches?common.map(label=>({key:null,label})):[];
 const previous=prefer?.subject||subject.value;
 const requestedKey=prefer?.subject_key||null;
 subject.replaceChildren(option('','اختر المادة الصحيحة'));
 for(const item of options)subject.append(option(item.label,item.label,item.key));
 if(requestedKey){
  const exact=[...subject.options].find(x=>x.dataset.subjectKey===requestedKey);
  if(exact)subject.value=exact.value;
 }else if(options.some(x=>x.label===previous))subject.value=previous;
 const status=$('contributorSubjectHint');
 if(status)status.textContent=code?('المواد المعروضة تخص شعبة '+branch.value+'. إذا لم تظهر مادة معينة، لا تضفها باسم مادة أخرى.'):
 branch.value===allBranches?'الموارد المشتركة فقط. إن كان محتوى المادة يختلف حسب الشعبة، اختر الشعبة بدلاً من «جميع الشعب».':
 'اختر الشعبة أولاً لتحديد المواد دون خلط.';
}
function fillSpecializations(prefer=null){
 const branch=$('collabResourceBranch'),selector=$('collabResourceSpecialization'),
 wrapper=$('contributorSpecializationWrap');
 if(!branch||!selector||!wrapper)return;
 const code=Object.keys(info()?.branches||{}).find(key=>info().branches[key].name===branch.value);
 const choices=info()?.branches?.[code]?.subspecialties||{};
 selector.replaceChildren();
 for(const [key,label] of Object.entries(choices))selector.append(option(key,label));
 const visible=!!Object.keys(choices).length;
 wrapper.hidden=!visible;
 selector.disabled=!visible;
 if(visible)selector.value=prefer?.specialization_code&&choices[prefer.specialization_code]?prefer.specialization_code:Object.keys(choices)[0];
 fillSubjectOptions(prefer);
}
function data(){
 const subject=$('collabResourceSubject'),branch=$('collabResourceBranch'),specialization=$('collabResourceSpecialization'),kind=$('collabResourceKind');
 if(!subject||!branch)return null;
 const chosen=subject.selectedOptions?.[0];
 if(!chosen||!chosen.value)return null;
 return {
   subject:chosen.value,
   subject_key:chosen.dataset.subjectKey||null,
   specialization_code:specialization&&!specialization.disabled?specialization.value:null,
   content_group:kindGroup[kind?.value]||'other'
 };
}
function hydrate(resource){
 if(!resource)return;
 if($('collabResourceBranch'))$('collabResourceBranch').value=resource.academic_branch||'';
 fillSpecializations(resource);
}
function init(){
 if(document.body?.dataset.portal!=='contributor')return;
 const branch=$('collabResourceBranch'),subject=$('collabResourceSubject'),kind=$('collabResourceKind');
 if(!branch||!subject||!kind)return;
 branch.addEventListener('change',()=>fillSpecializations());
 $('collabResourceSpecialization')?.addEventListener('change',()=>fillSubjectOptions());
 kind.addEventListener('change',()=>{
  const el=$('contributorKindHint');
  if(el)el.textContent=kind.value==='exam'?'تمييز البكالوريا الرسمية عن الفروض التجريبية يتم في مراجعة الإدارة.':
   kind.value==='video'?'تأكد أن الفيديو مرتبط مباشرة بالوحدة المختارة.':'صف المحتوى بدقة حتى يسهل على الطلاب العثور عليه.';
 });
 fillSpecializations();
}
window.BacContributorGuide={data,hydrate,refresh:()=>fillSpecializations()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();