import assert from 'node:assert/strict';
import handler from '../api/ai.js';
function response(){
  return {code:200,headers:{},body:null,
    setHeader(k,v){this.headers[k]=v;return this},
    status(n){this.code=n;return this},
    json(value){this.body=value;return this}
  };
}
const previousKey=process.env.GEMINI_API_KEY,previousFetch=globalThis.fetch;
const request={method:'GET',headers:{host:'bac-pedia26.vercel.app'}};
try{
  delete process.env.GEMINI_API_KEY;
  const missing=response();await handler(request,missing);
  assert.equal(missing.code,200);assert.equal(missing.body.ready,false);
  assert.equal(missing.body.reason,'not_configured');
  process.env.GEMINI_API_KEY='unit-test-placeholder';
  globalThis.fetch=async()=>({ok:true,status:200});
  const up=response();await handler(request,up);
  assert.equal(up.code,200);assert.equal(up.body.ready,true);
  assert.equal(up.body.reason,'ok');
  assert.ok(!JSON.stringify(up.body).includes('unit-test-placeholder'),'Never disclose Gemini API key');
  globalThis.fetch=async()=>({ok:false,status:403});
  // A fresh serverless instance runs a fresh health probe. A warm one
  // intentionally caches the previous ready result for up to 60 seconds.
  const {default:freshHandler}=await import('../api/ai.js?rejected-provider-test');
  const forbidden=response();await freshHandler(request,forbidden);
  assert.equal(forbidden.body.ready,false);
  assert.equal(forbidden.body.reason,'provider_auth');
  const unauth=response();await handler({method:'POST',headers:{host:'bac-pedia26.vercel.app'}},unauth);
  assert.equal(unauth.code,401);
  const method=response();await handler({method:'DELETE',headers:{host:'bac-pedia26.vercel.app'}},method);
  assert.equal(method.code,405);
  console.log('AI health checks passed: offline, ready, rejected key, unauthorized POST and unsupported method.');
}finally{
  if(previousKey===undefined)delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY=previousKey;
  globalThis.fetch=previousFetch;
}
