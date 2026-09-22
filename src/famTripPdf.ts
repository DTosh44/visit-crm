import type { CRMData } from './types'
import type { FamTrip, TravelBuyer } from './platformTypes'
import { tenant } from './tenant'

export interface FamItineraryDay { label:string; text:string }

export function parseFamItinerary(value:string):FamItineraryDay[]{
  const normalised=value.trim().replace(/([^\n])\s+(?=Day\s+\d+\s*[:–-])/gi,'$1\n')
  const days:FamItineraryDay[]=[]
  for(const line of normalised.split(/\n+/).map((part)=>part.trim()).filter(Boolean)){
    const day=line.match(/^Day\s+(\d+)\s*[:–-]\s*(.*)$/i)
    if(day){days.push({label:`Day ${day[1]}`,text:day[2]})}
    else if(days.length){days[days.length-1].text+=`${days[days.length-1].text?'\n':''}${line}`}
    else days.push({label:'Visit programme',text:line})
  }
  return days
}

export function famTripMemberDetails(trip:FamTrip,data:CRMData){
  return trip.organisationIds.map((id)=>{
    const organisation=data.organisations.find((item)=>item.id===id)
    if(!organisation)return null
    const places=trip.listingIds.map((listingId)=>data.listings.find((item)=>item.id===listingId)).filter((item)=>item?.organisationId===id).map((item)=>item!.name)
    return {id,name:organisation.name,type:organisation.type,town:organisation.town,website:organisation.website,places}
  }).filter((item):item is NonNullable<typeof item>=>Boolean(item))
}

function safe(value:string){return value.replace(/[\u2018\u2019]/g,"'").replace(/[\u2013\u2014\u2011]/g,'-').replace(/[^\x20-\xFF\n]/g,'?')}
function colour(hex:string,fallback:string){const valid=/^#[0-9a-f]{6}$/i.test(hex)?hex:fallback;return [1,3,5].map((offset)=>parseInt(valid.slice(offset,offset+2),16)/255) as [number,number,number]}
function displayWebsite(data:CRMData,baseUrl?:string){const configured=data.workspace.publicWebsiteUrl?.trim()||tenant.websiteUrl;try{return new URL(configured,baseUrl||'https://visit-crm.vercel.app').toString().replace(/\/$/,'')}catch{return configured}}
function slug(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,70)||'fam-trip'}

