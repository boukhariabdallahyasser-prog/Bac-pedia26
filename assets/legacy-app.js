
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));
    const CONFIG = {
      storageKey: 'bac-portal-deep-ai-v1',
      bacStart: new Date('2027-06-15T08:00:00+01:00'),
      videosCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHVBvdfHx7d-j0LMU8rPXIAxGbf3QQ4WxT_duxZdaZ95w6W8wvF5Kw7OuKh55_cTTeWMdIKpRGIZpL/pub?output=csv',
      mockBacUrl: 'https://drive.google.com/drive/folders/1I_YpIVvGLHMsPYQ97zIQUdFm8fr0Juuk',
      aiMode: 'proxy',
      aiProxyEndpoint: (!location.hostname || location.hostname.endsWith('.github.io') || ['localhost','127.0.0.1'].includes(location.hostname)) ? '' : '/api/ai'
    };
    const pages = [
      ['home','fa-solid fa-house','الرئيسية','واجهة بسيطة بدون تشتيت'],
      ['files','fa-solid fa-folder-open','الملفات','مواد وروابط Drive حسب الشعبة'],
       ['chapters','fa-solid fa-layer-group','الدروس والوحدات','بحث ذكي في المواد والملفات والوحدات'],
      
      ['collaborate','fa-solid fa-briefcase','لوحة المساهم','إدارة مواردي ومقترحاتي'],
      ['admin','fa-solid fa-shield-halved','لوحة الإدارة','الطلبات والموارد والحسابات'],
      ['ai','fa-solid fa-robot','المساعد','شرح وتخطيط وتدريب'],
      ['planner','fa-solid fa-calendar-check','المخطط','مهام وجلسات تركيز'],
      ['grades','fa-solid fa-calculator','المعدل','حاسبة ونصائح'],
      ['progress','fa-solid fa-chart-line','التقدم','نسب ودفتر أخطاء'],
      ['resources','fa-solid fa-book-open','الإضافات','كتب ومنهجيات وفيديوهات'],
      ['help','fa-solid fa-headset','المساعدة','شرح وتواصل']
    ];
    const branches = {
      math:{name:'رياضيات',icon:'fa-solid fa-calculator'},
      science:{name:'علوم تجريبية',icon:'fa-solid fa-flask'},
      tech:{name:'تقني رياضي',icon:'fa-solid fa-gears',subs:{electrical:'هندسة كهربائية',civil:'هندسة مدنية',mechanical:'هندسة ميكانيكية',process:'هندسة الطرائق'},defaultSub:'electrical'},
      literature:{name:'آداب وفلسفة',icon:'fa-solid fa-feather'},
      languages:{name:'لغات أجنبية',icon:'fa-solid fa-globe',subs:{german:'الألمانية',spanish:'الإسبانية',italian:'الإيطالية'}},
      economy:{name:'تسيير واقتصاد',icon:'fa-solid fa-chart-line'}
    };
    const color={math:'linear-gradient(135deg,#6366f1,#4f46e5)',physics:'linear-gradient(135deg,#0ea5e9,#0284c7)',science:'linear-gradient(135deg,#10b981,#059669)',arabic:'linear-gradient(135deg,#14b8a6,#0d9488)',french:'linear-gradient(135deg,#3b82f6,#2563eb)',english:'linear-gradient(135deg,#ef4444,#dc2626)',history:'linear-gradient(135deg,#8b5cf6,#7c3aed)',islamic:'linear-gradient(135deg,#f59e0b,#d97706)',philo:'linear-gradient(135deg,#ec4899,#db2777)',tech:'linear-gradient(135deg,#eab308,#ca8a04)',eco:'linear-gradient(135deg,#22c55e,#16a34a)',law:'linear-gradient(135deg,#a855f7,#9333ea)',special:'linear-gradient(135deg,#f97316,#ea580c)'};
    const allSubjects = {
      math_math:{name:'الرياضيات',icon:'fa-solid fa-square-root-variable',color:color.math,desc:'دروس وتمارين الرياضيات لشعبتي الرياضيات والتقني الرياضي',branches:['math','tech']},
      physics_math:{name:'الفيزياء',icon:'fa-solid fa-atom',color:color.physics,desc:'دروس وتمارين الفيزياء',branches:['math','tech']},
      natural_math:{name:'العلوم الطبيعية',icon:'fa-solid fa-dna',color:color.science,desc:'نفس برنامج العلوم الطبيعية لشعبتي الرياضيات والعلوم التجريبية',branches:['math','science']},
      exams:{name:'اختبارات وفروض',icon:'fa-solid fa-clipboard-list',color:color.special,desc:'اختبارات وفروض للمراجعة',branches:['math','science','tech','literature','languages','economy'],special:true},
      bac_math:{name:'مواضيع البكالوريا',icon:'fa-solid fa-award',color:color.special,desc:'مواضيع البكالوريا الخاصة بشعبة الرياضيات',branches:['math'],special:true},
      mock_bac:{name:'بكالوريات تجريبية',icon:'fa-solid fa-file-circle-check',color:'linear-gradient(135deg,#06b6d4,#3b82f6)',desc:'بكالوريات تجريبية لشعبتي الرياضيات والعلوم التجريبية',branches:['math','science'],special:true},
      summaries_math:{name:'الملخصات',icon:'fa-solid fa-file-lines',color:color.special,desc:'ملخصات جميع مواد الرياضيات',branches:['math'],special:true},
      summaries_science:{name:'الملخصات',icon:'fa-solid fa-file-lines',color:color.special,desc:'ملخصات العلوم التجريبية',branches:['science'],special:true},
      summaries_tech:{name:'الملخصات',icon:'fa-solid fa-file-lines',color:color.special,desc:'ملخصات ودروس الهندسة الكهربائية',branches:['tech'],subBranches:['electrical'],special:true},
      summaries_lit:{name:'الملخصات',icon:'fa-solid fa-file-lines',color:color.special,desc:'ملخصات الآداب والفلسفة',branches:['literature'],special:true},
      summaries_lang:{name:'الملخصات',icon:'fa-solid fa-file-lines',color:color.special,desc:'ملخصات اللغات الأجنبية',branches:['languages'],special:true},
      summaries_eco:{name:'الملخصات',icon:'fa-solid fa-file-lines',color:color.special,desc:'ملخصات التسيير والاقتصاد',branches:['economy'],special:true},
      math_science:{name:'الرياضيات',icon:'fa-solid fa-square-root-variable',color:color.math,desc:'رياضيات شعبة العلوم',branches:['science']},
      natural_science:{name:'العلوم الطبيعية',icon:'fa-solid fa-dna',color:color.science,desc:'مرادف قديم للعلوم الطبيعية المشتركة؛ يستخدم natural_math لتجنب تكرار المادة',branches:[]},
      physics_science:{name:'الفيزياء',icon:'fa-solid fa-atom',color:color.physics,desc:'فيزياء شعبة العلوم',branches:['science']},
      math_tech:{name:'الرياضيات',icon:'fa-solid fa-calculator',color:color.math,desc:'مرادف قديم؛ يستخدم math_math لبرنامج الرياضيات المشترك مع التقني الرياضي',branches:[]},
      tech_subject:{name:'الهندسة الكهربائية',icon:'fa-solid fa-bolt',color:color.tech,desc:'ملفات ودروس الهندسة الكهربائية المتاحة من مجلد تقني مستقل',branches:['tech'],subBranches:['electrical']},
      philo_tech:{name:'الفلسفة',icon:'fa-solid fa-brain',color:color.philo,desc:'مرادف قديم؛ تستخدم الفلسفة المشتركة للشعب العلمية والتقنية',branches:[]},
      arabic_lit:{name:'اللغة العربية',icon:'fa-solid fa-pen-nib',color:color.arabic,desc:'لغة عربية للشعب الأدبية',branches:['literature','languages','economy']},
      french_lit:{name:'اللغة الفرنسية',icon:'fa-solid fa-comment-dots',color:color.french,desc:'فرنسية للشعب الأدبية',branches:['literature','languages','economy']},
      english_lit:{name:'اللغة الإنجليزية',icon:'fa-solid fa-language',color:color.english,desc:'إنجليزية للشعب الأدبية',branches:['literature','languages','economy']},
      history_lit:{name:'التاريخ والجغرافيا',icon:'fa-solid fa-earth-africa',color:color.history,desc:'تاريخ وجغرافيا للشعب الأدبية',branches:['literature','languages','economy']},
      philo_lit:{name:'الفلسفة',icon:'fa-solid fa-brain',color:color.philo,desc:'فلسفة آداب وفلسفة',branches:['literature']},
      math_lit:{name:'الرياضيات',icon:'fa-solid fa-square-root-variable',color:color.math,desc:'رياضيات للشعب الأدبية',branches:['literature','languages']},
      philo_lang:{name:'الفلسفة',icon:'fa-solid fa-brain',color:color.philo,desc:'فلسفة شعبة اللغات',branches:['languages']},
      third_lang:{name:'اللغة الثالثة',icon:'fa-solid fa-comments',color:color.english,desc:'لغة أجنبية ثالثة',branches:['languages']},
      economy_subject:{name:'التسيير والاقتصاد',icon:'fa-solid fa-coins',color:color.eco,desc:'تسيير محاسبي واقتصاد',branches:['economy']},
      math_eco:{name:'الرياضيات',icon:'fa-solid fa-square-root-variable',color:color.math,desc:'رياضيات الاقتصاد',branches:['economy']},
      law:{name:'القانون',icon:'fa-solid fa-scale-balanced',color:color.law,desc:'مادة القانون',branches:['economy']},
      arabic_sci:{name:'اللغة العربية',icon:'fa-solid fa-pen-nib',color:color.arabic,desc:'لغة عربية للشعب العلمية',branches:['math','science','tech']},
      french_sci:{name:'اللغة الفرنسية',icon:'fa-solid fa-comment-dots',color:color.french,desc:'لغة فرنسية للشعب العلمية',branches:['math','science','tech']},
      english_sci:{name:'اللغة الإنجليزية',icon:'fa-solid fa-language',color:color.english,desc:'لغة إنجليزية للشعب العلمية',branches:['math','science','tech']},
      history_sci:{name:'التاريخ والجغرافيا',icon:'fa-solid fa-earth-africa',color:color.history,desc:'تاريخ وجغرافيا للشعب العلمية',branches:['math','science','tech']},
      islamic:{name:'العلوم الإسلامية',icon:'fa-solid fa-book-quran',color:color.islamic,desc:'علوم إسلامية لكل الشعب',branches:['math','science','tech','literature','languages','economy']},
      philo_sci:{name:'الفلسفة',icon:'fa-solid fa-brain',color:color.philo,desc:'الفلسفة المشتركة لشعب الرياضيات والعلوم والتقني الرياضي',branches:['math','science','tech']}
    };
    const backupUrls = {
      math_math:'https://drive.google.com/drive/folders/1h17a3knJEm7tCtge6hKsEJUSLjjL9_Yn',
      physics_math:'https://drive.google.com/drive/folders/1t8fEvl5ykjz7nEHxI6R_nCNEQEAugnUG?usp=sharing',
      natural_math:'https://drive.google.com/drive/folders/1I8pHfNKXnKGHSinpfcBW6d15EBH1t_Y5',
      exams:'https://drive.google.com/drive/folders/1c4M8-KO3nlfXQpUP1OH1r06QTT3sKcnT',
      bac_math:'https://drive.google.com/drive/folders/1SjNXx1mCJu0thDcpO-6IIMc1s40pEeIi',
      summaries_math:'https://drive.google.com/drive/folders/1yFiKLG7mCGo1Nx6HyIeakImgtAmqW65n?usp=drive_link',
      tech_subject:'https://drive.google.com/drive/folders/1TVa3lzCYwaAvOtae70djh8ItmjCQxTeC',
      arabic_sci:'https://drive.google.com/drive/folders/19AivMFVhb1OQ-nh0VtlcgUdJXBkfXzgQ',
      french_sci:'https://drive.google.com/drive/folders/1tQj-slGIMVtKZunffDMyurGJTkr5zMsN',
      english_sci:'https://drive.google.com/drive/folders/1WJ1PaXDzYSltJ-NrKQ1qCwiJww-val7C',
      history_sci:'https://drive.google.com/drive/folders/1tLu0szIITFfyR5PKPRWDgpgudsYVQf8f',
      islamic:'https://drive.google.com/drive/folders/1ZR_c-30rYN_OJMkQALbBSikj5Ha4X_Pk',
      philo_sci:'https://drive.google.com/drive/folders/1L75LG5nmNI2Ymktq3N2fqo2CAkTof9ZA',
      mock_bac:CONFIG.mockBacUrl
    };
    const coefTemplates = {
      math:[['الرياضيات',7],['الفيزياء',6],['العلوم الطبيعية',2],['العربية',3],['الفرنسية',2],['الإنجليزية',2],['الفلسفة',2],['التاريخ والجغرافيا',2],['العلوم الإسلامية',2]],
      science:[['العلوم الطبيعية',6],['الفيزياء',5],['الرياضيات',5],['العربية',3],['الفرنسية',2],['الإنجليزية',2],['الفلسفة',2],['التاريخ والجغرافيا',2],['العلوم الإسلامية',2]],
      tech:[['التكنولوجيا',7],['الرياضيات',6],['الفيزياء',6],['العربية',3],['الفرنسية',2],['الإنجليزية',2],['الفلسفة',2],['التاريخ والجغرافيا',2],['العلوم الإسلامية',2]],
      literature:[['اللغة العربية',6],['الفلسفة',6],['التاريخ والجغرافيا',4],['الفرنسية',3],['الإنجليزية',3],['الرياضيات',2],['العلوم الإسلامية',2]],
      languages:[['العربية',5],['الفرنسية',5],['الإنجليزية',5],['اللغة الثالثة',4],['الفلسفة',2],['التاريخ والجغرافيا',2],['العلوم الإسلامية',2]],
      economy:[['التسيير المحاسبي',6],['الاقتصاد',5],['القانون',3],['الرياضيات',5],['العربية',3],['الفرنسية',2],['الإنجليزية',2],['التاريخ والجغرافيا',2],['العلوم الإسلامية',2]]
    };
    const agents = {
      smart_tutor:{icon:'fa-solid fa-comments',title:'شرح',group:'فهم',desc:'شرح السؤال خطوة بخطوة مع مثال.'},
      summarizer:{icon:'fa-solid fa-align-left',title:'تلخيص',group:'فهم',desc:'ملخص واضح مع كلمات مفتاحية.'},

      quiz:{icon:'fa-solid fa-circle-question',title:'اختبار',group:'تدريب',desc:'اختبار قصير مع التصحيح.'},
      qcm:{icon:'fa-solid fa-list-ol',title:'اختيارات',group:'تدريب',desc:'أسئلة اختيار من متعدد.'},
      mock_exam:{icon:'fa-solid fa-file-pen',title:'محاكاة',group:'تدريب',desc:'تدريب امتحان بتوقيت وتصحيح.'},
      daily_plan:{icon:'fa-solid fa-sun',title:'خطة',group:'تنظيم',desc:'خطة مراجعة حسب وقتك.'},
      mistake_analyzer:{icon:'fa-solid fa-magnifying-glass-chart',title:'الأخطاء',group:'تنظيم',desc:'تحليل الأخطاء وطريقة علاجها.'},
      grade_advisor:{icon:'fa-solid fa-chart-simple',title:'المعدل',group:'تنظيم',desc:'أولوية المواد حسب العلامات.'},
      essay_coach:{icon:'fa-solid fa-pen-fancy',title:'المقال واللغات',group:'فهم',desc:'قوالب كتابة وحجج وروابط.'}
    };
    const resources = [
      ['♾️','الرياضيات',['الأستاذ نور الدين - كتاب','المغني - كتاب','مجلة الرائد','طريقة فعالة: درس مختصر ثم 12 تمرين متدرج ثم تصحيح الأخطاء']],
      ['⚛️','العلوم الفيزيائية',['المغني - كتاب','تأشيرة النجاح','الحقيبة العلمية للأستاذ عقبة بن نافع','قاعدة الحل: معطيات، تحويل وحدات، قانون، تطبيق، تعليل']],
      ['🧬','العلوم الطبيعية',['منهجية تحليل الوثائق','استنتاجات قصيرة ودقيقة','ربط الوثائق بالمكتسبات','رسومات تخطيطية منظمة']],
      ['🌏','التاريخ والجغرافيا',['السلسلة الخضراء - بورنان عمار','المراجعة السريعة - محمودي عادل','خط زمني + أسباب ونتائج + مصطلحات']],
      ['🗽','الفلسفة',['خليل سعيداني - الحجج والأقوال','هبة جبابرية - كتاب','مقدمة / أطروحة / نقيض / تركيب / خاتمة']],
      ['🇺🇸','اللغة الإنجليزية',['ناصر منصوري - كتاب','ناصري - كتاب','Paragraph: topic sentence + arguments + example + conclusion']],
      ['🇫🇷','اللغة الفرنسية',['المراجعة النهائية','منير شبوة - كتاب','Production écrite: intro + arguments + conclusion']],
      ['📖','الأدب العربي',['النوابغ - حيّقون أسامة','المراجعة النهائية في العربية','خالد حماش - كتاب']],
      ['🕌','العلوم الإسلامية',['الأستاذة بوسعادي - كتاب','الأستاذ شمس الدين - كتاب','بطاقات حفظ للآيات والأحاديث مع المعاني']],
      ['📗','الهندسة التقنية',['الهندسة الكهربائية: مجلد مستقل يحتوي على ملخصات ودروس ومواضيع وتمارين وكتب موثقة','الهندسة المدنية: لا توجد موارد Drive موثقة حالياً','الهندسة الميكانيكية: لا توجد موارد Drive موثقة حالياً','هندسة الطرائق: لا توجد موارد Drive موثقة حالياً']],
      ['🎬','فيديوهات تعليمية',[]]
    ];
    const defaultVideos = [{title:'كيفية المراجعة الفعّالة',url:''},{title:'إدارة الوقت قبل البكالوريا',url:''},{title:'تقنيات الحفظ السريع',url:''},{title:'التحكم في التوتر والقلق',url:''},{title:'إعداد جدول مراجعة',url:''},{title:'نصائح أيام الامتحان',url:''}];
    // Do not hydrate student state from a shared browser key before authentication.
    let state = {page:'home',branch:'math',subBranch:null,filter:'all',sort:'default',favorites:[],progress:{},tasks:[],mistakes:[],theme:'dark',focusDone:0,grades:null,aiHistory:[],aiProfile:{goals:[],weaknesses:[],preferredStyle:'منظم وواضح',lastUpdated:null},user:null,guest:false};
    // Always start the website on the Mathematics branch when the page launches.
    // The student can still change branch normally from the sidebar during the session.
    state.branch='math';
    state.subBranch=null;
    state.filter='all';
    state.sort='default';
    if(!Array.isArray(state.grades) || !state.grades.length || !state.grades.some(g=>g.name==='الرياضيات' && Number(g.coef)===7)){
      state.grades=coefTemplates.math.map(([name,coef])=>({name,coef,mark:10}));
    }
    if(!state.aiProfile)state.aiProfile={goals:[],weaknesses:[],preferredStyle:'منظم وواضح',lastUpdated:null};
    if(state.progress)Object.keys(state.progress).forEach(id=>{if(allSubjects[id]?.special)delete state.progress[id];});
    if(branches[state.branch]?.subs && !state.subBranch) state.subBranch=Object.keys(branches[state.branch].subs)[0];
    let currentModalSubject=null, activeAgent='smart_tutor', focusTimer=null, focusTotal=0, focusLeft=0, loadedVideos=defaultVideos;
    let cloudSaveTimer=null;
    function userStorageKey(userId){return `${CONFIG.storageKey}:student:${userId}`;}
    function resetStudentData(){
      state.branch='math';state.subBranch=null;state.filter='all';state.sort='default';
      state.progress={};state.tasks=[];state.mistakes=[];state.favorites=[];state.focusDone=0;state.aiHistory=[];
      state.aiProfile={goals:[],weaknesses:[],preferredStyle:'منظم وواضح',lastUpdated:null};
      state.grades=coefTemplates.math.map(([name,coef])=>({name,coef,mark:10}));
    }
    function applyStudentData(saved){
      if(!saved||typeof saved!=='object')return;
      for(const key of ['branch','subBranch','progress','tasks','mistakes','grades','favorites','focusDone','aiProfile','theme','aiHistory'])if(Object.prototype.hasOwnProperty.call(saved,key))state[key]=saved[key];
    }
    function saveState(){
      const snapshot={...state,user:null,guest:false};
      if(studentAuthUser?.id){try{localStorage.setItem(userStorageKey(studentAuthUser.id),JSON.stringify(snapshot));}catch(error){console.warn('Private local cache unavailable:',error);}}
      if(typeof renderHomeSummary==='function')renderHomeSummary();
      if(studentAuth&&studentAuthUser){clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(()=>syncStudentProgress(),1100);}
    }

    function escapeHtml(t){return String(t??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
    function normalize(s){return String(s||'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').trim();}
    function subjectLabel(id,sub=allSubjects[id]){if(!sub)return''; if(id==='third_lang'&&state.subBranch)return({german:'اللغة الألمانية',spanish:'اللغة الإسبانية',italian:'اللغة الإيطالية'}[state.subBranch]||sub.name); if(id==='tech_subject'&&state.subBranch)return({civil:'الهندسة المدنية',electrical:'الهندسة الكهربائية',mechanical:'الهندسة الميكانيكية',process:'هندسة الطرائق'}[state.subBranch]||sub.name); return sub.name;}
    function subjectDesc(id,sub=allSubjects[id]){if(id==='third_lang'&&state.subBranch)return'دروس وتمارين '+subjectLabel(id,sub); if(id==='tech_subject'&&state.subBranch)return'ملفات ودروس '+subjectLabel(id,sub); return sub?.desc||'';}
    function getSubjects(){return Object.entries(allSubjects).filter(([id,s])=>s.branches.includes(state.branch)&&(!Array.isArray(s.subBranches)||s.subBranches.includes(state.subBranch))).map(([id,s])=>({id,...s,name:subjectLabel(id,s),desc:subjectDesc(id,s)}));}
    function getNormalSubjects(){return getSubjects().filter(s=>!s.special);}
    function getResourceItems(){return getSubjects().filter(s=>s.special);}
    function isStudySubjectId(id){const s=id&&allSubjects[id];return !!(s&&!s.special&&s.branches.includes(state.branch)&&(!Array.isArray(s.subBranches)||s.subBranches.includes(state.subBranch)));}
    function studyProgress(){const out={};getNormalSubjects().forEach(s=>{out[s.id]=Number(state.progress[s.id]||0)});return out;}
    function cleanSpecialProgress(){Object.keys(state.progress||{}).forEach(id=>{if(allSubjects[id]?.special)delete state.progress[id];});}
    function currentSubject(){
      const id=$('#aiSubject')?.value;
      if(isStudySubjectId(id))return {id,...allSubjects[id],name:subjectLabel(id),desc:subjectDesc(id)};
      return getNormalSubjects()[0]||null;
    }
    let resourceManifest=null;
    function applyBackupUrls(){Object.entries(backupUrls).forEach(([id,url])=>{if(allSubjects[id])allSubjects[id].url=url||null;});applyCanonicalDriveLinks();}
    function isDriveResourceUrl(value){
      try{const u=new URL(value);return u.protocol==='https:'&&['drive.google.com','docs.google.com'].includes(u.hostname)&&/^\/(drive\/folders\/|file\/d\/|document\/d\/|spreadsheets\/d\/|presentation\/d\/)/.test(u.pathname);}
      catch{return false;}
    }
    async function loadResourceManifest(){
      try{
        const response=await fetch('./resources.json',{cache:'no-store'});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const data=await response.json();
        if(data.schemaVersion!==1||!data.subjects||typeof data.subjects!=='object')throw new Error('Invalid resource manifest');
        for(const [id,item] of Object.entries(data.subjects)){
          if(!allSubjects[id]||!item)continue;
          if(Array.isArray(item.branches))allSubjects[id].branches=[...item.branches];
          if(Array.isArray(item.subBranches))allSubjects[id].subBranches=[...item.subBranches];
          if(isDriveResourceUrl(item.url))allSubjects[id].url=item.url;
        }
        resourceManifest=data;renderAll();if(typeof window.renderChapters==='function')window.renderChapters();return true;
      }catch(error){console.warn('Resource manifest unavailable; using embedded fallback links.',error);applyBackupUrls();renderAll();return false;}
    }
    function parseCsv(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i],nx=text[i+1];if(ch==='"'&&q&&nx==='"'){cell+='"';i++;}else if(ch==='"'){q=!q;}else if(ch===','&&!q){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!q){if(cell||row.length){row.push(cell);rows.push(row);row=[];cell='';}if(ch==='\r'&&nx==='\n')i++;}else cell+=ch;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
    function parsePubHtml(text){const doc=new DOMParser().parseFromString(text,'text/html');const table=doc.querySelector('table');if(!table)return[];return Array.from(table.querySelectorAll('tr')).map(tr=>Array.from(tr.children).map(td=>td.textContent.trim())).filter(r=>r.length);}
    async function refreshFromDatabase(show=false){const ok=await loadResourceManifest();if(show)showToast(ok?'تم تحديث قائمة الموارد من الفهرس المحلي':'تعذر تحميل فهرس الموارد','info');return ok;}
    function showPage(id){
      if(!studentAuthUser){openLoginGate();return;}
      const role=window.BAC_PORTAL_ROLE||'student';
      const expected=role==='admin'?'admin':(role==='contributor'||role==='applicant')?'contributor':'student';
      // Navigation is a real route, not an attempt to reveal another role's
      // section in the wrong document.
      if(document.body.dataset.portal!==expected){
        window.location.replace('/'+expected+'/');
        return;
      }
      const allowed=role==='admin'?['admin']:['contributor','applicant'].includes(role)?['collaborate']:
        ['home','files','chapters','ai','planner','grades','progress','resources','help'];
      if(!allowed.includes(id))id=allowed[0];
      if(id==='files'){
        state.filter='all';
        state.sort='default';
        const search=$('#searchInput');
        if(search)search.value='';
      }
      state.page=id;
      saveState();
      $$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+id));
      const p=pages.find(x=>x[0]===id);
      if($('#pageTitle'))$('#pageTitle').textContent=p[2];
      if($('#pageSubtitle'))$('#pageSubtitle').textContent=p[3];
      renderNavs();
      closeSidebarMobileOnly();
      scrollTo({top:0,behavior:'smooth'});
      if(id==='files'){
        renderFilters();
        renderSubjects();
        updateFilesSubtitle();
        const allChip=[...document.querySelectorAll('#fileFilters .chip')].find(x=>x.textContent.trim()==='الكل');
        if(allChip){allChip.classList.add('flash-focus');setTimeout(()=>allChip.classList.remove('flash-focus'),750);}
      }
      if(id==='grades')renderGrades();
      if(id==='progress')renderProgress();
      if(id==='resources')renderResources();
       if(id==='chapters' && typeof window.renderChapters==='function')window.renderChapters();
      if(id==='ai'){renderAiSelectors();renderAgents();}
      
      if(id==='collaborate')window.renderCommunity?.();
      if(id==='admin')window.renderAdmin?.();
      if(id==='files')window.renderApprovedResources?.();
    }
    function openFilesAll(){
      state.filter='all';
      state.sort='default';
      const search=$('#searchInput');
      if(search)search.value='';
      saveState();
      showPage('files');
    }
    function updateFilesSubtitle(){
      const el=$('#filesSubtitle');
      if(!el)return;
      const branch=branches[state.branch]?.name || '';
      const sub=branches[state.branch]?.subs?.[state.subBranch];
      const suffix=sub ? ` - ${sub}` : '';
      const availabilityNote=state.branch==='tech'&&state.subBranch!=='electrical'?' — لا توجد حالياً موارد Drive موثقة لهذا التخصص':'';
      el.textContent=`يعرض الآن: الكل حسب شعبة ${branch}${suffix}${availabilityNote}.`;
    }
    function renderNavs(){
      const role=window.BAC_PORTAL_ROLE||'student';
      const allowed=role==='admin'?['admin']:['contributor','applicant'].includes(role)?['collaborate']:
        ['home','chapters','files','ai','planner','grades','progress','resources','help'];
      const visible=pages.filter(item=>allowed.includes(item[0]));
      const action=p=>p[0]==='files'?'openFilesAll()':`showPage('${p[0]}')`;
      const make=p=>`<button class="nav-btn ${state.page===p[0]?'active':''}" onclick="${action(p)}" aria-current="${state.page===p[0]?'page':'false'}"><span class="nav-icon"><i class="${p[1]}"></i></span><span class="nav-label"><strong>${p[2]}</strong><small>${p[3]}</small></span><i class="fa-solid fa-chevron-left nav-chevron"></i></button>`;
      $('#sideNav').innerHTML=visible.map(make).join('');
      const bottom=role==='student'?visible.filter(p=>['home','chapters','files','ai'].includes(p[0])):visible;
      $('#bottomNav').innerHTML=bottom.map(p=>`<button class="${state.page===p[0]?'active':''}" onclick="${action(p)}"><i class="${p[1]}"></i><span>${p[2]}</span></button>`).join('')+
        `<button onclick="openSidebar()"><i class="fa-solid fa-bars"></i><span>المزيد</span></button>`;
      const nonStudent=role!=='student';
      for(const id of ['sidebarBranches','sidebarStudyStats','sidebarAIBtn']){
        const element=document.getElementById(id);if(element)element.hidden=nonStudent;
      }
      const roleLabel=$('#sidebarRoleLabel');if(roleLabel)roleLabel.textContent=
        role==='admin'?'المالك':role==='contributor'?'مساهم معتمد':role==='applicant'?'طلب مساهمة':'طالب بكالوريا';
    }
        function isMobileSidebar(){return window.matchMedia('(max-width:980px)').matches;}
    function isSidebarVisible(){
      const s=$('#sidebar');
      return isMobileSidebar() ? !!(s&&s.classList.contains('show')) : !document.body.classList.contains('sidebar-collapsed');
    }
    function updateSidebarButton(){
      const btn=document.querySelector('.sidebar-toggle'), s=$('#sidebar');
      if(!btn||!s)return;
      const open=isSidebarVisible();
      const icon=btn.querySelector('i');
      if(icon)icon.className=open?'fa-solid fa-xmark':'fa-solid fa-bars-staggered';
      btn.setAttribute('aria-expanded',open?'true':'false');
      btn.setAttribute('title',open?'إغلاق القائمة':'فتح القائمة');
      btn.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');
    }
    function toggleSidebar(){
      isSidebarVisible() ? closeSidebar() : openSidebar();
    }
    function openSidebar(focusBranch=false){
      const s=$('#sidebar'),o=$('#sidebarOverlay');
      if(!s)return;
      if(!isMobileSidebar()){
        document.body.classList.remove('sidebar-collapsed','sidebar-open');
        if(o)o.classList.remove('show');
        s.classList.remove('show');
        s.classList.add('flash-focus');
        setTimeout(()=>s.classList.remove('flash-focus'),800);
        if(focusBranch){
          const branchBox=$('#branchGrid');
          if(branchBox)branchBox.scrollIntoView({behavior:'smooth',block:'center'});
        }
        updateSidebarButton();
        return;
      }
      s.classList.add('show');
      if(o)o.classList.add('show');
      document.body.classList.add('sidebar-open');
      document.body.classList.remove('sidebar-collapsed');
      updateSidebarButton();
    }
    function closeSidebar(){
      const s=$('#sidebar'),o=$('#sidebarOverlay');
      if(!isMobileSidebar()){
        document.body.classList.add('sidebar-collapsed');
        document.body.classList.remove('sidebar-open');
        if(o)o.classList.remove('show');
        if(s)s.classList.remove('show');
        updateSidebarButton();
        return;
      }
      if(s)s.classList.remove('show');
      if(o)o.classList.remove('show');
      document.body.classList.remove('sidebar-open');
      updateSidebarButton();
    }
    function closeSidebarMobileOnly(){ if(isMobileSidebar()) closeSidebar(); else updateSidebarButton(); }
    window.addEventListener('resize',()=>{
      if(!isMobileSidebar()) closeSidebar();
      else updateSidebarButton();
    });
    function renderBranches(){
      $('#branchGrid').innerHTML=Object.entries(branches).map(([id,b])=>`<button class="branch-btn ${state.branch===id?'active':''}" onclick="selectBranch('${id}')"><i class="${b.icon}"></i><span>${b.name}</span></button>`).join('');
      const b=branches[state.branch];
      $('#subBranchRow').innerHTML=b.subs?Object.entries(b.subs).map(([id,label])=>{
        const status=state.branch==='tech'?`<small class="sub-branch-status ${id==='electrical'?'is-available':'is-unavailable'}">${id==='electrical'?'موارد متاحة':'لا توجد موارد'}</small>`:'';
        return `<button class="chip ${state.subBranch===id?'active':''}" onclick="selectSubBranch('${id}')"><span>${label}</span>${status}</button>`;
      }).join(''):'';
      const note=$('#subBranchAvailabilityNote');
      if(note){
        const isTech=state.branch==='tech';
        note.hidden=!isTech;
        note.textContent=!isTech?'':state.subBranch==='electrical'?'تم ربط مجلد مستقل يحتوي على موارد الهندسة الكهربائية.':'لا يوجد مجلد موارد موثّق لهذا التخصص في Google Drive حالياً؛ لن تظهر له مواد على أنها متاحة.';
        note.classList.toggle('is-available',isTech&&state.subBranch==='electrical');
        note.classList.toggle('is-unavailable',isTech&&state.subBranch!=='electrical');
      }
      $('#homeBranchKicker').textContent='شعبة '+branches[state.branch].name;
      updateFilesSubtitle();
    }
    function selectBranch(id){state.branch=id;state.subBranch=branches[id].subs?(branches[id].defaultSub||Object.keys(branches[id].subs)[0]):null;state.grades=coefTemplates[id].map(([name,coef])=>({name,coef,mark:10}));saveState();renderAll();showToast('تم اختيار '+branches[id].name,'success');if(!branches[id].subs || window.matchMedia('(max-width:980px)').matches)closeSidebar();}
    function selectSubBranch(id){state.subBranch=id;saveState();renderAll();showToast('تم اختيار '+(branches[state.branch].subs?.[id]||''),'success');closeSidebar();}
    function renderFilters(){const filters=[['all','الكل'],['available','متاحة'],['preparing','قيد التحضير'],['favorites','المفضلة'],['special','موارد عامة']];$('#fileFilters').innerHTML=filters.map(f=>`<button class="chip ${state.filter===f[0]?'active':''}" onclick="state.filter='${f[0]}';saveState();renderSubjects();renderFilters()">${f[1]}</button>`).join('');$('#sortSelect').value=state.sort||'default';}
    function renderSubjects(){const q=normalize($('#searchInput')?.value||'');let list=getSubjects().filter(s=>!q||normalize(s.name+' '+s.desc+' '+s.id).includes(q));if(state.filter==='available')list=list.filter(s=>!!s.url);if(state.filter==='preparing')list=list.filter(s=>!s.url);if(state.filter==='favorites')list=list.filter(s=>state.favorites.includes(s.id));if(state.filter==='special')list=list.filter(s=>s.special);if(state.sort==='available')list.sort((a,b)=>(!!b.url)-(!!a.url));if(state.sort==='progress')list.sort((a,b)=>((a.special?1:0)-(b.special?1:0)) || ((state.progress[a.id]||0)-(state.progress[b.id]||0)));if(state.sort==='az')list.sort((a,b)=>a.name.localeCompare(b.name,'ar'));$('#subjectsGrid').innerHTML=list.map(subjectCard).join('');$('#noResults').classList.toggle('hide',!!list.length);renderStats();renderAiSelectors();renderFavoritesMini();updateFilesSubtitle();}
    function subjectCard(s){
      const fav=state.favorites.includes(s.id),ok=!!s.url,isResource=!!s.special,prog=isResource?0:(state.progress[s.id]||0);
      const progressHtml=isResource?'':`<div class="year-progress" style="margin:0 0 12px"><span style="width:${prog}%"></span></div>`;
      const typeText=isResource?'مورد عام':`${prog}% تقدم`;
      return`<article class="card subject-card ${isResource?'resource-card':''}" style="--accent-grad:${s.color}" onclick="openSubjectById('${s.id}')"><div class="subject-top"><div class="subject-icon"><i class="${s.icon}"></i></div><div class="subject-actions"><button class="round-btn ${fav?'active':''}" onclick="event.stopPropagation();toggleFavorite('${s.id}')"><i class="${fav?'fa-solid':'fa-regular'} fa-heart"></i></button><button class="round-btn" onclick="event.stopPropagation();shareSubject('${s.id}')"><i class="fa-solid fa-share-nodes"></i></button></div></div><div class="subject-name">${escapeHtml(s.name)}</div><p class="subject-desc">${escapeHtml(s.desc)}</p>${progressHtml}<div class="subject-footer"><span class="badge ${ok?'ok':'wait'}">${ok?'متاحة':'قيد التحضير'}</span><span class="soft">${typeText}</span></div></article>`;
    }
    const canonicalDriveFolders={"math_math":["1h17a3knJEm7tCtge6hKsEJUSLjjL9_Yn",[["مواضيع مراقبة المستوى","1EZ-Zkw3vgmB5vhxpECNmkCEjU3-RTy4g"],["مواضيع فصلية","1-fHMd5uhzr-KH_6Mtz75_Qn1MKAzI6iW"],["المراجعة النهائية","1cJNP4XumNHXqSN2sGLn3Oz3fnC_0zl60"],["المكتسبات القبلية","1XU50VMyN922zQTHGbA6yBNH6JeTwo5jk"],["المتتاليات","1Yu0rLOV3gnMOARG45iiNMSfIvwAw9Aiz"],["القسمة في زاد","1Q20aTa4ux6VK-CPWUmSjQgZ1mEmBEpfo"],["الدوال","1UsAaU7MGp8XKy1rae3fjeuKmEmW4_BOp"],["الاحتمالات","1ktdbUzujqY8mDLIwDYO7MwXB6LI5lZUu"],["الأعداد المركبة","1ex4wJN74-Mvyx6Y4JkJcNJCJbdPJztEh"]]],"french_sci":["1tQj-slGIMVtKZunffDMyurGJTkr5zMsN",[["دروس","11UjJzruGDNXKoPMwnBV31O23x3CZ70CM"],["مواضيع وتمارين","16EFEC71B81BpRy1nrazmGk32s8PFEMJH"],["مصطلحات","1romBTaen8j1T7CvPPgp-xDIV8yG2AD3q"],["المراجعة النهائية","10YWG5icnEK7Um4iIlnh5xNrggRLUOJsB"]]],"arabic_sci":["19AivMFVhb1OQ-nh0VtlcgUdJXBkfXzgQ",[["المراجعة النهائية","1nmG088y658tdbXtLpsjMt79lRK-dRdbs"],["دروس","1slZlL_kRKQd8fEP53wN6W4DfpwJPZ3mk"],["تطبيقات ومواضيع","1MEC1tGDzysM9kCAOBO6boC8tsKZkY0pM"]]],"english_sci":["1WJ1PaXDzYSltJ-NrKQ1qCwiJww-val7C",[["Paragraphs","1qwB0TkFMSAOj5C__4jxuUmF827vUnU7Y"],["مصطلحات","1lXEz-oKTOGaSND5ihJ5na1DsDCC44lgO"],["مواضيع وتمارين","12uxtTP4Vl6AYuwM6s49Sbvb71pAj2fl7"],["دروس","18Wv7u5XWQHgUpVaqZsDO7OyGZAgVd2RM"]]],"natural_math":["1I8pHfNKXnKGHSinpfcBW6d15EBH1t_Y5",[["نصوص علمية وملفات","13M7tPzxRcng3c1XpO-BXG_ti_zlmV481"],["المراجعة النهائية","10A7kMdypYonqfTIzzzom6ZfTOQKYWXBn"],["منهجية","1SoRGUTqSoGMtAXEFO47iDhJNms8wwCzY"],["تمارين + بكالوريات","19ygI6EN2AKOgNVKtalp7y7tKKUXRqLs5"]]],"philo_sci":["1L75LG5nmNI2Ymktq3N2fqo2CAkTof9ZA",[["مقالات فلسفية","1dXQhrcFALjqCkql3OuahzexX5yFzGHuK"],["الدروس","1-NjNZcWC0hZkoLLzUq23cgEXrfYH7q1T"]]],"islamic":["1ZR_c-30rYN_OJMkQALbBSikj5Ha4X_Pk",[["المراجعة النهائية","1WNSLXbprV__yMqqNLHdMWcO2e7r67QIT"],["ملخصات ودروس PDF","1_MVnd4jCdHutVO5YhYXc_JNTdwA3vOMT"],["الدروس","1OHMj2ks5L3ZRXSrP09SDYBIpbLXcMK1A"],["التطبيقات والتمارين","19hdtiqy_sNvkcB--i-L8073ZzPVQK55p"]]],"history_sci":["1tLu0szIITFfyR5PKPRWDgpgudsYVQf8f",[["المراجعة النهائية","1rrTYVzlFu9l0CL0avHyicAVTI0jS0c8A"],["منهجية","1wsQ-etobu9RD2Nhn2OmRl_MM_3ER5wVY"],["ملخصات ودروس PDF","1Af7xDwzpoS0kL192-9v_o_UuddQo3pvo"],["الدروس","1U6mM8O7Uu06fTnax_IMTXuVXPWVrD5T9"],["التطبيقات والتمارين","1feuHg5KVM2Pb8xy21KkKfcUp-g6AYiUh"]]],"bac_math":["1SjNXx1mCJu0thDcpO-6IIMc1s40pEeIi",[["الرياضيات","1Tq_St4xP9sa3tvn7qqbgGQ_MH-dw5K6B"],["الاجتماعيات","1Hw4lukCZLjY0PmBKMqMDFV9MkL-fSrkc"],["الإنجليزية","1HJqOCkG1vWZl7BUOAmhJQH1uWbsZePqv"],["الشريعة","1j1kAsuGwZ1LXUzyHPLs5LbyqZQxKx-fH"],["العربية","1BjjCIrgKwKti3da2yvrFdPPjujEdGbyW"],["الفيزياء","1D49IbxTn4Nd30P9KyCvnaNNSloJjtgTy"],["العلوم الطبيعية","1rBv00DEbiItKvMmTHTvIxAvWsRLKak0-"],["الفلسفة","14lfwEt77v9r4uZKuaNPeKTh1Bp_fk5LB"],["الفرنسية","1do-6Da-JyJNWqCvzYhltjK_bQNBG13xY"]]],"exams":["1c4M8-KO3nlfXQpUP1OH1r06QTT3sKcnT",[]],"math_science":["1h17a3knJEm7tCtge6hKsEJUSLjjL9_Yn",[["مواضيع مراقبة المستوى","1EZ-Zkw3vgmB5vhxpECNmkCEjU3-RTy4g"],["مواضيع فصلية","1-fHMd5uhzr-KH_6Mtz75_Qn1MKAzI6iW"],["المراجعة النهائية","1cJNP4XumNHXqSN2sGLn3Oz3fnC_0zl60"],["المكتسبات القبلية","1XU50VMyN922zQTHGbA6yBNH6JeTwo5jk"],["المتتاليات","1Yu0rLOV3gnMOARG45iiNMSfIvwAw9Aiz"],["القسمة في زاد","1Q20aTa4ux6VK-CPWUmSjQgZ1mEmBEpfo"],["الدوال","1UsAaU7MGp8XKy1rae3fjeuKmEmW4_BOp"],["الاحتمالات","1ktdbUzujqY8mDLIwDYO7MwXB6LI5lZUu"],["الأعداد المركبة","1ex4wJN74-Mvyx6Y4JkJcNJCJbdPJztEh"]]],"math_tech":["1h17a3knJEm7tCtge6hKsEJUSLjjL9_Yn",[["مواضيع مراقبة المستوى","1EZ-Zkw3vgmB5vhxpECNmkCEjU3-RTy4g"],["مواضيع فصلية","1-fHMd5uhzr-KH_6Mtz75_Qn1MKAzI6iW"],["المراجعة النهائية","1cJNP4XumNHXqSN2sGLn3Oz3fnC_0zl60"],["المكتسبات القبلية","1XU50VMyN922zQTHGbA6yBNH6JeTwo5jk"],["المتتاليات","1Yu0rLOV3gnMOARG45iiNMSfIvwAw9Aiz"],["القسمة في زاد","1Q20aTa4ux6VK-CPWUmSjQgZ1mEmBEpfo"],["الدوال","1UsAaU7MGp8XKy1rae3fjeuKmEmW4_BOp"],["الاحتمالات","1ktdbUzujqY8mDLIwDYO7MwXB6LI5lZUu"],["الأعداد المركبة","1ex4wJN74-Mvyx6Y4JkJcNJCJbdPJztEh"]]],"math_lit":["1h17a3knJEm7tCtge6hKsEJUSLjjL9_Yn",[["مواضيع مراقبة المستوى","1EZ-Zkw3vgmB5vhxpECNmkCEjU3-RTy4g"],["مواضيع فصلية","1-fHMd5uhzr-KH_6Mtz75_Qn1MKAzI6iW"],["المراجعة النهائية","1cJNP4XumNHXqSN2sGLn3Oz3fnC_0zl60"],["المكتسبات القبلية","1XU50VMyN922zQTHGbA6yBNH6JeTwo5jk"],["المتتاليات","1Yu0rLOV3gnMOARG45iiNMSfIvwAw9Aiz"],["القسمة في زاد","1Q20aTa4ux6VK-CPWUmSjQgZ1mEmBEpfo"],["الدوال","1UsAaU7MGp8XKy1rae3fjeuKmEmW4_BOp"],["الاحتمالات","1ktdbUzujqY8mDLIwDYO7MwXB6LI5lZUu"],["الأعداد المركبة","1ex4wJN74-Mvyx6Y4JkJcNJCJbdPJztEh"]]],"math_eco":["1h17a3knJEm7tCtge6hKsEJUSLjjL9_Yn",[["مواضيع مراقبة المستوى","1EZ-Zkw3vgmB5vhxpECNmkCEjU3-RTy4g"],["مواضيع فصلية","1-fHMd5uhzr-KH_6Mtz75_Qn1MKAzI6iW"],["المراجعة النهائية","1cJNP4XumNHXqSN2sGLn3Oz3fnC_0zl60"],["المكتسبات القبلية","1XU50VMyN922zQTHGbA6yBNH6JeTwo5jk"],["المتتاليات","1Yu0rLOV3gnMOARG45iiNMSfIvwAw9Aiz"],["القسمة في زاد","1Q20aTa4ux6VK-CPWUmSjQgZ1mEmBEpfo"],["الدوال","1UsAaU7MGp8XKy1rae3fjeuKmEmW4_BOp"],["الاحتمالات","1ktdbUzujqY8mDLIwDYO7MwXB6LI5lZUu"],["الأعداد المركبة","1ex4wJN74-Mvyx6Y4JkJcNJCJbdPJztEh"]]],"natural_science":["1I8pHfNKXnKGHSinpfcBW6d15EBH1t_Y5",[["نصوص علمية وملفات","13M7tPzxRcng3c1XpO-BXG_ti_zlmV481"],["المراجعة النهائية","10A7kMdypYonqfTIzzzom6ZfTOQKYWXBn"],["منهجية","1SoRGUTqSoGMtAXEFO47iDhJNms8wwCzY"],["تمارين + بكالوريات","19ygI6EN2AKOgNVKtalp7y7tKKUXRqLs5"]]],"arabic_lit":["19AivMFVhb1OQ-nh0VtlcgUdJXBkfXzgQ",[["المراجعة النهائية","1nmG088y658tdbXtLpsjMt79lRK-dRdbs"],["دروس","1slZlL_kRKQd8fEP53wN6W4DfpwJPZ3mk"],["تطبيقات ومواضيع","1MEC1tGDzysM9kCAOBO6boC8tsKZkY0pM"]]],"french_lit":["1tQj-slGIMVtKZunffDMyurGJTkr5zMsN",[["دروس","11UjJzruGDNXKoPMwnBV31O23x3CZ70CM"],["مواضيع وتمارين","16EFEC71B81BpRy1nrazmGk32s8PFEMJH"],["مصطلحات","1romBTaen8j1T7CvPPgp-xDIV8yG2AD3q"],["المراجعة النهائية","10YWG5icnEK7Um4iIlnh5xNrggRLUOJsB"]]],"english_lit":["1WJ1PaXDzYSltJ-NrKQ1qCwiJww-val7C",[["Paragraphs","1qwB0TkFMSAOj5C__4jxuUmF827vUnU7Y"],["مصطلحات","1lXEz-oKTOGaSND5ihJ5na1DsDCC44lgO"],["مواضيع وتمارين","12uxtTP4Vl6AYuwM6s49Sbvb71pAj2fl7"],["دروس","18Wv7u5XWQHgUpVaqZsDO7OyGZAgVd2RM"]]],"history_lit":["1tLu0szIITFfyR5PKPRWDgpgudsYVQf8f",[["المراجعة النهائية","1rrTYVzlFu9l0CL0avHyicAVTI0jS0c8A"],["منهجية","1wsQ-etobu9RD2Nhn2OmRl_MM_3ER5wVY"],["ملخصات ودروس PDF","1Af7xDwzpoS0kL192-9v_o_UuddQo3pvo"],["الدروس","1U6mM8O7Uu06fTnax_IMTXuVXPWVrD5T9"],["التطبيقات والتمارين","1feuHg5KVM2Pb8xy21KkKfcUp-g6AYiUh"]]],"philo_lit":["1L75LG5nmNI2Ymktq3N2fqo2CAkTof9ZA",[["مقالات فلسفية","1dXQhrcFALjqCkql3OuahzexX5yFzGHuK"],["الدروس","1-NjNZcWC0hZkoLLzUq23cgEXrfYH7q1T"]]],"philo_lang":["1L75LG5nmNI2Ymktq3N2fqo2CAkTof9ZA",[["مقالات فلسفية","1dXQhrcFALjqCkql3OuahzexX5yFzGHuK"],["الدروس","1-NjNZcWC0hZkoLLzUq23cgEXrfYH7q1T"]]],"philo_tech":["1L75LG5nmNI2Ymktq3N2fqo2CAkTof9ZA",[["مقالات فلسفية","1dXQhrcFALjqCkql3OuahzexX5yFzGHuK"],["الدروس","1-NjNZcWC0hZkoLLzUq23cgEXrfYH7q1T"]]]};
    function applyCanonicalDriveLinks(){for(const [id,[folderId]] of Object.entries(canonicalDriveFolders)){if(allSubjects[id])allSubjects[id].url='https://drive.google.com/drive/folders/'+folderId;}}
    function renderSubjectFolders(id){
      const root=document.getElementById('subjectSubfolders');if(!root)return;root.replaceChildren();
      const entry=resourceManifest?.subjects?.[id],fallback=canonicalDriveFolders[id];
      const heading=document.createElement('h3');heading.textContent='الموارد المتاحة في الفهرس';root.appendChild(heading);
      const categories=entry?.categories||(fallback?fallback[1].map(([title,folderId])=>({title,id:folderId,type:'folder',url:'https://drive.google.com/drive/folders/'+folderId})):[]);
      const addLink=(container,item)=>{
        if(!item||!isDriveResourceUrl(item.url))return;
        const a=document.createElement('a');a.className='resource-item';a.textContent=(item.type==='folder'?'📁 ':'📄 ')+(item.title||'مورد');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';container.appendChild(a);
      };
      if(entry?.url&&isDriveResourceUrl(entry.url))addLink(root,{title:'فتح المجلد الرئيسي في Google Drive',type:'folder',url:entry.url});
      categories.forEach(category=>{
        const group=document.createElement('div');group.className='resource-folder-group';addLink(group,category);
        if(Array.isArray(category.items)&&category.items.length){
          const details=document.createElement('details');details.style.margin='4px 0 10px';
          const summary=document.createElement('summary');summary.textContent='عرض '+category.items.length+' ملفاً';summary.style.cursor='pointer';summary.style.padding='8px 12px';details.appendChild(summary);
          category.items.forEach(item=>addLink(details,item));group.appendChild(details);
        }
        root.appendChild(group);
      });
      (entry?.items||[]).forEach(item=>addLink(root,item));
      if(!categories.length&&!(entry?.items||[]).length){
        const empty=document.createElement('p');empty.className='muted';empty.textContent='لم تُسجّل فئات أو ملفات لهذه المادة بعد.';root.appendChild(empty);
      }
    }
    function openSubjectById(id){
      const subject=allSubjects[id];
      if(!subject||!subject.branches.includes(state.branch)|| (Array.isArray(subject.subBranches)&&!subject.subBranches.includes(state.subBranch))){showToast('لا توجد موارد موثقة لهذا التخصص حالياً','warning');return;}
      const s={id,...subject,name:subjectLabel(id),desc:subjectDesc(id)};
      if(!s.url){showToast('هذه المادة قيد التحضير','warning');return;}
      currentModalSubject=s;renderSubjectFolders(id);$('#modalIcon').innerHTML=`<i class="${s.icon}"></i>`;$('#modalTitle').textContent=s.name;$('#modalDesc').textContent=s.desc;$('#modalHead').style.background=s.color;$('#modalOverlay').classList.add('show');$('#subjectModal').classList.add('show');
    }
    function closeModal(){$('#modalOverlay')?.classList.remove('show');$('#subjectModal')?.classList.remove('show');currentModalSubject=null;}
    function openCurrentDrive(){if(!currentModalSubject?.url)return;const a=document.createElement('a');a.href=currentModalSubject.url;a.target='_blank';a.rel='noopener noreferrer';document.body.appendChild(a);a.click();a.remove();closeModal();}
    function shareCurrentSubject(){if(currentModalSubject)copyText(currentModalSubject.url,'تم نسخ الرابط');}
    function shareSubject(id){const s=allSubjects[id];if(s?.url&&s.branches.includes(state.branch)&&(!Array.isArray(s.subBranches)||s.subBranches.includes(state.subBranch)))copyText(s.url,'تم نسخ الرابط');else showToast('لا توجد موارد موثقة لهذا التخصص حالياً','warning');}
    function toggleFavorite(id){const i=state.favorites.indexOf(id);if(i>=0){state.favorites.splice(i,1);showToast('تمت الإزالة من المفضلة','info')}else{state.favorites.push(id);showToast('تمت الإضافة للمفضلة','success')}saveState();renderSubjects();}
    function renderFavoritesMini(){/* sidebar stats only for clean UI */}
    function renderStats(){
      const normal=getNormalSubjects(),available=normal.filter(s=>!!s.url).length;
      const avg=Math.round(normal.reduce((a,s)=>a+(state.progress[s.id]||0),0)/Math.max(1,normal.length));
      $('#statTotal').textContent=normal.length;
      $('#statAvailable').textContent=available;
      $('#statFavs').textContent=state.favorites.length;
      $('#statProgress').textContent=avg+'%';
    }
    function renderAiSelectors(){
      const sel=$('#aiSubject');
      if(sel){
        const current=sel.value;
        const materials=getNormalSubjects();
        sel.innerHTML=materials.length?materials.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join(''):'<option value="">لا توجد مادة دراسية</option>';
        if(current&&isStudySubjectId(current)&&materials.some(s=>s.id===current))sel.value=current;
      }
      const t=$('#targetSubject');
      if(t&&state.grades)t.innerHTML=state.grades.map(g=>`<option value="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`).join('');
      const ctx=aiContext();
      if($('#aiCtxBranch'))$('#aiCtxBranch').textContent=ctx.branch+(ctx.subBranch?' / '+ctx.subBranch:'');
      if($('#aiCtxSubject'))$('#aiCtxSubject').textContent=ctx.subject||'-';
      if($('#aiCtxDays'))$('#aiCtxDays').textContent=ctx.countdown.days+' يوم';
      if($('#aiCtxAverage'))$('#aiCtxAverage').textContent=ctx.average?ctx.average+'/20':'غير محدد';
    }
    function renderAgents(){const groups=['فهم','تدريب','تنظيم'];const el=$('#agentGrid');if(!el)return;el.innerHTML=groups.map(g=>{const items=Object.entries(agents).filter(([id,a])=>a.group===g);if(!items.length)return '';return `<div class="agent-section"><div class="agent-section-title"><i class="fa-solid fa-layer-group"></i>${g}</div><div class="agent-grid">${items.map(([id,a])=>`<div class="card agent-card ${activeAgent===id?'active':''}" onclick="selectAgent('${id}')" role="button" tabindex="0"><div><div class="agent-icon"><i class="${a.icon}"></i></div><div><h3 style="margin-top:12px">${a.title}</h3><p class="muted">${a.desc}</p></div></div><button class="btn ${activeAgent===id?'primary':''}" onclick="event.stopPropagation();runAgent('${id}')" ${!hasLiveAI()&&!['daily_plan','mistake_analyzer','grade_advisor'].includes(id)?'disabled title="يتطلب AI متصلاً"':''}>تشغيل</button></div>`).join('')}</div></div>`;}).join('');}
    function selectAgent(id){activeAgent=id;renderAgents();showToast('تم اختيار: '+agents[id].title,'info');}
    function fillPrompt(text){$('#aiPrompt').value=text;$('#aiPrompt').focus();}
    function clearAIOutput(){const target=$('#aiOutput');target.textContent='تم المسح. اكتب طلباً جديداً أو اختر أداة.';delete target.dataset.rawAnswer;setAIStatus('جاهز. اكتب طلبك وسيحلله المساعد باستعمال بياناتك.','info');}
    function getBacCountdownData(){const diff=Math.max(0,CONFIG.bacStart.getTime()-Date.now());return{days:Math.floor(diff/86400000),hours:Math.floor(diff/3600000)%24,minutes:Math.floor(diff/60000)%60};}
    function aiContext(){
      const s=currentSubject();
      const studySubjects=getNormalSubjects().map(x=>({id:x.id,name:x.name,available:!!x.url,progress:state.progress[x.id]||0}));
      const resourceItems=getResourceItems().map(x=>({id:x.id,name:x.name,available:!!x.url}));
      const weakSubjects=studySubjects.sort((a,b)=>a.progress-b.progress).slice(0,5);
      const availableFiles=studySubjects.filter(x=>x.available).map(x=>x.name);
      const availableResources=resourceItems.filter(x=>x.available).map(x=>x.name);
      const avgData=(()=>{try{if(!state.grades||!state.grades.length)return null;const total=state.grades.reduce((a,g)=>a+(+g.mark||0)*(+g.coef||0),0);const coefs=state.grades.reduce((a,g)=>a+(+g.coef||0),0);return coefs?Number((total/coefs).toFixed(2)):null;}catch(e){return null;}})();
      const recentHistory=(state.aiHistory||[]).slice(0,5).map(h=>({agent:h.agent,title:h.title,question:h.question,signature:h.signature,time:h.time}));
      return{
        app:'بوابة المراجعة | باكالوريا الجزائر 2027',
        branch:branches[state.branch].name,
        branchKey:state.branch,
        subBranch:state.subBranch?branches[state.branch].subs?.[state.subBranch]:'',
        subject:s?.name||'', subjectId:s?.id||'', subjectAvailable:!!s?.url,
        level:$('#aiLevel')?.value||'متوسط',
        duration:Number($('#aiDuration')?.value||1),
        tone:$('#aiTone')?.value||'مختصر وواضح',
        prompt:$('#aiPrompt')?.value.trim()||'',
        countdown:getBacCountdownData(),
        progress:studyProgress(), weakSubjects, subjects:studySubjects, availableFiles, resourceItems, availableResources,
        favorites:(state.favorites||[]).filter(id=>isStudySubjectId(id)).map(id=>subjectLabel(id)).filter(Boolean),
        favoriteResources:(state.favorites||[]).filter(id=>allSubjects[id]?.special).map(id=>subjectLabel(id)).filter(Boolean),
        mistakes:(state.mistakes||[]).slice(0,30),
        tasks:(state.tasks||[]).slice(0,30),
        grades:state.grades||[], average:avgData,
        focusDone:state.focusDone||0,
        aiHistory:recentHistory,
        uniqueSeed:Date.now()+'-'+Math.random().toString(36).slice(2,8),
        user:state.user?{name:state.user.name,email:state.user.email,mode:state.user.mode}:{name:'زائر',mode:'guest'},
        aiProfile:state.aiProfile||{},
        completedTasks:(state.tasks||[]).filter(t=>t.done).slice(0,20),
        pendingTasks:(state.tasks||[]).filter(t=>!t.done).slice(0,20),
        userLanguage:'Arabic RTL, Algerian BAC context',
        rules:[
          'أجب بالعربية الواضحة، واستعمل الفرنسية أو الإنجليزية فقط عندما تكون الأداة خاصة باللغة.',
          'استعمل سياق الطالب من الموقع: الشعبة، المادة، التقدم، العلامات، المهام، الأخطاء والمفضلة.',
          'لا تكرر نفس الجواب السابق. إذا كان السؤال مشابهاً، غيّر الأمثلة والخطة والزاوية.',
          'اجعل النتيجة منظمة بعناوين قصيرة، خطوات عملية، وجداول نصية بسيطة عند الحاجة.',
          'لا تذكر مفاتيح API أو تفاصيل تقنية داخل الإجابة للطالب.',
          'إذا كان سؤال الطالب غامضاً، اعمل بأفضل افتراض ولا تتوقف.'
        ]
      };
    }
    function agentTitle(id){return (agents[id]?.title||'المساعد').replace(/^[^\u0600-\u06FFA-Za-z0-9]+/,'').trim();}
    function compactStudentSnapshot(ctx){
      // Keep the user's actual question salient. Avoid unrelated grades, history and email.
      return [
        'الشعبة: '+(ctx.branch||'غير محددة'),
        'المادة المختارة: '+(ctx.subject||'غير محددة'),
        'المستوى: '+(ctx.level||'متوسط'),
        'طول الإجابة: '+(ctx.tone||'مختصر وواضح')
      ].join('\n');
    }
    function buildAIPrompt(agentId,ctx){
      const task={
        smart_tutor:'اشرح أو حل المطلوب مباشرة حسب صياغة السؤال.',
        summarizer:'لخص النص أو الدرس المعطى دون افتراض قراءة مستند غير متاح.',
        quiz:'أنشئ اختباراً في الموضوع المطلوب مع تصحيح دقيق.',
        qcm:'أنشئ اختيارات متعددة حول المطلوب مع تبرير الإجابات.',
        mock_exam:'جهّز نموذج اختبار قصير مناسب للمطلوب مع التصحيح.',
        daily_plan:'قدّم خطة واقعية حسب الوقت والأهداف المذكورة.',
        mistake_analyzer:'حدد الخطأ وأسبابه وكيفية تجنّبه.',
        grade_advisor:'حلّل المعدل باستخدام العلامات والمعاملات المتوفرة فقط.',
        essay_coach:'اكتب أو صحح المقال أو التعبير المقدم بدقة.'
      };
      const question=(ctx.prompt||'').trim();
      const fallback={
        smart_tutor:'اشرح فكرة أساسية من المادة المختارة بمثال.',
        summarizer:'أعطني ملخصاً تمهيدياً منظماً في المادة المختارة.',
        quiz:'أنشئ اختباراً قصيراً في المادة المختارة مع التصحيح.',
        qcm:'أنشئ خمسة أسئلة اختيار متعدد في المادة المختارة.',
        mock_exam:'جهّز تدريباً قصيراً للمادة والشعبة المختارة.',
        daily_plan:'ضع خطة مراجعة واقعية للمادة المختارة.',
        mistake_analyzer:'ما الأخطاء الشائعة في المادة وكيف أصلحها؟',
        grade_advisor:'كيف أرتب أولوياتي لتحسين المعدل؟',
        essay_coach:'أعطني نموذج مقدمة وفق المادة المختارة.'
      };
      const focus=question||fallback[agentId]||fallback.smart_tutor;
      const extra=['daily_plan','mistake_analyzer','grade_advisor'].includes(agentId)?
        '، معدل الطالب المحسوب: '+(ctx.average??'غير متاح')+
        '، أخطاء مذكورة: '+(ctx.mistakes||[]).slice(0,3).map(x=>x.text).filter(Boolean).join('؛ ')+
        '، مهام مذكورة: '+(ctx.pendingTasks||[]).slice(0,3).map(x=>x.text).filter(Boolean).join('؛ '):'';
      return `السؤال الذي يجب الإجابة عنه أولاً:\n${focus}\n\nسياق مساعد فقط إذا كان مناسباً:\n${compactStudentSnapshot(ctx)}${extra}\n\nنوع المساعدة: ${task[agentId]||task.smart_tutor}\n\nقواعد الإجابة:\n- لا تغيّر السؤال ولا تستبدله بنصائح عامة أو بخطة غير مطلوبة.\n- استعمل المعطيات والشروط والأرقام التي أعطاها الطالب كما هي.\n- ابدأ بجواب مباشر. أضف خطوات الحل فقط في مسائل أو أسئلة تحتاج شرحاً.\n- حافظ على طول مناسب: السؤال البسيط يستحق إجابة قصيرة؛ السؤال المركّب شرحاً منظماً.\n- أجب بلغة سؤال الطالب، سواء العربية أو الفرنسية أو الإنجليزية.\n- استخدم Markdown مقروءاً: عناوين قليلة وقوائم عند الحاجة، دون زخرفة زائدة.\n- لا تخترع قوانين، نتائج حسابية، مراجع أو محتوى ملفات لم تُقدم. اذكر أي افتراض بوضوح.\n- لا تكتب فقرة تحديث ذاكرة ولا معلومات داخلية عن الموقع أو الـ API.`;
    }
    function readResponseText(data){
      if(!data)return '';
      if(data.output_text)return data.output_text;
      if(data.text)return data.text;
      if(data.message)return data.message;
      if(Array.isArray(data.output)){
        return data.output.map(item=>{
          if(item.content&&Array.isArray(item.content))return item.content.map(c=>c.text||c.output_text||c.value||'').join('');
          return item.text||'';
        }).join('\n').trim();
      }
      if(data.choices&&data.choices[0])return data.choices[0].message?.content||data.choices[0].text||'';
      return '';
    }
    function aiProviderName(){return 'المساعد الذكي';}
    function aiErrorMessage(error){
      if(!error)return 'خطأ غير معروف';
      if(typeof error==='string')return error;
      if(error.message)return error.message;
      if(error.error?.message)return error.error.message;
      try{return JSON.stringify(error).slice(0,700);}catch(e){return 'خطأ غير معروف';}
    }
    async function callProxyAI(agentId, ctx){
      if(!CONFIG.aiProxyEndpoint)return null;
      const auth=getStudentAuth();
      if(!auth)throw new Error('خدمة الحسابات غير متاحة.');
      const {data:sessionData,error:sessionError}=await auth.auth.getSession();
      if(sessionError)throw sessionError;
      const accessToken=sessionData?.session?.access_token;
      if(!accessToken)throw new Error('يجب تسجيل الدخول لاستخدام المساعد.');
      const res=await fetch(CONFIG.aiProxyEndpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},
        body:JSON.stringify({agent:agentId,context:ctx,prompt:buildAIPrompt(agentId,ctx)})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||'تعذر تشغيل خدمة الذكاء الاصطناعي.');
      return data.answer||data.text||data.message||readResponseText(data)||null;
    }
    async function callLiveAI(agentId,ctx){
      if(!CONFIG.aiProxyEndpoint)throw new Error('خادم الذكاء الاصطناعي غير متاح على هذا النطاق. افتح رابط Cloudflare الرسمي.');
      const answer=await callProxyAI(agentId,ctx);
      if(!answer)throw new Error('وصل رد فارغ من خادم الذكاء الاصطناعي.');
      return answer;
    }


    let aiBackendState='checking';
    let aiBackendReason='';
    function hasLiveAI(){return Boolean(CONFIG.aiProxyEndpoint&&aiBackendState==='ready');}
    async function checkAIAvailability(){
      if(!CONFIG.aiProxyEndpoint){aiBackendState='offline';aiBackendReason='المساعد متاح فقط في نسخة Vercel الرسمية.';updateAIModeIndicator();return false;}
      aiBackendState='checking';updateAIModeIndicator();
      try{
        const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
        let response;
        try{response=await fetch(CONFIG.aiProxyEndpoint,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});}
        finally{clearTimeout(timeout);}
        const info=await response.json();
        aiBackendState=response.ok&&info.ready===true?'ready':'offline';
        const messages={
          provider_unconfigured:'خدمة Deploy تحتاج مفتاح API سرياً صالحاً في إعدادات Cloudflare Worker.',
          configured_unverified:'إعداد Deploy مكتمل مبدئياً، لكن لم يُختبر توليد الإجابات بعد.',
          provider_error:'تعذر اتصال Deploy. أدوات المراجعة المحلية متاحة.',
          provider_unreachable:'تعذر الوصول إلى Deploy. الأدوات المحلية متاحة.'
        };
        aiBackendReason=aiBackendState==='ready'?'':messages[info.reason]||'تعذر التحقق من خدمة AI.';
      }catch(error){aiBackendState='offline';aiBackendReason='تعذر التحقق من خادم المساعد. الأدوات المحلية تبقى متاحة.';}
      updateAIModeIndicator();renderAgents();
      return hasLiveAI();
    }
    function updateAIModeIndicator(){
      const live=hasLiveAI(),dot=$('#aiModeDot'),title=$('#aiModeTitle'),desc=$('#aiModeDescription');
      if(dot)dot.classList.toggle('live',live);
      if(title)title.textContent=aiBackendState==='checking'?'جار التحقق من إعدادات Deploy...':live?'مساعد Deploy — الإعداد جاهز للتجربة':'أدوات المراجعة المحلية — دون اتصال';
      if(desc)desc.textContent=live?'الإعداد موجود في الخادم. يتأكد عمل النموذج عند إرسال أول طلب بنجاح، وقد تحتاج مفتاحاً صالحاً.':aiBackendState==='checking'?'نتحقق من إعدادات الخادم قبل عرض الأدوات التوليدية.':aiBackendReason;
    }
    function renderHomeSummary(){
      const subjects=getNormalSubjects(),avg=subjects.length?Math.round(subjects.reduce((a,x)=>a+Math.min(100,Math.max(0,Number(state.progress[x.id])||0)),0)/subjects.length):0;
      if($('#homeProgressValue'))$('#homeProgressValue').textContent=avg+'%';
      if($('#homeProgressFill'))$('#homeProgressFill').style.width=avg+'%';
      const remaining=(state.tasks||[]).filter(t=>!t.done).length;
      if($('#homeTasksValue'))$('#homeTasksValue').textContent=String(remaining);
      if($('#homeTasksSubtitle'))$('#homeTasksSubtitle').textContent=remaining?'مهام متبقية من قائمة مراجعتك':'لا توجد مهام متبقية، أضف هدفاً جديداً';
    }
    function setAIStatus(message, type='info'){
      const line=$('#aiStatusLine');
      if(!line)return;
      const icon=type==='danger'?'fa-triangle-exclamation':type==='success'?'fa-circle-check':'fa-signal';
      line.innerHTML=`<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
    }
    function renderApiError(error){
      const provider=aiProviderName();
      const msg=aiErrorMessage(error);
      return `<div class="api-error-box"><strong>تعذر تشغيل المساعد الآن.</strong><br>السبب: ${escapeHtml(msg)}<br><br>جرّب إعادة المحاولة، أو افتح الصفحة عبر HTTPS. لن يظهر جواب جاهز مكرر حتى تعرف سبب المشكلة الحقيقي.</div>`;
    }
    let aiBusy=false;
    async function runAgent(id='smart_tutor'){
      if(aiBusy){showToast('انتظر انتهاء الطلب الحالي','info');return;}
      activeAgent=id;renderAgents();renderAiSelectors();
      const out=$('#aiOutput'),ctx=aiContext();
      const localSupported=['daily_plan','mistake_analyzer','grade_advisor'];
      if(!hasLiveAI()){
        if(localSupported.includes(id)){
          const ans=localAgent(id,ctx);
          if(window.renderAIAnswer)window.renderAIAnswer(out,'[أداة محلية — ليست إجابة مولّدة بالذكاء الاصطناعي]\n\n'+ans);
          else out.textContent='[أداة محلية — ليست إجابة مولّدة بالذكاء الاصطناعي]\n\n'+ans;
          setAIStatus('تم تشغيل الأداة محلياً دون اتصال بنموذج AI.','success');
          showToast('تم إنشاء النتيجة المحلية','success');
        }else{
          out.textContent='هذه الأداة تتطلب خادم الذكاء الاصطناعي. افتح نسخة Bac-pedia الرسمية على Vercel بعد تفعيل الخدمة من الإدارة.\\n\\nيمكنك استخدام خطة المراجعة، تحليل الأخطاء، ونصيحة المعدل دون اتصال.';
          setAIStatus('لا توجد خدمة AI متصلة. لا يتم تقديم إجابات وهمية.','info');
          $('#aiSetup').open=true;
        }
        return;
      }
      aiBusy=true;
      delete out.dataset.rawAnswer;
      out.innerHTML='<span class="typing"><span></span><span></span><span></span></span> يتم إعداد جواب مطابق لسؤالك...';
      setAIStatus('جار الاتصال بنموذج الذكاء الاصطناعي...','info');
      try{
        const live=await callLiveAI(id,ctx);
        if(!live||!String(live).trim())throw new Error('وصل رد فارغ من المساعد.');
        const ans=cleanRepeatedAnswer(String(live).trim(),ctx,id);
        if(window.renderAIAnswer)window.renderAIAnswer(out,ans);
        else out.textContent=ans;
        rememberAI(id,ctx,ans,true);
        setAIStatus('تم استلام إجابة مولّدة من النموذج.','success');
        showToast('تم تجهيز الإجابة','success');
      }catch(e){
        console.warn('AI request failed',e);
        out.innerHTML=renderApiError(e);
        setAIStatus('تعذر الاتصال بالنموذج. تحقق من المفتاح والاتصال.','danger');
        showToast('تعذر تشغيل المساعد','danger');
      }finally{aiBusy=false;}
    }

    function rememberAI(id,ctx,ans,live){
      state.aiHistory=state.aiHistory||[];
      state.aiHistory.unshift({agent:id,title:agents[id]?.title||id,question:(ctx.prompt||ctx.subject||'').slice(0,120),signature:signature(ans),live,time:new Date().toLocaleString('ar-DZ')});
      state.aiHistory=state.aiHistory.slice(0,12);
      updateAiProfileFromInteraction(id,ctx,ans);
      saveState();
    }

    function updateAiProfileFromInteraction(id,ctx,ans){
      state.aiProfile=state.aiProfile||{goals:[],weaknesses:[],preferredStyle:'منظم وواضح',lastUpdated:null};
      const profile=state.aiProfile;
      const addUnique=(arr,value,limit=8)=>{value=String(value||'').trim();if(!value)return arr;arr=Array.isArray(arr)?arr:[];arr=[value,...arr.filter(x=>normalize(x)!==normalize(value))];return arr.slice(0,limit);};
      if(ctx.subject)profile.goals=addUnique(profile.goals,'تحسين '+ctx.subject,8);
      const weak=(ctx.weakSubjects||[])[0];
      if(weak)profile.weaknesses=addUnique(profile.weaknesses,weak.name+' تقدم '+weak.progress+'%',8);
      const lastMistake=(ctx.mistakes||[])[0]?.text;
      if(lastMistake)profile.weaknesses=addUnique(profile.weaknesses,lastMistake.slice(0,90),8);
      if(ctx.tone)profile.preferredStyle=ctx.tone;
      profile.lastAgent=id;
      profile.lastSubject=ctx.subject;
      profile.lastUpdated=new Date().toLocaleString('ar-DZ');
      state.aiProfile=profile;
    }

    function signature(text){return String(text||'').replace(/\s+/g,' ').slice(0,160);}
    function cleanRepeatedAnswer(ans,ctx,id){
      ans=String(ans||'').trim();
      if(!ans)return '';
      const same=(state.aiHistory||[]).some(h=>h.signature&&ans.includes(h.signature.slice(0,90)));
      if(same) ans+='\n\nملاحظة: تم إرسال طلب تنويع للنموذج باستعمال سجل إجاباتك. للحصول على زاوية مختلفة أكثر، أضف مثالاً أو صعوبة محددة في خانة الطلب.';
      return ans;
    }
    function localAgent(id,ctx){const map={smart_tutor:agentTutor,daily_plan:agentPlan,summarizer:agentSummary,quiz:agentQuiz,qcm:agentQcm,flashcards:agentFlashcards,mistake_analyzer:agentMistakes,grade_advisor:agentGrades,essay_coach:agentEssay,mock_exam:agentMock};return (map[id]||agentTutor)(ctx);}
    function hashText(s){let h=0;String(s||'').split('').forEach(ch=>{h=(h*31+ch.charCodeAt(0))>>>0});return h;}
    function variant(ctx,n=4){return (hashText(ctx.prompt+ctx.subject+Date.now())%n);}
    function intro(ctx,title){return `${title}\nالشعبة: ${ctx.branch}${ctx.subBranch?' - '+ctx.subBranch:''}\nالمادة: ${ctx.subject}\nالمستوى: ${ctx.level}\n${'─'.repeat(34)}\n`;}
    function subjectMethod(ctx){
      const s=normalize(ctx.subject);
      if(s.includes('رياض'))return ['حدد المعطيات','اكتب القانون أو الخاصية','عوّض بهدوء','تحقق من المجال والوحدة','اكتب النتيجة في مربع'];
      if(s.includes('فيز'))return ['حوّل الوحدات','ارسم مخططاً صغيراً','اختر القانون','علل في كل مرحلة','راجع رتبة النتيجة'];
      if(s.includes('طبي'))return ['اقرأ الوثيقة','استخرج المؤشرات','اربط بالمكتسبات','استنتج بجملة قصيرة','ادعم برسم إن أمكن'];
      if(s.includes('فلس'))return ['مفهوم مركزي','إشكال واضح','أطروحة بحجة','نقيض بحجة','تركيب وخاتمة'];
      if(s.includes('تاريخ')||s.includes('جغراف'))return ['تحديد المصطلحات','أسباب','مظاهر','نتائج','خريطة أو تواريخ إن لزم'];
      if(s.includes('عربي'))return ['فكرة النص','الحقول الدلالية','الصور والأساليب','النمط والحجاج','خلاصة مركزة'];
      if(s.includes('فرنسي')||s.includes('انجليزي')||s.includes('لغة'))return ['topic','vocabulary','two arguments','example','short conclusion'];
      return ['افهم المطلوب','قسّم السؤال','استعمل مصطلحات المادة','اكتب جواباً منظماً','راجع قبل التسليم'];
    }
    function uniqueNextStep(ctx,id){
      const steps={smart_tutor:'اكتب الآن سؤالاً واحداً من الدرس وسأحوله إلى مثال محلول.',summarizer:'الصق فقرة من الدرس وسأقسمها إلى عنوان، فكرة، كلمات مفتاحية.',flashcards:'اختر 5 مصطلحات وسأصنع لها بطاقات صعبة وسهلة.',quiz:'حل التمرين الأول فقط ثم اكتب إجابتك لأصححها.',qcm:'بعد الإجابة، اكتب سبب اختيارك وليس الحرف فقط.',mock_exam:'اضبط مؤقت 20 دقيقة وابدأ بالسؤال الأسهل.',daily_plan:'اختر أول جلسة وابدأ 25 دقيقة بدون هاتف.',mistake_analyzer:'اكتب خطأ واحداً متكرراً بصيغة: الخطأ / السبب / وقت حدوثه.',grade_advisor:'حدّد مادة واحدة تريد رفعها بنقطتين هذا الأسبوع.',essay_coach:'اكتب مقدمة من 4 أسطر وسأحسنها لك.'};
      return steps[id]||'ابدأ بخطوة صغيرة الآن.';
    }
    function agentTutor(ctx){const p=ctx.prompt||'اشرح لي أهم ما يجب مراجعته في هذه المادة';const m=subjectMethod(ctx);return intro(ctx,'شرح')+`طلبك:\n${p}\n\nالفكرة قبل الحفظ:\nالمطلوب في ${ctx.subject} ليس جمع معلومات كثيرة، بل معرفة متى تستعمل كل فكرة وكيف تكتبها في ورقة الامتحان.\n\nطريقة العمل المناسبة:\n${m.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nمثال سريع قابل للتطبيق:\n- اقرأ السؤال وحدد الكلمة التي تبدأ بها الإجابة: عرّف، احسب، علل، قارن، استنتج.\n- اكتب سطراً تمهيدياً قصيراً يبين أنك فهمت المطلوب.\n- استعمل مصطلحين من الدرس على الأقل.\n- اختم بنتيجة واضحة لا تزيد عن سطرين.\n\nأخطاء تنقص النقاط:\n1. جواب طويل بلا ترتيب.\n2. قانون أو فكرة بدون سبب استعمالها.\n3. نسيان التعليل أو الوحدة أو المثال.\n4. الانتقال بين الأفكار دون رابط.\n\nتدريب الآن:\nاكتب جواباً من 5 أسطر فقط عن نفس الطلب، ثم راجعه بهذه القائمة: هل عندي تعريف؟ خطوة؟ مثال؟ نتيجة؟`;}
    function agentPlan(ctx){const days=Math.max(1,ctx.duration);const weak=ctx.weakSubjects.length?ctx.weakSubjects:getNormalSubjects().slice(0,4).map(s=>({name:s.name,progress:state.progress[s.id]||0}));const blocks=days<=1?['جلسة 1: أصعب مادة — 25 دقيقة فهم + 15 دقيقة تمرين','جلسة 2: مادة ثانية — تمرين واحد مصحح','جلسة 3: حفظ سريع — 12 بطاقة','جلسة 4: أخطاء — إعادة سؤالين أخطأت فيهما','قبل النوم: مراجعة خفيفة فقط']:Array.from({length:Math.min(days,7)},(_,i)=>`اليوم ${i+1}: ${weak[i%weak.length]?.name||ctx.subject} — درس قصير + تمرين + تصحيح خطأ`);return intro(ctx,'خطة')+`الأولوية الآن:\n${weak.slice(0,5).map((s,i)=>`${i+1}. ${s.name} — التقدم ${s.progress||0}%`).join('\n')}\n\nخطة ${days} يوم:\n${blocks.map(x=>'• '+x).join('\n')}\n\nقاعدة لا تكسرها:\nكل جلسة لها نتيجة واحدة فقط: تمرين مصحح، ملخص صفحة، أو بطاقة أخطاء.\n\nمؤشر نهاية اليوم:\n□ أنهيت 3 جلسات قصيرة\n□ صححت خطأين\n□ كتبت 5 بطاقات\n□ لم أفتح دروساً جديدة بلا تطبيق\n\n${uniqueNextStep(ctx,'daily_plan')}`;}
    function agentSummary(ctx){const text=ctx.prompt||`اكتب هنا نص الدرس أو الفقرة التي تريد تلخيصها في ${ctx.subject}`;const words=text.split(/\s+/).filter(Boolean).length;return intro(ctx,'تلخيص')+`عدد الكلمات التقريبي: ${words}\n\n1) الفكرة العامة:\n${text.length>50?text.slice(0,220)+'...':'المحور يدور حول '+ctx.subject+' ويحتاج إلى فهم المصطلحات الأساسية ثم التطبيق.'}\n\n2) الكلمات المفتاحية:\n- تعريف\n- سبب\n- نتيجة\n- مثال\n- خطأ شائع\n\n3) خريطة ذهنية نصية:\nالمفهوم الرئيسي → شروطه → تطبيقه → مثال → سؤال امتحان محتمل.\n\n4) أسئلة مراجعة:\nأ. ما التعريف المختصر؟\nب. متى نستعمل هذه الفكرة؟\nج. ما المثال المناسب؟\nد. ما الخطأ الذي يجب تجنبه؟\n\n5) ملخص صفحة واحدة:\nاكتب العنوان، 5 نقاط فقط، مثال واحد، وسؤالاً واحداً للتدريب.`;}
    function agentQuiz(ctx){const m=subjectMethod(ctx);return intro(ctx,'اختبار')+`اختبار قصير في ${ctx.subject} — 20 نقطة\n\nالتمرين 1: فهم الدرس (4ن)\nعرّف مفهومين مهمين، ثم أعط مثالاً لكل مفهوم.\nالتصحيح: 1ن للتعريف + 1ن للمثال لكل مفهوم.\n\nالتمرين 2: تطبيق منهجي (6ن)\nاستعمل الخطوات التالية:\n${m.map((x,i)=>`${i+1}. ${x}`).join('\n')}\nالتصحيح: 2ن للمنهجية، 2ن للتطبيق، 1ن للتنظيم، 1ن للنتيجة.\n\nالتمرين 3: سؤال تركيبي (6ن)\nاربط بين فكرتين من الدرس، ثم استنتج نتيجة قصيرة.\n\nالتمرين 4: تصحيح أخطاء (4ن)\nاكتب خطأين يقع فيهما التلاميذ في هذه المادة، وصححهما.\n\nبعد الاختبار:\nسجل أكبر خطأ في صفحة التقدم.`;}
    function agentQcm(ctx){const subject=ctx.subject;const questions=[['أول خطوة قبل الإجابة هي تحديد المطلوب بدقة','صحيح','لأن نوع السؤال يحدد طريقة الإجابة.'],['كثرة الدروس بدون تمارين تكفي للنجاح','خطأ','البكالوريا تقيس التطبيق والتصحيح.'],['التصحيح بعد التمرين جزء من المراجعة','صحيح','بدونه يتكرر نفس الخطأ.'],['يمكن ترك التعليل إذا كانت النتيجة صحيحة','خطأ','التعليل يمنح نقاطاً ويحمي الإجابة.'],['المراجعة المتباعدة أفضل من ليلة واحدة طويلة','صحيح','لأنها تثبت الحفظ وتكشف النسيان.']];return intro(ctx,'اختيارات')+`QCM في ${subject}\n\n`+questions.map((q,i)=>`${i+1}) ${q[0]}\nأ. صحيح\nب. خطأ\nج. أحياناً\nد. لا أعرف\nالإجابة: ${q[1]}\nالسبب: ${q[2]}\n`).join('\n')+`\nطريقة الاستفادة: قبل رؤية الإجابة، اكتب سبب اختيارك في سطر واحد.`;}
    function agentFlashcards(ctx){const cards=[['ما أول خطوة؟','تحديد المطلوب والكلمات المفتاحية.'],['كيف أتجنب النسيان؟','مراجعة بعد يوم، بعد 3 أيام، بعد أسبوع.'],['كيف أعرف أنني فهمت؟','أحل مثالاً دون النظر للحل.'],['ماذا أكتب في دفتر الأخطاء؟','نوع الخطأ، سببه، طريقة منعه.'],['كيف أرفع النقاط؟','أركز على أكبر معامل وأضعف تقدم.'],['كيف أراجع آخر يوم؟','ملخصات وبطاقات ونوم، لا دروس جديدة.']];return intro(ctx,'بطاقات')+cards.map((c,i)=>`بطاقة ${i+1}\nس: ${c[0]}\nج: ${c[1]}\nمتى أراجعها؟ ${i<2?'اليوم وغداً':'بعد 3 أيام ثم أسبوع'}`).join('\n\n')+`\n\nمهمة الآن: حوّل آخر خطأ عندك إلى بطاقة سؤال/جواب.`;}
    function agentMistakes(ctx){const mistakes=state.mistakes.length?state.mistakes.map((m,i)=>`${i+1}. ${m.text}`).join('\n'):(ctx.prompt||'لم تُسجّل أخطاء بعد. اكتب خطأك في الخانة أو في صفحة التقدم.');return intro(ctx,'الأخطاء')+`الأخطاء المدخلة:\n${mistakes}\n\nالتصنيف:\n1) فهم: لم يتضح المفهوم. العلاج: مثال بسيط قبل التمرين.\n2) منهجية: تعرف الدرس لكن الحل غير مرتب. العلاج: قالب ثابت.\n3) تسرع: وحدة، إشارة، تعليل، قراءة خاطئة. العلاج: دقيقة مراجعة.\n4) حفظ: معلومة غير مثبتة. العلاج: بطاقة وتكرار.\n\nخطة علاج 3 أيام:\nاليوم 1: أعد حل سؤال واحد فيه نفس الخطأ.\nاليوم 2: حل سؤالاً مشابهاً دون تصحيح أمامك.\nاليوم 3: اكتب قاعدة تمنع تكرار الخطأ.\n\nقاعدة مختصرة: لا تنتقل لدرس جديد قبل أن تصلح الخطأ المتكرر.`;}
    function agentGrades(ctx){if(!state.grades)resetGrades(false);const total=state.grades.reduce((a,g)=>a+(+g.mark||0)*(+g.coef||0),0),coefs=state.grades.reduce((a,g)=>a+(+g.coef||0),0),avg=coefs?total/coefs:0;const weak=[...state.grades].sort((a,b)=>(+a.mark||0)-(+b.mark||0)||(+b.coef||0)-(+a.coef||0)).slice(0,4);return intro(ctx,'المعدل')+`المعدل التقريبي: ${avg.toFixed(2)}/20\n\nأولوية العمل:\n${weak.map((g,i)=>`${i+1}. ${g.name}: ${g.mark}/20 — معامل ${g.coef}`).join('\n')}\n\nالخطة:\n- ارفع مادة ضعيفة ذات معامل كبير قبل تحسين مادة قوية.\n- هدف الأسبوع: +1 إلى +2 نقطة في مادتين فقط.\n- لكل مادة: درس مختصر، تمرينان مصححان، دفتر أخطاء.\n\nتوزيع الوقت المقترح:\n60% للمواد ذات المعامل الكبير والضعف الواضح.\n25% للمواد المتوسطة.\n15% للحفظ والصيانة.\n\nقرار الآن: اختر مادة واحدة من القائمة وابدأ تمريناً مصححاً.`;}
    function agentEssay(ctx){return intro(ctx,'المقال واللغات')+`قالب بسيط:\n\nالفلسفة:\nمقدمة = تمهيد + إبراز التناقض + طرح الإشكال.\nالعرض = أطروحة بحجة ومثال، ثم نقيض بحجة ومثال، ثم تركيب.\nالخاتمة = جواب مباشر عن الإشكال.\n\nالعربية:\nفكرة عامة → أفكار النص → الأساليب والصور → القيمة → خلاصة.\n\nFrench / English:\nIntroduction: introduce the topic.\nBody: argument 1 + example, argument 2 + example.\nConclusion: clear opinion.\n\nروابط مفيدة:\nأولاً / Firstly / D'abord\nبالإضافة / Moreover / De plus\nلكن / However / Cependant\nلذلك / Therefore / Donc\n\nتدريب الآن: اكتب مقدمة فقط، ثم افحص هل فيها: تمهيد، مشكلة، سؤال؟`;}
    function agentMock(ctx){return intro(ctx,'محاكاة')+`محاكاة امتحان في ${ctx.subject} — 45 دقيقة\n\n0-5 دقائق:\nاقرأ الموضوع، ضع خطاً تحت المطلوب، واختر ترتيب الحل.\n\n5-30 دقيقة:\nأنجز الأسئلة الأسهل أولاً. لا تتوقف أكثر من 4 دقائق في سؤال عالق.\n\n30-38 دقيقة:\nأكمل السؤال الأصعب أو اكتب بداية منظمة لتحصل على بعض النقاط.\n\n38-45 دقيقة:\nراجع الوحدات، التعليل، الترقيم، وضوح النتيجة.\n\nسلم تصحيح ذاتي /20:\n- فهم المطلوب: 4\n- المنهجية: 5\n- التطبيق: 7\n- التنظيم والتعليل: 4\n\nبعد المحاكاة: سجل خطأ واحداً فقط وعالجه في اليوم التالي.`;}
    function addTask(){const t=$('#newTaskText').value.trim();if(!t)return;state.tasks.unshift({text:t,done:false,date:Date.now()});$('#newTaskText').value='';saveState();renderTasks();}
    function generateDailyTasks(){const subs=getNormalSubjects().sort((a,b)=>(state.progress[a.id]||0)-(state.progress[b.id]||0)).slice(0,3);subs.forEach(s=>state.tasks.unshift({text:`جلسة ${s.name}: 25د درس + تمرين + تصحيح`,done:false,date:Date.now()}));saveState();renderTasks();showToast('تم توليد مهام اليوم','success');}
    function renderTasks(){$('#focusDoneLabel').textContent=state.focusDone||0;$('#taskList').innerHTML=state.tasks.length?state.tasks.map((t,i)=>`<div class="task-row"><input type="checkbox" ${t.done?'checked':''} onchange="state.tasks[${i}].done=this.checked;saveState();renderTasks()"><span style="${t.done?'text-decoration:line-through;color:var(--text-muted)':''}">${escapeHtml(t.text)}</span><button class="round-btn" onclick="state.tasks.splice(${i},1);saveState();renderTasks()"><i class="fa-solid fa-trash"></i></button></div>`).join(''):'<p class="muted">لا توجد مهام بعد.</p>';}
    let focusDeadline=0,focusPausedRemaining=0;
    function startFocus(minutes){if(!Number.isFinite(minutes)||minutes<=0)return;stopFocus(false);focusTotal=Math.round(minutes*60);focusLeft=focusTotal;focusDeadline=Date.now()+focusTotal*1000;tickFocus();focusTimer=setInterval(tickFocus,250);showToast('بدأت جلسة تركيز','success');}
    function tickFocus(){if(!focusDeadline)return;focusLeft=Math.max(0,Math.ceil((focusDeadline-Date.now())/1000));const m=Math.floor(focusLeft/60),seconds=focusLeft%60;$('#focusLabel').textContent=`${String(m).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;$('#focusBar').style.width=(100-focusLeft/focusTotal*100)+'%';if(focusLeft===0){stopFocus(true);state.focusDone=(state.focusDone||0)+1;saveState();renderTasks();showToast('انتهت الجلسة، أحسنت','success');}}
    function stopFocus(done=false){if(focusTimer)clearInterval(focusTimer);focusTimer=null;focusDeadline=0;if(!done){$('#focusLabel').textContent='25:00';$('#focusBar').style.width='0%';}}
    function resetGrades(render=true){state.grades=coefTemplates[state.branch].map(([name,coef])=>({name,coef,mark:10}));saveState();if(render)renderGrades();}
    function renderGrades(){if(!state.grades)resetGrades(false);$('#gradeRows').innerHTML=state.grades.map((g,i)=>`<div class="grade-row"><input class="small-input" value="${escapeHtml(g.name)}" oninput="state.grades[${i}].name=this.value;saveState();renderAiSelectors()"><input class="small-input" type="number" min="0" max="20" step="0.25" value="${g.mark}" oninput="state.grades[${i}].mark=Number(this.value);saveState()"><input class="small-input" type="number" min="1" value="${g.coef}" oninput="state.grades[${i}].coef=Number(this.value);saveState()"><button class="round-btn" onclick="state.grades.splice(${i},1);saveState();renderGrades()"><i class="fa-solid fa-trash"></i></button></div>`).join('');renderAiSelectors();}
    function addGradeRow(name,coef,mark){state.grades.push({name,coef,mark});saveState();renderGrades();}
    function calcGrade(){if(!state.grades)resetGrades(false);const valid=state.grades.every(g=>Number.isFinite(Number(g.mark))&&Number(g.mark)>=0&&Number(g.mark)<=20&&Number.isFinite(Number(g.coef))&&Number(g.coef)>0&&String(g.mark).trim()!==''&&String(g.coef).trim()!=='');if(!valid){$('#gradeResult').textContent='تحقق من العلامات (0 إلى 20) والمعاملات الموجبة قبل الحساب.';showToast('توجد علامات أو معاملات غير صالحة','warning');return;}const total=state.grades.reduce((a,g)=>a+Number(g.mark)*Number(g.coef),0),coefs=state.grades.reduce((a,g)=>a+Number(g.coef),0);if(!coefs){$('#gradeResult').textContent='أضف مادة واحدة على الأقل.';return;}const avg=total/coefs;$('#gradeResult').textContent=`المعدل التقريبي: ${avg.toFixed(2)}/20\nمجموع المعاملات: ${coefs}\n${avg>=10?'أنت فوق العتبة، ركز على رفع المواد ذات المعامل الكبير.':'تحتاج خطة إنقاذ: ابدأ بالمواد الضعيفة ذات المعامل الكبير.'}`;}
    function neededMark(){const raw=$('#targetAverage').value,target=Number(raw),sub=$('#targetSubject').value;if(raw.trim()===''||!Number.isFinite(target)||target<0||target>20){$('#targetResult').textContent='أدخل هدفاً صحيحاً بين 0 و20.';return;}if(!state.grades?.length){$('#targetResult').textContent='أضف المواد والعلامات أولاً.';return;}if(state.grades.some(g=>String(g.mark).trim()===''||!Number.isFinite(Number(g.mark))||Number(g.mark)<0||Number(g.mark)>20||String(g.coef).trim()===''||!Number.isFinite(Number(g.coef))||Number(g.coef)<=0)){$('#targetResult').textContent='صحح العلامات والمعاملات غير الصالحة أولاً.';return;}let total=0,coefs=0,targetCoef=0;state.grades.forEach(g=>{const c=Number(g.coef);if(g.name===sub)targetCoef+=c;else total+=Number(g.mark)*c;coefs+=c;});if(!targetCoef){$('#targetResult').textContent='المادة غير موجودة.';return;}const need=(target*coefs-total)/targetCoef;$('#targetResult').textContent=`للوصول إلى ${target.toFixed(2)}/20 تحتاج ${Math.max(0,need).toFixed(2)}/20 في ${sub}.\n${need>20?'الهدف غير ممكن بتغيير علامة هذه المادة وحدها.':need<=0?'تحقق الهدف حتى مع علامة صفر في هذه المادة.':'الهدف ممكن حسابياً وفق بقية العلامات الحالية.'}`;}
    function renderProgress(){
      cleanSpecialProgress();
      const list=getNormalSubjects();
      $('#progressRows').innerHTML=list.length?list.map(s=>`<div class="progress-row"><strong>${escapeHtml(s.name)}</strong><input class="range" type="range" min="0" max="100" value="${state.progress[s.id]||0}" oninput="state.progress['${s.id}']=Number(this.value);this.nextElementSibling.textContent=this.value+'%';saveState();renderStats();renderAiSelectors()"><span>${state.progress[s.id]||0}%</span></div>`).join(''):'<p class="muted">لا توجد مواد دراسية لهذه الشعبة حالياً.</p>';
      renderMistakes();
    }
    function addMistake(){const t=$('#mistakeInput').value.trim();if(!t)return;state.mistakes.unshift({text:t,date:new Date().toLocaleDateString('ar-DZ')});$('#mistakeInput').value='';saveState();renderMistakes();}
    function renderMistakes(){$('#mistakeList').innerHTML=state.mistakes.length?state.mistakes.map((m,i)=>`<div class="mistake-row"><p><strong>${m.date}</strong><br>${escapeHtml(m.text)}</p><button class="round-btn" onclick="state.mistakes.splice(${i},1);saveState();renderMistakes()"><i class="fa-solid fa-trash"></i></button></div>`).join(''):'<p class="muted" style="margin-top:10px">لا توجد أخطاء مسجلة.</p>';}
    function clearMistakes(){if(confirm('مسح كل الأخطاء؟')){state.mistakes=[];saveState();renderMistakes();}}
    async function loadVideos(){const urls=[CONFIG.videosCsvUrl,'https://api.allorigins.win/raw?url='+encodeURIComponent(CONFIG.videosCsvUrl)];for(const url of urls){try{const res=await fetch(url,{cache:'no-store'});if(!res.ok)continue;const rows=parseCsv(await res.text());const h=rows.findIndex(r=>normalize(r.join(',')).includes('title'));if(h<0)continue;const vids=rows.slice(h+1).map(r=>({title:r[0],url:r.slice(1).join(',')})).filter(v=>v.title);if(vids.length){loadedVideos=vids;renderResources();showToast('تم تحميل الفيديوهات','success');return;}}catch(e){}}loadedVideos=defaultVideos;renderResources();showToast('استُخدمت فيديوهات احتياطية','warning');}
    function renderResources(){$('#resourcesGrid').innerHTML=resources.map(r=>`<div class="card"><h3><span>${r[0]}</span> ${r[1]}</h3>${r[1].includes('فيديوهات')?loadedVideos.map(v=>v.url&&v.url.startsWith('http')?`<a class="resource-item" target="_blank" rel="noopener" href="${escapeHtml(v.url)}"><i class="fa-solid fa-play-circle"></i>${escapeHtml(v.title)}</a>`:`<div class="resource-item"><i class="fa-solid fa-play-circle"></i>${escapeHtml(v.title)} <span class="soft">(قريباً)</span></div>`).join(''):r[2].map(x=>`<div class="resource-item"><i class="fa-solid fa-check"></i>${escapeHtml(x)}</div>`).join('')}</div>`).join('');}
    function copyText(text,msg='تم النسخ'){if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>showToast(msg,'success')).catch(()=>fallbackCopy(text,msg));else fallbackCopy(text,msg);}
    function fallbackCopy(text,msg){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showToast(msg,'success');}
    function toggleTheme(){state.theme=state.theme==='light'?'dark':'light';saveState();applyTheme();}
    function applyTheme(){document.body.classList.toggle('light-mode',state.theme==='light');const icon=$('#themeToggleBtn i');if(icon)icon.className=state.theme==='light'?'fa-solid fa-sun':'fa-solid fa-moon';}
    function updateCountdown(){const diff=Math.max(0,CONFIG.bacStart.getTime()-Date.now());const d=Math.floor(diff/86400000),h=Math.floor(diff/3600000)%24,m=Math.floor(diff/60000)%60,s=Math.floor(diff/1000)%60;$('#cdDays').textContent=String(d).padStart(3,'0');$('#cdHours').textContent=String(h).padStart(2,'0');$('#cdMins').textContent=String(m).padStart(2,'0');$('#cdSecs').textContent=String(s).padStart(2,'0');const start=new Date('2025-09-01T00:00:00+01:00').getTime();const pct=Math.max(0,Math.min(100,(Date.now()-start)/(CONFIG.bacStart.getTime()-start)*100));$('#yearProgress').style.width=pct+'%';}
    function showToast(message,type='info'){const div=document.createElement('div');div.className='toast';const icon=type==='success'?'fa-circle-check':type==='warning'?'fa-triangle-exclamation':type==='danger'?'fa-circle-xmark':'fa-circle-info';div.innerHTML=`<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;$('#toastArea').appendChild(div);setTimeout(()=>div.remove(),3200);}
    function initCanvas(){const c=$('#bgCanvas');if(!c||matchMedia('(prefers-reduced-motion: reduce)').matches||matchMedia('(max-width: 760px)').matches)return;const ctx=c.getContext('2d');if(!ctx)return;let pts=[];function resize(){c.width=innerWidth;c.height=innerHeight;pts=Array.from({length:Math.min(80,Math.floor(innerWidth/18))},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*2+.5,vx:(Math.random()-.5)*.26,vy:(Math.random()-.5)*.26}));}function draw(){ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='rgba(129,140,248,.55)';pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>c.width)p.vx*=-1;if(p.y<0||p.y>c.height)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});requestAnimationFrame(draw)}resize();addEventListener('resize',resize);draw();}
    function renderAll(){
      // Landing, contributor and admin have their own HTML entry points and
      // deliberately do not contain (or initialize) student-only DOM controls.
      if(document.body.dataset.portal!=='student'){applyTheme();return;}
      cleanSpecialProgress();
      if(typeof window.renderChapters==='function')window.renderChapters();
      renderNavs();renderBranches();renderFilters();renderSubjects();
      renderAgents();renderTasks();renderGrades();renderProgress();renderResources();
      applyTheme();renderHomeSummary();updateAIModeIndicator();
    }

    function showAuthNotice(message,type='info'){
      const note=$('#authSetupNotice');if(!note)return;
      note.textContent=message;note.dataset.status=type;
    }
    function switchLoginTab(tab){
      document.body.dataset.authTab=tab==='signup'?'signup':'login';
      const heading=$('#loginHeading'),subtitle=$('#authSubtitle');
      if(heading)heading.textContent=tab==='signup'?'أنشئ حسابك.':'أهلاً بعودتك.';
      if(subtitle)subtitle.textContent=tab==='signup'?'ابدأ رحلتك الدراسية بحساب شخصي مجاني.':'تابع مراجعتك من حيث توقفت، بخطوة واحدة.';
      showAuthNotice('');
      $('#passwordRecoveryPanel')?.classList.add('hidden');
      $$('.login-tab').forEach(button=>button.classList.remove('hidden'));
      $('#authResetButton')?.classList.remove('hidden');
      $('#loginMainTab')?.classList.toggle('active',tab==='login');
      $('#signupMainTab')?.classList.toggle('active',tab==='signup');
      $('#loginMainForm')?.classList.toggle('hidden',tab!=='login');
      $('#signupMainForm')?.classList.toggle('hidden',tab!=='signup');
      $('#loginMainTab')?.setAttribute('aria-selected',String(tab==='login'));
      $('#signupMainTab')?.setAttribute('aria-selected',String(tab==='signup'));
      const source=tab==='signup'?'loginEmailInput':'signupEmailInput',target=tab==='signup'?'signupEmailInput':'loginEmailInput';
      if($('#'+source)?.value&&!$('#'+target)?.value)$('#'+target).value=$('#'+source).value;
    }
    let signupIntent='student';
    function setSignupIntent(intent='student'){
      signupIntent=intent==='collaborator'?'collaborator':'student';
      $('#signupKindStudent')?.classList.toggle('active',signupIntent==='student');
      $('#signupKindCollaborator')?.classList.toggle('active',signupIntent==='collaborator');
      $('#signupKindStudent')?.setAttribute('aria-pressed',String(signupIntent==='student'));
      $('#signupKindCollaborator')?.setAttribute('aria-pressed',String(signupIntent==='collaborator'));
      $('#signupCollabExtras')?.classList.toggle('hidden',signupIntent!=='collaborator');
      const hint=$('#signupRoleDescription');
      if(hint)hint.textContent=signupIntent==='collaborator'?
        'بعد إنشاء حسابك وتأكيد بريدك، أكمل بيانات المساهم والشعبة في مساحتك. قبول الطلب بيد الإدارة.':
        'سجّل حساب طالب للاطلاع على المواد وإنشاء بطاقات المراجعة.';
    }
    function openLoginGate(showModal=false){
      // Standalone /login/ is the actual authentication page, not a popup.
      if(document.body.dataset.portal==='login')showModal=true;
      const gate=$('#loginGate');
      if(!gate)return;
      document.body.classList.remove('authenticated');
      document.body.classList.add('public-mode');
      document.querySelector('.app-shell')?.setAttribute('inert','');
      gate.classList.toggle('hidden',!showModal);
      document.body.classList.toggle('auth-modal-open',showModal);
      if(showModal&&!document.activeElement?.closest?.('#loginGate'))
        requestAnimationFrame(()=>$('#loginEmailInput')?.focus({preventScroll:true}));
    }
    function openAuthModal(tab='login',intent='student'){
      if(document.body.dataset.portal!=='login'){
        const query=new URLSearchParams({tab:tab==='signup'?'signup':'login',role:intent==='collaborator'?'collaborator':'student'});
        location.assign('/login/?'+query.toString());
        return;
      }
      if(studentAuthUser){window.refreshPortalRole?.();return;}
      setSignupIntent(intent);
      switchLoginTab(tab==='signup'?'signup':'login');
      openLoginGate(true);
      requestAnimationFrame(()=>$('#'+(tab==='signup'?'signupNameInput':'loginEmailInput'))?.focus({preventScroll:true}));
    }
    function closeAuthModal(){
      if(document.body.dataset.portal==='login'){location.assign('/');return;}
      if(studentAuthUser)return;
      $('#loginGate')?.classList.add('hidden');
      document.body.classList.remove('auth-modal-open');
      document.body.classList.add('public-mode');
      const recovery=$('#passwordRecoveryPanel');
      if(recovery&&!recovery.classList.contains('hidden'))switchLoginTab('login');
      const note=$('#authSetupNotice');if(note)note.textContent='';
    }
    function closeLoginGate(){
      if(!studentAuthUser)return;
      const gate=$('#loginGate');
      if(gate)gate.classList.add('hidden');
      document.body.classList.add('authenticated');
      document.body.classList.remove('public-mode','auth-modal-open');
      document.querySelector('.app-shell')?.removeAttribute('inert');
    }
    let studentAuth=null,studentAuthUser=null,authLoading=false,authCooldownUntil=0;
    function authConfigured(){
      const c=window.BAC_SUPABASE||{};
      return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.url||'') && /^sb_publishable_|^eyJ/.test(c.anonKey||'');
    }
    function getStudentAuth(){
      if(studentAuth)return studentAuth;
      if(!authConfigured()||!window.supabase?.createClient)return null;
      const c=window.BAC_SUPABASE;
      studentAuth=window.supabase.createClient(c.url,c.anonKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
      return studentAuth;
    }
    function authErrorMessage(e){
      const m=String(e?.message||'');
      const code=String(e?.code||e?.name||'');
      const detail=(m+' '+code).toLowerCase();
      if(/535|5\\.7\\.8|smtp.*authentication failed|authentication failed.*smtp/.test(detail)){
        return 'فشل إرسال رسالة التأكيد بسبب إعدادات خادم البريد (SMTP). تواصل مع إدارة المنصة لإصلاح الإرسال؛ لا تعطل تأكيد البريد.';
      }
      if(/email not confirmed/.test(detail))return 'تحقق من رسالة تأكيد الحساب في بريدك الإلكتروني قبل تسجيل الدخول.';
      if(/unexpected_failure|error sending confirmation email/.test(detail))return 'تعذر إرسال رسالة التأكيد. تواصل مع إدارة المنصة للتحقق من إعدادات البريد الإلكتروني.';
      if(/invalid login credentials/.test(detail)){
        return 'هذا البريد أو كلمة المرور غير صحيحين. إذا كان الحساب موجوداً، استخدم استعادة كلمة المرور بدلاً من إنشاء حساب جديد.';
      }
      if(/already registered|user_already_exists/.test(detail)){
        return 'هذا البريد مسجل مسبقاً. انتقل إلى تسجيل الدخول أو استعادة كلمة المرور.';
      }
      if(/rate limit|over_email_send_rate_limit|too many requests|429/.test(detail)){
        return 'تم بلوغ حد المحاولات. انتظر قليلاً ثم حاول مجدداً.';
      }
      if(/network|failed to fetch|fetch failed|load failed/.test(detail)){
        return 'تعذر الوصول إلى Supabase. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.';
      }
      if(/password/.test(detail))return 'تحقق من كلمة المرور؛ يجب أن تتكون من 8 أحرف على الأقل.';
      console.error('[Bac-pedia Auth]',{message:m,code,status:e?.status});
      return 'فشل طلب المصادقة. افتح الموقع المنشور بعد تحديثه، وإذا استمرت المشكلة أرسل تفاصيل الخطأ من وحدة التحكم.';
    }
    function updatePasswordStrength(){
      const password=$('#signupPassInput')?.value||'';
      const indicator=$('#passwordStrengthStatus'),bar=$('#passwordStrengthBar');
      if(!indicator||!bar)return;
      const length=password.length>=8,letter=/\p{L}/u.test(password),digit=/\d/.test(password),long=password.length>=12,symbol=/[^\p{L}\d]/u.test(password);
      const score=[length,letter,digit,long,symbol].filter(Boolean).length;
      bar.style.width=(password?Math.max(12,score*20):0)+'%';
      bar.style.background=length&&letter&&digit?(long&&symbol?'#10b981':'#a78bfa'):'#f59e0b';
      indicator.firstChild.textContent=!password?'استعمل 8 أحرف على الأقل، مع حرف ورقم.':length&&letter&&digit?'كلمة المرور تستوفي الشروط الأساسية.':'أضف '+(!length?'8 أحرف على الأقل':'حرفاً ورقماً')+' لإكمال الشروط.';
    }
    function togglePasswordVisibility(inputId,button){
      const input=$('#'+inputId);if(!input)return;
      const reveal=input.type==='password';input.type=reveal?'text':'password';
      button.innerHTML=reveal?'<i class="fa-solid fa-eye-slash"></i>':'<i class="fa-solid fa-eye"></i>';
      button.setAttribute('aria-label',reveal?'إخفاء كلمة المرور':'إظهار كلمة المرور');
    }
    function setAuthBusy(busy){
      authLoading=busy;
      ['loginEmailInput','loginPassInput','signupEmailInput','signupPassInput','signupNameInput','recoveryPasswordInput','recoveryPasswordConfirmInput'].forEach(id=>{const el=$('#'+id);if(el)el.disabled=busy});
      document.querySelectorAll('#loginGate .login-form button, #loginGate .auth-reset, #loginGate .login-tab').forEach(button=>{button.disabled=busy;if(button.classList.contains('btn')){button.setAttribute('aria-busy',String(busy));}});
    }
    async function syncStudentProgress(){
      if(!studentAuth||!studentAuthUser)return;
      const userId=studentAuthUser.id;
      const data={branch:state.branch,subBranch:state.subBranch,progress:state.progress,tasks:state.tasks,mistakes:state.mistakes,grades:state.grades,favorites:state.favorites,focusDone:state.focusDone,aiProfile:state.aiProfile,theme:state.theme,aiHistory:state.aiHistory};
      const {error}=await studentAuth.from('student_progress').upsert({user_id:userId,data,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(error)console.warn('Cloud progress sync failed:',error.message);
    }
    async function loadStudentProgress(){
      if(!studentAuth||!studentAuthUser?.id)return;
      const userId=studentAuthUser.id;
      let localSnapshot=null;
      try{localSnapshot=JSON.parse(localStorage.getItem(userStorageKey(userId))||'null');}catch(error){console.warn('Private local cache could not be read:',error);}
      const {data,error}=await studentAuth.from('student_progress').select('data').eq('user_id',userId).maybeSingle();
      if(studentAuthUser?.id!==userId)return;
      if(error){console.warn('Cloud progress load failed:',error.message);if(localSnapshot)applyStudentData(localSnapshot);else resetStudentData();renderAll();return;}
      if(data?.data&&typeof data.data==='object')applyStudentData(data.data);
      else if(localSnapshot){applyStudentData(localSnapshot);await syncStudentProgress();}
      else resetStudentData();
      renderAll();
    }
    async function applyStudentSession(session){
      const u=session?.user||null;
      if(!u){studentAuthUser=null;state.user=null;state.guest=false;resetStudentData();renderAll();renderSession();openLoginGate();if(document.body.dataset.portal!=='landing')window.location.replace('/');return;}
      if(!u.email_confirmed_at){
        studentAuthUser=null;state.user=null;state.guest=false;resetStudentData();
        renderAll();renderSession();openLoginGate();
        showAuthNotice('يرجى تأكيد البريد الإلكتروني قبل فتح حسابك.','warning');
        if(studentAuth)void studentAuth.auth.signOut().catch(error=>console.warn('Unconfirmed session sign-out failed:',error));
        if(document.body.dataset.portal!=='landing')window.location.replace('/');
        return;
      }
      resetStudentData();studentAuthUser=u;state.guest=false;
      state.user={name:u.user_metadata?.full_name||u.email?.split('@')[0]||'طالب',email:u.email,mode:'supabase'};
      renderAll();renderSession();closeLoginGate();
      window.onCommunityAuthChanged?.();
      // Roles come from RLS-protected database rows, not user-editable signup metadata.
      // Enter immediately; cloud hydration and last-activity tracking must not block the interface.
      void loadStudentProgress().catch(error=>console.warn('Progress hydration failed:',error));
      void studentAuth.from('student_profiles').update({last_activity_at:new Date().toISOString()}).eq('user_id',u.id).then(({error})=>{if(error)console.warn('Student profile activity update failed:',error.message);});
    }

    async function initStudentAuth(){
      const auth=getStudentAuth();
      const note=$('#authSetupNotice');
      if(!auth){
        if(note)note.textContent='تعذّر الاتصال بخدمة الحسابات. أعد تحميل الصفحة أو تواصل مع إدارة المنصة.';
        studentAuthUser=null;state.user=null;state.guest=false;resetStudentData();renderAll();renderSession();openLoginGate();if(document.body.dataset.portal!=='landing')window.location.replace('/');return;
      }
      if(note)note.textContent='';
      let recoveryFlow=/(?:^|[&#?])type=recovery(?:&|$)/i.test(location.hash+location.search);
      auth.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'){
          recoveryFlow=true;
          if(session?.user){resetStudentData();studentAuthUser=session.user;state.guest=false;}
          setTimeout(()=>{openLoginGate(true);completePasswordRecovery();},0);
          return;
        }
        if(event==='SIGNED_OUT'){studentAuthUser=null;state.user=null;state.guest=false;resetStudentData();window.onCommunityAuthChanged?.();renderAll();renderSession();openLoginGate();if(document.body.dataset.portal!=='landing')window.location.replace('/');return;}
        if((event==='SIGNED_IN'||event==='USER_UPDATED')&&!recoveryFlow)setTimeout(()=>{if(session?.user?.id!==studentAuthUser?.id)void applyStudentSession(session);},0);
      });
      const {data,error}=await auth.auth.getSession();
      if(error)console.warn('Auth session error:',error.message);
      if(recoveryFlow){
        if(data?.session){
          resetStudentData();studentAuthUser=data.session.user;state.guest=false;
          openLoginGate(true);completePasswordRecovery();
        }else{
          studentAuthUser=null;state.user=null;state.guest=false;resetStudentData();renderAll();renderSession();openLoginGate();
          showToast('رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.','warning');
        }
        return;
      }
      if(data?.session){
        // Revalidate a stored session with Supabase Auth before revealing private data.
        const verified=await auth.auth.getUser();
        if(verified.error||!verified.data?.user?.id){
          console.warn('Saved session is no longer valid:',verified.error?.message);
          await auth.auth.signOut();openLoginGate();
        }else if(verified.data.user.id!==studentAuthUser?.id){
          await applyStudentSession({...data.session,user:verified.data.user});
        }
      }
      else if(!studentAuthUser){studentAuthUser=null;state.user=null;state.guest=false;resetStudentData();renderAll();renderSession();openLoginGate();if(document.body.dataset.portal!=='landing')window.location.replace('/');}
    }

    function enterAsGuest(){
      openLoginGate();
      showToast('يجب إنشاء حساب أو تسجيل الدخول لاستعمال المنصة','warning');
    }
    async function loginWithForm(){
      const auth=getStudentAuth();
      if(!auth){showToast('يجب ربط Supabase أولاً','warning');return;}
      if(authLoading)return;
      const email=($('#loginEmailInput')?.value||'').trim();
      const password=$('#loginPassInput')?.value||'';
      if(!email||!password){showToast('أدخل البريد الإلكتروني وكلمة المرور','warning');return;}
      setAuthBusy(true);showAuthNotice('جارٍ تسجيل الدخول...');
      try{
        const {data,error}=await auth.auth.signInWithPassword({email,password});
        if(error)throw error;
        if(data.session?.user?.id!==studentAuthUser?.id)await applyStudentSession(data.session);
        $('#loginPassInput').value='';
        showAuthNotice('');showToast('تم تسجيل الدخول بنجاح','success');
      }catch(e){showAuthNotice(authErrorMessage(e),'warning');showToast(authErrorMessage(e),'danger')}
      finally{setAuthBusy(false)}
    }
    async function signupWithForm(){
      if(Date.now()<authCooldownUntil){showAuthNotice('انتظر بضع ثوانٍ قبل إعادة المحاولة.','warning');return;}
      const auth=getStudentAuth();
      if(!auth){showToast('يجب ربط Supabase أولاً','warning');return;}
      if(authLoading)return;
      const email=($('#signupEmailInput')?.value||'').trim();
      const password=$('#signupPassInput')?.value||'';
      const fullName=($('#signupNameInput')?.value||'').trim();
      // Contributor profile is completed in the contributor dashboard after signup.
      // An editable signup intent is never an access-control grant.
      const contributorInfo={};
      if(fullName.length<2){showToast('اكتب اسمك الكامل لإنشاء الحساب','warning');return;}
      if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8||! /\p{L}/u.test(password)||! /\d/.test(password)){
        showToast('أدخل بريداً صحيحاً وكلمة مرور من 8 أحرف على الأقل تحتوي على حرف ورقم','warning');return;
      }
      setAuthBusy(true);showAuthNotice('جارٍ إنشاء الحساب...');
      try{
        const {data,error}=await auth.auth.signUp({
          email,password,
          options:{
            emailRedirectTo:location.origin+location.pathname,
            data:{full_name:fullName,signup_intent:signupIntent,...contributorInfo}
          }
        });
        if(error)throw error;
        if(!data.session){
          if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0)throw new Error('already registered');
          authCooldownUntil=Date.now()+120000;
          $('#signupPassInput').value='';updatePasswordStrength();
          switchLoginTab('login');
          $('#loginEmailInput').value=email;
          showAuthNotice('تم إنشاء طلب الحساب. افتح رسالة التأكيد في بريدك الإلكتروني ثم سجّل الدخول.','success');
          showToast('أرسلنا رسالة تأكيد إن كان البريد متاحاً. تحقق من البريد غير الهام أيضاً.','info');
          return;
        }
        authCooldownUntil=Date.now()+5000;
        await applyStudentSession(data.session);
        $('#signupPassInput').value='';updatePasswordStrength();
        $('#loginEmailInput').value=email;
        $('#loginPassInput').value='';
        showAuthNotice('');
        showToast('تم إنشاء الحساب وتسجيل الدخول بنجاح','success');
      }catch(e){
        if(/rate limit|429|too many requests/i.test(String(e?.message||'')))authCooldownUntil=Date.now()+120000;
        const message=authErrorMessage(e);
        showAuthNotice(message,'warning');
        showToast(message,'warning');
      }finally{setAuthBusy(false);}
    }
    async function completePasswordRecovery(){
      if(!getStudentAuth())return;
      $('#loginMainForm')?.classList.add('hidden');$('#signupMainForm')?.classList.add('hidden');
      $('#passwordRecoveryPanel')?.classList.remove('hidden');$$('.login-tab').forEach(tab=>tab.classList.add('hidden'));
      $('#authResetButton')?.classList.add('hidden');$('#recoveryPasswordInput')?.focus();
    }
    async function saveRecoveredPassword(){
      const auth=getStudentAuth(),password=$('#recoveryPasswordInput')?.value||'',confirmation=$('#recoveryPasswordConfirmInput')?.value||'';
      if(authLoading)return;
      if(password.length<8){showToast('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل','warning');return;}
      if(password!==confirmation){showToast('تأكيد كلمة المرور غير مطابق','warning');return;}
      setAuthBusy(true);
      try{const {error}=await auth.auth.updateUser({password});if(error)throw error;history.replaceState(null,'',location.pathname+location.search);$('#passwordRecoveryPanel')?.classList.add('hidden');const {data}=await auth.auth.getSession();if(data?.session)await applyStudentSession(data.session);else throw new Error('تعذر استعادة جلسة الحساب بعد تحديث كلمة المرور');showToast('تم تحديث كلمة المرور بنجاح','success');}
      catch(error){showToast(authErrorMessage(error),'danger');}finally{setAuthBusy(false);}
    }

    async function resetStudentPassword(){
      const auth=getStudentAuth();
      if(!auth){showToast('يجب ربط Supabase أولاً','warning');return;}
      if(authLoading)return;
      const email=($('#loginEmailInput')?.value||'').trim();
      if(!/^\S+@\S+\.\S+$/.test(email)){showToast('اكتب بريدك الإلكتروني أولاً','warning');return;}
      setAuthBusy(true);
      try{
        const {error}=await auth.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
        showToast(error?authErrorMessage(error):'إذا كان البريد مسجلاً فستصلك رسالة لاستعادة كلمة المرور',error?'warning':'success');
      }catch(error){showToast(authErrorMessage(error),'warning');}
      finally{setAuthBusy(false);}
    }
    async function logoutUser(){
      clearTimeout(cloudSaveTimer);
      if(studentAuth){const {error}=await studentAuth.auth.signOut();if(error){showToast(authErrorMessage(error),'warning');return;}}
      studentAuthUser=null;state.user=null;state.guest=false;state.page='home';
window.onCommunityAuthChanged?.();resetStudentData();renderAll();
      renderSession();showPage('home');openLoginGate();showToast('تم تسجيل الخروج','info');
    }
    function renderSession(){
      const u=state.user;
      const name=u?.name || (state.guest?'زائر':'غير مسجل');
      const mail=state.guest?'وضع الزائر':(u?.email || 'ادخل لحفظ تجربتك محلياً');
      if($('#sessionName'))$('#sessionName').textContent=name;
      if($('#sessionMail'))$('#sessionMail').textContent=mail;
      if($('#userTopBtn'))$('#userTopBtn').innerHTML='<i class="fa-solid '+(u||state.guest?'fa-user-check':'fa-user')+'"></i>';
      const card=$('#sessionCard');
      if(card){
        const old=card.querySelector('.logout-mini');
        if(old)old.remove();
        if(u||state.guest){
          const b=document.createElement('button');b.className='round-btn logout-mini';b.title='خروج';b.onclick=logoutUser;b.innerHTML='<i class="fa-solid fa-right-from-bracket"></i>';card.appendChild(b);
        }
      }
    }
    function afterLoginLanding(){
      if(!studentAuthUser){openLoginGate();return;}
      state.page='home';
      saveState();showPage('home');closeLoginGate();
    }
    function initSession(){
      state.guest=false;state.user=null;studentAuthUser=null;
      document.querySelector('.app-shell')?.setAttribute('inert','');
      renderSession();openLoginGate();
      initStudentAuth().catch(e=>{
        console.warn('Auth init:',e);
        const note=$('#authSetupNotice');
        if(note)note.textContent='تعذّر الاتصال بالخادم. حاول تحديث الصفحة.';
        openLoginGate();
      });
    }
    window.addEventListener('error',e=>{console.warn('Website error handled:',e.message);});
    window.addEventListener('unhandledrejection',e=>{console.warn('Promise error handled:',e.reason);});

    function initAuthKeyboard(){
      [['loginMainForm','loginWithForm'],['signupMainForm','signupWithForm'],['passwordRecoveryPanel','saveRecoveredPassword']].forEach(([id,handler])=>{
        $('#'+id)?.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.tagName==='INPUT'&&!authLoading){event.preventDefault();window[handler]?.();}});
      });
    }
    function init(){
      initAuthKeyboard();
      const portal=document.body.dataset.portal||'landing';
      if(portal==='login'){
        const search=new URLSearchParams(location.search);
        setSignupIntent(search.get('role')==='collaborator'?'collaborator':'student');
        switchLoginTab(search.get('tab')==='signup'?'signup':'login');
      }
      if(portal==='student'){
        applyBackupUrls();
        initCanvas();
        renderAll();
        if(!isMobileSidebar())document.body.classList.remove('sidebar-collapsed');
        updateSidebarButton();
        updateCountdown();
        setInterval(updateCountdown,1000);
        loadResourceManifest();
        void checkAIAvailability();
      }else{
        // Non-student entry points never touch student-only page elements.
        applyTheme();
      }
      initSession();
      window.addEventListener('resize',()=>{
        if(!isMobileSidebar()){
          document.body.classList.remove('sidebar-open');
          $('#sidebarOverlay')?.classList.remove('show');
          $('#sidebar')?.classList.remove('show');
        }
        updateSidebarButton();
      });
      document.addEventListener('keydown',event=>{
        if(event.key==='Escape'){
          closeModal();closeSidebar();
          if(!studentAuthUser&&!$('#loginGate')?.classList.contains('hidden'))closeAuthModal();
        }
        if(portal==='student'&&(event.key==='Enter'||event.key===' ')&&event.target.classList?.contains('agent-card')){
          event.preventDefault();event.target.click();
        }
      });
    }
    init();
  