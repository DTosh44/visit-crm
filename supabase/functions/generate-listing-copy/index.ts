import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  try{
    const token=request.headers.get('Authorization')??''
    const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:token}}})
    const {data:{user}}=await client.auth.getUser();if(!user)return new Response(JSON.stringify({error:'Authentication required'}),{status:401,headers:{...cors,'Content-Type':'application/json'}})
    const input=await request.json()
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('OPENAI_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('OPENAI_MODEL')??'gpt-5-mini',instructions:'Write accurate, warm UK destination website copy. Use only supplied facts. Do not invent awards, access details, prices or claims. Return JSON with shortDescription no more than 180 characters and description of 80 to 130 words.',input:JSON.stringify(input),text:{format:{type:'json_schema',name:'listing_copy',strict:true,schema:{type:'object',properties:{shortDescription:{type:'string'},description:{type:'string'}},required:['shortDescription','description'],additionalProperties:false}}}})})
    if(!response.ok)throw new Error(await response.text())
    const result=await response.json();const output=JSON.parse(result.output_text)
    return new Response(JSON.stringify(output),{headers:{...cors,'Content-Type':'application/json'}})
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:'Unable to generate copy'}),{status:500,headers:{...cors,'Content-Type':'application/json'}})}
})
