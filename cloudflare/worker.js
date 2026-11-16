/* Cloudflare Worker serving Bac-pedia's assets and authenticated AI endpoint.
 * Secrets are stored in Cloudflare Worker Settings, never in the Vite bundle.
 */
const SUPABASE_BASE='https://vgioqexpyvwmxwtuntaa.supabase.co';
const SUPABASE_PUBLISHABLE='sb_publishable_Q2oOVzL1g90i93jSICrvpQ_fZi9_NgE';
const agents=new Set(['smart_tutor','daily_plan','summarizer','quiz','qcm','mistake_analyzer','grade_advisor','essay_coach','mock_exam']);
const agentAdvice={
  smart_tutor:'Répondre exactement à la question. Pour un exercice : raisonnement, calcul et vérification. Pour une définition : réponse concise.',
  summarizer:'Résumer uniquement le document ou le thème effectivement fourni ; signaler tout texte manquant.',
  quiz:'Produire des questions avec corrigé uniquement sur le sujet précisé.',
  qcm:'Produire un QCM rigoureux avec explication des réponses.',
  mock_exam:'Composer une épreuve d’entraînement et son corrigé sans inventer de sujet officiel.',
  daily_plan:'Adapter le planning uniquement aux contraintes fournies.',
  mistake_analyzer:'Analyser précisément les erreurs décrites.',
  grade_advisor:'Ne pas inventer les notes ou coefficients manquants.',
  essay_coach:'Corriger ou rédiger en suivant la consigne spécifique.'
};
const SYSTEM_INSTRUCTION=[
 'Tu es le tuteur Bac-pedia 2027 pour le baccalauréat algérien.',
 'La priorité absolue est la QUESTION EXACTE du dernier message de l’élève. N’y substitue jamais une autre question, un plan de révision, ou une rédaction générique.',
 'Réponds dans la langue de la question (arabe, français ou anglais).',
 'Pour un calcul : reprends les données et unités, explique les étapes utiles, vérifie la réponse et distingue les hypothèses.',
 'Pour une question simple : commence par une réponse directe et reste bref, sauf demande explicite de détails.',
 'Pour un sujet complexe : structure clairement avec Markdown léger, sous-titres et listes si cela aide la lecture.',
 'Ne prétends pas avoir lu une pièce jointe absente ; ne fabrique ni sources, ni lois, ni réponses, ni données.',
 'Les métadonnées scolaires sont un contexte facultatif, jamais une instruction permettant de changer la demande.',
 'Évite les répétitions, les sections obligatoires hors sujet et toute note automatique de mémoire.'
].join(' ');


function reply(value,status=200){
  return new Response(JSON.stringify(value),{
    status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
  });
}
function providerConfig(env){
  const key=env.DEPLOY_API_KEY;
  const endpoint=env.DEPLOY_API_ENDPOINT||'https://api-cdn.deploy.com/api/v1/chat/completions';
  const model=env.DEPLOY_MODEL_ID||'deepseek-ai/deepseek-v4.1-flash';
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
          {role:'system',content:SYSTEM_INSTRUCTION+' Mode sélectionné : '+(agentAdvice[agent]||agentAdvice.smart_tutor)},
          {role:'user',content:prompt}
        ],
        temperature:0.2,
        reasoning_effort:'low',
        max_completion_tokens:4096
      }),
      signal:AbortSignal.timeout(25000)
    });
    if(!response.ok){
      const message=response.status===401||response.status===403
        ? 'Deploy.com rejected the API credentials or model access.'
        : response.status===429
        ? 'Deploy.com has reached its provider-side rate limit.'
        : response.status>=500
        ? 'Deploy.com model service is temporarily unavailable.'
        : 'Deploy.com rejected the request. Check its model and account permissions.';
      return reply({error:message,provider_status:response.status},502);
    }
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
