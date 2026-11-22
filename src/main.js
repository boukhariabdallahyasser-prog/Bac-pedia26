// Modern build entry. Existing classic-script APIs are intentionally
// maintained during the progressive migration from the old single-file app.
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
  // Handle confirmation/recovery links from legacy public root URLs without
  // letting auth tokens be consumed on a page which has no recovery form.
  if(document.body.dataset.portal==='landing'&&
     /(?:^|[&#?])type=recovery(?:&|$)/i.test(location.hash+location.search)){
    location.replace('/login/'+location.search+location.hash);
    return;
  }
  // Order matters: auth config and search helpers must exist before
  // legacy application initialization, then Chapter Studio is mounted.
  for(const path of [
    '/auth-config.js',
    '/assets/chapter-search.js',
    '/assets/education-model.js',
    '/assets/subject-taxonomy.js',
    '/assets/legacy-app.js',
    '/assets/subject-organizer.js',
    '/assets/weekly-planner.js',
    '/assets/admin-library.js',
    '/assets/chapters.js',
    '/assets/ai-format.js',
    '/assets/landing.js',
    '/assets/public-explorer.js',
    '/assets/contributor-guide.js',
    '/assets/community.js',
    '/assets/practice.js',
    '/assets/study-hub.js'
  ])await loadScript(path);
  if(document.body.dataset.portal==='student')await import('./pdf-tools.js');
  if(['student','library'].includes(document.body.dataset.portal)&&'serviceWorker' in navigator&&location.protocol==='https:'){
    navigator.serviceWorker.register('/service-worker.js').catch(error=>console.warn('Offline mode unavailable',error));
  }
}
start().catch(error=>{
  console.error('[Bac-pedia bootstrap]',error);
  const note=document.getElementById('authSetupNotice');
  if(note){note.textContent='تعذّر تحميل التطبيق. تحقّق من الاتصال وأعد تحديث الصفحة.';note.setAttribute('role','alert');}
});
