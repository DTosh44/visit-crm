import type { Listing } from './types'

export interface VisitorFilterOption { id:string; label:string; terms:string[] }
export interface VisitorFilterGroup { id:'experience'|'party'|'occasion'|'needs'; label:string; prompt:string; options:VisitorFilterOption[] }

export const visitorFilterGroups: VisitorFilterGroup[] = [
  { id:'experience', label:'What would you like to do?', prompt:'Choose one or more experiences', options:[
    {id:'heritage',label:'History & heritage',terms:['heritage','history','historic','castle','museum','abbey','interactive history']},
    {id:'outdoors',label:'Outdoors & nature',terms:['outdoor','garden','park','walk','wildlife','nature']},
    {id:'food',label:'Food & drink',terms:['food','drink','restaurant','café','cafe','dining','distillery']},
    {id:'culture',label:'Arts & culture',terms:['art','arts','culture','gallery','theatre','music']},
    {id:'shopping',label:'Independent shopping',terms:['shopping','shop','retail','independent']},
    {id:'stay',label:'Places to stay',terms:['stay','hotel','accommodation','lodge','overnight']},
  ]},
  { id:'party', label:'Who are you visiting with?', prompt:'Find places that suit your group', options:[
    {id:'families',label:'Families',terms:['family','families','children','kids','under 5']},
    {id:'couples',label:'Couples & romantic visits',terms:['couple','couples','romantic','romance','date night','partner','partners','husband','wife']},
    {id:'groups',label:'Groups',terms:['group','groups','coach']},
    {id:'solo',label:'Solo visitors',terms:['solo','independent traveller']},
    {id:'dogs',label:'Dog friendly',terms:['dog','dogs','pet friendly','dog-friendly']},
  ]},
  { id:'occasion', label:'What kind of visit is it?', prompt:'Match the moment and the weather', options:[
    {id:'rainy',label:'A rainy day',terms:['rain','rainy','wet weather','indoor']},
    {id:'evening',label:'An evening out',terms:['evening','night','after dark']},
    {id:'short',label:'A quick visit',terms:['quick','short visit','two hours']},
    {id:'full-day',label:'A full day',terms:['full day','full-day','day out']},
    {id:'break',label:'A short break',terms:['short break','overnight','weekend','stay']},
    {id:'peaceful',label:'Something peaceful',terms:['peaceful','quiet','relaxing']},
  ]},
  { id:'needs', label:'What do you need?', prompt:'Add practical requirements', options:[
    {id:'accessible',label:'Accessible',terms:['accessible','accessibility','step free','step-free','wheelchair']},
    {id:'free',label:'Free to visit',terms:['free','no cost','free to visit','free outdoor spaces']},
    {id:'parking',label:'Parking',terms:['parking','on-site parking','car park']},
    {id:'food-available',label:'Food available',terms:['food available','café','cafe','restaurant']},
    {id:'bookable',label:'Book ahead',terms:['book','booking','booking recommended','bookable']},
  ]},
]

export function visitorTaxonomyFor(listing: Pick<Listing, 'category' | 'searchTags' | 'visitorTaxonomy'>) {
  if (listing.visitorTaxonomy?.length) return listing.visitorTaxonomy
  const searchable = `${listing.category} ${listing.searchTags.join(' ')}`.toLowerCase()
  const audiences: string[] = []
  const add = (label: string, pattern: RegExp) => { if (pattern.test(searchable)) audiences.push(label) }
  add('Families with children', /famil|under 5|play/)
  add('Couples', /romantic|couple/)
  add('Groups', /group/)
  add('Visitors with access needs', /access|wheel|hearing|step-free/)
  add('Dog owners', /dog/)
  add('Wet-weather planners', /rainy|indoor/)
  add('Outdoor explorers', /outdoor|garden|park|walk/)
  add('Food and drink visitors', /food|restaurant|café|cafe|drink|distill/)
  add('Short-break visitors', /overnight|hotel|accommodation|stay/)
  if (!audiences.length) audiences.push('First-time visitors', 'Local residents')
  return audiences
}

export function listingTaxonomyText(listing: Listing, allowedSearchTags: string[]) {
  return [listing.name,listing.category,listing.town,listing.shortDescription,listing.description,...listing.facilities,...allowedSearchTags,...visitorTaxonomyFor(listing),...listing.goodToKnow].join(' ').toLowerCase()
}

export function matchesVisitorOption(listing: Listing, option: VisitorFilterOption, allowedSearchTags: string[]) {
  const text=listingTaxonomyText(listing,allowedSearchTags)
  return option.terms.some((term)=>text.includes(term.toLowerCase()))
}

const ignoredSearchWords=new Set(['a','an','and','day','days','for','in','me','my','of','our','the','to','with','want','looking'])
const aliases:Record<string,string[]>= { partner:['couple','romantic'],girlfriend:['couple','romantic'],boyfriend:['couple','romantic'],kids:['family','children'],child:['family','children'],raining:['rainy','indoor'],wet:['rainy','indoor'],mobility:['accessible','step-free'],wheelchairs:['wheelchair','accessible'],cheap:['free'],night:['evening'] }
function editDistance(a:string,b:string){const row=Array.from({length:b.length+1},(_,index)=>index);for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const saved=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=saved}}return row[b.length]}

export function filtersForVisitorQuery(query:string) {
  const normalized=` ${query.toLowerCase().replace(/[^a-z0-9-]+/g,' ').replace(/\s+/g,' ').trim()} `
  return Object.fromEntries(visitorFilterGroups.map((group)=>[group.id,group.options.filter((option)=>option.terms.some((term)=>{
    const clean=term.toLowerCase().replace(/[^a-z0-9-]+/g,' ').replace(/\s+/g,' ').trim()
    return normalized.includes(` ${clean} `)||clean.split(' ').some((word)=>word.length>4&&normalized.includes(` ${word} `))
  })).map((option)=>option.id)]).filter(([,ids])=>ids.length)) as Record<string,string[]>
}
export function matchesVisitorQuery(listing: Listing, query: string, allowedSearchTags: string[]) {
  const text=listingTaxonomyText(listing,allowedSearchTags)
  const textWords=Array.from(new Set(text.split(/[^a-z0-9-]+/).filter(Boolean)))
  const words=query.toLowerCase().split(/\s+/).map((word)=>word.replace(/[^a-z0-9-]/g,'')).filter((word)=>word&&!ignoredSearchWords.has(word))
  return words.every((word)=>{
    if(text.includes(word)) return true
    if((aliases[word]??[]).some((alias)=>text.includes(alias)))return true
    if(word.length>=5&&textWords.some((candidate)=>candidate.length>=5&&editDistance(word,candidate)<=1))return true
    const options=visitorFilterGroups.flatMap((group)=>group.options).filter((option)=>option.terms.some((term)=>term.includes(word)||word.includes(term)))
    return options.some((option)=>matchesVisitorOption(listing,option,allowedSearchTags))
  })
}
