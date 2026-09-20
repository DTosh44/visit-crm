import { Check, Globe2, Image, Info, MapPin, Save, Send, Sparkles, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useCRM } from '../store'
import type { Listing } from '../types'
import { Badge, Button, Drawer, Field, Progress, Tabs } from './UI'

type EditorTab = 'Content' | 'Visitor taxonomy' | 'Contact & links' | 'Facilities' | 'Media' | 'Preview'

export function ListingEditor({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { updateListing, publishListing } = useCRM()
  const [tab, setTab] = useState<EditorTab>('Content')
  const [draft, setDraft] = useState(listing)
  const [saved, setSaved] = useState(false)

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

  return (
    <Drawer title="Edit website listing" subtitle={`${listing.name} · Changes save to the CRM record`} onClose={onClose}>
      <div className="listing-editor-top">
        <div><Badge>{listing.status}</Badge><span>Last updated {listing.lastUpdated}</span></div>
        <div className="completion-inline"><span>Listing completeness</span><Progress value={draft.completeness} colour="#5c57d6" /><strong>{draft.completeness}%</strong></div>
      </div>
      <Tabs items={['Content','Visitor taxonomy','Contact & links','Facilities','Media','Preview'] as EditorTab[]} active={tab} onChange={setTab} />

      <div className="listing-editor-body">
        <div className="editor-main">
          {tab === 'Content' && <div className="form-stack">
            <div className="ai-helper"><span><Sparkles size={18} /></span><div><strong>Improve this listing with AI</strong><p>Polish the copy while preserving approved business details.</p></div><Button variant="secondary" size="sm">Suggest improvements</Button></div>
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
            <Field label="Search tags" hint="Separate tags with commas"><textarea rows={4} value={draft.searchTags.join(', ')} onChange={(event) => set('searchTags', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></Field>
            <div className="taxonomy-suggestions"><strong>Suggested visitor tags</strong><div>{['Rainy-day activity','Great for families','Dog-friendly','Accessible','Free to visit','Romantic','Suitable for groups','Indoor attraction','Outdoor experience','Evening activity','Food available','On-site parking','Booking recommended'].map((tag) => <button type="button" key={tag} className={draft.searchTags.includes(tag) ? 'selected' : ''} onClick={() => set('searchTags', draft.searchTags.includes(tag) ? draft.searchTags.filter((item) => item !== tag) : [...draft.searchTags, tag])}>{draft.searchTags.includes(tag) && <Check size={12} />}{tag}</button>)}</div></div>
            <Field label="Visitors frequently mention" hint="Evidence-led themes from review analysis"><textarea rows={3} value={draft.reviewHighlights.join(', ')} onChange={(event) => set('reviewHighlights', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></Field>
            <Field label="Good to know" hint="Practical facts or recurring operational feedback"><textarea rows={3} value={draft.goodToKnow.join(', ')} onChange={(event) => set('goodToKnow', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></Field>
            <div className="info-note"><Info size={17} /><p>Search tags can be member verified, editorially assigned or supported by reviews. Publish review themes only when the evidence is strong enough.</p></div>
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
          </div>}

          {tab === 'Media' && <div className="form-stack">
            <div className={`media-hero image-${draft.image}`}><span><Image size={28} /><strong>Current hero image</strong><small>Recommended 1600 × 900px</small></span></div>
            <button className="upload-zone"><UploadCloud size={25} /><strong>Upload images</strong><span>Drag and drop JPG, PNG or WebP files, or browse</span><small>Up to 20 images on this membership level</small></button>
            <div className="info-note"><Info size={17} /><p>Only upload images the organisation owns or has permission to use. Record image rights before publishing.</p></div>
          </div>}

          {tab === 'Preview' && <div className="website-preview">
            <div className="preview-browser"><span /><span /><span /><p>visitvalechester.co.uk/place/{draft.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}</p></div>
            <div className={`preview-hero image-${draft.image}`}><div><Badge tone="purple">{draft.category}</Badge><h2>{draft.name}</h2><p><MapPin size={15} />{draft.town}</p></div></div>
            <div className="preview-content"><main><p className="preview-lead">{draft.shortDescription}</p><p>{draft.description}</p><h3>Facilities</h3><div className="preview-facilities">{draft.facilities.map((item) => <span key={item}><Check size={13} />{item}</span>)}</div></main><aside><h3>Plan your visit</h3><p><strong>Opening hours</strong>{draft.openingHours}</p><p><strong>Contact</strong>{draft.phone}<br />{draft.email}</p>{draft.bookingUrl && <Button>Book now</Button>}<Button variant="secondary" icon={Globe2}>Visit website</Button></aside></div>
          </div>}
        </div>

        <aside className="editor-side">
          <div className="editor-status-card"><h3>Publishing</h3><div><span>Current status</span><Badge>{listing.status}</Badge></div><div><span>Visibility</span><strong><Globe2 size={14} /> Public</strong></div><div><span>Last updated</span><strong>{listing.lastUpdated}</strong></div></div>
          <div className="editor-checklist"><h3>Before publishing</h3><p className="done"><Check size={13} />Name and category</p><p className="done"><Check size={13} />Visitor description</p><p className={draft.bookingUrl ? 'done' : ''}>{draft.bookingUrl ? <Check size={13} /> : <span /> }Booking link</p><p className={draft.facilities.length >= 3 ? 'done' : ''}>{draft.facilities.length >= 3 ? <Check size={13} /> : <span /> }Facilities</p><p><span />Image rights confirmed</p></div>
        </aside>
      </div>

      <footer className="drawer-actionbar"><span>{saved ? <><Check size={15} /> Changes saved</> : 'Changes stay in draft until published'}</span><div><Button variant="secondary" icon={Save} onClick={save}>Save draft</Button><Button icon={Send} onClick={publish}>{listing.status === 'Published' ? 'Publish changes' : 'Approve & publish'}</Button></div></footer>
    </Drawer>
  )
}
