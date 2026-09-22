import type { Campaign, CampaignMetric } from './platformTypes'
import type { CRMData } from './types'

export const campaignTypes=['Seasonal','Domestic leisure','International','Travel trade','Business events','Member/co-op','PR','Tactical'] as const
export const campaignStatuses=['Planning','Active','Paused','Completed','Cancelled'] as const
export const campaignMetrics:Record<CampaignMetric,string>={website_visits:'Website visits',leads:'Leads',bookings_referrals:'Bookings / referrals',impressions:'Impressions',reach:'Reach',engagement:'Engagement',email_subscribers:'Email subscribers',campaign_partners:'Campaign partners',partner_investment:'Partner investment',media_coverage:'Media coverage'}

export function normaliseCampaign(campaign:Campaign):Campaign{
  return {...campaign,status:campaign.status==='Complete'?'Completed':campaign.status,description:campaign.description??'',type:campaign.type??'Tactical',eventIds:campaign.eventIds??[],kpis:campaign.kpis??[],partners:campaign.partners??campaign.organisationIds.map((organisationId)=>({organisationId,contribution:0,participationType:'Featured partner',status:'Confirmed' as const,notes:''})),expenses:campaign.expenses??[],assets:campaign.assets??[],activity:campaign.activity??[],channelResults:campaign.channelResults??[],externalFunding:campaign.externalFunding??0,partnerInvestment:campaign.partnerInvestment??0,resultValue:campaign.resultValue??0}
}
export function campaignWebsiteResults(campaign:Campaign,crm:CRMData){
  const events=crm.analyticsEvents.filter((event)=>[campaign.id,campaign.name].includes(event.campaign??''))
  return {visits:events.filter((event)=>event.type==='page_view').length,leads:events.filter((event)=>event.type==='form_submit').length,referrals:events.filter((event)=>event.type==='cta_click').length,bookings:events.filter((event)=>event.type==='booking_completed').length}
}
export function campaignWebsiteChannels(campaign:Campaign,crm:CRMData){
  const sources=new Map<string,{source:string;visits:number;leads:number;referrals:number;bookings:number}>()
  for(const event of crm.analyticsEvents.filter((item)=>[campaign.id,campaign.name].includes(item.campaign??''))){
    const source=event.source||'Unknown'
    const row=sources.get(source)??{source,visits:0,leads:0,referrals:0,bookings:0}
    if(event.type==='page_view')row.visits++
    if(event.type==='form_submit')row.leads++
    if(event.type==='cta_click')row.referrals++
    if(event.type==='booking_completed')row.bookings++
    sources.set(source,row)
  }
  return [...sources.values()].sort((a,b)=>b.visits-a.visits)
}
export function campaignFinance(campaign:Campaign){
  const planned=(campaign.expenses??[]).reduce((sum,item)=>sum+item.planned,0)
  const actual=(campaign.expenses??[]).reduce((sum,item)=>sum+item.actual,0)
  const contributions=(campaign.partners??[]).filter((item)=>['Confirmed','Active','Completed'].includes(item.status)).reduce((sum,item)=>sum+item.contribution,0)
  const funding=campaign.externalFunding??0
  const totalFunding=campaign.budget
  const spend=(campaign.actualSpend??0)+actual
  return {planned,spend,contributions,funding,totalFunding,remaining:totalFunding-spend,unfunded:Math.max(0,totalFunding-contributions-funding),roi:campaign.resultValue&&campaign.resultValueEvidence?.trim()&&spend>0?(campaign.resultValue-spend)/spend:null}
}
export function campaignKpiActual(metric:CampaignMetric,campaign:Campaign,crm:CRMData){
  const measured=campaignWebsiteResults(campaign,crm)
  if(metric==='website_visits')return measured.visits
  if(metric==='leads')return measured.leads
  if(metric==='bookings_referrals')return measured.bookings+measured.referrals
  if(metric==='campaign_partners')return (campaign.partners??[]).filter((item)=>['Confirmed','Active','Completed'].includes(item.status)).length
  if(metric==='partner_investment')return campaignFinance(campaign).contributions
  return campaign.kpis?.find((item)=>item.metric===metric)?.actual??0
}
export function campaignKpiProgress(target:number,actual:number){return target>0?Math.min(100,Math.round(actual/target*100)):0}
