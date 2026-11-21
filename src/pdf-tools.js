/* Client-only PDF extraction. Extraction happens in memory; AI use requires a separate click. */
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=pdfWorkerURL;
const $=id=>document.getElementById(id);
async function extract(){
 const file=$('studyPdfInput')?.files?.[0],status=$('studyPdfStatus'),out=$('studyPdfText');
 if(!file||!out||!status)return;
 out.value='';
 if(file.size>15728640||file.size<20){status.textContent='حجم PDF يجب أن يكون أقل من 15 ميغابايت.';return}
 status.textContent='جار استخراج النص على جهازك...';
 let task=null,doc=null;
 try{
   const buffer=await file.arrayBuffer();
   const signature=new TextDecoder().decode(buffer.slice(0,5));
   if(signature!=='%PDF-')throw Error('الملف ليس PDF صالحاً.');
   task=getDocument({data:new Uint8Array(buffer),disableFontFace:true});
   doc=await task.promise;
   const pages=Math.min(doc.numPages,12),texts=[];
   for(let index=1;index<=pages;index++){
     const page=await doc.getPage(index);
     const content=await page.getTextContent();
     const lines=content.items.map(x=>typeof x.str==='string'?x.str:'').filter(Boolean);
     texts.push('صفحة '+index+'\n'+lines.join(' '));
     page.cleanup();
   }
   const text=texts.join('\n\n').trim();
   if(!text)throw Error('هذا PDF لا يحتوي نصاً قابلاً للاستخراج. قد يكون صورة ممسوحة ضوئياً.');
   out.value=text.slice(0,10000);
   status.textContent='تم استخراج '+pages+' صفحات من '+doc.numPages+'. النص محفوظ في الذاكرة فقط. راجعه قبل إرساله إلى الذكاء الاصطناعي.';
 }catch(error){
   status.textContent=error.message||'تعذر قراءة PDF. قد يكون محمياً بكلمة مرور أو غير مدعوم.';
 }finally{try{await doc?.destroy()}catch{}}
}
function requestAI(agent){
 const text=$('studyPdfText')?.value.trim();
 if(!text||text.length<50){$('studyPdfStatus').textContent='استخرج النص وراجعه أولاً.';return}
 const target=$('aiPrompt');
 if(!target){$('studyPdfStatus').textContent='المساعد غير متاح.';return}
 target.value=(agent==='quiz'?'أنشئ أسئلة مراجعة مع حلول من النص المرفق فقط. لا تضف حقائق خارجية.\n':'لخص هذه الصفحات بدقة واذكر ما لا يمكن استنتاجه منها.\n')+text.slice(0,9000);
 if(typeof window.showPage==='function')window.showPage('ai');
 if(typeof window.runAgent==='function')void window.runAgent(agent);
}
function init(){
 if(document.body.dataset.portal!=='student')return;
 $('studyPdfExtract')?.addEventListener('click',()=>void extract());
 $('studyPdfSummarize')?.addEventListener('click',()=>requestAI('summarizer'));
 $('studyPdfQuiz')?.addEventListener('click',()=>requestAI('quiz'));
 $('studyQuizSendAI')?.addEventListener('click',()=>{
   const notes=$('studyQuizNotes')?.value.trim()||'';
   if(notes.length<60){$('studyQuizResult').textContent='أضف ملاحظات كافية أولاً.';return}
   const target=$('aiPrompt');if(!target)return;
   target.value='أنشئ اختباراً بأسئلة وأجوبة تستند حصراً إلى الملاحظات التالية. أظهر أي غموض في النص.\n'+notes.slice(0,9000);
   if(typeof window.showPage==='function')window.showPage('ai');
   if(typeof window.runAgent==='function')void window.runAgent('quiz');
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
