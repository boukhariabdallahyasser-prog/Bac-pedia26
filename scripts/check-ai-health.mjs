import assert from 'node:assert/strict';
import handler from '../api/ai.js';
function response(){return {code:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this},status(n){this.code=n;return this},json(v){this.body=v;return this}}}
const keys=['DEPLOY_API_KEY','DEPLOY_API_ENDPOINT','DEPLOY_MODEL_ID'];
const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
try{
 for(const k of keys)delete process.env[k];
 const missing=response();await handler({method:'GET',headers:{}},missing);
 assert.equal(missing.code,200);
 assert.equal(missing.body.ready,false);
 assert.equal(missing.body.reason,'provider_unconfigured');
 process.env.DEPLOY_API_KEY='test-secret-no-network';
 // Documented defaults provide the inference endpoint and model without secrets.
 const configured=response();await handler({method:'GET',headers:{}},configured);
 assert.equal(configured.body.ready,true);
 assert.equal(configured.body.verified,false,'Configuration does not prove live provider availability');
 assert.equal(configured.body.provider,'deploy');
 assert.ok(!JSON.stringify(configured.body).includes('test-secret-no-network'));
 process.env.DEPLOY_API_ENDPOINT='http://localhost:1234/v1/chat/completions';
 const invalid=response();await handler({method:'GET',headers:{}},invalid);
 assert.equal(invalid.body.ready,false);
 const denied=response();await handler({method:'POST',headers:{host:'bac-pedia26.vercel.app'}},denied);
 assert.equal(denied.code,401,'No AI proxy access without login');
 const method=response();await handler({method:'DELETE',headers:{}},method);
 assert.equal(method.code,405);
 console.log('Deploy adapter contract passed: missing credentials, configured-unverified, SSRF guard, auth, HTTP methods.');
}finally{for(const k of keys){if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k]}}
