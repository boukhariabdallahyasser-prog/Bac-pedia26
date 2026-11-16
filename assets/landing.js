/* Public landing interactions. All authenticated actions remain in the existing Supabase flow. */
(function(){
  'use strict';
  const demo=document.getElementById('lpDemoFlashcard');
  if(demo){
    demo.addEventListener('click',()=>{
      const pressed=demo.getAttribute('aria-pressed')==='true';
      demo.setAttribute('aria-pressed',String(!pressed));
    });
    demo.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();demo.click();}
    });
  }
  // Navigation anchors are meaningful and remain usable without a student session.
  document.querySelectorAll('#publicLanding a[href^="#"]').forEach(link=>{
    link.addEventListener('click',event=>{
      const dest=document.getElementById(link.getAttribute('href').slice(1));
      if(!dest)return;
      event.preventDefault();
      dest.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
    });
  });
})();
