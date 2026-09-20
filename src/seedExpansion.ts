import type { Contact, DestinationEvent, Listing, Organisation } from './types'

const towns = ['Castle Quarter', 'Riverside', 'Market Vale', 'Eastgate', 'North Vale', 'Willowmere', 'Valechester']
const images = ['castle', 'lodge', 'theatre', 'hotel', 'distillery', 'museum', 'gallery', 'restaurant', 'books', 'gardens', 'park']
const firstNames = ['Avery', 'Billie', 'Cameron', 'Devon', 'Ellis', 'Frankie', 'Harper', 'Jules', 'Kit', 'Logan', 'Marley', 'Noel', 'Parker', 'Quinn']
const lastNames = ['Ash', 'Bell', 'Clarke', 'Dean', 'Evans', 'Fox', 'Grant', 'Hall', 'Ives', 'Jones', 'Kent', 'Lane', 'Moss', 'North']

const tierSeeds = [
  { tier: 'Tier 4', needed: 13, price: 3919, type: 'Attraction', category: 'Landmarks & experiences', names: ['Valechester Abbey Estate','The Grand Vale Hotel','Royal Vale Racecourse','Valechester Science Centre','The Riverlight Theatre','Valechester Wildlife Park','The Foundry Arts Centre','Crown & Vale Resort','Valechester Heritage Railway','The Great Hall Experience','North Vale Adventure Park','Valechester Food Hall','The Old Mint Museum'] },
  { tier: 'Tier 3', needed: 12, price: 1321, type: 'Accommodation', category: 'Hotels & experiences', names: ['Willowmere Hall','The Market House Hotel','Eastgate Spa','River Vale Cruises','The Clocktower Rooms','Valechester Cookery School','The Assembly Rooms','Meadow & Mill Retreat','Castle Gate Apartments','The Artisan Quarter','Valechester Cycle Tours','The Glasshouse Venue'] },
  { tier: 'Tier 2', needed: 13, price: 571, type: 'Food & drink', category: 'Food, drink & days out', names: ['Juniper Kitchen','The Riverside Pantry','Valechester Walking Tours','North Vale Farm Park','The Boathouse Café','Market Vale Brewery','Eastgate Escape Rooms','The Willow Cinema','Castle Quarter Antiques','Valechester Kayak Club','The Orchard Table','Riverbank Guesthouse','The Vale Pottery'] },
  { tier: 'Tier 1', needed: 12, price: 212, type: 'Retail', category: 'Independent places', names: ['Moss & Thread','The Vale Chocolate House','Riverside Records','Foxglove Florists','The Little Lantern Café','North & Willow Gallery','Eastgate Bakes','The Map Room','Valechester Vintage','Market Square Deli','The Riverside Studio','Castle Lane Gifts'] },
  { tier: 'Supplier', needed: 14, price: 495, type: 'Supplier', category: 'Visitor services', names: ['Vale Event Production','Northstar Coaches','Riverside AV','Valechester Print Works','Market Town Media','Willow Event Hire','Castle Catering Collective','Vale Access Consultants','Eastgate Security','River & Road Travel','Valechester Linen Co.','Foundry Digital','Local Story Guides','Vale Ticketing Services'] },
  { tier: 'Free Listing', needed: 14, price: 0, type: 'Other', category: 'Community & local places', names: ['Eastgate Community Garden','Valechester Canal Walk','North Vale Nature Reserve','Market Square','Castle Lane Viewpoint','Willowmere Village Green','River Vale Towpath','Eastgate Memorial Gardens','The Old Town Pump','Valechester Library','North Vale Play Park','Willowmere Woods','Foundry Pocket Park','Castle Quarter Trail'] },
] as const

let sequence = 100
export const expandedOrganisations: Organisation[] = []
export const expandedContacts: Contact[] = []
export const expandedListings: Listing[] = []

