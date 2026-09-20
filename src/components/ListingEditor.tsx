import { ArrowDown, ArrowUp, Check, Film, Globe2, Image, Info, Link2, MapPin, Plus, Save, Send, Sparkles, Star, Trash2, UploadCloud } from 'lucide-react'
import { useState, type ChangeEvent, type DragEvent } from 'react'
import { supabase } from '../auth'
import { useCRM } from '../store'
import { imageLibrary } from '../siteData'
import { tenant } from '../tenant'
import type { Listing, ListingMedia } from '../types'
import { visitorTaxonomyFor } from '../listingTaxonomy'
import { Badge, Button, Drawer, Field, Progress, Tabs } from './UI'

type EditorTab = 'Content' | 'Visitor taxonomy' | 'Review sites' | 'Contact & links' | 'Facilities' | 'Media' | 'Preview'

function listingMediaUrl(value:string) { return imageLibrary[value]??value??imageLibrary.hero }
function fileDataUrl(file:File) { return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('The image could not be read.'));reader.readAsDataURL(file)}) }

export function ListingEditor({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { data, updateListing, publishListing } = useCRM()
  const [tab, setTab] = useState<EditorTab>('Content')
  const [draft, setDraft] = useState(listing)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [aiLoading,setAiLoading]=useState(false)
  const [aiError,setAiError]=useState('')
  const organisation = data.organisations.find((item) => item.id === listing.organisationId)
  const membershipLevel = data.levels.find((item) => item.name === organisation?.tier)
  const taxonomyAllowance = membershipLevel?.taxonomyAllowance ?? 0
  const mediaAllowance = membershipLevel
    ? `${membershipLevel.imageAllowance} image${membershipLevel.imageAllowance === 1 ? '' : 's'}${membershipLevel.videoAllowance ? ` and ${membershipLevel.videoAllowance} video${membershipLevel.videoAllowance === 1 ? '' : 's'}` : ''}`
    : 'Media allowance unavailable'
  const media=draft.media?.length?draft.media:[{id:`media-${draft.id}-hero`,type:'image' as const,url:draft.image,alt:draft.name,caption:''}]
  const images=media.filter((item)=>item.type==='image')
  const videos=media.filter((item)=>item.type==='video')
  const mediaEnabled=Boolean(membershipLevel&&membershipLevel.id!=='level-006')

  const set = <K extends keyof Listing>(key: K, value: Listing[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const save = () => {
    updateListing(listing.id, draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }
  const publish = () => {
    updateListing(listing.id, draft)
    publishListing(listing.id)
    onClose()
  }
  const storeImage=async(file:File)=>{
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error(`${file.name} is not a JPG, PNG or WebP image.`)
    if(file.size>10*1024*1024) throw new Error(`${file.name} is larger than 10 MB.`)
    if(supabase){
      const safeName=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-')
      const storagePath=`${tenant.id}/${listing.id}/${Date.now()}-${safeName}`
      const {error}=await supabase.storage.from('listing-media').upload(storagePath,file,{contentType:file.type,upsert:false})
      if(error) throw error
      return {url:supabase.storage.from('listing-media').getPublicUrl(storagePath).data.publicUrl,storagePath}
    }
    if(file.size>2*1024*1024) throw new Error('Connect Supabase Storage to upload images over 2 MB. Smaller files can be stored in this browser.')
    return {url:await fileDataUrl(file),storagePath:undefined}
  }
  const addImages=async(files:File[])=>{
    if(!mediaEnabled||!membershipLevel)return
    const remaining=membershipLevel.imageAllowance-images.length
    if(remaining<=0){setMediaError(`This listing has reached its allowance of ${membershipLevel.imageAllowance} images.`);return}
    const selected=files.slice(0,remaining)
    if(files.length>remaining)setMediaError(`${remaining} more ${remaining===1?'image is':'images are'} available on this membership level.`);else setMediaError('')
    setUploading(true)
    try{
      const uploaded:ListingMedia[]=[]
      for(const file of selected){const stored=await storeImage(file);uploaded.push({id:`media-${Date.now()}-${uploaded.length}`,type:'image',url:stored.url,storagePath:stored.storagePath,alt:file.name.replace(/\.[^.]+$/,''),caption:''})}
      setDraft((current)=>({...current,media:[...(current.media?.length?current.media:media),...uploaded],image:current.image||uploaded[0]?.url||''}))
    }catch(error){setMediaError(error instanceof Error?error.message:'The images could not be uploaded.')}finally{setUploading(false)}
  }
  const onFiles=(event:ChangeEvent<HTMLInputElement>)=>{void addImages(Array.from(event.target.files??[]));event.target.value=''}
  const onDrop=(event:DragEvent<HTMLLabelElement>)=>{event.preventDefault();void addImages(Array.from(event.dataTransfer.files))}
  const replaceImage=async(item:ListingMedia,file?:File)=>{
    if(!file)return
    setUploading(true);setMediaError('')
    try{const stored=await storeImage(file);setDraft((current)=>({...current,image:current.image===item.url?stored.url:current.image,media:(current.media??media).map((entry)=>entry.id===item.id?{...entry,url:stored.url,storagePath:stored.storagePath}:entry)}))}catch(error){setMediaError(error instanceof Error?error.message:'The image could not be replaced.')}finally{setUploading(false)}
  }
  const removeMedia=(item:ListingMedia)=>{
    const next=media.filter((entry)=>entry.id!==item.id)
    const nextHero=draft.image===item.url?(next.find((entry)=>entry.type==='image')?.url??''):draft.image
    setDraft((current)=>({...current,media:next,image:nextHero}))
    if(item.storagePath&&supabase)void supabase.storage.from('listing-media').remove([item.storagePath])
  }
  const moveImage=(item:ListingMedia,direction:-1|1)=>{
    const currentIndex=media.findIndex((entry)=>entry.id===item.id);let target=currentIndex+direction
    while(target>=0&&target<media.length&&media[target].type!=='image')target+=direction
    if(target<0||target>=media.length)return
    const next=[...media];[next[currentIndex],next[target]]=[next[target],next[currentIndex]];set('media',next)
  }
  const updateMedia=(itemId:string,changes:Partial<ListingMedia>)=>set('media',media.map((item)=>item.id===itemId?{...item,...changes}:item))
  const suggestCopy=async()=>{
    setAiLoading(true);setAiError('')
    if(supabase){const {data:result,error}=await supabase.functions.invoke('generate-listing-copy',{body:{name:draft.name,town:draft.town,category:draft.category,shortDescription:draft.shortDescription,description:draft.description,facilities:draft.facilities,searchTags:draft.searchTags}});if(!error&&result?.shortDescription&&result?.description){setDraft((current)=>({...current,shortDescription:result.shortDescription,description:result.description}));setAiLoading(false);return}if(error)setAiError(error.message)}
    setDraft((current)=>{
    const short=current.shortDescription.trim()||`Discover ${current.name} in ${current.town}, with practical information to help you plan your visit.`
    const description=current.description.trim()||`${current.name} offers visitors a memorable experience in ${current.town}. Check opening information, accessibility and facilities before travelling, then book ahead where recommended.`
    return {...current,shortDescription:short.charAt(0).toUpperCase()+short.slice(1),description:description.charAt(0).toUpperCase()+description.slice(1)}
  })
    setAiLoading(false)
  }

  return (
    <Drawer title="Edit website listing" subtitle={`${listing.name} · Changes save to the CRM record`} onClose={onClose}>
      <div className="listing-editor-top">
        <div><Badge>{listing.status}</Badge><span>Last updated {listing.lastUpdated}</span></div>
        <div className="completion-inline"><span>Listing completeness</span><Progress value={draft.completeness} colour="#5c57d6" /><strong>{draft.completeness}%</strong></div>
      </div>
      <Tabs items={['Content','Visitor taxonomy','Review sites','Contact & links','Facilities','Media','Preview'] as EditorTab[]} active={tab} onChange={setTab} />

      <div className="listing-editor-body">
        <div className="editor-main">
          {tab === 'Content' && <div className="form-stack">
            <div className="ai-helper"><span><Sparkles size={18} /></span><div><strong>Improve this listing copy</strong><p>{aiError||'Fill missing visitor-focused copy while preserving approved business details.'}</p></div><Button variant="secondary" size="sm" disabled={aiLoading} onClick={()=>void suggestCopy()}>{aiLoading?'Writing…':'Suggest improvements'}</Button></div>
            <div className="form-grid two">
              <Field label="Listing name"><input value={draft.name} onChange={(event) => set('name', event.target.value)} /></Field>
              <Field label="Category"><select value={draft.category} onChange={(event) => set('category', event.target.value)}><option>Attractions</option><option>Castles & heritage</option><option>Accommodation</option><option>Hotels</option><option>Experiences</option><option>Museums</option><option>Galleries</option><option>Restaurants</option><option>Shopping</option><option>Parks & gardens</option><option>Theatre</option></select></Field>
            </div>
            <Field label="Short description" hint={`${draft.shortDescription.length}/180 characters`}><textarea rows={3} maxLength={180} value={draft.shortDescription} onChange={(event) => set('shortDescription', event.target.value)} /></Field>
            <Field label="Full description" hint="Use clear, visitor-focused language. This appears on the listing page."><textarea rows={8} value={draft.description} onChange={(event) => set('description', event.target.value)} /></Field>
            <div className="form-grid two"><Field label="Town"><input value={draft.town} onChange={(event) => set('town', event.target.value)} /></Field><Field label="Opening hours"><input value={draft.openingHours} onChange={(event) => set('openingHours', event.target.value)} /></Field></div>
          </div>}

          {tab === 'Visitor taxonomy' && <div className="form-stack">
            <div><h3 className="form-title">Visitor search taxonomy</h3><p className="form-description">These tags power website search and practical filters. Review highlights stay separate so their evidence remains clear.</p></div>
            <Field label="Visitor interests" hint="Audience groups and trip motivations, separated by commas"><textarea rows={3} value={visitorTaxonomyFor(draft).join(', ')} onChange={(event) => set('visitorTaxonomy', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></Field>
            <Field label="Search categories" hint={`${draft.searchTags.length}/${taxonomyAllowance} included with ${organisation?.tier ?? 'this level'}`}><textarea rows={4} value={draft.searchTags.join(', ')} onChange={(event) => set('searchTags', event.target.value.split(',').map((item) => item.trim()).filter(Boolean).slice(0,taxonomyAllowance))} /></Field>
            <div className="taxonomy-suggestions"><strong>Suggested visitor categories</strong><small>Higher membership levels include more categories and more opportunities to appear in filtered searches.</small><div>{['Rainy-day activity','Great for families','Dog-friendly','Accessible','Free to visit','Romantic','Suitable for groups','Indoor attraction','Outdoor experience','Evening activity','Food available','On-site parking','Booking recommended'].map((tag) => { const atLimit=draft.searchTags.length>=taxonomyAllowance&&!draft.searchTags.includes(tag); return <button type="button" key={tag} disabled={atLimit} className={draft.searchTags.includes(tag) ? 'selected' : ''} onClick={() => set('searchTags', draft.searchTags.includes(tag) ? draft.searchTags.filter((item) => item !== tag) : [...draft.searchTags, tag].slice(0,taxonomyAllowance))}>{draft.searchTags.includes(tag) && <Check size={12} />}{tag}</button>})}</div></div>
            <Field label="Visitors frequently mention" hint="Evidence-led themes from review analysis"><textarea rows={3} value={draft.reviewHighlights.join(', ')} onChange={(event) => set('reviewHighlights', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></Field>
            <Field label="Good to know" hint="Practical facts or recurring operational feedback"><textarea rows={3} value={draft.goodToKnow.join(', ')} onChange={(event) => set('goodToKnow', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></Field>
            <div className="info-note"><Info size={17} /><p>Search tags can be member verified, editorially assigned or supported by reviews. Publish review themes only when the evidence is strong enough.</p></div>
          </div>}

          {tab === 'Review sites' && <div className="form-stack">
            <div><h3 className="form-title">Review sites</h3><p className="form-description">Add the organisation’s official review profiles. Eligible public listing templates can link visitors to these sources.</p></div>
            <div className="review-site-editor">{(draft.reviewSites ?? []).map((site, index) => <div key={site.id} className="review-site-row"><Link2 size={18}/><Field label="Review platform"><select value={site.name} onChange={(event) => set('reviewSites', (draft.reviewSites ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}><option>Google Business Profile</option><option>Tripadvisor</option><option>Trustpilot</option><option>Facebook</option><option>Other</option></select></Field><Field label="Profile URL"><input type="url" placeholder="https://" value={site.url} onChange={(event) => set('reviewSites', (draft.reviewSites ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))}/></Field><button type="button" aria-label={`Remove ${site.name}`} onClick={() => set('reviewSites', (draft.reviewSites ?? []).filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17}/></button></div>)}</div>
            <Button variant="secondary" icon={Plus} onClick={() => set('reviewSites', [...(draft.reviewSites ?? []), { id: `review-${Date.now()}`, name: 'Google Business Profile', url: '' }])}>Add review site</Button>
            <div className="info-note"><Info size={17}/><p>Use the business’s official profile URL. Adding a profile does not import or republish review content automatically.</p></div>
          </div>}

          {tab === 'Contact & links' && <div className="form-stack">
            <div className="form-grid two"><Field label="Public email"><input type="email" value={draft.email} onChange={(event) => set('email', event.target.value)} /></Field><Field label="Public phone"><input value={draft.phone} onChange={(event) => set('phone', event.target.value)} /></Field></div>
            <Field label="Website URL"><input type="url" value={draft.website} onChange={(event) => set('website', event.target.value)} /></Field>
            <Field label="Booking URL" hint="Leave blank if visitors do not need to book."><input type="url" value={draft.bookingUrl} onChange={(event) => set('bookingUrl', event.target.value)} /></Field>
            <div className="info-note"><Info size={17} /><p>Contact details here are public. Private CRM contacts are never published automatically.</p></div>
          </div>}

          {tab === 'Facilities' && <div className="form-stack">
            <div><h3 className="form-title">Facilities and accessibility</h3><p className="form-description">Select everything visitors can rely on at this location.</p></div>
            <div className="check-grid">{['Accessible toilets','Accessible entrance','Accessible parking','Café','Restaurant','Bar','Parking','EV charging','Wi-Fi','Family friendly','Dog friendly','Hearing loop','Baby changing','Picnic area','Shop','Group visits'].map((facility) => {
              const checked = draft.facilities.includes(facility)
              return <label className={checked ? 'checked' : ''} key={facility}><input type="checkbox" checked={checked} onChange={() => set('facilities', checked ? draft.facilities.filter((item) => item !== facility) : [...draft.facilities, facility])} /><span><Check size={13} /></span>{facility}</label>
            })}</div>
            <Field label="Awards and accreditations" hint="Only include verified recognition, separated by commas"><textarea rows={3} value={(draft.awards??[]).join(', ')} onChange={(event)=>set('awards',event.target.value.split(',').map((item)=>item.trim()).filter(Boolean))}/></Field>
          </div>}

          {tab === 'Media' && <div className="form-stack listing-media-manager">
            <div className="media-manager-heading"><div><h3 className="form-title">Images and video</h3><p className="form-description">Upload, replace and order listing imagery, then add hosted video links.</p></div><span>{images.length}/{membershipLevel?.imageAllowance??0} images · {videos.length}/{membershipLevel?.videoAllowance??0} videos</span></div>
            {!mediaEnabled?<div className="media-unavailable"><Image size={24}/><div><strong>Visit Valechester branded imagery is used for this listing</strong><p>This membership level does not include business images or video.</p></div></div>:<>
              {images.length>0&&<div className="media-hero" style={{backgroundImage:`url("${listingMediaUrl(draft.image||images[0].url)}")`,backgroundSize:'cover',backgroundPosition:'center'}}><span><Star size={24}/><strong>Hero image</strong><small>{images.find((item)=>item.url===draft.image)?.alt||draft.name}</small></span></div>}
              <section className="media-manager-section"><header><div><strong>Image library</strong><small>The hero image appears on cards and at the top of the listing.</small></div></header><div className="listing-media-grid">{images.map((item,index)=><article key={item.id} className={draft.image===item.url?'is-hero':''}><div className="listing-media-thumb"><img src={listingMediaUrl(item.url)} alt={item.alt||''}/>{draft.image===item.url&&<span><Star size={11}/>Hero</span>}</div><div className="listing-media-fields"><label>Alternative text<input value={item.alt??''} onChange={(event)=>updateMedia(item.id,{alt:event.target.value})} placeholder="Describe the image"/></label><label>Caption<input value={item.caption??''} onChange={(event)=>updateMedia(item.id,{caption:event.target.value})} placeholder="Optional caption"/></label></div><footer><div><button type="button" onClick={()=>moveImage(item,-1)} disabled={index===0} aria-label={`Move ${item.alt||'image'} up`}><ArrowUp size={14}/></button><button type="button" onClick={()=>moveImage(item,1)} disabled={index===images.length-1} aria-label={`Move ${item.alt||'image'} down`}><ArrowDown size={14}/></button></div><div><label className="media-replace">Replace<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>void replaceImage(item,event.target.files?.[0])}/></label>{draft.image!==item.url&&<button type="button" onClick={()=>set('image',item.url)}>Set as hero</button>}<button type="button" className="danger" onClick={()=>removeMedia(item)} aria-label={`Remove ${item.alt||'image'}`}><Trash2 size={14}/></button></div></footer></article>)}</div></section>
              <label className={`upload-zone${uploading?' busy':''}`} onDragOver={(event)=>event.preventDefault()} onDrop={onDrop} aria-disabled={uploading||images.length>=(membershipLevel?.imageAllowance??0)}><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFiles} disabled={uploading||images.length>=(membershipLevel?.imageAllowance??0)}/><UploadCloud size={25}/><strong>{uploading?'Uploading images…':'Upload images'}</strong><span>Drag and drop JPG, PNG or WebP files, or browse</span><small>Up to 10 MB each · {mediaAllowance} on the {organisation?.tier} membership level</small></label>
              {mediaError&&<div className="media-error" role="alert">{mediaError}</div>}
              <section className="media-manager-section video-manager"><header><div><strong>Hosted videos</strong><small>Add a YouTube, Vimeo, Mux or other public video URL.</small></div>{videos.length<(membershipLevel?.videoAllowance??0)&&<Button variant="secondary" size="sm" icon={Plus} onClick={()=>set('media',[...media,{id:`video-${Date.now()}`,type:'video',url:'',title:`Watch ${draft.name}`}])}>Add video</Button>}</header>{membershipLevel?.videoAllowance?<div className="video-editor-list">{videos.map((item)=><article key={item.id}><Film size={20}/><Field label="Video title"><input value={item.title??''} onChange={(event)=>updateMedia(item.id,{title:event.target.value})}/></Field><Field label="Video URL"><input type="url" value={item.url} placeholder="https://" onChange={(event)=>updateMedia(item.id,{url:event.target.value})}/></Field><button type="button" onClick={()=>removeMedia(item)} aria-label={`Remove ${item.title||'video'}`}><Trash2 size={16}/></button></article>)}</div>:<p className="media-empty">Video is not included with this membership level.</p>}</section>
            </>}
            <label className="info-note"><input type="checkbox" checked={draft.imageRightsConfirmed??false} onChange={(event)=>set('imageRightsConfirmed',event.target.checked)}/><p>I confirm the organisation owns this media or has permission for it to be published.</p></label>
          </div>}

          {tab === 'Preview' && <div className="website-preview">
            <div className="preview-browser"><span /><span /><span /><p>visitvalechester.co.uk/place/{draft.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}</p></div>
            <div className="preview-hero" style={{backgroundImage:`url("${listingMediaUrl(draft.image)}")`,backgroundSize:'cover',backgroundPosition:'center'}}><div><Badge tone="purple">{draft.category}</Badge><h2>{draft.name}</h2><p><MapPin size={15} />{draft.town}</p></div></div>
            <div className="preview-content"><main><p className="preview-lead">{draft.shortDescription}</p><p>{draft.description}</p><h3>Facilities</h3><div className="preview-facilities">{draft.facilities.map((item) => <span key={item}><Check size={13} />{item}</span>)}</div></main><aside><h3>Plan your visit</h3><p><strong>Opening hours</strong>{draft.openingHours}</p><p><strong>Contact</strong>{draft.phone}<br />{draft.email}</p>{draft.bookingUrl && <Button onClick={()=>window.open(draft.bookingUrl,'_blank','noopener,noreferrer')}>Book now</Button>}{draft.website&&<Button variant="secondary" icon={Globe2} onClick={()=>window.open(draft.website,'_blank','noopener,noreferrer')}>Visit website</Button>}</aside></div>
          </div>}
        </div>

        <aside className="editor-side">
          <div className="editor-status-card"><h3>Publishing</h3><div><span>Current status</span><Badge>{draft.status}</Badge></div><div><span>Visibility</span><strong><Globe2 size={14} /> {draft.status==='Published'?'Public':'Not public'}</strong></div><div><span>Last updated</span><strong>{listing.lastUpdated}</strong></div></div>
          <div className="editor-checklist"><h3>Before publishing</h3><p className={draft.name&&draft.category?'done':''}>{draft.name&&draft.category?<Check size={13}/>:<span/>}Name and category</p><p className={draft.shortDescription&&draft.description?'done':''}>{draft.shortDescription&&draft.description?<Check size={13}/>:<span/>}Visitor description</p><p className={draft.bookingUrl ? 'done' : ''}>{draft.bookingUrl ? <Check size={13} /> : <span /> }Booking link</p><p className={draft.facilities.length >= 3 ? 'done' : ''}>{draft.facilities.length >= 3 ? <Check size={13} /> : <span /> }Facilities</p><p className={draft.imageRightsConfirmed?'done':''}>{draft.imageRightsConfirmed?<Check size={13}/>:<span/>}Image rights confirmed</p></div>
        </aside>
      </div>

      <footer className="drawer-actionbar"><span>{saved ? <><Check size={15} /> Changes saved</> : 'Changes stay in draft until published'}</span><div><Button variant="secondary" icon={Save} onClick={save}>Save draft</Button><Button icon={Send} onClick={publish}>{listing.status === 'Published' ? 'Publish changes' : 'Approve & publish'}</Button></div></footer>
    </Drawer>
  )
}
