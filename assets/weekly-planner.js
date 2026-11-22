/* Source-backed weekly planner. Subject selection is a single compact control,
   not a second subject-card catalogue. It only uses links already in resources.json. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(text!==undefined)x.textContent=String(text);return x;
};
const ALL='__all__';
const groupNames={lessons:'افهم درساً',exercises:'حل تمريناً',
 summaries:'راجع ملخصاً',tests:'اختبر نفسك',bac:'تدرب على البكالوريا'};
const pattern=['lessons','exercises','summaries','exercises','tests','lessons','bac'];
let manifest=null,models=[],branchKey='',selectedId=ALL,plans=[],busy=false,ready=false,hadManifest=false;
function currentBranch(){
 return typeof state!=='undefined'?state.branch+':'+(state.subBranch||''):'';
}
async function load(){
 if(manifest||busy)return;
 busy=true;
 try{
  const r=await fetch('/resources.json',{cache:'force-cache'});
  if(!r.ok)throw Error('missing catalog');
  const json=await r.json();
  if(json.schemaVersion!==1)throw Error('unexpected catalog');
  manifest=json;
 }catch(e){console.warn('Weekly plans have no indexed resources',e)}
 finally{busy=false;refresh()}
}
function eligible(){
 if(!manifest||typeof getNormalSubjects!=='function'||typeof state==='undefined')return [];
 const subjects=getNormalSubjects().filter(x=>!x.special);
 const result=window.BacSubjectCatalog?.build({
  manifest,branch:state.branch,subBranch:state.subBranch,subjects
 })||[];
 return result.filter(x=>x.items?.length>0);
}
function getDate(index){
 const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+index);return d;
}
function dateLabel(d){return new Intl.DateTimeFormat('ar-DZ',{weekday:'long',day:'numeric',month:'short'}).format(d)}
function dateKey(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function buildPlan(items,days,minutes){
 if(!items.length)return [];
 const slots=Math.max(1,Math.floor(minutes/25));
 const result=[];
 for(let day=0;day<days;day++){
  const date=getDate(day),model=items[day%items.length],tasks=[];
  for(let slot=0;slot<slots;slot++){
   const desired=pattern[(day*2+slot)%pattern.length];
   let group=model.groups?.find(x=>x.id===desired&&x.items.length);
   if(!group)group=(model.groups||[]).find(x=>x.items.length);
   if(!group)continue;
   const pool=group.items.filter(x=>x.url&&x.title);
   if(!pool.length)continue;
   const resource=pool[(day+slot)%pool.length];
   tasks.push({
    id:dateKey(date)+'|'+model.id+'|'+slot+'|'+resource.url,
    subject:model.name,subjectId:model.id,title:resource.title,url:resource.url,
    group:group.id,method:groupNames[group.id]||'راجع المورد',minutes:25
   });
  }
  result.push({date,dateKey:dateKey(date),label:dateLabel(date),subject:model.name,tasks});
 }
 return result;
}
function selectedModels(){return selectedId===ALL?models:models.filter(x=>x.id===selectedId)}
function submit(){
 if(typeof studentAuthUser==='undefined'||!studentAuthUser?.id||!Array.isArray(state?.tasks))return;
 const seen=new Set(state.tasks.filter(t=>t.studyPlanKey).map(t=>t.studyPlanKey));
 let count=0;
 for(const day of plans)for(const task of day.tasks){
  if(seen.has(task.id))continue;
  state.tasks.push({
   text:day.label+' · '+task.method+' في '+task.subject+': '+task.title+' (25 دقيقة)',
   done:false,date:Date.now(),studyPlanKey:task.id
  });
  seen.add(task.id);count++;
 }
 if(!count){
  if(typeof showToast==='function')showToast('هذه المهام موجودة في المخطط مسبقاً','info');
  return;
 }
 if(typeof saveState==='function')saveState();
 if(typeof renderTasks==='function')renderTasks();
 if(typeof showToast==='function')showToast('أضفنا '+count+' مهمة إلى مخططك','success');
 if(typeof showPage==='function')showPage('planner');
}
function render(){
 const host=$('weeklyStudio');if(!host||document.body.dataset.portal!=='student')return;
 host.replaceChildren();
 const top=el('div','weekly-header'),copy=el('div','weekly-copy');
 copy.append(el('span','weekly-eyebrow','خطة مراجعة أسبوعية'),el('h2','','حوّل وقتك إلى جلسات واضحة'));
 copy.append(el('p','','اختر المدة والمادة، وسنرتب لك جلسات من موارد موجودة فعلاً في مكتبتك.'));
 top.append(copy);host.append(top);
 if(!manifest){
  host.append(el('p','weekly-empty',busy?'جار تحميل المصادر...':'تعذر تحميل فهرس المصادر. أعد المحاولة بعد تحديث الصفحة.'));
  return;
 }
 if(!models.length){
  host.append(el('p','weekly-empty','لا توجد موارد مفهرسة لهذه الشعبة حالياً. يمكنك تغيير الشعبة من صفحة المكتبة.'));
  return;
 }
 const settings=el('div','weekly-settings'),opts=el('div','weekly-options');
 const subjectLabel=el('label','weekly-subject-select-wrap','المادة');
 const subject=el('select','weekly-select');subject.id='weeklySubject';
 const all=el('option','', 'التناوب بين مواد شعبتي المتاحة');all.value=ALL;subject.append(all);
 for(const model of models){const o=el('option','',model.name);o.value=model.id;subject.append(o)}
 if(!models.some(x=>x.id===selectedId)&&selectedId!==ALL)selectedId=ALL;
 subject.value=selectedId;
 subject.addEventListener('change',()=>{selectedId=subject.value;makePreview()});
 subjectLabel.append(subject);
 const length=el('label','','عدد الأيام'),daySelect=el('select','weekly-select');daySelect.id='weeklyDays';
 for(const n of [3,5,7]){const o=el('option','',n+' أيام');o.value=String(n);daySelect.append(o)}
 daySelect.value='7';length.append(daySelect);
 const duration=el('label','','الوقت اليومي'),minuteSelect=el('select','weekly-select');minuteSelect.id='weeklyMinutes';
 for(const n of [25,50,75]){const o=el('option','',n+' دقيقة');o.value=String(n);minuteSelect.append(o)}
 minuteSelect.value='50';duration.append(minuteSelect);
 opts.append(subjectLabel,length,duration);settings.append(opts);host.append(settings);
 const status=el('p','weekly-help','اقتراح قابل للتعديل، وليس جدولاً رسمياً للمنهاج. لا نضيف إلى مخططك إلا بعد ضغط زر الإضافة.');
 host.append(status);
 const actions=el('div','weekly-actions');
 const generate=el('button','weekly-primary','معاينة الخطة');generate.type='button';generate.addEventListener('click',makePreview);actions.append(generate);
 const save=el('button','weekly-secondary','إضافة المهام إلى مخططي');save.type='button';save.id='weeklySave';save.addEventListener('click',submit);actions.append(save);
 host.append(actions,el('div','weekly-preview'));
 daySelect.addEventListener('change',makePreview);minuteSelect.addEventListener('change',makePreview);
 makePreview();
}
function makePreview(){
 const host=$('weeklyStudio'),preview=host?.querySelector('.weekly-preview'),save=$('weeklySave');
 if(!host||!preview||!save)return;
 plans=buildPlan(selectedModels(),Number($('weeklyDays')?.value||7),Number($('weeklyMinutes')?.value||50));
 preview.replaceChildren();save.disabled=!plans.length||!plans.some(x=>x.tasks.length);
 if(!selectedModels().length){preview.append(el('p','weekly-empty','لا توجد مادة متاحة لإعداد الخطة.'));return}
 const list=el('div','weekly-days');
 for(const day of plans){
  const card=el('article','weekly-day'),title=el('div','weekly-day-header');
  title.append(el('strong','',day.label),el('small','',day.subject));card.append(title);
  for(const task of day.tasks){
   const row=el('div','weekly-task');row.append(el('span','',task.method+': '+task.title));
   const link=el('a','','المصدر');link.href=task.url;link.target='_blank';link.rel='noopener noreferrer';row.append(link);
   card.append(row);
  }
  if(!day.tasks.length)card.append(el('p','weekly-empty','لا توجد موارد مناسبة لهذه الجلسة.'));
  list.append(card);
 }
 preview.append(list);
}
function refresh(){
 const root=$('weeklyStudio');
 if(!root||document.body.dataset.portal!=='student'||typeof state==='undefined')return;
 const now=currentBranch();
 if(now!==branchKey||!ready||Boolean(manifest)!==hadManifest){
  branchKey=now;hadManifest=Boolean(manifest);models=eligible();
  if(selectedId!==ALL&&!models.some(x=>x.id===selectedId))selectedId=ALL;
  ready=true;render();
 }
}
function init(){
 if(document.body.dataset.portal!=='student'||!$('weeklyStudio'))return;
 void load();refresh();
}
window.BacWeeklyPlanner={refresh,buildPlan};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();