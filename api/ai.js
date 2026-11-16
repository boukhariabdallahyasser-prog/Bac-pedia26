// Vercel serverless function. Set GEMINI_API_KEY in Vercel project environment variables.
const allowedAgents=new Set(['smart_tutor','daily_plan','summarizer','quiz','qcm','flashcards','mistake_analyzer','grade_advisor','essay_coach','mock_exam']);
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  // Public health check confirms provider reachability, not merely that an API URL exists.
  // It never discloses the configured secret or consumes a student's daily quota.
  if(req.method==='GET'){
    if(!process.env.GEMINI_API_KEY)return res.status(200).json({ready:false,reason:'not_configured'});
    try{
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
      let response;
      try{
        response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash',{
          method:'GET',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY},
          signal:controller.signal
        });
      }finally{clearTimeout(timeout);}
      return res.status(200).json({ready:response.ok,reason:response.ok?'ok':response.status===400||response.status===401||response.status===403?'provider_auth':'provider_error'});
    }catch(error){
      return res.status(200).json({ready:false,reason:'provider_unreachable'});
    }
  }
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
  if(!process.env.GEMINI_API_KEY)return res.status(503).json({error:'AI service is not configured. Set GEMINI_API_KEY in Vercel.'});
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
      response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{
        method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:'You are Bac-pedia 2027, a rigorous tutor for the Algerian baccalaureate. Respond in the language used by the student (Arabic or French). Explain concepts accurately, structure answers clearly, adapt to the selected subject and level, and never invent official exam facts or references.'}]},
          contents:[{role:'user',parts:[{text:prompt}]}],
          generationConfig:{maxOutputTokens:4096,thinkingConfig:{thinkingLevel:'medium'}}
        })
      });
    }finally{clearTimeout(timer);}
    if(!response.ok)return res.status(502).json({error:'AI provider unavailable'});
    const result=await response.json();
    const answer=result?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n').trim();
    if(!answer)return res.status(502).json({error:'AI provider returned no answer'});
    return res.status(200).json({answer});
  }catch(error){
    return res.status(502).json({error:error?.name==='AbortError'?'AI request timed out':'AI request failed'});
  }
}
