import { describe, expect, it } from 'vitest'
import { initialData } from './data'
import { initialPlatformData } from './platformData'
import { canSetTradeLeadStage, matchTradeProducts, normaliseTradeLead, tradeReport } from './travelTradeModel'

describe('travel trade records',()=>{
  it('does not treat a legacy won stage as a conversion without an outcome and date',()=>{
    const lead={...initialPlatformData.tradeLeads[0],stage:'Won' as const,outcome:''}
    expect(normaliseTradeLead(lead).stage).toBe('Responded')
    expect(canSetTradeLeadStage({...lead,stage:'Responded',convertedAt:'2026-09-20',outcome:'Booked',distributions:[{organisationId:'org-001',sharedAt:'2026-09-01',response:'Converted',notes:''}]},'Converted')).toBe(true)
    expect(canSetTradeLeadStage({...lead,stage:'Responded',convertedAt:undefined},'Converted')).toBe(false)
  })
  it('requires a recorded share date and member response before progressing',()=>{
    const lead=normaliseTradeLead(initialPlatformData.tradeLeads[0])
    expect(canSetTradeLeadStage({...lead,stage:'Qualified'},'Shared')).toBe(false)
    const shared={...lead,stage:'Qualified' as const,distributions:[{organisationId:'org-001',sharedAt:'2026-09-20',response:'Awaiting' as const,notes:''}]}
    expect(canSetTradeLeadStage(shared,'Shared')).toBe(true)
    expect(canSetTradeLeadStage({...shared,stage:'Shared'},'Responded')).toBe(false)
  })
  it('matches only published products to explicit buyer interests',()=>{
    const buyer={...initialPlatformData.travelBuyers[0],interests:['Heritage']}
    const matches=matchTradeProducts(buyer,initialData.listings)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.every((item)=>item.listing.status==='Published'&&item.matches.includes('heritage'))).toBe(true)
  })
  it('reports only linked contacts, logged meetings and evidenced conversions',()=>{
    const platform={...initialPlatformData,tradeActivities:[{id:'trade-activity-test',date:'2026-09-20',type:'Meeting' as const,title:'Product meeting',detail:'Discussed groups',owner:'Morgan Lee',buyerId:'buyer-001'}]}
    const report=tradeReport(initialData,platform)
    expect(report.meetings).toBe(1)
    expect(report.conversions).toBe(0)
    expect(report.activeContacts).toBe(0)
    expect(report.membersRepresented).toBeGreaterThan(0)
  })
})
