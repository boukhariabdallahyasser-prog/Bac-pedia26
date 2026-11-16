/* Cloudflare Worker serving Bac-pedia's assets and authenticated AI endpoint.
 * Secrets are stored in Cloudflare Worker Settings, never in the Vite bundle.
 */
const SUPABASE_BASE='https://vgioqexpyvwmxwtuntaa.supabase.co';
const SUPABASE_PUBLISHABLE='sb_publishable_Q2oOVzL1g90i93jSICrvpQ_fZi9_NgE';
const agents=new Set(['smart_tutor','daily_plan','summarizer','quiz','qcm','mistake_analyzer','grade_advisor','essay_coach','mock_exam']);

function reply(value,status=200){
  return new Response(JSON.stringify(value),{
    status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
  });
}
function providerConfig(env){
  const key=env.DEPLOY_API_KEY,endpoint=env.DEPLOY_API_ENDPOINT,model=env.DEPLOY_MODEL_ID;
  if(typeof key!=='string'||!key||typeof endpoint!=='string'||!endpoint||typeof model!=='string'||!model)return null;
  try{
    const url=new URL(endpoint);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return null;
    const host=url.hostname.toLowerCase();
    // Protect against accidental internal or metadata service requests.
    if(/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.0\.0\.0$)/i.test(host))return null;
    return {key,endpoint:url.toString(),model};
  }catch{return null;}
}
async function handleAI(request,env){
  if(request.method==='GET'){
    const configured=Boolean(providerConfig(env));
    return reply({
      ready:configured,verified:false,provider:'deploy',
      reason:configured?'configured_unverified':'provider_unconfigured'
    });
  }
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  const url=new URL(request.url);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)return reply({error:'Origin not allowed'},403);

  const len=Number(request.headers.get('Content-Length')||0);
  if(len>32000)return reply({error:'Request too large'},413);
  const token=request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return reply({error:'Sign in required'},401);
  const config=providerConfig(env);
  if(!config)return reply({error:'Deploy.com is not configured for this Cloudflare Worker.'},503);

  let payload;
  try{payload=await request.json();}catch{return reply({error:'Invalid JSON request'},400);}
  const {agent,prompt}=payload||{};
  if(!agents.has(agent)||typeof prompt!=='string'||!prompt.trim()||prompt.length>14000)
    return reply({error:'Invalid agent or prompt'},400);

  try{
    const check=await fetch(SUPABASE_BASE+'/auth/v1/user',{
      headers:{Authorization:'Bearer '+token,apikey:SUPABASE_PUBLISHABLE},
      signal:AbortSignal.timeout(6000)
    });
    if(!check.ok)return reply({error:'Invalid or expired session'},401);
    const user=await check.json();
    if(!user?.id||!user?.email_confirmed_at)return reply({error:'Verified account required'},403);
  }catch{return reply({error:'Unable to verify session'},503);}

  try{
    const quota=await fetch(SUPABASE_BASE+'/rest/v1/rpc/consume_ai_quota',{
      method:'POST',
      headers:{Authorization:'Bearer '+token,apikey:SUPABASE_PUBLISHABLE,'Content-Type':'application/json'},
      body:JSON.stringify({p_daily_limit:30}),
      signal:AbortSignal.timeout(6000)
    });
    if(!quota.ok)return reply({error:'Unable to verify AI quota'},503);
    if(await quota.json()!==true)return reply({error:'Daily AI limit reached'},429);
  }catch{return reply({error:'AI quota service unavailable'},503);}

  try{
    const response=await fetch(config.endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.key},
      body:JSON.stringify({
        model:config.model,
        messages:[
          {role:'system',content:'You are Bac-pedia 2027, a careful tutor for the Algerian baccalaureate. Explain clearly in Arabic or French and never invent exam facts.'},
          {role:'user',content:prompt}
        ],
        temperature:0.5,max_tokens:2048
      }),
      signal:AbortSignal.timeout(25000)
    });
    if(!response.ok)return reply({error:'Deploy.com inference rejected this request.'},502);
    const result=await response.json();
    const answer=typeof result?.choices?.[0]?.message?.content==='string'
      ?result.choices[0].message.content.trim():'';
    if(!answer)return reply({error:'Deploy.com returned an unsupported response format'},502);
    return reply({answer});
  }catch{return reply({error:'AI service timed out or is unavailable'},502);}
}

export default {
  async fetch(request,env){
    const pathname=new URL(request.url).pathname;
    if(pathname==='/api/ai')return handleAI(request,env);
    if(pathname.startsWith('/api/'))return reply({error:'Unknown API endpoint'},404);
    return env.ASSETS.fetch(request);
  }
};