tierSeeds.forEach((seed, tierIndex) => {
  seed.names.slice(0, seed.needed).forEach((name, index) => {
    const suffix = String(sequence++).padStart(3, '0')
    const organisationId = `org-${suffix}`
    const contactId = `con-${suffix}`
    const town = towns[(index + tierIndex) % towns.length]
    const contactName = `${firstNames[index % firstNames.length]} ${lastNames[(index + tierIndex) % lastNames.length]}`
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    expandedOrganisations.push({
      id: organisationId, name, type: seed.type, town,
      address: `${index + 1} ${town} Way, ${town}, VC${tierIndex + 1} ${index + 1}VV`,
      website: `https://example.com/${slug}`, tier: seed.tier,
      status: seed.tier === 'Free Listing' ? 'Free listing' : 'Active', health: index % 7 === 0 ? 'OK' : 'Happy',
      owner: index % 2 ? 'Morgan Lee' : 'Sam Taylor', primaryContactId: contactId,
      renewalDate: '2027-08-31', membershipStart: '2026-09-01', annualValue: seed.price, listings: 1,
      lastActivity: `2026-09-${String(19 - (index % 12)).padStart(2, '0')}T10:00:00Z`,
      nextAction: 'Review autumn website content', nextActionDate: '2026-10-15',
      tags: [seed.type, town, seed.tier], notes: 'Website listing and membership record are up to date.',
      colour: ['#6d294f','#f0785e','#7a9a83','#a86b78','#247a77','#7b8798'][tierIndex],
    })
    expandedContacts.push({ id: contactId, organisationId, name: contactName, jobTitle: 'Business contact', email: `${slug}@example.com`, phone: `01926 55${suffix}`, roles: ['Primary', 'Membership'], primary: true, portalAccess: true })
    expandedListings.push({
      id: `list-${suffix}`, organisationId, name, category: seed.category, town, status: 'Published',
      completeness: 88 + (index % 11), views: 780 + index * 217 + tierIndex * 190, enquiries: 18 + index * 7,
      shortDescription: `Discover ${name}, a distinctive ${seed.type.toLowerCase()} experience in ${town}.`,
      description: `${name} brings together a warm Valechester welcome, strong local character and practical information to help visitors plan with confidence.`,
      website: `https://example.com/${slug}`, bookingUrl: seed.tier === 'Free Listing' ? '' : `https://example.com/${slug}/book`,
      phone: `01926 55${suffix}`, email: `${slug}@example.com`, openingHours: 'Open throughout the year; check ahead for seasonal times',
      facilities: ['Accessible information', 'Visitor information', index % 2 ? 'Food nearby' : 'Parking nearby'],
      searchTags: [index % 2 ? 'Great for families' : 'Couples', index % 3 ? 'Outdoor experience' : 'Rainy-day activity', 'Accessible', town],
      reviewHighlights: ['Friendly welcome', 'Strong local character', 'Helpful visitor information'],
      goodToKnow: ['Check opening times before travelling', 'Contact the venue for specific access requirements'],
      lastUpdated: '2026-09-20', image: images[(index + tierIndex) % images.length],
    })
  })
})

export const supplementalListings: Listing[] = [
  { id:'list-012', organisationId:'org-011', name:'Marlow House', category:'Restaurants', town:'Market Vale', status:'Published', completeness:92, views:940, enquiries:31, shortDescription:'A new neighbourhood dining room built around the best produce from the Vale.', description:'Seasonal menus, thoughtful drinks and an easygoing dining room in the heart of Market Vale.', website:'https://example.com/marlow-house', bookingUrl:'https://example.com/marlow-house/book', phone:'01926 555011', email:'hello.marlow@example.com', openingHours:'Tue–Sun, lunch and dinner', facilities:['Accessible entrance','Restaurant','Bar'], searchTags:['Food available','Romantic','Accessible','Evening activity'], reviewHighlights:['Inventive seasonal food','Relaxed service','Beautiful dining room'], goodToKnow:['Booking recommended','Vegetarian menu available'], lastUpdated:'2026-09-20', image:'restaurant' },
  { id:'list-013', organisationId:'org-012', name:'Vale Executive Travel', category:'Visitor services', town:'Valechester', status:'Published', completeness:90, views:670, enquiries:42, shortDescription:'Private transfers, group travel and accessible transport across Valechester.', description:'A locally based transport team supporting visitors, groups and business events throughout the destination.', website:'https://example.com/vale-executive-travel', bookingUrl:'https://example.com/vale-executive-travel/enquire', phone:'01789 000 121', email:'travel@example.com', openingHours:'Bookings daily, 8am–8pm', facilities:['Accessible vehicles','Group travel','Advance booking'], searchTags:['Suitable for groups','Accessible','Travel trade','Booking recommended'], reviewHighlights:['Reliable service','Helpful drivers','Comfortable vehicles'], goodToKnow:['Advance booking required','Accessible vehicles should be requested'], lastUpdated:'2026-09-20', image:'park' },
]

