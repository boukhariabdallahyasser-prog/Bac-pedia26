import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class NodeStub {
  constructor(tag='#text'){this.tagName=tag.toUpperCase();this._text='';this.children=[];this.dataset={};this.className='';this.dir='';}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
  set textContent(v){this._text=String(v);this.children=[];}
  appendChild(n){this.children.push(n);return n;}
  append(...ns){for(const n of ns)this.appendChild(n);}
  replaceChildren(...ns){this._text='';this.children=[...ns];}
  get firstChild(){return this.children[0]||null;}
}
const document={
  createElement:tag=>new NodeStub(tag),
  createTextNode:s=>{const n=new NodeStub('#text');n.textContent=s;return n;},
  createDocumentFragment:()=>new NodeStub('#fragment')
};
const win={};
const source=fs.readFileSync('assets/ai-format.js','utf8');
assert.ok(!source.includes('.innerHTML'), 'AI answers must not inject HTML');
vm.runInNewContext(source,{document,window:win});
assert.equal(typeof win.renderAIAnswer,'function');

const target=new NodeStub('div');
const raw='## الحل\n**المعطيات**: x = 2\n\n1. عوض في المعادلة\n2. تحقق من النتيجة\n\n- النتيجة الصحيحة\n\n<script>alert(1)</script>';
win.renderAIAnswer(target,raw);
assert.equal(target.dataset.rawAnswer,raw);
const all=[];
function visit(node){all.push(node.tagName.toLowerCase());for(const child of node.children)visit(child);}
visit(target);
assert.ok(all.includes('h4'),'Should render heading as a semantic element');
assert.ok(all.includes('strong'),'Should render emphasized words');
assert.ok(all.includes('ol'),'Should render numbered steps');
assert.ok(all.includes('ul'),'Should render bullet notes');
assert.ok(!all.includes('script'),'Model-supplied HTML must remain inert text');
assert.ok(target.textContent.includes('<script>alert(1)</script>'));
assert.ok(target.textContent.includes('x = 2'));
win.renderAIAnswer(target,'تم الحل');
assert.equal(target.dataset.rawAnswer,'تم الحل');
assert.ok(!target.textContent.includes('alert(1)'));
console.log('AI result reader checks passed: Markdown readability, inert HTML and response replacement.');
