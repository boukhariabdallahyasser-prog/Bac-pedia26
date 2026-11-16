// Server-side Deploy.com API adapter. Never place DEPLOY_API_KEY into browser code.
// An inference URL/model must come from verified provider documentation, not guesswork.
const allowedAgents=new Set(['smart_tutor','daily_plan','summarizer','quiz','qcm','mistake_analyzer','grade_advisor','essay_coach','mock_exam']);
function deployConfig(){
  const key=process.env.DEPLOY_API_KEY;
  const endpoint=process.env.DEPLOY_API_ENDPOINT;
  const model=process.env.DEPLOY_MODEL_ID;
  if(!key||!endpoint||!model)return null;
  try{
    const url=new URL(endpoint);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return null;
    const blocked=/^(localhost|127\\.|10\\.|192\\.168\\.|169\\.254\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.)/i;
    if(blocked.test(url.hostname))return null;
    return {key,url:url.toString(),model};
  }catch{return null;}
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  // Public health check confirms provider reachability, not merely that an API URL exists.
  // It never discloses the configured secret or consumes a student's daily quota.
  if(req.method==='GET'){
    const ready=Boolean(deployConfig());
    return res.status(200).json({
      ready,verified:false,
      provider:'deploy',
      reason:ready?'configured_unverified':'provider_unconfigured'
    });
  }
t result={ready:response.ok,reason:response.ok?'ok':response.status===400||response.status===401||response.status===403?'provider_auth':'provider_error'};
      aiProbeCache={at:Date.now(),result};
      return res.status(200).json(result);
    }catch(error){
      const result={ready:false,reason:'provider_unreachable'};
      aiProbeCache={at:Date.now(),result};
      return res.status(200).json(result);
    }
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const siteOrigin='https://'+req.headers.host;
  if(req.headers.origin&&req.headers.origin!==siteOrigin)return res.status(403).json({error:'Origin not allowed'});
  // Enforce a real Supabase session server-side, not only a frontend login gate.
  const token=(req.headers.authorization||'').match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return res.status(401).json({error:'Sign in required'});
  let user=null;
  try{
    const check=await fetch('https://vgioqexpyvwmxwtuntaa.supabase.co/auth/v1/user',{
      headers:{Authorization:'Bearer '+token,apikey:'sb_publishable_Q2oOVzL1g90i93jSICrvpQ_fZi9_NgE'},
      signal:AbortSignal.timeout(6000)
    });
    if(!check.ok)return res.status(401).json({error:'Invalid or expired session'});
    user=await check.json();
    if(!user?.id||!user?.email_confirmed_at)return res.status(403).json({error:'Verified account required'});
  }catch(error){
    return res.status(503).json({error:'Unable to verify session'});
  }
  if(Number(req.headers['content-length']||0)>32000)return res.status(413).json({error:'Request too large'});
  const deploy=deployConfig();
  if(!deploy)return res.status(503).json({error:'Deploy.com provider configuration incomplete. Set DEPLOY_API_KEY, DEPLOY_API_ENDPOINT and DEPLOY_MODEL_ID.'});
  const {agent,prompt}=req.body||{};
  if(!allowedAgents.has(agent)||typeof prompt!=='string'||!prompt.trim()||prompt.length>14000)return res.status(400).json({error:'Invalid agent or prompt'});

  // Atomic per-student daily quota enforced in PostgreSQL (30 admitted requests per UTC day).
  try{
    const quotaResponse=await fetch('https://vgioqexpyvwmxwtuntaa.supabase.co/rest/v1/rpc/consume_ai_quota',{
      method:'POST',
      headers:{Authorization:'Bearer '+token,apikey:'sb_publishable_Q2oOVzL1g90i93jSICrvpQ_fZi9_NgE','Content-Type':'application/json'},
      body:JSON.stringify({p_daily_limit:30}),
      signal:AbortSignal.timeout(6000)
    });
    if(!quotaResponse.ok)return res.status(503).json({error:'Unable to verify AI usage quota'});
    const allowed=await quotaResponse.json();
    if(allowed!==true)return res.status(429).json({error:'Daily AI limit reached (30 requests). Try again tomorrow.'});
  }catch(error){return res.status(503).json({error:'AI usage service unavailable'});}
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),25000);
    let response;
    try{
      response=await fetch(deploy.url,{
        method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+deploy.key},
        body:JSON.stringify({
          model:deploy.model,
          messages:[
            {role:'system',content:'You are Bac-pedia 2027, a rigorous tutor for the Algerian baccalaureate. Answer the student in Arabic or French, explain correctly, and never invent official examination facts.'},
            {role:'user',content:prompt}
          ],
          temperature:0.5,
          max_tokens:2048
        })
      });
    }finally{clearTimeout(timer);}
    if(!response.ok)return res.status(502).json({error:'Deploy.com request failed. Check the documented endpoint, model and key.'});
    const result=await response.json();
    const answer=typeof result?.choices?.[0]?.message?.content==='string'?
      result.choices[0].message.content.trim():'';
    if(!answer)return res.status(502).json({error:'AI provider returned no answer'});
    return res.status(200).json({answer});
  }catch(error){
    return res.status(502).json({error:error?.name==='AbortError'?'AI request timed out':'AI request failed'});
  }
}
