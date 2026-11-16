/* Bac-pedia · subject → unit → resource explorer. Existing verified Drive catalog only. */
(function(){
  'use strict';
  const el=id=>document.getElementById(id);
  const esc=value=>escapeHtml(String(value??''));
  const valid=url=>typeof isDriveResourceUrl==='function'&&isDriveResourceUrl(url);
  const labels={subject:'المادة',folder:'الوحدة أو المجلد',file:'ملف',shortcut:'اختصار'};
  const icons={subject:'fa-book-open',folder:'fa-folder-open',file:'fa-file-pdf',shortcut:'fa-arrow-up-right-from-square'};
  const prefs={query:'',subject:'',type:'all',sort:'relevant',favoritesOnly:false};
  let subjects=[],flat=[],branchStamp='',userStamp=null,requestId=0;
  const favorites=new Set();

  const key=item=>[item.subjectId,item.type,item.id].join(':');
  function saveLocal(){
    if(!studentAuthUser?.id)return;
    try{localStorage.setItem(userStorageKey(studentAuthUser.id)+':chapterFavorites',JSON.stringify([...favorites].slice(0,1000)));}
    catch(error){console.warn('Bookmarks local cache unavailable',error);}
  }
  async function loadCloud(userId){
    try{
      const client=getStudentAuth();
      if(!client)return;
      const {data,error}=await client.from('student_resource_bookmarks').select('resource_key').eq('user_id',userId).limit(1000);
      if(error)throw error;
      if(studentAuthUser?.id!==userId)return;
      for(const item of data||[])if(typeof item.resource_key==='string')favorites.add(item.resource_key);
      saveLocal();render();
    }catch(error){console.warn('Cloud bookmarks unavailable; local cache is still usable',error);}
  }
  function ensureUser(){
    const id=studentAuthUser?.id||null;
    if(id===userStamp)return;
    userStamp=id;favorites.clear();
    if(!id)return;
    try{
      const cached=JSON.parse(localStorage.getItem(userStorageKey(id)+':chapterFavorites')||'[]');
      if(Array.isArray(cached))cached.filter(x=>typeof x==='string'&&x.length<=240).slice(0,1000).forEach(x=>favorites.add(x));
    }catch(error){console.warn('Could not restore bookmarks',error);}
    void loadCloud(id);
  }
  async function setBookmark(item,enabled){
    const id=key(item);
    if(enabled)favorites.add(id);else favorites.delete(id);
    saveLocal();render();
    const userId=studentAuthUser?.id;
    if(!userId)return;
    try{
      const client=getStudentAuth();if(!client)return;
      const result=enabled
        ?await client.from('student_resource_bookmarks').upsert({user_id:userId,resource_key:id,subject_id:item.subjectId},{onConflict:'user_id,resource_key'})
        :await client.from('student_resource_bookmarks').delete().eq('user_id',userId).eq('resource_key',id);
      if(result.error)throw result.error;
    }catch(error){console.warn('Bookmark cloud sync failed',error);showToast('تم حفظ المفضلة محلياً، وتعذر مزامنتها سحابياً','warning');}
  }

  function makeNode(raw,subjectId,path,kind){
    if(!raw||!raw.title)return null;
    const type=kind||((raw.type==='file'||raw.type==='shortcut')?'file':'folder');
    const id=String(raw.id||raw.driveId||raw.url||raw.title);
    const item={id,title:String(raw.title),type,url:valid(raw.url)?raw.url:null,
      subjectId,path:[...path,id],children:[],subjectName:'',categoryName:''};
    for(const child of [...(raw.categories||[]),...(raw.items||[])]){
      const node=makeNode(child,subjectId,item.path);
      if(node)item.children.push(node);
    }
    return item;
  }
  function rebuild(){
    subjects=[];flat=[];
    for(const subject of getSubjects()){
      const root={id:subject.id,title:subject.name,type:'subject',subjectId:subject.id,
        subjectName:subject.name,categoryName:'',path:[],url:valid(subject.url)?subject.url:null,
        desc:subject.desc||'',icon:subject.icon||'fa-solid fa-book',children:[]};
      const source=resourceManifest?.subjects?.[subject.id];
      if(source){
        for(const child of [...(source.categories||[]),...(source.items||[])]){
          const node=makeNode(child,subject.id,[]);
          if(node)root.children.push(node);
        }
      }else{
        const backup=canonicalDriveFolders[subject.id];
        if(backup){
          if(!root.url)root.url='https://drive.google.com/drive/folders/'+backup[0];
          for(const [title,id] of backup[1]){
            const node=makeNode({id,title,type:'folder',url:'https://drive.google.com/drive/folders/'+id},subject.id,[]);
            if(node)root.children.push(node);
          }
        }
      }
      subjects.push(root);
      flat.push({...root,keywords:root.desc});
      function walk(items,trail){
        for(const item of items){
          item.subjectName=root.title;
          item.categoryName=trail.join(' / ');
          flat.push({...item,keywords:root.desc});
          walk(item.children,[...trail,item.title]);
        }
      }
      walk(root.children,[]);
    }
  }
  function route(){
    const hash=decodeURIComponent(location.hash||'');
    if(!hash.startsWith('#/chapters'))return {subject:'',path:[]};
    const pieces=hash.slice('#/chapters'.length).split('/').filter(Boolean);
    return {subject:pieces.shift()||'',path:pieces.slice(0,12)};
  }
  function setRoute(subject='',path=[]){
    // Opening a search result must actually enter its detail page.
    prefs.query='';prefs.subject='';prefs.type='all';prefs.favoritesOnly=false;
    const search=el('chapterQuery');if(search)search.value='';
    const pieces=[subject,...path].filter(Boolean).map(encodeURIComponent);
    const next='#/chapters'+(pieces.length?'/'+pieces.join('/'): '');
    if(location.hash!==next)location.hash=next;
    if(studentAuthUser&&state.page!=='chapters')showPage('chapters');
    else render();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function resolveCurrent(){
    const current=route(),subject=subjects.find(x=>x.id===current.subject);
    if(!subject)return {current,subject:null,node:null,parents:[]};
    let items=subject.children,node=subject;
    const parents=[subject];
    for(const id of current.path){
      const match=items.find(x=>x.id===id);
      if(!match)break;
      node=match;parents.push(match);items=match.children;
    }
    return {current,subject,node,parents};
  }
  function applySelect(id,values,selected,placeholder){
    const select=el(id);if(!select)return;
    const old=select.value;
    select.replaceChildren();
    for(const [value,text] of [['',placeholder],...values]){
      const option=document.createElement('option');option.value=value;option.textContent=text;select.appendChild(option);
    }
    select.value=selected;if(select.value!==selected)select.value='';
  }
  function textNode(tag,className,text){
    const e=document.createElement(tag);e.className=className;e.textContent=text;return e;
  }
  function makeButton(label,onClick,cls=''){
    const button=document.createElement('button');
    button.type='button';button.className=cls;button.textContent=label;
    button.addEventListener('click',onClick);return button;
  }
  function card(item){
    const article=document.createElement('article');article.className='chapter-result chapter-tile';
    const head=document.createElement('div');head.className='chapter-result-head';
    const type=document.createElement('span');type.className='chapter-type';
    const symbol=document.createElement('span');symbol.className='chapter-symbol';
    const icon=document.createElement('i');icon.className=item.type==='subject'?item.icon:'fa-solid '+(icons[item.type]||icons.folder);
    symbol.appendChild(icon);type.append(symbol,document.createTextNode(labels[item.type]||'مورد'));
    head.append(type,textNode('small','chapter-count',(item.children?.length||0)?item.children.length+' عناصر':''));article.append(head);
    article.append(textNode('h3','',item.title));
    article.append(textNode('p','',item.type==='subject'?(item.desc||'اختر المادة لعرض الوحدات والملفات'):
      (item.categoryName||item.subjectName||'مورد من المكتبة')));
    const actions=document.createElement('div');actions.className='chapter-actions';
    actions.append(makeButton(item.type==='subject'?'استكشاف المادة':item.type==='folder'?'فتح الوحدة':'عرض تفاصيل الملف',
      ()=>setRoute(item.subjectId,item.path),'chapter-open'));
    const fav=makeButton(favorites.has(key(item))?'♥':'♡',()=>void setBookmark(item,!favorites.has(key(item))),'chapter-favorite');
    fav.setAttribute('aria-label','حفظ في المفضلة');
    fav.setAttribute('aria-pressed',String(favorites.has(key(item))));
    actions.append(fav);article.append(actions);
    return article;
  }
  function empty(title,message){
    const div=document.createElement('div');div.className='chapter-empty';div.style.gridColumn='1/-1';
    div.append(textNode('h3','',title),textNode('p','',message));return div;
  }
  function crumbs(parents){
    const host=el('chapterBreadcrumbs');if(!host)return;
    host.replaceChildren();
    host.append(makeButton('جميع المواد',()=>setRoute(),'chapter-crumb'));
    for(let i=0;i<parents.length;i++){
      host.append(textNode('span','chapter-crumb-sep','/'));
      host.append(makeButton(parents[i].title,()=>setRoute(parents[i].subjectId,parents[i].path),'chapter-crumb'));
    }
  }
  function detailActions(item,host){
    if(!item.url)return;
    const a=document.createElement('a');
    a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.className='chapter-drive-link';
    a.textContent=item.type==='file'?'فتح الملف في Google Drive':'فتح المجلد الأصلي في Google Drive';
    host.append(a);
  }
  function render(){
    const page=el('page-chapters'),grid=el('chapterResults');if(!page||!grid)return;
    ensureUser();
    const branch=state.branch+':'+state.subBranch;
    if(branchStamp!==branch||!subjects.length){
      rebuild();branchStamp=branch;
      if(!subjects.some(x=>x.id===prefs.subject))prefs.subject='';
    }
    applySelect('chapterSubject',subjects.map(x=>[x.id,x.title]),prefs.subject,'كل المواد');
    const q=el('chapterQuery');
    if(q&&q!==document.activeElement&&q.value!==prefs.query)q.value=prefs.query;
    const sort=el('chapterSort');if(sort)sort.value=prefs.sort;
    document.querySelectorAll('[data-chapter-type]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.chapterType===prefs.type)));
    const favFilter=el('chapterFavFilter');if(favFilter)favFilter.setAttribute('aria-pressed',String(prefs.favoritesOnly));
    grid.replaceChildren();
    const searchMode=Boolean(prefs.query.trim()||prefs.subject||prefs.type!=='all'||prefs.favoritesOnly);
    const {subject,node,parents}=resolveCurrent();
    const detail=Boolean(subject&&!searchMode);
    page.classList.toggle('chapters-detail-mode',detail);
    crumbs(detail?parents:[]);
    const context=el('chapterContext');
    if(context){context.replaceChildren();context.hidden=!detail;}
    const count=el('chapterCount');
    const title=el('chapterSectionTitle');
    let results=[];
    if(detail){
      const back=makeButton('العودة',()=>setRoute(parents.length>1?subject.id:'',parents.length>1?parents[parents.length-2].path:[]),'chapter-back');
      context.append(back,textNode('p','chapter-context-eyebrow',node.type==='subject'?'مسار المواد':node.type==='folder'?'الوحدة التعليمية':'تفاصيل المورد'));
      context.append(textNode('h2','',node.title));
      context.append(textNode('p','chapter-context-desc',node.type==='file'?
        'يمكنك فتح الملف الأصلي للقراءة أو التحميل حسب صلاحيات Google Drive.':
        'استعرض المجلدات والملفات المفهرسة لهذه المادة. لا تُعرض ملفات غير موثقة.'));
      detailActions(node,context);
      if(node.type==='file'){
        results=[];
        grid.append(empty('الملف جاهز للفتح','اضغط على رابط Google Drive أعلاه للوصول إلى الملف الأصلي.'));
      }else results=node.children||[];
      if(title)title.textContent=node.type==='subject'?'وحدات المادة':node.type==='folder'?'ملفات ووحدات المجلد':'تفاصيل الملف';
    }else{
      const indexed=flat.map(item=>({...item,favorite:favorites.has(key(item))}));
      results=searchMode?BacSearch.search(indexed,prefs.query,{
        subject:prefs.subject,type:prefs.type,sort:prefs.sort,favoritesOnly:prefs.favoritesOnly
      }):subjects;
      if(title)title.textContent=searchMode?'نتائج البحث':'اختر مادة للبدء';
    }
    if(count)count.textContent=results.length.toLocaleString('ar-DZ')+' عنصر';
    if(results.length){
      const fragment=document.createDocumentFragment();
      for(const item of results.slice(0,180))fragment.appendChild(card(item));
      grid.append(fragment);
      if(results.length>180)grid.append(empty('نتائج إضافية','تم عرض أول 180 نتيجة؛ استخدم البحث أو الفلاتر لتحديد ما تحتاجه.'));
    }else if(node?.type!=='file'){
      grid.append(empty(detail?'لا توجد ملفات مفهرسة داخل هذا المجلد':'لا توجد نتائج مطابقة',
        detail?'يمكنك فتح المجلد على Google Drive من الزر أعلاه. لا نفترض وجود دروس غير مدرجة في الفهرس.':
          'جرّب اسماً آخر بالعربية أو الفرنسية، أو امسح الفلاتر.'));
      if(!detail){
        const words=BacSearch.suggest(prefs.query,flat);
        const hints=document.createElement('div');hints.className='chapter-suggestions';
        for(const word of words)hints.append(makeButton(word,()=>{prefs.query=word;if(q)q.value=word;render()},'chapter-suggestion'));
        grid.lastChild.append(hints);
      }
    }
  }
  function resetSearch(){
    prefs.query='';prefs.subject='';prefs.type='all';prefs.sort='relevant';prefs.favoritesOnly=false;
    if(el('chapterQuery'))el('chapterQuery').value='';
    render();
  }
  let animationFrame=0;
  el('chapterQuery')?.addEventListener('input',event=>{
    prefs.query=event.target.value;
    cancelAnimationFrame(animationFrame);
    animationFrame=requestAnimationFrame(render);
  });
  el('chapterSubject')?.addEventListener('change',event=>{prefs.subject=event.target.value;render()});
  el('chapterSort')?.addEventListener('change',event=>{prefs.sort=event.target.value;render()});
  document.querySelectorAll('[data-chapter-type]').forEach(button=>button.addEventListener('click',()=>{prefs.type=button.dataset.chapterType;render()}));
  el('chapterFavFilter')?.addEventListener('click',()=>{prefs.favoritesOnly=!prefs.favoritesOnly;render()});
  el('chapterClear')?.addEventListener('click',()=>{resetSearch();setRoute()});
  window.addEventListener('hashchange',()=>{
    if(!location.hash.startsWith('#/chapters'))return;
    if(studentAuthUser&&state.page!=='chapters')showPage('chapters');
    render();
  });
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!event.altKey&&studentAuthUser){
      event.preventDefault();resetSearch();setRoute();el('chapterQuery')?.focus();
    }
  });
  window.renderChapters=()=>{branchStamp='';render()};
  window.openChaptersSubject=id=>{resetSearch();setRoute(id,[])};
  render();
})();