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
const stableKey=(subject,url)=>{
 const raw=String(subject)+'|'+String(url);
 let a=2166136261,b=2166136261;
 for(let i=0;i<raw.length;i++){
  const c=raw.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^(c+31),16777619);
 }
 return 'r'+(a>>>0).toString(36)+(b>>>0).toString(36);
};
const pendingStorageKey=()=>currentUser()?.id?'bacpedia:bookmark-pending:'+currentUser().id:null;
function readPending(){
 const key=pendingStorageKey();if(!key)return {};
 try{
  const p=JSON.parse(localStorage.getItem(key)||'{}');
  return p&&typeof p==='object'&&!Array.isArray(p)?p:{};
 }catch{return {}}
}
function writePending(pending){
 const key=pendingStorageKey();if(!key)return;
 try{localStorage.setItem(key,JSON.stringify(pending))}catch{}
}
function mapKey(key){
 const item=catalog.find(x=>x.key===key||x.legacyKey===key);
 return item?.key||key;
}
let syncedUid=null,syncFlight=null;
async function mutateRemoteBookmark(db,uid,key,enabled){
 const item=catalog.find(x=>x.key===key);
 if(!item)return false;
 const resource_key=hubKey(item.key);
 if(resource_key.length>240)return false;
 const aliases=[resource_key];
 if(item.legacyKey&&item.legacyKey!==item.key)aliases.push(hubKey(item.legacyKey).slice(0,240));
 let error=null;
 if(enabled){
  const response=await db.from('student_resource_bookmarks').upsert({
   user_id:uid,resource_key,subject_id:item.subjectId||'general'
  },{onConflict:'user_id,resource_key'});
  error=response.error;
 }else{
  const response=await db.from('student_resource_bookmarks').delete()
   .eq('user_id',uid).in('resource_key',aliases);
  error=response.error;
 }
 if(error)throw error;
 return true;
}
async function syncSaved(){
 const uid=currentUser()?.id,db=bookmarkClient();
 if(!uid||!db)return;
 if(syncedUid===uid)return;
 if(syncFlight?.uid===uid)return syncFlight.promise;
 const task=(async()=>{
  try{
   const {data,error}=await db.from('student_resource_bookmarks')
     .select('resource_key').eq('user_id',uid).like('resource_key','hub:%').limit(500);
   if(error)throw error;
   if(currentUser()?.id!==uid)return;
   const pending=readPending();
   const remote=(data||[]).map(x=>x.resource_key).filter(k=>typeof k==='string'&&k.startsWith('hub:'))
     .map(k=>mapKey(k.slice(4)));
   const local=readSaved().map(mapKey);
   const all=new Set([...remote,...local]);
   for(const [key,value] of Object.entries(pending)){
    if(value===false)all.delete(mapKey(key));
    else if(value===true)all.add(mapKey(key));
   }
   if(currentUser()?.id!==uid)return;
   saveSaved([...all]);
   // Replay explicit offline changes first. A stale cloud item must never resurrect a deletion.
   for(const [key,enabled] of Object.entries(pending)){
    if(currentUser()?.id!==uid)return;
    const canonical=mapKey(key);
    if(await mutateRemoteBookmark(db,uid,canonical,enabled)){
     const now=readPending();if(now[key]===enabled){delete now[key];writePending(now)}
    }
   }
   const currentRemote=new Set(remote);
   const additions=[...all].filter(x=>!currentRemote.has(x));
   for(const key of additions){
    if(currentUser()?.id!==uid)return;
    await mutateRemoteBookmark(db,uid,key,true);
   }
   if(currentUser()?.id!==uid)return;
   syncedUid=uid;
  }catch(error){console.warn('Saved-resource cloud sync unavailable; local changes preserved',error)}
 })();
 syncFlight={uid,promise:task};
 try{await task}finally{if(syncFlight?.promise===task)syncFlight=null}
}
async function updateCloudBookmark(item,enabled){
 const uid=currentUser()?.id,db=bookmarkClient();if(!uid)return;
 const pending=readPending();pending[item.key]=enabled;writePending(pending);
 if(!db)return;
 try{
  if(await mutateRemoteBookmark(db,uid,item.key,enabled)&&currentUser()?.id===uid){
   const latest=readPending();
   if(latest[item.key]===enabled){delete latest[item.key];writePending(latest)}
  }
 }catch(error){
  console.warn('Bookmark retained locally but cloud sync failed',error);
  if(typeof showToast==='function')showToast('حُفظ التغيير محلياً؛ ستُعاد محاولة المزامنة عند عودة الاتصال','warning');
 }
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
  const hint=document.createElement('p');hint.className='muted';hint.textContent=item.subject+' · '+(item.parent||'مورد')+(item.year?' · '+item.year:'')+(item.type==='folder'?' · مجلد':'');info.appendChild(hint);row.appendChild(info);
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
    if(root.BacEducation&&Array.isArray(settings.records))root.BacEducation.overlay(entries,settings.records,[],settings.branch,settings.subBranch);
    const collected=[],seen=new Set();
    function add(model,item,source){
      if(!validUrl(source.url))return;
      const u=new URL(source.url);
      const legacyKey=source.id||model.id+':'+u.pathname;
      const key=stableKey(model.id,source.url);
      const canonical=model.id+'|'+source.url;
      if(seen.has(canonical))return;
      seen.add(canonical);
      const parent=item.title===source.title?item.context:(item.title+' · '+item.context);
      const rec={key,legacyKey,title:source.title,subject:model.name,subjectId:model.id,
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
    let records=[];
    const client=bookmarkClient();
    if(client&&root.BacEducation){
      const label=root.BacEducation.branches[branch]?.name||'جميع الشعب';
      const {data,error}=await client.from('collaborator_resources')
        .select('id,title,subject,subject_key,specialization_code,academic_branch,content_group,unit_title,resource_url,resource_kind,status,exam_year')
        .eq('status','approved').in('academic_branch',[label,'جميع الشعب']).limit(1000);
      if(error)console.warn('Approved resource catalog unavailable',error);
      else records=data||[];
    }
    catalog=flatten(rawManifest,{branch,subBranch,subjects,records});
    loaded=true;catalogKey=stamp;
    const original=readSaved();
    const migrated=[...new Set(original.map(mapKey))];
    if(migrated.some((x,i)=>x!==original[i]))saveSaved(migrated);
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
  if(status)status.textContent=filtered.length+' مورد مطابق لشعبة '+(typeof state!=='undefined'?state.branch:'')+'. التصنيف يعتمد على العناوين وفهرس المصادر.';
  filtered.slice(0,80).forEach(item=>addRow(dest,item));
  if(!filtered.length){
    const empty=document.createElement('p');empty.className='muted';
    empty.textContent=mode==='papers'?'لم نجد مواضيع بكالوريا مفهرسة لهذه المادة في شعبتك. جرّب مادة أخرى؛ لا نعرض مواضيع شعبة مختلفة.':
      'لم نجد تمارين مصنفة لهذا البحث في شعبتك. ابحث عن وحدة داخل «موادي الدراسية».';
    dest.appendChild(empty);
  }
  if(filtered.length>80){const note=document.createElement('p');note.textContent='عرض أول 80 نتيجة. ضيّق البحث للحصول على نتائج أدق.';dest.appendChild(note)}
}
async function renderCollections(){
  const dest=$('studyCollectionsResults');if(!dest)return;
  const items=await load(),saved=readSaved().map(mapKey);
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
