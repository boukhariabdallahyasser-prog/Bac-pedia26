(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BacSearch = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const groups = [
    ['رياضيات','الرياضيات','math','maths','mathematics','mathematiques','mathematique'],
    ['فيزياء','الفيزياء','physique','physics','phys'],
    ['كيمياء','الكيمياء','chimie','chemistry'],
    ['علوم','العلوم','علوم طبيعية','بيولوجيا','biologie','svt','science','sciences'],
    ['عربية','العربية','العربيه','arabe','arabic'],
    ['فرنسية','الفرنسية','francais','français','french'],
    ['انجليزية','الانجليزية','english','anglais','anglaise'],
    ['فلسفة','الفلسفة','philosophie','philo'],
    ['تاريخ','التاريخ','histoire','history'],
    ['جغرافيا','الجغرافيا','geographie','geography'],
    ['اسلامية','الاسلامية','الشريعة','islamique'],
    ['دوال','الدوال','الدالة','fonctions','fonction','functions','function'],
    ['متتاليات','المتتاليات','متتالية','suites','suite','sequences'],
    ['احتمالات','الاحتمالات','probabilites','probabilite','probability','proba'],
    ['مركبة','المركبة','الاعداد المركبة','complexes','complexe'],
    ['ميكانيك','ميكانيكية','الميكانيك','mecanique','mechanics'],
    ['كهربائية','الكهربائية','كهرباء','electricite','electricity'],
    ['مراجعة','المراجعة','revision','revisions','review'],
    ['بكالوريا','البكالوريا','bac','baccalaureat','baccalauréat'],
    ['تمارين','التمارين','exercices','exercice','exercise','exercises'],
    ['دروس','الدروس','cours','lecons','lesson','lessons'],
    ['ملخصات','الملخصات','ملخص','resume','resumes','summaries','summary'],
    ['مواضيع','المواضيع','sujets','sujet','annales','papers'],
    ['اختبارات','الاختبارات','فروض','tests','examens','exams'],
    ['هندسة','الهندسة','ingenierie','engineering']
  ];

  function normalize(value) {
    return String(value == null ? '' : value).normalize('NFD')
      .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
      .replace(/[آأإٱ]/g, 'ا').replace(/[يى]/g, 'ي')
      .replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776))
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  }

  const aliases = groups.map(group => [...new Set(group.map(normalize))]);
  function variants(term) {
    const found = new Set([term]);
    for (const group of aliases) if (group.includes(term)) group.forEach(x => found.add(x));
    return [...found];
  }

  function distance(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let previous = Array.from({length: b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const current = [i];
      let minimum = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const value = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
        current.push(value);
        minimum = Math.min(minimum, value);
      }
      if (minimum > limit) return limit + 1;
      previous = current;
    }
    return previous[b.length];
  }

  function score(item, rawQuery) {
    const q = normalize(rawQuery);
    if (!q) return 1;
    const title = normalize(item.title);
    const subject = normalize(item.subjectName);
    const category = normalize(item.categoryName);
    const body = normalize([item.title, item.subjectName, item.categoryName, item.keywords || ''].join(' '));
    if (!body) return 0;
    let points = title === q ? 180 : title.startsWith(q) ? 110 : title.includes(q) ? 75 : body.includes(q) ? 45 : 0;
    const tokens = [...new Set(q.split(' ').filter(Boolean))].slice(0, 8);
    const words = body.split(' ').filter(Boolean);
    let covered = 0;
    for (const term of tokens) {
      let match = 0;
      for (const form of variants(term)) {
        if (title.split(' ').includes(form)) match = Math.max(match, 55);
        else if (title.includes(form)) match = Math.max(match, 40);
        else if (category.includes(form)) match = Math.max(match, 34);
        else if (subject.includes(form)) match = Math.max(match, 23);
        else if (body.includes(form)) match = Math.max(match, 15);
      }
      if (!match && term.length >= 4) {
        const limit = term.length >= 7 ? 2 : 1;
        if (words.some(word => Math.abs(word.length - term.length) <= limit && distance(term, word, limit) <= limit)) match = 12;
      }
      if (match) { points += match; covered++; }
    }
    if (!covered && !points) return 0;
    if (tokens.length > 1 && covered < Math.ceil(tokens.length * 0.6)) return 0;
    return points + (covered === tokens.length ? 22 : 0);
  }

  function search(items, query, options = {}) {
    const q = normalize(query);
    return (Array.isArray(items) ? items : [])
      .filter(item =>
        (!options.subject || item.subjectId === options.subject) &&
        (!options.type || options.type === 'all' || item.type === options.type) &&
        (!options.availableOnly || !!item.url) &&
        (!options.favoritesOnly || !!item.favorite))
      .map(item => ({...item, relevance: score(item, q)}))
      .filter(item => !q || item.relevance > 0)
      .sort((a,b) => {
        if (options.sort === 'az') return String(a.title).localeCompare(String(b.title),'ar');
        if (options.sort === 'subject') return String(a.subjectName).localeCompare(String(b.subjectName),'ar') || String(a.title).localeCompare(String(b.title),'ar');
        return b.relevance - a.relevance || ({subject:0,folder:1,file:2}[a.type] ?? 3) - ({subject:0,folder:1,file:2}[b.type] ?? 3) || String(a.title).localeCompare(String(b.title),'ar');
      });
  }

  function suggest(query, items, max = 4) {
    const q = normalize(query).split(' ').filter(Boolean).pop();
    if (!q || q.length < 3) return [];
    const dictionary = new Map();
    for (const item of items || []) {
      for (const original of String([item.title,item.subjectName,item.categoryName].filter(Boolean).join(' ')).split(/\s+/)) {
        const word = normalize(original);
        if (word.length >= 3 && word.length <= 24 && !dictionary.has(word)) dictionary.set(word, original);
      }
    }
    aliases.flat().forEach(word => { if (!dictionary.has(word)) dictionary.set(word,word); });
    return [...dictionary.entries()]
      .map(([word,label]) => ({word,label,d:distance(q,word,2)}))
      .filter(entry => entry.d > 0 && entry.d <= 2)
      .sort((a,b) => a.d - b.d || a.word.length - b.word.length)
      .slice(0,max).map(entry => entry.label);
  }
  return {normalize, score, search, suggest};
});
