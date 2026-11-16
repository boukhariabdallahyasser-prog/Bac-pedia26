/* Accessible, injection-safe Markdown reader for generated AI answers.
 * Model text is inserted ONLY with textContent or text nodes.
 */
(function(){
  'use strict';
  const MAX_CHARS=30000;
  function part(tag,text,cls){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    node.dir='auto';
    return node;
  }
  function addInline(parent,raw){
    const input=String(raw||'');
    const pattern=/(\*\*[^*\n]+\*\*|\x60[^\x60\n]+\x60)/g;
    let start=0,match;
    while((match=pattern.exec(input))!==null){
      if(match.index>start)parent.appendChild(document.createTextNode(input.slice(start,match.index)));
      const segment=match[0];
      const isBold=segment.startsWith('**');
      const node=part(isBold?'strong':'code',isBold?segment.slice(2,-2):segment.slice(1,-1));
      parent.appendChild(node);start=match.index+segment.length;
    }
    if(start<input.length)parent.appendChild(document.createTextNode(input.slice(start)));
  }
  function renderAnswer(target,answer){
    if(!target)return;
    const raw=String(answer??'').slice(0,MAX_CHARS).replace(/\r\n?/g,'\n');
    target.dataset.rawAnswer=raw;
    target.replaceChildren();
    const root=document.createDocumentFragment();
    const lines=raw.split('\n');
    let paragraph=[],list=null,codeBlock=null,table=null;
    function flushParagraph(){
      if(!paragraph.length)return;
      const node=part('p',undefined,'ai-paragraph');
      addInline(node,paragraph.join('\n'));
      root.appendChild(node);paragraph=[];
    }
    function endList(){list=null;}
    function endCode(){if(codeBlock){root.appendChild(codeBlock);codeBlock=null;}}
    function endTable(){if(table){root.appendChild(table);table=null;}}
    for(const line of lines){
      const trim=line.trim();
      if(/^\x60{3}/.test(trim)){
        flushParagraph();endList();endTable();
        if(codeBlock){endCode();}
        else{codeBlock=part('pre',undefined,'ai-code-block');codeBlock.appendChild(part('code',''));}
        continue;
      }
      if(codeBlock){
        const inner=codeBlock.firstChild;
        inner.textContent+=(inner.textContent?'\n':'')+line;
        continue;
      }
      if(!trim){flushParagraph();endList();endTable();continue;}
      const heading=trim.match(/^(#{1,4})\s+(.+)$/);
      if(heading){
        flushParagraph();endList();endTable();
        const level=Math.min(4,heading[1].length+2);
        const node=part('h'+level,undefined,'ai-heading');
        addInline(node,heading[2]);root.appendChild(node);continue;
      }
      if(/^(?:---+|\*\*\*+|___+)$/.test(trim)){
        flushParagraph();endList();endTable();root.appendChild(part('hr'));continue;
      }
      if(/^>\s?/.test(trim)){
        flushParagraph();endList();endTable();
        const node=part('blockquote',undefined,'ai-quote');
        addInline(node,trim.replace(/^>\s?/,''));root.appendChild(node);continue;
      }
      const bullet=trim.match(/^[-*+]\s+(.+)$/);
      const numbered=trim.match(/^\d+[.)]\s+(.+)$/);
      if(bullet||numbered){
        flushParagraph();endTable();
        const kind=numbered?'ol':'ul';
        if(!list||list.tagName.toLowerCase()!==kind){
          list=part(kind,undefined,'ai-list');
          if(numbered){const n=Number(trim.match(/^\d+/)?.[0]||1);if(n>1&&n<100)list.start=n;}
          root.appendChild(list);
        }
        const item=part('li');
        addInline(item,(bullet||numbered)[1]);list.appendChild(item);continue;
      }
      if(trim.startsWith('|')&&trim.endsWith('|')&&trim.split('|').length>=4){
        flushParagraph();endList();
        const cols=trim.slice(1,-1).split('|').map(v=>v.trim());
        if(cols.every(v=>/^:?-{3,}:?$/.test(v)))continue;
        if(!table){table=part('table',undefined,'ai-table');root.appendChild(table);}
        const tr=part('tr');
        for(const col of cols){const td=part('td');addInline(td,col);tr.appendChild(td);}
        table.appendChild(tr);continue;
      }
      endList();endTable();paragraph.push(line);
    }
    flushParagraph();endCode();
    target.appendChild(root);
    if(!raw.trim())target.textContent='لم يتم إرجاع إجابة. أعد المحاولة.';
  }
  window.renderAIAnswer=renderAnswer;
})();
