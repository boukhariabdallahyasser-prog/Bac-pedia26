/* BAC-PEDIA study session: local-only timer and exam history.
 * No credentials, answer keys or protected resources enter browser storage. */
(function(root){
  'use strict';
  const KEY='bacpedia-practice-sessions-v1';
  let tick=null, ends=0, total=0;
  const $=id=>document.getElementById(id);
  const store={
    read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v.slice(0,50):[]}catch{return []}},
    write(v){try{localStorage.setItem(KEY,JSON.stringify(v.slice(0,50)))}catch{/* offline storage may be disabled */}}
  };
  function remaining(){return Math.max(0,Math.ceil((ends-Date.now())/1000))}
  function format(sec){return [Math.floor(sec/3600),Math.floor(sec%3600/60),sec%60].map(x=>String(x).padStart(2,'0')).join(':')}
  function update(){
    const value=remaining();
    if($('practiceClock'))$('practiceClock').textContent=format(value);
    if($('practiceProgress'))$('practiceProgress').value=total?100*(total-value)/total:0;
    if(!value&&tick){finish(true);}
  }
  function renderHistory(){
    const container=$('practiceHistory');if(!container)return;
    container.replaceChildren();
    const rows=store.read();
    if(!rows.length){container.textContent='لا توجد جلسات سابقة بعد.';return}
    rows.slice(0,10).forEach(row=>{
      const el=document.createElement('li');
      el.textContent=[new Date(row.at).toLocaleDateString('ar-DZ'),row.subject,row.minutes+' دقيقة',row.completed?'مكتملة':'أُنهيت مبكراً'].join(' · ');
      container.appendChild(el);
    });
  }
  function finish(completed){
    if(!tick)return;
    clearInterval(tick);tick=null;
    const subject=$('practiceSubject')?.value||'مراجعة عامة';
    const actual=Math.max(0,Math.min(total,Math.round((total-remaining())/60)));
    const history=store.read();
    history.unshift({at:new Date().toISOString(),subject,minutes:actual,completed:!!completed});
    store.write(history);
    if($('practiceStatus'))$('practiceStatus').textContent=completed?'انتهى الوقت. راجع إجاباتك بنفسك.':'تم حفظ جلسة المراجعة محلياً.';
    if($('practiceStart'))$('practiceStart').disabled=false;
    if($('practiceStop'))$('practiceStop').disabled=true;
    renderHistory();
  }
  function start(){
    if(tick)return;
    const minutes=Number($('practiceMinutes')?.value);
    if(!Number.isInteger(minutes)||minutes<5||minutes>240){
      if($('practiceStatus'))$('practiceStatus').textContent='اختر مدة بين 5 و240 دقيقة.';return;
    }
    total=minutes*60;ends=Date.now()+total*1000;
    if($('practiceStart'))$('practiceStart').disabled=true;
    if($('practiceStop'))$('practiceStop').disabled=false;
    if($('practiceStatus'))$('practiceStatus').textContent='الجلسة جارية. افتح الموضوع الذي اخترته في تبويب آخر.';
    update();tick=setInterval(update,1000);
  }
  function stop(){finish(false)}
  function init(){
    if(document.body.dataset.portal!=='student'||!$('practiceStart'))return;
    $('practiceStart').addEventListener('click',start);
    $('practiceStop').addEventListener('click',stop);
    renderHistory();update();
    document.addEventListener('visibilitychange',update);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  root.BacPractice={format,remaining};
})(typeof window!=='undefined'?window:globalThis);
