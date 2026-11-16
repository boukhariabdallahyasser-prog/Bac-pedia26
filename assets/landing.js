/* Public landing: smooth section navigation, no flashcard interactions. */
(function(){
 'use strict';
 document.querySelectorAll('#publicLanding a[href^="#"]').forEach(link=>{
   link.addEventListener('click',event=>{
     const dest=document.getElementById(link.getAttribute('href').slice(1));
     if(!dest)return;
     event.preventDefault();
     dest.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
   });
 });
})();
