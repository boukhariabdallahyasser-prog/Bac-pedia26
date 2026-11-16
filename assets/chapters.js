/* Chapters Studio, driven by checked-in Google Drive manifest. */
(function () {
  'use strict';
  const $c = id => document.getElementById(id);
  const safe = value => escapeHtml(String(value ?? ''));
  const valid = url => typeof isDriveResourceUrl === 'function' && isDriveResourceUrl(url);
  const pref = {query:'',subject:'',type:'all',sort:'relevant',favoritesOnly:false};
  const favorites = new Set();
  const labels = {subject:'مادة أو مجموعة',folder:'وحدة أو مجلد',file:'ملف'};
  const icons = {subject:'fa-book',folder:'fa-folder-open',file:'fa-file-pdf'};
  const key = item => [item.subjectId,item.type,item.id].join(':');
  let records = [], lastBranch = null, lastUser = null;
  function syncFavorites() {
    const userId=studentAuthUser?.id||null;
    if(lastUser===userId)return;
    lastUser=userId;favorites.clear();
    if(!userId)return;
    try {
      const saved=JSON.parse(localStorage.getItem(userStorageKey(userId)+':chapterFavorites')||'[]');
      if(Array.isArray(saved))saved.filter(v=>typeof v==='string'&&v.length<220).slice(0,1000).forEach(v=>favorites.add(v));
    } catch(error) {console.warn('Chapter bookmarks could not be restored:',error);}
  }
  function persistFavorites() {
    const userId=studentAuthUser?.id;
    if(!userId)return;
    try{localStorage.setItem(userStorageKey(userId)+':chapterFavorites',JSON.stringify([...favorites].slice(0,1000)));}
    catch(error){console.warn('Chapter bookmarks could not be saved:',error);}
  }

  function buildIndex() {
    const list = [];
    for (const subject of getSubjects()) {
      const backup=canonicalDriveFolders[subject.id];
      const source = resourceManifest?.subjects?.[subject.id] || (backup?{
        categories:backup[1].map(([title,id])=>({title,id,type:'folder',url:'https://drive.google.com/drive/folders/'+id}))
      }:null);
      list.push({
        id:subject.id,subjectId:subject.id,subjectName:subject.name,
        title:subject.name, categoryName:'', keywords:subject.desc,
        type:'subject',url:valid(subject.url)?subject.url:null
      });
      if (!source) continue;
      const seen = new Set();
      function add(item, type, category='') {
        if (!item || !item.title || !valid(item.url)) return;
        const id = String(item.id || item.url);
        if (seen.has(id)) return;
        seen.add(id);
        list.push({
          id,subjectId:subject.id,subjectName:subject.name,
          title:item.title, categoryName:category,keywords:subject.desc,
          type,url:item.url
        });
      }
      for (const cat of source.categories || []) {
        add(cat,'folder');
        for (const item of cat.items || []) add(item,item.type === 'folder' ? 'folder' : 'file',cat.title);
      }
      for (const item of source.items || []) add(item,item.type === 'folder' ? 'folder' : 'file');
    }
    records = list;
  }

  function selectControl(id, opts, current, placeholder) {
    const select = $c(id);
    if (!select) return;
    select.replaceChildren();
    for (const [value,label] of [[ '',placeholder ],...opts]) {
      const option = document.createElement('option');
      option.value=value; option.textContent=label; select.appendChild(option);
    }
    select.value=current;
    if (select.value !== current) select.value='';
  }

  function render() {
    const page = $c('page-chapters');
    if (!page) return;
    syncFavorites();
    if (lastBranch !== state.branch + ':' + state.subBranch || !records.length) {
      buildIndex(); lastBranch=state.branch + ':' + state.subBranch;
      if (!getSubjects().some(s=>s.id===pref.subject)) pref.subject='';
    }
    selectControl('chapterSubject',getSubjects().map(s=>[s.id,s.name]),pref.subject,'كل المواد والمجموعات');
    const q = $c('chapterQuery');
    if (q && q.value !== pref.query && document.activeElement !== q) q.value=pref.query;
    const sort=$c('chapterSort');if(sort)sort.value=pref.sort;
    document.querySelectorAll('[data-chapter-type]').forEach(button => {
      button.setAttribute('aria-pressed',String(button.dataset.chapterType===pref.type));
    });
    const saved = records.map(item => ({...item,favorite:favorites.has(key(item))}));
    const result = BacSearch.search(saved,pref.query,{
      subject:pref.subject,type:pref.type,sort:pref.sort,favoritesOnly:pref.favoritesOnly
    });
    const count=$c('chapterCount');if(count)count.textContent=result.length.toLocaleString('ar-DZ')+' نتيجة';
    const favBtn=$c('chapterFavFilter');if(favBtn)favBtn.setAttribute('aria-pressed',String(pref.favoritesOnly));
    const root=$c('chapterResults');
    if (!root) return;
    root.replaceChildren();
    if (!result.length) {
      const holder=document.createElement('div');holder.className='chapter-empty';holder.style.gridColumn='1/-1';
      holder.innerHTML='<i class="fa-solid fa-magnifying-glass"></i><h3>لم نجد نتائج مطابقة</h3><p>جرّب اسماً آخر، أو ابحث بالفرنسية والإنجليزية، أو غيّر المادة والفلاتر.</p>';
      const suggestions=BacSearch.suggest(pref.query,saved);
      if(suggestions.length) {
        const wrap=document.createElement('div');wrap.className='chapter-suggestions';
        for(const word of suggestions) {
          const button=document.createElement('button');button.type='button';button.textContent=word;
          button.addEventListener('click',()=>{pref.query=word;if(q)q.value=word;render()});
          wrap.appendChild(button);
        }
        holder.appendChild(wrap);
      }
      root.appendChild(holder);return;
    }
    const fragment=document.createDocumentFragment();
    for(const item of result.slice(0,150)) {
      const article=document.createElement('article');
      article.className='chapter-result';
      const isFav=favorites.has(key(item));
      article.innerHTML=
        '<div class="chapter-result-head"><span class="chapter-type"><span class="chapter-symbol"><i class="fa-solid '+icons[item.type]+'"></i></span>'+safe(labels[item.type])+'</span><span class="soft">'+safe(item.subjectName)+'</span></div>'+
        '<div><h3>'+safe(item.title)+'</h3><p>'+safe(item.categoryName || (item.type==='subject'?'كل موارد المادة':'من مكتبة '+item.subjectName))+'</p></div>'+
        '<div class="chapter-actions"><button type="button" class="chapter-open">'+(item.url?'فتح المورد <i class="fa-solid fa-arrow-up-right-from-square"></i>':'قيد التحضير')+'</button><button type="button" class="chapter-favorite" aria-label="المفضلة" aria-pressed="'+isFav+'"><i class="'+(isFav?'fa-solid':'fa-regular')+' fa-heart"></i></button></div>';
      const open=article.querySelector('.chapter-open');
      open.disabled=!item.url;
      open.addEventListener('click',()=>{
        if(item.type==='subject')openSubjectById(item.subjectId);
        else if(valid(item.url)) window.open(item.url,'_blank','noopener,noreferrer');
      });
      article.querySelector('.chapter-favorite').addEventListener('click',()=>{
        const id=key(item);if(favorites.has(id))favorites.delete(id);else favorites.add(id);
        persistFavorites();
        render();
      });
      fragment.appendChild(article);
    }
    root.appendChild(fragment);
    if(result.length>150) {
      const caption=document.createElement('p');caption.className='muted';caption.textContent='تظهر أول 150 نتيجة. حدّد المادة أو ابحث بكلمة أدق لعرض بقية النتائج.';root.appendChild(caption);
    }
  }

  let scheduled = 0;
  function queueRender(){if(scheduled)cancelAnimationFrame(scheduled);scheduled=requestAnimationFrame(()=>{scheduled=0;render()});}
  $c('chapterQuery')?.addEventListener('input',e=>{pref.query=e.target.value;queueRender()});
  $c('chapterSubject')?.addEventListener('change',e=>{pref.subject=e.target.value;render()});
  $c('chapterSort')?.addEventListener('change',e=>{pref.sort=e.target.value;render()});
  document.querySelectorAll('[data-chapter-type]').forEach(b=>b.addEventListener('click',()=>{pref.type=b.dataset.chapterType;render()}));
  $c('chapterFavFilter')?.addEventListener('click',()=>{pref.favoritesOnly=!pref.favoritesOnly;render()});
  $c('chapterClear')?.addEventListener('click',()=>{
    pref.query='';pref.subject='';pref.type='all';pref.sort='relevant';pref.favoritesOnly=false;
    if($c('chapterQuery'))$c('chapterQuery').value='';
    render();
  });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!e.altKey) {
      if(!studentAuthUser)return;
      e.preventDefault();showPage('chapters');$c('chapterQuery')?.focus();
    }
  });
  window.renderChapters = () => {lastBranch=null;render()};
  render();
})();