/* Bac-pedia student flashcards + approved contributor resources.
   Supabase RLS, not client-side form visibility, controls authorization. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const status=(message,type='info')=>{if(typeof showToast==='function')showToast(message,type)};
  const client=()=>typeof getStudentAuth==='function'?getStudentAuth():null;
  const uid=()=>typeof studentAuthUser==='undefined'?null:studentAuthUser?.id||null;
  const normalize=value=>String(value||'').trim();
  let activeUser=null,decks=[],cardStats=[],selectedDeck=null,cards=[],studied=new Set(),currentCardId=null,flipped=false;
  let applicant=null,submissions=[],flashBusy=false,collabBusy=false,loadedOnce=false;

  function element(tag,cls,text){
    const item=document.createElement(tag);
    if(cls)item.className=cls;
    if(text!=null)item.textContent=String(text);
    return item;
  }
  function button(label,fn,cls){
    const item=element('button',cls,label);
    item.type='button';item.addEventListener('click',fn);return item;
  }
  function empty(title,desc){
    const item=element('div','comm-empty');
    item.append(element('i','fa-solid fa-layer-group'),element('h3','',title),element('p','',desc));
    return item;
  }
  function safeError(error,context){
    console.warn('[Bac-pedia] '+context,error);
    status('تعذر '+context+'. تحقق من الاتصال وحاول مرة أخرى.','warning');
  }
  function ownsSession(expected){return expected&&uid()===expected;}

  async function loadDecks(){
    const user=uid(),sup=client();if(!user||!sup)return;
    try{
      const {data,error}=await sup.from('flashcard_decks')
        .select('id,title,subject,description,created_at,updated_at')
        .eq('owner_id',user).order('updated_at',{ascending:false}).limit(150);
      if(error)throw error;
      if(!ownsSession(user))return;
      decks=data||[];cardStats=[];
      if(decks.length){
        const ids=decks.map(d=>d.id);
        const result=await sup.from('flashcard_cards').select('id,deck_id,due_at').in('deck_id',ids).limit(5000);
        if(result.error)throw result.error;
        if(!ownsSession(user))return;
        cardStats=result.data||[];
      }
      renderDecks();
    }catch(error){safeError(error,'تحميل بطاقات المراجعة');}
  }

  function renderStats(){
    const root=$('flashStats');if(!root)return;
    const values=[decks.length,cardStats.length,cardStats.filter(c=>new Date(c.due_at).getTime()<=Date.now()).length];
    root.querySelectorAll('strong').forEach((node,i)=>node.textContent=String(values[i]||0));
  }
  function renderDecks(){
    renderStats();
    const grid=$('flashDeckGrid');if(!grid)return;
    grid.replaceChildren();
    const count=$('flashDeckCount');
    if(count)count.textContent=decks.length+' مجموعة';
    if(!decks.length){
      grid.append(empty('ابدأ بأول مجموعة','مثلاً: أنشئ مجموعة للدوال، أضف أسئلتك ثم تدرب عليها في جلسات قصيرة.'));
      return;
    }
    const fragment=document.createDocumentFragment();
    for(const deck of decks){
      const card=element('article','comm-deck');
      card.append(element('div','comm-deck-symbol'),element('h4','',deck.title),element('p','',deck.description||deck.subject));
      card.firstChild.append(element('i','fa-solid fa-layer-group'));
      const footer=element('div','comm-deck-footer');
      footer.append(element('small','',cardStats.filter(c=>c.deck_id===deck.id).length+' بطاقة'));
      footer.append(button('ابدأ المراجعة',()=>void openDeck(deck.id)));
      card.append(footer);fragment.append(card);
    }
    grid.append(fragment);
  }
  async function createDeck(event){
    event.preventDefault();
    if(flashBusy)return;
    const title=normalize($('flashDeckTitle')?.value),subject=normalize($('flashDeckSubject')?.value),owner=uid();
    if(!owner||title.length<2)return;
    flashBusy=true;
    try{
      const result=await client().from('flashcard_decks').insert({
        owner_id:owner,title,subject:subject||'عام'
      }).select('id').single();
      if(result.error)throw result.error;
      $('flashDeckTitle').value='';
      $('flashDeckForm').classList.add('hidden');
      await loadDecks();
      status('تم إنشاء المجموعة','success');
      await openDeck(result.data.id);
    }catch(error){safeError(error,'إنشاء مجموعة المراجعة');}
    finally{flashBusy=false;}
  }

  function currentCard(){return cards.find(c=>c.id===currentCardId)||null;}
  function nextStudyCard(){
    const due=cards.filter(c=>!studied.has(c.id)&&new Date(c.due_at).getTime()<=Date.now());
    currentCardId=due.length?due[0].id:null;flipped=false;
    renderStudy();
  }
  function renderStudy(){
    const face=$('flashCardFace'),panel=$('flashStudyCard'),progress=$('flashCardProgress');
    if(!face||!panel)return;
    const card=currentCard();
    panel.classList.toggle('is-flipped',flipped);
    if(card){
      face.textContent=flipped?card.back:card.front;
      progress.textContent=cards.length+' بطاقات · '+studied.size+' مراجعة في هذه الجلسة';
    }else{
      face.textContent=cards.length?'أحسنت! انتهيت من البطاقات المستحقة للمراجعة.':'أضف أول بطاقة للمجموعة وابدأ المراجعة.';
      progress.textContent=cards.length+' بطاقات';
    }
    for(const id of ['flashAgainBtn','flashHardBtn','flashGoodBtn']){
      const node=$(id);if(node)node.disabled=!card;
    }
    renderCardList();
  }
  function flipStudy(){
    if(!currentCard())return;
    flipped=!flipped;renderStudy();
  }
  async function openDeck(id){
    const deck=decks.find(item=>item.id===id),owner=uid();
    if(!deck||!owner)return;
    selectedDeck=deck;studied.clear();currentCardId=null;cards=[];
    $('flashDecksView')?.classList.add('hidden');
    $('flashStudyView')?.classList.remove('hidden');
    $('flashCurrentDeckTitle').textContent=deck.title;
    $('flashCardFace').textContent='جار تحميل البطاقات...';
    try{
      const {data,error}=await client().from('flashcard_cards')
        .select('id,front,back,due_at,interval_days,reviews,created_at')
        .eq('deck_id',id).order('due_at',{ascending:true}).limit(500);
      if(error)throw error;
      if(!ownsSession(owner)||selectedDeck?.id!==id)return;
      cards=data||[];nextStudyCard();
    }catch(error){safeError(error,'تحميل بطاقات المجموعة');}
  }
  function closeDeck(){
    selectedDeck=null;currentCardId=null;cards=[];studied.clear();
    $('flashDecksView')?.classList.remove('hidden');
    $('flashStudyView')?.classList.add('hidden');
    void loadDecks();
  }
  async function createCard(event){
    event.preventDefault();if(flashBusy||!selectedDeck)return;
    const front=normalize($('flashCardFront')?.value),back=normalize($('flashCardBack')?.value);
    if(front.length<2||!back)return;
    flashBusy=true;
    try{
      const result=await client().from('flashcard_cards')
        .insert({deck_id:selectedDeck.id,front,back}).select('id,front,back,due_at,interval_days,reviews,created_at').single();
      if(result.error)throw result.error;
      cards.push(result.data);
      $('flashCardFront').value='';$('flashCardBack').value='';
      nextStudyCard();status('تمت إضافة البطاقة','success');
      void loadDecks();
    }catch(error){safeError(error,'إضافة البطاقة');}
    finally{flashBusy=false;}
  }
  async function deleteCard(id){
    if(flashBusy||!selectedDeck)return;
    flashBusy=true;
    try{
      const result=await client().from('flashcard_cards').delete().eq('id',id).eq('deck_id',selectedDeck.id);
      if(result.error)throw result.error;
      cards=cards.filter(c=>c.id!==id);studied.delete(id);
      nextStudyCard();void loadDecks();
      status('حُذفت البطاقة','success');
    }catch(error){safeError(error,'حذف البطاقة');}
    finally{flashBusy=false;}
  }
  function renderCardList(){
    const root=$('flashCardList');if(!root)return;
    root.replaceChildren();
    for(const card of cards){
      const row=element('div','comm-card-row');
      const body=element('div');
      body.append(element('strong','',card.front),element('span','',card.back));
      row.append(body,button('حذف',()=>void deleteCard(card.id)));
      root.append(row);
    }
  }
  async function reviewCard(level){
    const card=currentCard();if(!card||flashBusy)return;
    if(!flipped){flipped=true;renderStudy();return;}
    const previous=Math.max(0,Number(card.interval_days)||0);
    const minutes=level==='again'?10:level==='hard'?1440:Math.max(2,previous?Math.min(365,Math.round(previous*2.2)):2)*1440;
    flashBusy=true;
    try{
      const result=await client().from('flashcard_cards').update({
        due_at:new Date(Date.now()+minutes*60000).toISOString(),
        interval_days:level==='again'?0:Math.ceil(minutes/1440),
        reviews:Math.max(0,Number(card.reviews)||0)+1,
        updated_at:new Date().toISOString()
      }).eq('id',card.id).eq('deck_id',selectedDeck.id);
      if(result.error)throw result.error;
      studied.add(card.id);nextStudyCard();void loadDecks();
    }catch(error){safeError(error,'حفظ نتيجة المراجعة');}
    finally{flashBusy=false;}
  }

  async function loadCollaboration(){
    const user=uid(),sup=client();
    if(!user||!sup)return;
    try{
      const [application,resources]=await Promise.all([
        sup.from('collaborator_applications')
          .select('display_name,organization,contribution_type,motivation,status,created_at')
          .eq('user_id',user).maybeSingle(),
        sup.from('collaborator_resources')
          .select('id,title,subject,description,resource_url,status,contributor_id,created_at')
          .order('created_at',{ascending:false}).limit(60)
      ]);
      if(application.error)throw application.error;
      if(resources.error)throw resources.error;
      if(!ownsSession(user))return;
      applicant=application.data||null;
      submissions=resources.data||[];
      renderCollaboration();
    }catch(error){safeError(error,'تحميل مساهمات المجتمع');}
  }
  function renderCollaboration(){
    const statusPanel=$('collaboratorStatusPanel'),form=$('collaboratorApplyPanel'),resourceForm=$('collabSubmitPanel'),grid=$('collabResourcesGrid');
    if(!statusPanel||!form||!resourceForm||!grid)return;
    statusPanel.replaceChildren();
    statusPanel.append(element('h3','','حالة طلبك'));
    if(!applicant){
      statusPanel.append(element('p','','يمكنك التسجيل كمساهم بعد إنشاء حساب طالب موثّق. دور المساهم يُمنح بعد مراجعة الطلب، وليس تلقائياً.'));
      form.classList.remove('hidden');
      resourceForm.classList.add('hidden');
    }else{
      const labels={pending:'قيد المراجعة',approved:'مقبول',rejected:'غير مقبول'};
      const tag=element('span','comm-state-tag '+applicant.status,labels[applicant.status]||applicant.status);
      statusPanel.append(tag,element('p','',applicant.organization+' · '+applicant.display_name));
      statusPanel.append(element('p','',applicant.status==='approved'?
        'يمكنك إرسال مصادر تعليمية الآن. ستُنشر بعد مراجعتها.':
        applicant.status==='pending'?'وصل طلبك بنجاح. ستظهر نتيجة المراجعة هنا.':'يمكنك التواصل مع الإدارة لمزيد من المعلومات.'));
      form.classList.add('hidden');
      resourceForm.classList.toggle('hidden',applicant.status!=='approved');
    }
    grid.replaceChildren();
    if(!submissions.length){
      grid.append(empty('لا توجد موارد منشورة بعد','الموارد المقترحة تظهر هنا بعد مراجعة فريق المنصة.'));
      return;
    }
    for(const entry of submissions){
      const card=element('article','comm-deck');
      const glyph=element('div','comm-deck-symbol');glyph.append(element('i','fa-solid fa-file-lines'));
      card.append(glyph,element('h4','',entry.title),element('p','',entry.description||entry.subject));
      const row=element('div','comm-deck-footer');
      row.append(element('small','comm-resource-status',entry.status==='approved'?'مورد مقبول':entry.status==='pending'?'قيد المراجعة':'لم تتم الموافقة'));
      if(entry.status==='approved'&&/^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/)/.test(entry.resource_url)){
        const a=element('a','comm-resource-link','فتح المصدر');
        a.href=entry.resource_url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);
      }
      card.append(row);grid.append(card);
    }
  }
  async function applyCollaboration(event){
    event.preventDefault();if(collabBusy||!uid())return;
    const row={
      user_id:uid(),display_name:normalize($('collabName').value),
      organization:normalize($('collabOrg').value),
      contribution_type:$('collabType').value,
      motivation:normalize($('collabMotivation').value)
    };
    if(row.display_name.length<2||row.organization.length<2||row.motivation.length<15){
      status('أكمل بيانات طلب المساهمة','warning');return;
    }
    collabBusy=true;
    try{
      const result=await client().from('collaborator_applications').insert(row);
      if(result.error)throw result.error;
      await loadCollaboration();status('تم إرسال طلبك للمراجعة','success');
    }catch(error){safeError(error,'إرسال طلب المساهمة');}
    finally{collabBusy=false;}
  }
  async function submitResource(event){
    event.preventDefault();if(collabBusy||!uid()||applicant?.status!=='approved')return;
    const url=normalize($('collabResourceUrl').value);
    if(!/^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/)/.test(url)){
      status('يجب تقديم رابط Google Drive صحيح','warning');return;
    }
    const row={
      contributor_id:uid(),title:normalize($('collabResourceTitle').value),
      subject:normalize($('collabResourceSubject').value),
      resource_url:url,
      description:normalize($('collabResourceDescription').value)
    };
    collabBusy=true;
    try{
      const result=await client().from('collaborator_resources').insert(row);
      if(result.error)throw result.error;
      $('collabResourceForm').reset();
      await loadCollaboration();status('تم إرسال المورد للمراجعة قبل النشر','success');
    }catch(error){safeError(error,'اقتراح المورد');}
    finally{collabBusy=false;}
  }

  function resetForLogout(){
    activeUser=null;loadedOnce=false;decks=[];cardStats=[];cards=[];studied.clear();selectedDeck=null;applicant=null;submissions=[];
    renderDecks();
    const grid=$('collabResourcesGrid');if(grid)grid.replaceChildren();
  }
  async function onAuthChanged(){
    const user=uid();
    if(!user){resetForLogout();return;}
    if(user===activeUser&&loadedOnce)return;
    activeUser=user;loadedOnce=true;
    await Promise.all([loadDecks(),loadCollaboration()]);
    if(!ownsSession(user))resetForLogout();
  }
  function renderFlashcards(){
    if(uid()&&(!loadedOnce||activeUser!==uid()))void onAuthChanged();
    renderDecks();
  }
  function renderCommunity(){
    if(uid()&&(!loadedOnce||activeUser!==uid()))void onAuthChanged();
    else renderCollaboration();
  }

  $('flashNewDeckBtn')?.addEventListener('click',()=>$('flashDeckForm')?.classList.toggle('hidden'));
  $('flashDeckCreateForm')?.addEventListener('submit',event=>void createDeck(event));
  $('flashBackBtn')?.addEventListener('click',closeDeck);
  $('flashAddCardForm')?.addEventListener('submit',event=>void createCard(event));
  $('flashStudyCard')?.addEventListener('click',flipStudy);
  $('flashStudyCard')?.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();flipStudy();}
  });
  $('flashAgainBtn')?.addEventListener('click',()=>void reviewCard('again'));
  $('flashHardBtn')?.addEventListener('click',()=>void reviewCard('hard'));
  $('flashGoodBtn')?.addEventListener('click',()=>void reviewCard('good'));
  $('collaboratorApplyForm')?.addEventListener('submit',event=>void applyCollaboration(event));
  $('collabResourceForm')?.addEventListener('submit',event=>void submitResource(event));

  window.renderFlashcards=renderFlashcards;
  window.renderCommunity=renderCommunity;
  window.onCommunityAuthChanged=()=>void onAuthChanged();
  if(uid())void onAuthChanged();
})();
