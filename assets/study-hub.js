/* BAC-PEDIA 2027 learning toolkit. Public resource catalog only; personal collections scoped to auth uid. */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const clean=s=>String(s??'').trim();
const norm=s=>root.BacSearch?.normalize(s)||clean(s).toLowerCase();
const currentUser=()=>typeof studentAuthUser!=='undefined'?studentAuthUser:null;
let catalog=[],loaded=false,rawManifest=null,catalogKey='';
const bookmarkClient=()=>typeof getStudentAuth==='function'?getStudentAuth():null;
const hubKey=k=>'hub:'+k;
async function syncSaved(){
  const uid=currentUser()?.id,db=bookmarkClient();if(!uid||!db)return;
  try{
    const {data,error}=await db.from('student_resource_bookmarks')
      .select('resource_key').eq('user_id',uid).like('resource_key','hub:%').limit(500);
    if(error)throw error;
    if(currentUser()?.id!==uid)return;
    const remote=(data||[]).map(x=>x.resource_key).filter(k=>typeof k==='string'&&k.startsWith('hub:')).map(k=>k.slice(4));
    const local=readSaved();const missing=local.filter(k=>!remote.includes(k));
    if(missing.length){
      const lookup=new Map(catalog.map(x=>[x.key,x]));
      const rows=missing.filter(k=>lookup.has(k)).map(k=>({
        user_id:uid,resource_key:hubKey(k).slice(0,240),subject_id:lookup.get(k).subject.slice(0,80)||'general'
      }));
      if(rows.length){
        const response=await db.from('student_resource_bookmarks').upsert(rows,{onConflict:'user_id,resource_key'});
        if(response.error)throw response.error;
      }
    }
    if(currentUser()?.id!==uid)return;
    saveSaved([...new Set([...local,...remote])]);
  }catch(error){console.warn('Collection cloud sync unavailable, retaining local cache',error)}
}
async function updateCloudBookmark(item,enabled){
  const uid=currentUser()?.id,db=bookmarkClient();
  if(!uid||!db)return;
  const resource_key=hubKey(item.key);
  if(resource_key.length>240)return;
  const q=enabled
    ?db.from('student_resource_bookmarks').upsert({user_id:uid,resource_key,subject_id:item.subject.slice(0,80)||'general'},{onConflict:'user_id,resource_key'})
    :db.from('student_resource_bookmarks').delete().eq('user_id',uid).eq('resource_key',resource_key);
  const {error}=await q;if(error)console.warn('Collection change saved locally but could not sync',error);
}

