import type { DestinationEvent, Listing } from './types'

export type MapPointKind = 'Place' | 'Event'
export interface MapPoint {
  id: string
  entityId: string
  kind: MapPointKind
  title: string
  category: string
  town: string
  description: string
  image: string
  latitude: number
  longitude: number
  featured: boolean
  path: string
  date?: string
}

export const mapCentre: [number, number] = [52.1917, -1.7083]

const townCentres: Record<string, [number, number]> = {
  Valechester: mapCentre,
  'Castle Quarter': [52.1948, -1.7138],
  Riverside: [52.1872, -1.7042],
  'Market Vale': [52.191, -1.7001],
  Eastgate: [52.1931, -1.6928],
  'North Vale': [52.2022, -1.707],
  Willowmere: [52.1791, -1.7193],
}

function numberFromId(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0)
}

export function coordinatesFor(town: string, id: string): [number, number] {
  const centre = townCentres[town] ?? mapCentre
  const seed = numberFromId(id)
  const angle = (seed % 360) * (Math.PI / 180)
  const radius = .0015 + (seed % 7) * .00048
  return [centre[0] + Math.sin(angle) * radius, centre[1] + Math.cos(angle) * radius]
}

export function listingMapPoint(listing: Listing): MapPoint {
  const fallback = coordinatesFor(listing.town, listing.id)
  return { id: `place-${listing.id}`, entityId: listing.id, kind: 'Place', title: listing.name, category: listing.category, town: listing.town, description: listing.shortDescription, image: listing.image, latitude: listing.mapLatitude ?? fallback[0], longitude: listing.mapLongitude ?? fallback[1], featured: listing.mapFeatured ?? listing.completeness >= 95, path: `/place/${listing.id}` }
}

export function eventMapPoint(event: DestinationEvent): MapPoint {
  const fallback = coordinatesFor(event.town, event.id)
  return { id: `event-${event.id}`, entityId: event.id, kind: 'Event', title: event.title, category: event.category, town: event.town, description: event.description, image: event.image, latitude: event.mapLatitude ?? fallback[0], longitude: event.mapLongitude ?? fallback[1], featured: event.mapFeatured ?? false, path: `/events#${event.id}`, date: event.startDate }
}

export function publicMapPoints(listings: Listing[], events: DestinationEvent[]) {
  const today = new Date().toISOString().slice(0, 10)
  return [
    ...listings.filter((listing) => listing.status === 'Published' && listing.mapVisible !== false).map(listingMapPoint),
    ...events.filter((event) => event.status === 'Published' && event.format !== 'Online events' && event.endDate >= today && event.mapVisible !== false).map(eventMapPoint),
  ]
}