const eventTitles = [
  'Valechester After Dark','Harvest & Makers Market','Light on the River','New Voices Weekend','Castle Courtyard Cinema','Vale Food Festival','Autumn Book Fair','Willowmere Apple Day','River Vale Half Marathon','Heritage Open Weekend',
  'Comedy at the Foundry','Valechester Christmas Market','Lantern Parade','Winter Tales at the Castle','New Year Riverside Walk','Independent Wedding Fair','Snowdrop Weekend','Valechester Jazz Nights','Spring Makers Market','Family Science Festival',
  'Riverside Food Trail','Easter Castle Quest','Valechester Poetry Weekend','Willowmere Craft Fair','Bluebell Walks','Open Studios Weekend','Valechester Pride','Summer Theatre in the Park','River Vale Regatta','Street Food Fridays',
  'Valechester Folk Festival','Castle Quarter Garden Trail','Outdoor Cinema Weekend','North Vale Family Fun Day','Heritage Railway Gala','Valechester Beer Festival','Museum Late: Invention','Riverside Dance Festival','Market Vale Fashion Week','Valechester Literature Festival',
  'Autumn Photography Walk','Willowmere Pumpkin Weekend','The Great Vale Bake Off','Castle Ghost Stories','Diwali in the Square','Valechester Bonfire Night','Remembrance Arts Trail','Winter Wellness Weekend','Carols by the River','New Year Makers Market',
]
const eventCategories = ['Festival','Food & drink','Family','Culture','Film','Markets','Sport','Heritage','Comedy','Music','Outdoors','Workshops']
const eventVenues = ['Market Square','Riverside Gardens','Valechester Castle','The Foundry','Willowmere Green','North Vale Park','Eastgate Hall','River Vale','Castle Quarter','Market Vale']
function eventCategory(title: string) {
  if (/food|beer|bake|apple|pumpkin|street food|harvest/i.test(title)) return 'Food & drink'
  if (/half marathon|regatta/i.test(title)) return 'Sport'
  if (/comedy/i.test(title)) return 'Comedy'
  if (/jazz|folk|carols|dance/i.test(title)) return 'Music'
  if (/market|fair|wedding/i.test(title)) return 'Markets'
  if (/castle|heritage|ghost|remembrance|railway|museum/i.test(title)) return 'Heritage'
  if (/walk|bluebell|garden|outdoor|snowdrop|river/i.test(title)) return 'Outdoors'
  if (/science|family|lantern|easter/i.test(title)) return 'Family'
  if (/workshop|open studios|wellness|makers/i.test(title)) return 'Workshops'
  if (/book|poetry|literature|theatre|film|voices|arts|diwali|pride|fashion/i.test(title)) return 'Culture'
  return eventCategories[0]
}

export const seededEvents: DestinationEvent[] = eventTitles.map((title, index) => {
  const date = new Date(Date.UTC(2026, 8, 26 + index * 5))
  const startDate = date.toISOString().slice(0, 10)
  const venueName = eventVenues[index % eventVenues.length]
  return {
    id: `event-${String(index + 1).padStart(3, '0')}`, title, category: eventCategory(title),
    description: `${title} brings visitors and local communities together for a memorable day in Valechester, with a welcoming programme and clear information for planning ahead.`,
    startDate, endDate: startDate, startTime: index % 3 === 0 ? '10:00' : index % 3 === 1 ? '17:30' : '19:00', endTime: index % 3 === 0 ? '16:00' : '22:00',
    venueName, address: `${index + 1} Event Way`, town: towns[index % towns.length], postcode: `VC${(index % 6) + 1} ${(index % 9) + 1}EV`,
    price: index % 4 === 0 ? 'Free' : index % 4 === 1 ? 'From £6' : index % 4 === 2 ? 'From £12' : '£18',
    bookingUrl: index % 4 === 0 ? '' : `https://example.com/events/${index + 1}`, contactName: 'Events team', contactEmail: `event${index + 1}@example.com`,
    image: images[index % images.length], accessibility: 'Step-free information is available from the organiser. Contact the event team for specific requirements.',
    status: 'Published', submittedBy: index % 5 === 0 ? 'Community organiser' : 'Destination team', lastUpdated: '2026-09-20',
  }
})
