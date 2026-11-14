// Vercel serverless function. Set GEMINI_API_KEY in Vercel project environment variables.
const allowedAgents=new Set(['smart_tutor','daily_plan','summarizer','quiz','qcm','flashcards','mistake_analyzer','grade_advisor','essay_coach','mock_exam']);
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const siteOrigin='https://'+req.headers.host;
  if(req.headers.origin&&req.headers.origin!==siteOrigin)return res.status(403).json({error:'Origin not allowed'});
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
