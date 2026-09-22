import { useMemo, useState, type FormEvent } from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'
import { supabase, useAuth } from '../auth'
import { usePlatform } from '../platform'
import { useCRM } from '../store'
import { Button, Drawer, EmptyState } from './UI'
import { currency, formatDate } from '../utils'

type AssistantMessage={role:'user'|'assistant';text:string}
function normalise(value:string){return value.toLowerCase().replaceAll(/[?.,]/g,'')}

export function AskVisitMade({open,onClose}:{open:boolean;onClose:()=>void}){
  const {data}=useCRM();const {data:platform}=usePlatform();const {user}=useAuth();const [query,setQuery]=useState('');const [messages,setMessages]=useState<AssistantMessage[]>([]);const [loading,setLoading]=useState(false)
  const tools=useMemo(()=>({
    renewals:()=>data.organisations.filter((org)=>['Active','Renewing'].includes(org.status)).sort((a,b)=>a.renewalDate.localeCompare(b.renewalDate)).slice(0,12).map((org)=>`${org.name} — ${formatDate(org.renewalDate)} (${org.tier})`),
    overdue:()=>data.invoices.filter((item)=>item.status==='Overdue').map((item)=>`${item.number} — ${data.organisations.find((org)=>org.id===item.organisationId)?.name}: ${currency.format(item.total)}`),
    listings:()=>data.listings.filter((item)=>item.completeness<70).map((item)=>`${item.name} — ${item.completeness}% complete`),
    campaigns:()=>platform.campaigns.slice().sort((a,b)=>b.referrals-a.referrals).map((item)=>`${item.name} — ${item.referrals} referrals, ${item.conversions} conversions, ${currency.format(item.actualSpend)} spent`),
    risks:()=>data.organisations.filter((org)=>org.health==='Needs attention'||data.invoices.some((invoice)=>invoice.organisationId===org.id&&invoice.status==='Overdue')).map((org)=>`${org.name} — ${org.health}${data.invoices.some((invoice)=>invoice.organisationId===org.id&&invoice.status==='Overdue')?', overdue invoice':''}`),
    trade:()=>platform.tradeLeads.map((item)=>`${item.description} — ${item.stage}, ${currency.format(item.estimatedValue)} estimated value`),
  }),[data,platform])
  if(!open)return null
  const ask=async(event:FormEvent)=>{event.preventDefault();const prompt=query.trim();if(!prompt)return;setMessages((current)=>[...current,{role:'user',text:prompt}]);setQuery('');setLoading(true);const lower=normalise(prompt);let selected:{tool:string;rows:string[]}
    if(lower.includes('renew'))selected={tool:'renewals',rows:tools.renewals()};else if(lower.includes('invoice')||lower.includes('overdue'))selected={tool:'overdue_invoices',rows:tools.overdue()};else if(lower.includes('listing')||lower.includes('complete'))selected={tool:'listing_completeness',rows:tools.listings()};else if(lower.includes('campaign'))selected={tool:'campaign_performance',rows:tools.campaigns()};else if(lower.includes('risk')||lower.includes('attention'))selected={tool:'member_risk',rows:tools.risks()};else if(lower.includes('trade')||lower.includes('heritage'))selected={tool:'travel_trade_leads',rows:tools.trade()};else selected={tool:'workspace_summary',rows:[`${data.organisations.filter((org)=>org.status==='Active').length} active members`,`${data.opportunities.filter((item)=>item.stage!=='Won').length} open sales opportunities`,`${data.tasks.filter((item)=>!item.completed).length} open tasks`,`${platform.campaigns.filter((item)=>item.status==='Active').length} active campaigns`]}
    const {tool,rows}=selected
    let text=rows.length?`${rows.length} result${rows.length===1?'':'s'} from ${tool.replaceAll('_',' ')}:\n\n${rows.map((row)=>`• ${row}`).join('\n')}`:`I found no matching records in ${tool.replaceAll('_',' ')}.`
    if(lower.includes('draft')&&lower.includes('renew'))text+=`\n\nDraft:\nSubject: Your Visit Valechester membership renewal\n\nHello {{first_name}},\n\nYour {{membership_level}} membership renews on {{renewal_date}}. We’d welcome the opportunity to review the value delivered this year and discuss the next membership period.\n\nBest wishes,\nThe membership team`
    if(supabase&&user?.tenantId){const response=await supabase.functions.invoke('ask-visitmade',{body:{question:prompt,tool,results:rows,tenantId:user.tenantId,userRole:user.role}});if(response.data?.answer)text=String(response.data.answer)}
    setMessages((current)=>[...current,{role:'assistant',text}]);setLoading(false)}
  return <Drawer title="Ask VisitMade" subtitle="A permission-aware assistant for CRM queries and reviewable drafts." onClose={onClose} width="standard"><div className="assistant-shell"><div className="assistant-notice"><Sparkles size={16}/><span>Read-only by default. Publishing, sending, invoicing and permission changes always require a separate confirmation.</span></div><div className="assistant-messages" aria-live="polite">{messages.length?messages.map((message,index)=><article key={index} className={message.role}><strong>{message.role==='assistant'?'Ask VisitMade':'You'}</strong><p>{message.text}</p></article>):<EmptyState icon={Bot} title="What would you like to know?" description="Try “Which invoices are overdue?”, “Which listings are below 70%?” or “Draft a renewal email”."/>}{loading&&<article className="assistant"><strong>Ask VisitMade</strong><p>Checking the records you can access…</p></article>}</div><form className="assistant-compose" onSubmit={ask}><label htmlFor="assistant-query">Ask about this workspace</label><div><textarea id="assistant-query" rows={3} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Ask a question or request a draft…"/><Button type="submit" icon={Send} disabled={loading||!query.trim()}>Ask</Button></div></form></div></Drawer>
}
