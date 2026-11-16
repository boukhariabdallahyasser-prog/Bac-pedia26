// Server-only Deploy.com inference adapter. The browser never receives API keys.
// Deploy's official endpoint and model must be verified in the provider portal.
const allowedAgents=new Set(['smart_tutor','daily_plan','summarizer','quiz','qcm','mistake_analyzer','grade_advisor','essay_coach','mock_exam']);
function deployConfig(){
 const key=process.env.DEPLOY_API_KEY;
 const endpoint=process.env.DEPLOY_API_ENDPOINT||'https://api-cdn.deploy.com/api/v1/chat/completions';
 const model=process.env.DEPLOY_MODEL_ID||'deepseek-ai/deepseek-v4.1-flash';
 if(!key||!endpoint||!model)return null;
 try{
   const u=new URL(endpoint);
   if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return null;
   if(/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(u.hostname))return null;
   return {key,endpoint:u.toString(),model};
 }catch{return null}
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET'){
   const configured=Boolean(deployConfig());
   return res.status(200).json({
     ready:configured,verified:false,provider:'deploy',
     reason:configured?'configured_unverified':'provider_unconfigured'
   });
 }
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const siteOrigin='https://'+req.headers.host;
 if(req.headers.origin&&req.headers.origin!==siteOrigin)return res.status(403).json({error:'Origin not allowed'});
 const token=(req.headers.authorization||'').match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return res.status(401).json({error:'Sign in required'});
 let current=null;
 try{
   const checked=await fetch('https://vgioqexpyvwmxwtuntaa.supabase.co/auth/v1/user',{
     headers:{Authorization:'Bearer '+token,apikey:'sb_publishable_Q2oOVzL1g90i93jSICrvpQ_fZi9_NgE'},
     signal:AbortSignal.timeout(6000)
   });
   if(!checked.ok)return res.status(401).json({error:'Invalid or expired session'});
   current=await checked.json();
   if(!current?.id||!current?.email_confirmed_at)return res.status(403).json({error:'Verified account required'});
 }catch{return res.status(503).json({error:'Unable to verify session'})}
 if(Number(req.headers['content-length']||0)>32000)return res.status(413).json({error:'Request too large'});
 const deploy=deployConfig();
 if(!deploy)return res.status(503).json({error:'Deploy.com inference is not configured. Verify DEPLOY_API_ENDPOINT and DEPLOY_MODEL_ID.'});
 const {agent,prompt}=req.body||{};
 if(!allowedAgents.has(agent)||typeof prompt!=='string'||!prompt.trim()||prompt.length>14000)
   return res.status(400).json({error:'Invalid agent or prompt'});
 try{
   const checked=await fetch('https://vgioqexpyvwmxwtuntaa.supabase.co/rest/v1/rpc/consume_ai_quota',{
     method:'POST',
     headers:{Authorization:'Bearer '+token,apikey:'sb_publishable_Q2oOVzL1g90i93jSICrvpQ_fZi9_NgE','Content-Type':'application/json'},
     body:JSON.stringify({p_daily_limit:30}),
     signal:AbortSignal.timeout(6000)
   });
   if(!checked.ok)return res.status(503).json({error:'Unable to verify AI usage quota'});
   if(await checked.json()!==true)return res.status(429).json({error:'Daily AI limit reached'});
 }catch{return res.status(503).json({error:'AI usage service unavailable'})}
 try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
   let response;
   try{
     // This payload is OpenAI-compatible. It is used ONLY when the account's
     // Deploy.com documentation confirms that the supplied endpoint supports it.
     response=await fetch(deploy.endpoint,{
       method:'POST',signal:controller.signal,
       headers:{'Content-Type':'application/json',Authorization:'Bearer '+deploy.key},
       body:JSON.stringify({
         model:deploy.model,
         messages:[
 {role:'system',content:'You are Bac-pedia 2027, an accurate Algerian baccalaureate tutor. Answer the exact user question FIRST, in its language. Do not replace it with a generic study plan. Use given numbers and constraints, explain exercises step by step, and be concise for simple questions. Use readable Markdown only when useful. Never invent official facts, sources or unseen file contents. Tool: '+agent},
           {role:'user',content:prompt}
         ],
         temperature:0.2,reasoning_effort:'low',max_completion_tokens:4096
       })
     });
   }finally{clearTimeout(timer)}
   if(!response.ok)return res.status(502).json({error:'Deploy.com inference rejected the request. Check the endpoint, model and credentials.'});
   const result=await response.json();
   const answer=typeof result?.choices?.[0]?.message?.content==='string'?
     result.choices[0].message.content.trim():'';
   if(!answer)return res.status(502).json({error:'Deploy.com response format is not compatible with this adapter'});
   return res.status(200).json({answer});
 }catch(error){
   return res.status(502).json({error:error?.name==='AbortError'?'AI request timed out':'AI request failed'});
 }
}
