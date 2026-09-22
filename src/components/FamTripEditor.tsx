import { useState, type FormEvent } from 'react'
import { useCRM } from '../store'
import { makePlatformId, usePlatform } from '../platform'
import type { FamTrip } from '../platformTypes'
import { Button, Field, Modal } from './UI'

function LinkSelector({label,options,selected,onChange}:{label:string;options:Array<{id:string;name:string}>;selected:string[];onChange:(ids:string[])=>void}){
  const available=options.filter((item)=>!selected.includes(item.id))
  return <Field label={label}>
    <div className="fam-link-selector">
      <select aria-label={`Add ${label.toLowerCase()}`} value="" onChange={(event)=>{if(event.target.value)onChange([...selected,event.target.value])}}>
        <option value="">Select to add…</option>
        {available.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {selected.length>0&&<div className="filter-chips">{selected.map((id)=>{const item=options.find((option)=>option.id===id);return <button type="button" key={id} className="fam-link-chip" aria-label={`Remove ${item?.name??id}`} onClick={()=>onChange(selected.filter((value)=>value!==id))}>{item?.name??'Unavailable record'} ×</button>})}</div>}
    </div>
  </Field>
}

export function FamTripEditor({trip,onClose,onSave}:{trip?:FamTrip;onClose:()=>void;onSave:(trip:FamTrip)=>void}){
  const {data:crm}=useCRM()
  const {data:platform}=usePlatform()
  const [draft,setDraft]=useState<FamTrip>(()=>trip??{id:makePlatformId('fam'),title:'',startDate:'',endDate:'',targetMarket:'',buyerIds:[],organisationIds:[],listingIds:[],itinerary:'',dietary:'',accessibility:'',cost:0,feedback:'',followUp:''})
  const [dateError,setDateError]=useState('')
  const update=<K extends keyof FamTrip>(key:K,value:FamTrip[K])=>setDraft((current)=>({...current,[key]:value}))
  const submit=(event:FormEvent)=>{event.preventDefault();if(draft.endDate<draft.startDate){setDateError('The end date must be on or after the start date.');return}onSave({...draft,title:draft.title.trim(),targetMarket:draft.targetMarket.trim(),itinerary:draft.itinerary.trim()})}
  return <Modal title={trip?`Edit ${trip.title}`:'New FAM trip'} subtitle="Plan the visit and keep buyer, member and itinerary details together." onClose={onClose} width="lg">
    <form className="form-stack" onSubmit={submit}>
      <Field label="Trip title"><input autoFocus required value={draft.title} onChange={(event)=>update('title',event.target.value)}/></Field>
      <div className="form-grid two">
        <Field label="Start date"><input required type="date" value={draft.startDate} onChange={(event)=>{update('startDate',event.target.value);setDateError('')}}/></Field>
        <Field label="End date"><input required type="date" min={draft.startDate||undefined} value={draft.endDate} onChange={(event)=>{update('endDate',event.target.value);setDateError('')}}/></Field>
      </div>
      {dateError&&<p className="form-error" role="alert">{dateError}</p>}
      <div className="form-grid two">
        <Field label="Target market"><input required value={draft.targetMarket} onChange={(event)=>update('targetMarket',event.target.value)}/></Field>
        <Field label="Cost (£)"><input type="number" min="0" step="0.01" value={draft.cost} onChange={(event)=>update('cost',Number(event.target.value))}/></Field>
      </div>
      <LinkSelector label="Buyers" options={platform.travelBuyers.map((item)=>({id:item.id,name:`${item.company} · ${item.contact}`}))} selected={draft.buyerIds} onChange={(ids)=>update('buyerIds',ids)}/>
      <LinkSelector label="Participating members" options={crm.organisations.filter((item)=>['Active','Renewing'].includes(item.status)||draft.organisationIds.includes(item.id)).map((item)=>({id:item.id,name:item.name}))} selected={draft.organisationIds} onChange={(ids)=>update('organisationIds',ids)}/>
      <LinkSelector label="Places and venues" options={crm.listings.map((item)=>({id:item.id,name:item.name}))} selected={draft.listingIds} onChange={(ids)=>update('listingIds',ids)}/>
      <Field label="Itinerary"><textarea required rows={6} value={draft.itinerary} onChange={(event)=>update('itinerary',event.target.value)} placeholder="Day 1: arrivals and welcome…"/></Field>
      <div className="form-grid two">
        <Field label="Dietary requirements"><textarea rows={3} value={draft.dietary} onChange={(event)=>update('dietary',event.target.value)}/></Field>
        <Field label="Accessibility requirements"><textarea rows={3} value={draft.accessibility} onChange={(event)=>update('accessibility',event.target.value)}/></Field>
      </div>
      <Field label="Feedback"><textarea rows={3} value={draft.feedback} onChange={(event)=>update('feedback',event.target.value)}/></Field>
      <Field label="Follow-up"><textarea rows={3} value={draft.followUp} onChange={(event)=>update('followUp',event.target.value)}/></Field>
      <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{trip?'Save FAM trip':'Create FAM trip'}</Button></div>
    </form>
  </Modal>
}
