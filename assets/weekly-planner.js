/* Guided study week. Every suggested source must exist in resources.json.
   Generated plans are suggestions, not official schedules or curriculum claims.
   Adds tasks through the existing account-scoped planner without modifying past tasks. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(text!==undefined)x.textContent=String(text);return x;
};
const groupNames={lessons:'افهم درساً',exercises:'حل تمريناً',
 summaries:'راجع ملخصاً',tests:'اختبر نفسك',bac:'تدرب على البكالوريا'};
const pattern=['lessons','exercises','summaries','exercises','tests','lessons','bac'];
let manifest=null,models=[],branchKey='',chosen=new Set(),plans=[],busy=false,ready=false;
function currentBranch(){
 return typeof state!=='undefined'?state.branch+':'+(state.subBranch||''):null;
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
 if(!manifest||typeof getNormalSubjects!=='function')return [];
 const subjects=getNormalSubjects().filter(x=>!x.special);
 const result=window.BacSubjectCatalog?.build({
  manifest,branch:state.branch,subBranch:state.subBranch,subjects
 })||[];
 return result.filter(x=>x.items?.length>0);
}
function pref(){
 if(!models.length)return;
 const valid=new Set(models.map(x=>x.id));
 for(const id of [...chosen])if(!valid.has(id))chosen.delete(id);
 if(!chosen.size)for(const item of models.slice(0,2))chosen.add(item.id);
}
function getDate(index){
 const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+index);
 return d;
}
function dateLabel(d){return new Intl.DateTimeFormat('ar-DZ',{weekday:'long',day:'numeric',month:'short'}).format(d)}
function dateKey(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function buildPlan(items,days,minutes){
 if(!items.length)return [];
 const slots=Math.max(1,Math.floor(minutes/25));
 const result=[];
 for(let day=0;day<days;day++){
  const date=getDate(day),model=items[day%items.length];
  const tasks=[];
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
function submit(){
 if(typeof studentAuthUser==='undefined'||!studentAuthUser?.id||!Array.isArray(state?.tasks))return;
 const seen=new Set(state.tasks.filter(t=>t.studyPlanKey).map(t=>t.studyPlanKey));
 let count=0;
 for(const day of plans){
  for(const task of day.tasks){
   if(seen.has(task.id))continue;
   state.tasks.push({
    text:day.label+' · '+task.method+' في '+task.subject+': '+task.title+' (25 دقيقة)',
    done:false,date:Date.now(),studyPlanKey:task.id
   });
   seen.add(task.id);count++;
  }
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
 const top=el('div','weekly-header');
 const copy=el('div','weekly-copy');
 copy.append(el('span','weekly-eyebrow','نظّم أسبوعك'),
  el('h2','','من الملف إلى خطة مراجعة'));
 copy.append(el('p','','حدد وقتك اليومي وموادك؛ سنقترح جلسات قصيرة مرتبطة بروابط موجودة في المكتبة.'));
 top.append(copy);host.append(top);
 if(!manifest){
  host.append(el('p','weekly-empty',busy?'جار تحميل المواد المتاحة...':'لا يمكن إعداد خطة مرتبطة بالمصادر حالياً. تأكد من الاتصال.'));
  return;
 }
 const settings=el('div','weekly-settings');
 const opts=el('div','weekly-options');
 const length=el('label','','عدد الأيام');
 const daySelect=el('select','weekly-select');daySelect.id='weeklyDays';
 for(const n of [3,5,7]){
  const o=el('option','',n+' أيام');o.value=String(n);daySelect.append(o);
 }
 daySelect.value='7';length.append(daySelect);
 const duration=el('label','','وقت يومي مقترح');
 const minuteSelect=el('select','weekly-select');minuteSelect.id='weeklyMinutes';
 for(const n of [25,50,75]){
  const o=el('option','',n+' دقيقة');o.value=String(n);minuteSelect.append(o);
 }
 minuteSelect.value='50';duration.append(minuteSelect);
 opts.append(length,duration);
 settings.append(opts);
 const materials=el('fieldset','weekly-subjects');
 const legend=el('legend','','اختر المواد التي تريد التركيز عليها');
 materials.append(legend);
 for(const model of models){
  const label=el('label','weekly-choice');
  const checkbox=el('input');checkbox.type='checkbox';checkbox.value=model.id;checkbox.checked=chosen.has(model.id);
  checkbox.addEventListener('change',()=>{
   if(checkbox.checked)chosen.add(model.id);else chosen.delete(model.id);
   makePreview();
  });
  label.append(checkbox,el('span','',model.name));materials.append(label);
 }
 settings.append(materials);host.append(settings);
 const status=el('p','weekly-help','خطة تدريب شخصية قابلة للتعديل. ترتيب الملفات لا يمثل ترتيباً رسمياً للمنهاج.');
 host.append(status);
 const actions=el('div','weekly-actions');
 const generate=el('button','weekly-primary','معاينة خطة المراجعة');
 generate.type='button';generate.addEventListener('click',makePreview);actions.append(generate);
 const save=el('button','weekly-secondary','إضافتها إلى مخططي');save.type='button';
 save.id='weeklySave';save.addEventListener('click',submit);actions.append(save);
 host.append(actions,el('div','weekly-preview'));makePreview();
}
function makePreview(){
 const host=$('weeklyStudio'),preview=host?.querySelector('.weekly-preview'),save=$('weeklySave');
 if(!host||!preview||!save)return;
 const selected=models.filter(m=>chosen.has(m.id));
 const days=Number($('weeklyDays')?.value||7),minutes=Number($('weeklyMinutes')?.value||50);
 plans=buildPlan(selected,days,minutes);
 preview.replaceChildren();
 save.disabled=!plans.length||!plans.some(x=>x.tasks.length);
 if(!selected.length){preview.append(el('p','weekly-empty','اختر مادة واحدة على الأقل لإعداد الخطة.'));return}
 const list=el('div','weekly-days');
 for(const day of plans){
  const card=el('article','weekly-day');
  const title=el('div','weekly-day-header');title.append(el('strong','',day.label),el('small','',day.subject));
  card.append(title);
  for(const task of day.tasks){
   const row=el('div','weekly-task');
   const details=el('span','',task.method+': '+task.title);
   row.append(details);
   if(task.url){
    const link=el('a','','المصدر');link.href=task.url;link.target='_blank';link.rel='noopener noreferrer';
    row.append(link);
   }
   card.append(row);
  }
  if(!day.tasks.length)card.append(el('p','weekly-empty','لا توجد موارد مفهرسة مناسبة للجلسة.'));
  list.append(card);
 }
 preview.append(list);
}
function refresh(){
 const root=$('weeklyStudio');
 if(!root||document.body.dataset.portal!=='student'||typeof state==='undefined')return;
 const now=currentBranch();
 if(now!==branchKey||!ready){
  branchKey=now;models=eligible();pref();ready=true;
  render();
 }
}
function init(){
 if(document.body.dataset.portal!=='student'||!$('weeklyStudio'))return;
 void load();refresh();
}
window.BacWeeklyPlanner={refresh,buildPlan};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();