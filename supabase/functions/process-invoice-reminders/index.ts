import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async(request)=>{
  const expected=Deno.env.get('REMINDER_CRON_SECRET');if(expected&&request.headers.get('x-cron-secret')!==expected)return new Response('Forbidden',{status:403})
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const {data:states,error}=await client.from('workspace_states').select('tenant_id,data');if(error)throw error
  let sent=0
  for(const state of states??[]){const workspace=state.data as Record<string,unknown>;const invoices=(workspace.invoices??[]) as Array<Record<string,unknown>>;const organisations=(workspace.organisations??[]) as Array<Record<string,unknown>>;const contacts=(workspace.contacts??[]) as Array<Record<string,unknown>>;const today=new Date().toISOString().slice(0,10);let changed=false
    for(const invoice of invoices){if(['Paid','Draft','Void'].includes(String(invoice.status))||invoice.remindersPaused||String(invoice.dueDate)>=today||Number(invoice.reminderStep)>=3)continue;invoice.status='Overdue';invoice.reminderStep=Number(invoice.reminderStep??0)+1;changed=true;sent++
      const org=organisations.find((item)=>item.id===invoice.organisationId);const contact=contacts.find((item)=>item.organisationId===invoice.organisationId&&item.primary)
      if(Deno.env.get('RESEND_API_KEY')&&contact?.email)await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('RESEND_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({from:Deno.env.get('REMINDER_FROM_EMAIL'),to:[contact.email],subject:`Payment reminder: ${invoice.number}`,text:`Hello ${contact.name}, payment for ${invoice.number} from ${org?.name??'your organisation'} is overdue. Please contact the destination team if you need a copy or wish to discuss payment.`})})
    }
    if(changed)await client.from('workspace_states').update({data:workspace,updated_at:new Date().toISOString()}).eq('tenant_id',state.tenant_id)
  }
  return new Response(JSON.stringify({processed:sent}),{headers:{'Content-Type':'application/json'}})
})
