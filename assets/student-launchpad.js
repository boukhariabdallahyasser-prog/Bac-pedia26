/* Student start screen: one action first, advanced tools remain accessible.
   No personal information is sent to third-party services. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const node=(tag,cls,content)=>{
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(content!==undefined)e.textContent=String(content);
 return e;
};
const names={math:'رياضيات',science:'علوم تجريبية',tech:'تقني رياضي',literature:'آداب وفلسفة',languages:'لغات أجنبية',economy:'تسيير واقتصاد'};
const goalOptions=[{key:'lessons',label:'أريد أن أفهم درساً',icon:'book-open'},
 {key:'exercises',label:'أريد حل تمارين',icon:'pen-line'},
 {key:'bac',label:'أريد مواضيع البكالوريا',icon:'file-text'}];
let goal='lessons';
function recentKey(){
 const uid=typeof studentAuthUser!=='undefined'?studentAuthUser?.id:null;
 return uid?'bac2027-recent-subject:'+uid:null;
}
function recentSubject(){
 const key=recentKey();if(!key)return null;
 try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
}
function saveRecent(id,branch,sub){
 const key=recentKey();if(!key)return;
 try{localStorage.setItem(key,JSON.stringify({id,branch,sub:sub||null}))}catch{}
}
function makeButton(text,callback,cls){
 const e=node('button',cls||'launch-action',text);e.type='button';e.addEventListener('click',callback);return e;
}
function studentSubjects(){
 if(typeof getNormalSubjects!=='function')return [];
 return getNormalSubjects().filter(s=>!s.special);
}
function launch(id,goalKey){
 saveRecent(id,state.branch,state.subBranch);
 if(typeof window.openOrganizedSubject==='function')window.openOrganizedSubject(id,goalKey);
 else if(typeof showPage==='function')showPage('chapters');
}
function createSelection(){
 const wrap=node('section','study-launcher-panel');
 const heading=node('div','study-launcher-heading');
 heading.append(node('span','study-launcher-eyebrow','01 · حدد شعبتك'));
 heading.append(node('h2','','اختر المادة التي تريد مراجعتها اليوم'));
 heading.append(node('p','','كل مادة في مكانها، ثم تختار الدرس أو التمرين أو البكالوريا.'));
 wrap.append(heading);
 const top=node('div','study-launcher-branch-controls');
 const branch=node('select','study-launcher-select');
 branch.id='studyLauncherBranch';branch.setAttribute('aria-label','شعبة البكالوريا');
 for(const [id,title] of Object.entries(names)){
  const option=node('option','',title);option.value=id;branch.append(option);
 }
 branch.value=state.branch;
 branch.addEventListener('change',()=>{if(typeof selectBranch==='function')selectBranch(branch.value)});
 const branchLabel=node('label','study-launcher-label','الشعبة الدراسية');
 branchLabel.append(branch);top.append(branchLabel);
 const subs=window.BacEducation?.branches?.[state.branch]?.subspecialties||{};
 if(Object.keys(subs).length){
  const spec=node('select','study-launcher-select');spec.id='studyLauncherSpecialization';
  spec.setAttribute('aria-label','التخصص أو اللغة الثالثة');
  for(const [id,title] of Object.entries(subs)){const opt=node('option','',title);opt.value=id;spec.append(opt)}
  spec.value=state.subBranch||Object.keys(subs)[0];
  spec.addEventListener('change',()=>{if(typeof selectSubBranch==='function')selectSubBranch(spec.value)});
  const label=node('label','study-launcher-label',state.branch==='tech'?'التخصص':'اللغة الثالثة');
  label.append(spec);top.append(label);
 }
 wrap.append(top);
 const recent=recentSubject(),options=studentSubjects();
 if(recent&&recent.branch===state.branch&&recent.sub===(state.subBranch||null)&&options.some(s=>s.id===recent.id)){
  const resume=node('div','study-launcher-resume');
  const picked=options.find(s=>s.id===recent.id);
  resume.append(node('span','','آخر مادة راجعتها: '+picked.name));
  resume.append(makeButton('متابعة المراجعة',()=>launch(picked.id,goal),'launch-action outlined'));
  wrap.append(resume);
 }
 const cards=node('div','study-launcher-subjects');
 cards.setAttribute('aria-label','مواد شعبة '+(names[state.branch]||''));
 for(const s of options){
  const card=makeButton(s.name,()=>launch(s.id,goal),'study-launcher-subject');
  card.setAttribute('aria-label','فتح مادة '+s.name);
  const ico=node('i',s.icon||'fa-solid fa-book');ico.setAttribute('aria-hidden','true');
  card.prepend(ico);cards.append(card);
 }
 if(!options.length)cards.append(node('p','study-launcher-empty','لا توجد مواد مفهرسة لهذه الشعبة حالياً.'));
 wrap.append(cards);
 return wrap;
}
function render(){
 const root=$('studyLaunchpad');
 if(!root||document.body.dataset.portal!=='student'||typeof state==='undefined')return;
 root.replaceChildren();
 const intro=node('div','study-launcher-top');
 intro.append(node('span','study-launcher-eyebrow','BAC-PEDIA · مساحتك الدراسية'));
 intro.append(node('h1','','ابدأ بالمادة، لا بالقوائم.'));
 intro.append(node('p','','اختر هدفك الدراسي ثم مادة من شعبتك. سنعرض محتواها فقط، دون خلط الموارد بين المواد.'));
 root.append(intro);
 const choice=node('div','study-launcher-goals');
 choice.setAttribute('role','group');choice.setAttribute('aria-label','ماذا تريد أن تدرس؟');
 for(const item of goalOptions){
  const b=makeButton(item.label,()=>{goal=item.key;render()},'study-launcher-goal'+(goal===item.key?' active':''));
  b.setAttribute('aria-pressed',String(goal===item.key));choice.append(b);
 }
 root.append(choice,createSelection());
 const bottom=node('div','study-launcher-shortcuts');
 bottom.append(makeButton('تنظيم وقتي',()=>showPage('planner'),'launch-action outlined'));
 bottom.append(makeButton('مواردي المحفوظة',()=>showPage('collections'),'launch-action outlined'));
 bottom.append(makeButton('مساعدة في المراجعة',()=>showPage('ai'),'launch-action outlined'));
 root.append(bottom);
 const small=node('p','study-launcher-footnote','إظهار المادة لا يعني أن كل دروسها أو روابطها متاحة. ستظهر المعلومات المتاحة فقط.');
 root.append(small);
}
window.renderStudyLaunchpad=render;
window.rememberBacSubject=saveRecent;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();