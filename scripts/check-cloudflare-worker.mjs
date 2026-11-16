import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.js';

const origin='https://bac-pedia26.example.workers.dev';
const assets={fetch:async request=>new Response('STATIC:'+new URL(request.url).pathname,{status:200})};
const base={ASSETS:assets};
const call=async(path,opts={},env=base)=>worker.fetch(new Request(origin+path,opts),env);

const home=await call('/');
assert.equal(home.status,200);
assert.equal(await home.text(),'STATIC:/');
for(const role of ['student','contributor','admin']){
  const withSlash=await call('/'+role+'/');
  assert.equal(withSlash.status,200);
  assert.equal(await withSlash.text(),'STATIC:/'+role+'/index.html');
  const canonical=await call('/'+role);
  assert.equal(canonical.status,308);
  assert.equal(canonical.headers.get('location'),origin+'/'+role+'/');
}


const aiWithoutKey=await call('/api/ai');
assert.equal(aiWithoutKey.status,200);
assert.deepEqual(await aiWithoutKey.json(),{
  ready:false,verified:false,provider:'deploy',reason:'provider_unconfigured'
});

const configured={
  ...base,
  DEPLOY_API_KEY:'private-test-credential-never-returned'
};
// Provider URL and model have documented, non-secret defaults; only the API key is required.
const health=await call('/api/ai',{},configured);
const healthBody=await health.json();
assert.equal(healthBody.ready,true);
assert.equal(healthBody.verified,false);
assert.ok(!JSON.stringify(healthBody).includes(configured.DEPLOY_API_KEY));

const invalid={...configured,DEPLOY_API_ENDPOINT:'http://127.0.0.1/internal'};
assert.equal((await (await call('/api/ai',{},invalid)).json()).ready,false);

const wrongMethod=await call('/api/ai',{method:'PUT'});
assert.equal(wrongMethod.status,405);

const missingAuth=await call('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({agent:'smart_tutor',prompt:'Explain derivatives'})},configured);
assert.equal(missingAuth.status,401);

const wrongOrigin=await call('/api/ai',{method:'POST',headers:{Origin:'https://attacker.example',Authorization:'Bearer test'},body:'{}'},configured);
assert.equal(wrongOrigin.status,403);

const unknown=await call('/api/undefined');
assert.equal(unknown.status,404);
assert.match(unknown.headers.get('content-type'),/application\/json/);

const priorFetch=globalThis.fetch;
let providerBody=null;
try{
  globalThis.fetch=async (url,opts={})=>{
    const address=String(url);
    if(address.endsWith('/auth/v1/user'))return new Response(JSON.stringify({
      id:'mock-student',email_confirmed_at:'2026-11-16T18:00:00+00:00'
    }),{status:200,headers:{'Content-Type':'application/json'}});
    if(address.endsWith('/rest/v1/rpc/consume_ai_quota'))return new Response('true',{status:200,headers:{'Content-Type':'application/json'}});
    if(address.endsWith('/chat/completions')){
      providerBody=JSON.parse(opts.body);
      return new Response(JSON.stringify({choices:[{message:{content:'## جواب مباشر\n2 + 2 = 4'}}]}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    throw Error('Unexpected mocked fetch URL');
  };
  const reply=await call('/api/ai',{
    method:'POST',
    headers:{Authorization:'Bearer mock-verified-session','Content-Type':'application/json',Origin:origin},
    body:JSON.stringify({agent:'smart_tutor',prompt:'سؤال الطالب: ما مجموع 2 + 2؟'})
  },configured);
  assert.equal(reply.status,200);
  assert.ok((await reply.json()).answer.includes('2 + 2 = 4'));
  assert.equal(providerBody.model,'deepseek-ai/deepseek-v4.1-flash');
  assert.equal(providerBody.temperature,0.2);
  assert.equal(providerBody.reasoning_effort,'low');
  assert.ok(providerBody.max_completion_tokens>=3500);
  assert.match(providerBody.messages[0].content,/QUESTION EXACTE/);
  assert.match(providerBody.messages[1].content,/2 \+ 2/);
  assert.ok(!JSON.stringify(providerBody).includes(configured.DEPLOY_API_KEY));
}finally{globalThis.fetch=priorFetch;}

console.log('Cloudflare Worker API checks passed: assets, readiness, secret privacy, SSRF guard, authentication and API 404.');
