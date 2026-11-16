// Modern build entry. Existing classic-script APIs are intentionally
// maintained during the progressive migration from the old single-file app.
import '../assets/app.css';
import '../assets/chapters.css';
import {createClient} from '@supabase/supabase-js';

// Keep the existing student-auth initialization contract intact.
// No service-role keys or AI provider credentials are exposed here.
window.supabase={createClient};

function loadScript(path){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=path;
    script.async=false;
    script.onload=resolve;
    script.onerror=()=>reject(new Error('Could not load '+path));
    document.body.appendChild(script);
  });
}

async function start(){
  // Order matters: auth config and search helpers must exist before
  // legacy application initialization, then Chapter Studio is mounted.
  for(const path of [
    '/auth-config.js',
    '/assets/chapter-search.js',
    '/assets/legacy-app.js',
    '/assets/chapters.js'
  ])await loadScript(path);
}
start().catch(error=>{
  console.error('[Bac-pedia bootstrap]',error);
  const note=document.getElementById('authSetupNotice');
  if(note){note.textContent='تعذّر تحميل التطبيق. تحقّق من الاتصال وأعد تحديث الصفحة.';note.setAttribute('role','alert');}
});
