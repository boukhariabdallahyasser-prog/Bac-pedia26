import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.js';

const origin='https://bac-pedia26.example.workers.dev';
const assets={fetch:async request=>new Response('STATIC:'+new URL(request.url).pathname,{status:200})};
const base={ASSETS:assets};
const call=async(path,opts={},env=base)=>worker.fetch(new Request(origin+path,opts),env);

const home=await call('/');
assert.equal(home.status,200);
assert.equal(await home.text(),'STATIC:/');

const aiWithoutKey=await call('/api/ai');
assert.equal(aiWithoutKey.status,200);
assert.deepEqual(await aiWithoutKey.json(),{
  ready:false,verified:false,provider:'deploy',reason:'provider_unconfigured'
});

const configured={
  ...base,
  DEPLOY_API_KEY:'private-test-credential-never-returned',
  DEPLOY_API_ENDPOINT:'https://api.example.com/v1/chat/completions',
  DEPLOY_MODEL_ID:'example-test-model'
};
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

console.log('Cloudflare Worker API checks passed: assets, readiness, secret privacy, SSRF guard, authentication and API 404.');
