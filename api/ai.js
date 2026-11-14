// Vercel serverless function. Set GEMINI_API_KEY in Vercel project environment variables.
const allowedAgents=new Set(['smart_tutor','daily_plan','summarizer','quiz','qcm','flashcards','mistake_analyzer','grade_advisor','essay_coach','mock_exam']);
// Best-effort per-runtime protection. For a hard cross-instance quota, use a shared store.
const usageStore=globalThis.__bacPediaAiUsage||(globalThis.__bacPediaAiUsage=new Map());
function checkRateLimit(userId){
  const now=Date.now(),windowMs=10*60*1000,limit=12;
  let entry=usageStore.get(userId);
  if(!entry||now-entry.startedAt>=windowMs){entry={startedAt:now,count:0};usageStore.set(userId,entry);}
  entry.count++;
  if(entry.count>limit)return Math.max(1,Math.ceil((windowMs-(now-entry.startedAt))/1000));
  return 0;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
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
  const retryAfter=checkRateLimit(user.id);
  if(retryAfter){res.setHeader('Retry-After',String(retryAfter));return res.status(429).json({error:'AI usage limit reached. Please try again later.'});}
  if(Number(req.headers['content-length']||0)>32000)return res.status(413).json({error:'Request too large'});
  if(!process.env.GEMINI_API_KEY)return res.status(503).json({error:'AI service is not configured. Set GEMINI_API_KEY in Vercel.'});
  const {agent,prompt}=req.body||{};
  if(!allowedAgents.has(agent)||typeof prompt!=='string'||!prompt.trim()||prompt.length>14000)return res.status(400).json({error:'Invalid agent or prompt'});
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),25000);
    let response;
    try{
      response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{
        method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:'You are a careful tutor for the Algerian baccalaureate. Respond in clear Arabic, follow the student request, avoid invented citations, and explicitly acknowledge uncertainty.'}]},
          contents:[{role:'user',parts:[{text:prompt}]}],
          generationConfig:{maxOutputTokens:2200,temperature:0.6}
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