const storageKey=()=>currentUser()?.id?'bacpedia:collections:'+currentUser().id:null;
function readSaved(){
  const key=storageKey();if(!key)return [];
  try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x.filter(v=>typeof v==='string').slice(0,500):[]}catch{return []}
}
function saveSaved(keys){
  const key=storageKey();if(!key)return;
  try{localStorage.setItem(key,JSON.stringify(keys.slice(0,500)))}catch(e){console.warn('local collection storage unavailable',e)}
}
function addRow(container,item,showBookmark=true){
  const row=document.createElement('article');row.className='resource-item';row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap';
  const info=document.createElement('div');info.style.flex='1';
  const title=document.createElement('strong');title.textContent=item.title;info.appendChild(title);
  const hint=document.createElement('p');hint.className='muted';hint.textContent=item.subject+' · '+(item.parent||'مورد')+(item.type==='folder'?' · مجلد':'');info.appendChild(hint);row.appendChild(info);
  const link=document.createElement('a');link.className='btn';link.target='_blank';link.rel='noopener noreferrer';link.href=item.url;link.textContent='فتح المورد';row.appendChild(link);
  if(showBookmark){
    const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.textContent=readSaved().includes(item.key)?'إزالة من مجموعتي':'حفظ';
    btn.addEventListener('click',()=>{
      let list=readSaved();const enabled=!list.includes(item.key);
      list=enabled?[...list,item.key]:list.filter(x=>x!==item.key);
      saveSaved(list);void updateCloudBookmark(item,enabled);
      btn.textContent=enabled?'إزالة من مجموعتي':'حفظ';
      if($('studyCollectionCount'))$('studyCollectionCount').textContent=String(list.length);
    });row.appendChild(btn);
  }
  container.appendChild(row);
}
const validUrl=u=>{try{const x=new URL(u);return x.protocol==='https:'&&!!x.hostname}catch{return false}};
function flatten(manifest,settings){
  if(settings?.subjects&&root.BacSubjectCatalog){
    const entries=root.BacSubjectCatalog.build({
      manifest,branch:settings.branch,subBranch:settings.subBranch,subjects:settings.subjects
    });
    const collected=[],seen=new Set();
    function add(model,item,source){
      if(!validUrl(source.url))return;
      const u=new URL(source.url);
      const key=source.id||model.id+':'+u.pathname;
      const canonical=model.id+'|'+source.url;
      if(seen.has(canonical))return;
      seen.add(canonical);
      const parent=item.title===source.title?item.context:(item.title+' · '+item.context);
      const rec={key,title:source.title,subject:model.name,subjectId:model.id,
        parent,url:source.url,type:source.type,group:item.group,year:source.year||null,
        text:norm([model.name,source.title,parent].join(' '))};
      collected.push(rec);
    }
    for(const model of entries)for(const item of model.items){
      if(item.group==='bac'&&item.children.length){
        for(const child of item.children)add(model,item,child);
      }else add(model,item,item);
    }
    return collected;
  }
  const result=[],seen=new Set();
  function visit(obj,subject,parent,depth=0){
    if(!obj||typeof obj!=='object'||depth>8)return;
    const title=clean(obj.title||obj.name),url=obj.url;
    if(title&&validUrl(url)){
      const key=String(obj.id||url);if(!seen.has(key)){
        seen.add(key);result.push({key,title,subject,parent,url,type:obj.type||'file',text:norm([title,subject,parent].join(' '))});
      }
    }
    for(const field of ['categories','items','children','files','folders']){
      if(Array.isArray(obj[field]))obj[field].forEach(child=>visit(child,subject,title||parent,depth+1));
    }
  }
  Object.entries(manifest.subjects||{}).forEach(([id,obj])=>visit(obj,clean(obj.title||id),''));
  return result;
}
async function load(){
  const branch=typeof state!=='undefined'?state.branch:'math';
  const subBranch=typeof state!=='undefined'?state.subBranch:null;
  const stamp=branch+':'+subBranch;
  if(loaded&&stamp===catalogKey)return catalog;
  try{
    if(!rawManifest){
      const response=await fetch('/resources.json',{cache:'no-store'});
      if(!response.ok)throw Error('catalog HTTP '+response.status);
      rawManifest=await response.json();
      if(rawManifest.schemaVersion!==1||!rawManifest.subjects)throw Error('Invalid catalog');
    }
    const subjects=typeof getNormalSubjects==='function'?getNormalSubjects():[];
    catalog=flatten(rawManifest,{branch,subBranch,subjects});loaded=true;catalogKey=stamp;
  }catch(error){
    console.warn('Study catalog unavailable:',error);catalog=[];loaded=false;
  }
  return catalog;
}
const matching=(item,query)=>!query||item.text.includes(norm(query))||(root.BacSearch?.score({title:item.title,subjectName:item.subject,categoryName:item.parent},query)>0);
function classify(item,mode){
  if(item.group){
    if(mode==='papers')return item.group==='bac';
    if(mode==='exercises')return item.group==='exercises';
  }
  const text=item.text;
  if(mode==='papers')return /بكالوريا|مواضيع|اختبار|امتحان|bac|annale|sujet|examen|exam/.test(text);
  if(mode==='exercises')return /تمرين|تمارين|تطبيق|تدريب|exercise|exercice|serie|سلسلة/.test(text);
  return true;
}
function fillOptions(id,items){
  const select=$(id);if(!select)return;
  const value=select.value;select.replaceChildren();
  const all=document.createElement('option');all.value='';all.textContent='جميع المواد';select.appendChild(all);
  [...new Set(items.map(x=>x.subject))].sort((a,b)=>a.localeCompare(b,'ar')).forEach(name=>{
    const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.appendChild(opt);
  });if([...select.options].some(o=>o.value===value))select.value=value;
}
async function renderList(mode){
  const dest=$(mode==='papers'?'studyPapersResults':'studyExercisesResults');
  if(!dest)return;
  const items=(await load()).filter(item=>classify(item,mode));
  fillOptions(mode==='papers'?'studyPapersSubject':'studyExercisesSubject',items);
  const query=clean($(mode==='papers'?'studyPapersQuery':'studyExercisesQuery')?.value);
  const subject=$(mode==='papers'?'studyPapersSubject':'studyExercisesSubject')?.value||'';
  const filtered=items.filter(item=>(!subject||item.subject===subject)&&matching(item,query));
  dest.replaceChildren();
  const status=$(mode==='papers'?'studyPapersStatus':'studyExercisesStatus');
  if(status)status.textContent=filtered.length+' مورد مطابق لشعبتك، مرتّب حسب المادة. تصنيف العناوين والمصادر يحتاج مراجعة عند الشك.';
  filtered.slice(0,80).forEach(item=>addRow(dest,item));
  if(filtered.length>80){const note=document.createElement('p');note.textContent='عرض أول 80 نتيجة. ضيّق البحث للحصول على نتائج أدق.';dest.appendChild(note)}
}
async function renderCollections(){
  const dest=$('studyCollectionsResults');if(!dest)return;
  const items=await load(),saved=readSaved();
  if($('studyCollectionCount'))$('studyCollectionCount').textContent=String(saved.length);
  const dictionary=new Map(items.map(x=>[x.key,x]));
  dest.replaceChildren();let found=0;
  saved.forEach(key=>{const item=dictionary.get(key);if(item){addRow(dest,item);found++}});
  if(!found)dest.textContent=saved.length?'الموارد المحفوظة غير موجودة في الفهرس الحالي.':'احفظ الموارد من مستكشف المواضيع أو التمارين.';
}
function sentences(text){
  return clean(text).split(/[\n.!؟؛]+/).map(s=>s.trim()).filter(s=>s.length>=28&&s.length<=400).slice(0,30);
}
function makeQuiz(){
  const source=clean($('studyQuizNotes')?.value),out=$('studyQuizResult');if(!out)return;
  out.replaceChildren();
  if(source.length<60||source.length>12000){out.textContent='أدخل ملاحظات من 60 إلى 12000 حرف.';return}
  const lines=sentences(source);if(!lines.length){out.textContent='اكتب جملاً مفيدة ومكتملة لإنشاء الأسئلة.';return}
  let count=0;
  lines.forEach((line,index)=>{
    const tokens=line.match(/[\p{L}\p{N}]{5,}/gu)||[];
    const word=tokens.find(w=>!/^(عندما|لذلك|حيثما|كذلك|because|which|their)$/i.test(w));
    if(!word||count>=10)return;
    const loc=line.indexOf(word),question=line.slice(0,loc)+'________'+line.slice(loc+word.length);
    const details=document.createElement('details');details.className='card';details.style.marginBottom='8px';
    const summary=document.createElement('summary');summary.textContent=(++count)+'. أكمل الفراغ: '+question;
    const answer=document.createElement('p');answer.textContent='الجواب المستخرج حرفياً: '+word;
    details.append(summary,answer);out.appendChild(details);
  });
  if(!count)out.textContent='لم يتم العثور على عبارات مناسبة للأسئلة.';
}
async function renderCoverage(){
  const dest=$('studyCoverageResults');if(!dest)return;
  const data=await load(),group=new Map();
  data.forEach(item=>{const g=group.get(item.subject)||{folders:0,files:0};g[item.type==='folder'?'folders':'files']++;group.set(item.subject,g)});
  dest.replaceChildren();
  for(const [subject,summary] of [...group.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ar'))){
    const p=document.createElement('p');p.className='resource-item';
    p.textContent=subject+' : '+summary.folders+' مجلد و '+summary.files+' ملف/رابط مفهرس';dest.appendChild(p);
  }
  if(!group.size)dest.textContent='الفهرس غير متاح حالياً.';
}
async function render(id){
  if(document.body.dataset.portal!=='student'||!currentUser()?.id)return;
  await load();await syncSaved();
  if(id==='papers'||id==='exercises')await renderList(id);
  if(id==='collections')await renderCollections();
  if(id==='coverage')await renderCoverage();
}
function init(){
  if(document.body.dataset.portal!=='student')return;
  [['studyPapersQuery','papers'],['studyPapersSubject','papers'],['studyExercisesQuery','exercises'],['studyExercisesSubject','exercises']].forEach(([id,mode])=>{
    $(id)?.addEventListener(id.endsWith('Query')?'input':'change',()=>{void render(mode)});
  });
  $('studyQuizGenerate')?.addEventListener('click',makeQuiz);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
root.BacStudyHub={render,flatten,classify,sentences};
})(typeof window!=='undefined'?window:globalThis);
