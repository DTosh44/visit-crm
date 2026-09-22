import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  try{
    const auth=request.headers.get('Authorization')??''
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}})
    const {data:{user}}=await supabase.auth.getUser();if(!user)return new Response(JSON.stringify({error:'Unauthorised'}),{status:401,headers:{...cors,'Content-Type':'application/json'}})
    const body=await request.json();const tenantId=String(body.tenantId??'');if(!tenantId)return new Response(JSON.stringify({error:'Workspace is required'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});const {data:profile}=await supabase.from('profiles').select('role').eq('user_id',user.id).eq('tenant_id',tenantId).eq('active',true).maybeSingle();if(!profile)return new Response(JSON.stringify({error:'No workspace access'}),{status:403,headers:{...cors,'Content-Type':'application/json'}})
    const apiKey=Deno.env.get('OPENAI_API_KEY');if(!apiKey)return new Response(JSON.stringify({answer:null,configured:false}),{headers:{...cors,'Content-Type':'application/json'}})
    const question=String(body.question??'').slice(0,2000);const tool=String(body.tool??'workspace_summary');const results=Array.isArray(body.results)?body.results.slice(0,50).map(String):[]
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('OPENAI_MODEL')??'gpt-5-mini',input:[{role:'system',content:[{type:'input_text',text:'You are Ask VisitMade, a concise DMO operations assistant. Answer only from the permission-filtered tool result supplied. Never claim estimated value is objective ROI. Never say an external message was sent or content was published. If asked to change data, produce a draft and explain that confirmation is required.'}]},{role:'user',content:[{type:'input_text',text:`Question: ${question}\nSelected tool: ${tool}\nPermission-filtered results for tenant ${tenantId}:\n${results.join('\n')||'No matching records.'}`}]}],max_output_tokens:700})})
    if(!response.ok)throw new Error(`OpenAI request failed: ${response.status}`);const payload=await response.json();const answer=payload.output_text??payload.output?.flatMap((item:any)=>item.content??[]).find((item:any)=>item.type==='output_text')?.text
    return new Response(JSON.stringify({answer,configured:true}),{headers:{...cors,'Content-Type':'application/json'}})
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:'Request failed'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
})
