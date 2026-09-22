import { CalendarDays, Crosshair, List, Map as MapIcon, MapPin, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { imageLibrary } from '../siteData'
import { mapCentre, type MapPoint } from '../mapData'

function MapFocus({ point, userPosition }: { point?: MapPoint; userPosition?: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    const target = point ? [point.latitude, point.longitude] as [number, number] : userPosition
    if (target) map.flyTo(target, point ? 16 : 14, { duration: .7 })
  }, [map, point, userPosition])
  return null
}

export function InteractiveMap({ points, onOpen }: { points: MapPoint[]; onOpen: (point: MapPoint) => void }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'All' | MapPoint['kind']>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userPosition, setUserPosition] = useState<[number, number] | undefined>()
  const [locationError, setLocationError] = useState('')
  const [listOpen, setListOpen] = useState(true)
  const filtered = useMemo(() => points.filter((point) => (kind === 'All' || point.kind === kind) && (!query || `${point.title} ${point.category} ${point.town} ${point.description}`.toLowerCase().includes(query.toLowerCase()))), [kind, points, query])
  const selected = filtered.find((point) => point.id === selectedId)
  const locate = () => {
    if (!navigator.geolocation) { setLocationError('Location is not available in this browser.'); return }
    navigator.geolocation.getCurrentPosition((position) => { setUserPosition([position.coords.latitude, position.coords.longitude]); setLocationError('') }, () => setLocationError('We could not access your location. Check your browser permission and try again.'), { enableHighAccuracy: false, timeout: 8000 })
  }
  return <div className={`interactive-map${listOpen ? ' list-open' : ''}`}>
    <aside className="map-results-panel" aria-label="Map search and results">
      <header><div><span className="site-eyebrow plum">Find your way</span><h2>Explore the map</h2></div><button onClick={() => setListOpen(false)} aria-label="Hide map results"><X size={18}/></button></header>
      <label className="map-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, events or towns" aria-label="Search the map"/></label>
      <div className="map-kind-filters" aria-label="Map categories">{(['All','Place','Event'] as const).map((item) => <button key={item} className={kind === item ? 'active' : ''} aria-pressed={kind === item} onClick={() => setKind(item)}>{item === 'All' ? 'Everything' : `${item}s`}</button>)}</div>
      <div className="map-result-count" role="status">{filtered.length} mapped {filtered.length === 1 ? 'location' : 'locations'}</div>
      <div className="map-result-list">{filtered.map((point) => <button key={point.id} className={selectedId === point.id ? 'active' : ''} onClick={() => setSelectedId(point.id)}><img src={imageLibrary[point.image] ?? point.image ?? imageLibrary.park} alt=""/><span><small>{point.kind} · {point.category}</small><strong>{point.title}</strong><em><MapPin size={12}/>{point.town}{point.date && <><CalendarDays size={12}/>{new Date(`${point.date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</>}</em></span></button>)}</div>
    </aside>
    <div className="map-canvas-wrap">
      {!listOpen && <button className="map-show-results" onClick={() => setListOpen(true)}><List size={17}/>Show results</button>}
      <button className="map-locate" onClick={locate} title="Use my location"><Crosshair size={17}/>Near me</button>
      {locationError && <div className="map-location-error" role="alert">{locationError}</div>}
      <MapContainer center={mapCentre} zoom={13} minZoom={10} scrollWheelZoom className="map-canvas">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        <MapFocus point={selected} userPosition={userPosition}/>
        {userPosition && <CircleMarker center={userPosition} radius={8} pathOptions={{ color: '#245c9c', fillColor: '#4d93df', fillOpacity: 1, weight: 3 }}><Popup>You are here</Popup></CircleMarker>}
        {filtered.map((point) => <CircleMarker key={point.id} center={[point.latitude, point.longitude]} radius={selectedId === point.id ? 12 : point.featured ? 10 : 8} pathOptions={{ color: '#fff', fillColor: point.kind === 'Event' ? '#f0785e' : '#6d294f', fillOpacity: 1, weight: selectedId === point.id ? 4 : 2 }} eventHandlers={{ click: () => setSelectedId(point.id) }}><Popup><article className="map-popup"><img src={imageLibrary[point.image] ?? point.image ?? imageLibrary.park} alt=""/><small>{point.kind} · {point.category}</small><strong>{point.title}</strong><span><MapPin size={12}/>{point.town}</span><button onClick={() => onOpen(point)}>View details</button></article></Popup></CircleMarker>)}
      </MapContainer>
      {selected && <article className="map-selection-card"><button onClick={() => setSelectedId(null)} aria-label="Close selected location"><X size={16}/></button><span><small>{selected.kind} · {selected.category}</small><strong>{selected.title}</strong><em><MapPin size={12}/>{selected.town}</em></span><button onClick={() => onOpen(selected)}>Explore <MapIcon size={14}/></button></article>}
    </div>
  </div>
}