export async function createFamTripPdf(trip:FamTrip,data:CRMData,buyers:TravelBuyer[],baseUrl?:string):Promise<Uint8Array>{
  const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib')
  const pdf=await PDFDocument.create()
  const regular=await pdf.embedFont(StandardFonts.Helvetica)
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold)
  let embeddedLogo:Awaited<ReturnType<typeof pdf.embedPng>>|undefined
  if(data.workspace.destinationLogoUrl){
    const response=await fetch(data.workspace.destinationLogoUrl)
    if(!response.ok)throw new Error('The destination logo could not be loaded for the PDF.')
    const bytes=new Uint8Array(await response.arrayBuffer())
    embeddedLogo=bytes[0]===0xff&&bytes[1]===0xd8?await pdf.embedJpg(bytes):await pdf.embedPng(bytes)
  }
  const W=595.28,H=841.89,M=46,CW=W-M*2
  const primary=rgb(...colour(data.workspace.primaryColour,'#6d294f'))
  const accent=rgb(...colour(data.workspace.accentColour,'#f0785e'))
  const supporting=rgb(...colour(data.workspace.supportingColour,'#7a9a83'))
  const ink=rgb(.13,.10,.17),muted=rgb(.39,.42,.46),paper=rgb(1,.994,.977),pale=rgb(.958,.971,.967),white=rgb(1,1,1)
  const website=displayWebsite(data,baseUrl)
  const pages:ReturnType<typeof pdf.addPage>[]=[]
  let page=pdf.addPage([W,H]),cursor=H
  const draw=(value:string,x:number,y:number,size=10,font=regular,color=ink)=>{page.drawText(safe(value),{x,y,size,font,color})}
  const drawFitted=(value:string,x:number,y:number,maxWidth:number,size:number,font=regular,color=ink)=>{let fittedSize=size;while(font.widthOfTextAtSize(safe(value),fittedSize)>maxWidth&&fittedSize>6)fittedSize-=.25;draw(value,x,y,fittedSize,font,color)}
  const wrap=(value:string,maxWidth:number,size:number,font=regular)=>{
    const lines:string[]=[]
    for(const paragraph of safe(value).split('\n')){
      const words=paragraph.split(/\s+/).filter(Boolean)
      if(!words.length){lines.push('');continue}
      let line=''
      for(const word of words){const candidate=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(candidate,size)<=maxWidth){line=candidate;continue}if(line)lines.push(line);line=word}
      if(line)lines.push(line)
    }
    return lines
  }
  const footer=()=>{
    page.drawRectangle({x:0,y:0,width:W,height:73,color:primary})
    page.drawRectangle({x:0,y:73,width:W,height:4,color:accent})
    drawFitted(data.workspace.legalName||data.workspace.destinationName,M,49,CW-30,9,bold,white)
    drawFitted(`${website}  |  ${data.workspace.contactEmail}${data.workspace.contactPhone?`  |  ${data.workspace.contactPhone}`:''}`,M,32,CW-30,8,regular,white)
    const address=wrap(data.workspace.address,CW-35,7.5,regular)[0]||''
    drawFitted(address,M,18,CW-30,7.5,regular,white)
    draw(String(pages.length),W-M-10,49,8,bold,white)
  }
  const mark=(x:number,y:number)=>{
    page.drawRectangle({x,y,width:44,height:44,color:white,opacity:.13,borderColor:white,borderWidth:.6})
    page.drawSvgPath('M8 8h9l7 21L31 8h9L27 40h-7L8 8Z',{x:x+3,y:y+41,scale:.85,color:white})
    page.drawSvgPath('M12 34c7-5 16-6 25-2',{x:x+3,y:y+41,scale:.85,borderColor:white,borderWidth:2})
  }
  const logo=(x:number,y:number)=>{
    if(!embeddedLogo){mark(x,y);return 58}
    const dimensions=embeddedLogo.scale(Math.min(150/embeddedLogo.width,42/embeddedLogo.height))
    page.drawRectangle({x,y,width:165,height:52,color:white})
    page.drawImage(embeddedLogo,{x:x+(165-dimensions.width)/2,y:y+(52-dimensions.height)/2,width:dimensions.width,height:dimensions.height})
    return 178
  }
  const addPage=(first=false)=>{
    if(pages.length)footer()
    if(pages.length)page=pdf.addPage([W,H])
    pages.push(page)
    page.drawRectangle({x:0,y:0,width:W,height:H,color:paper})
    if(first){
      page.drawRectangle({x:0,y:658,width:W,height:H-658,color:primary})
      page.drawRectangle({x:M,y:641,width:62,height:4,color:accent})
      const logoOffset=logo(M,765)
      drawFitted(data.workspace.destinationName.toUpperCase(),M+logoOffset,791,CW-logoOffset,15,bold,white)
      drawFitted(data.workspace.strapline||'Destination familiarisation',M+logoOffset,774,CW-logoOffset,8,regular,white)
      draw('FAMILIARISATION VISIT',M,742,9,bold,white)
      const titleLines=wrap(trip.title,CW,27,bold).slice(0,2)
      titleLines.forEach((line,index)=>draw(line,M,705-index*31,27,bold,white))
      cursor=621
      draw(`${trip.targetMarket.toUpperCase()}  /  ${new Date(`${trip.startDate}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} - ${new Date(`${trip.endDate}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`,M,cursor,10,bold,primary)
      cursor-=38
    }else{
      page.drawRectangle({x:0,y:768,width:W,height:H-768,color:primary})
      const logoOffset=logo(M,779)
      drawFitted(data.workspace.destinationName.toUpperCase(),M+logoOffset,799,CW-logoOffset,14,bold,white)
      drawFitted(`${trip.title}  /  itinerary continued`,M+logoOffset,782,CW-logoOffset,8,regular,white)
      cursor=742
    }
  }
  addPage(true)
  const ensure=(height:number)=>{if(cursor-height<105)addPage()}
  const section=(title:string,subtitle?:string)=>{ensure(52);draw(title.toUpperCase(),M,cursor,11,bold,primary);page.drawRectangle({x:M,y:cursor-10,width:32,height:2,color:accent});cursor-=25;if(subtitle){const lines=wrap(subtitle,CW,9,regular);lines.forEach((line)=>{draw(line,M,cursor,9,regular,muted);cursor-=13})}cursor-=13}
  const paragraph=(text:string)=>{for(const line of wrap(text,CW,9.5,regular)){ensure(16);draw(line,M,cursor,9.5,regular,ink);cursor-=15}cursor-=6}

  section('Your visit',`A hosted programme by ${data.workspace.legalName||data.workspace.destinationName}. Times and arrangements can be confirmed with the destination team.`)
  section('The itinerary')
  for(const [index,day] of parseFamItinerary(trip.itinerary).entries()){
    const lines=wrap(day.text,CW-64,10,regular)
    const chunks:string[][]=[]
    for(let offset=0;offset<lines.length;offset+=23)chunks.push(lines.slice(offset,offset+23))
    if(!chunks.length)chunks.push([''])
    chunks.forEach((chunk,part)=>{
      const height=48+chunk.length*15
      ensure(height+12)
      page.drawRectangle({x:M,y:cursor-height+11,width:CW,height:height,color:pale})
      page.drawRectangle({x:M,y:cursor-height+11,width:4,height:height,color:index%2?accent:supporting})
      draw(part?`${day.label.toUpperCase()} - CONTINUED`:day.label.toUpperCase(),M+18,cursor-19,10,bold,primary)
      chunk.forEach((line,lineIndex)=>draw(line,M+18,cursor-43-lineIndex*15,10,regular,ink))
      cursor-=height+14
    })
  }

  const members=famTripMemberDetails(trip,data)
  if(members.length){
    const memberHeight=members.reduce((sum,member)=>sum+40+wrap(member.places.length?member.places.join(', '):`${member.type}  /  ${member.town}`,CW-24,8.5,regular).length*12,0)+60
    ensure(memberHeight)
    section('Members included','Destination partners contributing to the visit.')
    for(const member of members){
      const names=member.places.length?member.places.join(', '):`${member.type}  /  ${member.town}`
      const detailLines=wrap(names,CW-24,8.5,regular)
      ensure(39+detailLines.length*12)
      page.drawLine({start:{x:M,y:cursor+6},end:{x:W-M,y:cursor+6},thickness:.6,color:supporting,opacity:.35})
      draw(member.name,M,cursor-9,10.5,bold,ink)
      detailLines.forEach((line,index)=>draw(line,M,cursor-25-index*12,8.5,regular,muted))
      cursor-=40+detailLines.length*12
    }
  }
  const selectedBuyers=buyers.filter((buyer)=>trip.buyerIds.includes(buyer.id))
  if(selectedBuyers.length){section('Hosted for');paragraph(selectedBuyers.map((buyer)=>buyer.company).join('  /  '))}
  if(trip.dietary.trim()||trip.accessibility.trim()){
    section('Practical information')
    if(trip.dietary.trim()){draw('DIETARY',M,cursor,8,bold,primary);cursor-=15;paragraph(trip.dietary)}
    if(trip.accessibility.trim()){draw('ACCESSIBILITY',M,cursor,8,bold,primary);cursor-=15;paragraph(trip.accessibility)}
  }
  section('Contact the destination team')
  paragraph([data.workspace.legalName,data.workspace.contactEmail,data.workspace.contactPhone,website,data.workspace.address].filter(Boolean).join('  |  '))
  footer()
  pdf.setTitle(`${trip.title} - ${data.workspace.destinationName} FAM itinerary`)
  pdf.setAuthor(data.workspace.legalName||data.workspace.destinationName)
  pdf.setSubject('Familiarisation trip itinerary')
  return pdf.save()
}

export async function downloadFamTripPdf(trip:FamTrip,data:CRMData,buyers:TravelBuyer[]){
  const bytes=await createFamTripPdf(trip,data,buyers,window.location.origin)
  const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}))
  const link=document.createElement('a')
  link.href=url;link.download=`${slug(trip.title)}-itinerary.pdf`;document.body.appendChild(link);link.click();link.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),60_000)
}
