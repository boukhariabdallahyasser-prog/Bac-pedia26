// Cloudflare Worker: keep GEMINI_API_KEY in Worker secrets, never in GitHub Pages.
// Set ALLOWED_ORIGIN to the exact GitHub Pages origin.
export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || 'https://boukhariabdallahyasser-prog.github.io';
    const origin = request.headers.get('Origin') || '';
    const cors = {'Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
    if(origin !== allowed)return new Response('Origin not allowed',{status:403});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:cors});
    if(!env.GEMINI_API_KEY)return new Response(JSON.stringify({error:'AI backend is not configured'}),{status:503,headers:{...cors,'Content-Type':'application/json'}});
    const length=Number(request.headers.get('Content-Length')||0);
    if(length>18000)return new Response('Request too large',{status:413,headers:cors});
    let data;
    try{data=await request.json();}catch{return new Response('Invalid JSON',{status:400,headers:cors});}
    const prompt=String(data?.prompt||'').slice(0,14000);
    if(!prompt)return new Response('Prompt required',{status:400,headers:cors});
    const model='gemini-2.5-flash';
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:2500}})
    });
    const result=await response.json();
    const answer=result?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\\n').trim()||'';
    return new Response(JSON.stringify(response.ok?{answer}:{error:'AI provider unavailable'}),{status:response.ok?200:502,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
};
