export const imageLibrary: Record<string, string> = {
  hero: '/images/valechester-riverside-hero.webp',
  castle: '/images/valechester-castle-family.webp',
  lodge: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=84',
  theatre: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=84',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=84',
  distillery: '/images/valechester-riverside-dining.webp',
  museum: '/images/valechester-castle-family.webp',
  gallery: '/images/valechester-castle-family.webp',
  restaurant: '/images/valechester-riverside-dining.webp',
  books: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=84',
  gardens: '/images/valechester-castle-family.webp',
  park: '/images/valechester-riverside-hero.webp',
}

export const events = [
  { id: 'event-1', day: '26', month: 'SEP', title: 'Valechester After Dark', place: 'Castle Quarter', category: 'Festival', time: '6pm–10pm', price: 'Free', description: 'Lantern trails, live stories and late opening across the old town.', image: imageLibrary.castle },
  { id: 'event-2', day: '03', month: 'OCT', title: 'Harvest & Makers Market', place: 'Market Square', category: 'Food & drink', time: '10am–4pm', price: 'Free', description: 'Meet growers, bakers and independent makers from across the Vale.', image: imageLibrary.restaurant },
  { id: 'event-3', day: '17', month: 'OCT', title: 'Light on the River', place: 'Riverside Gardens', category: 'Family', time: '5pm–9pm', price: 'From £6', description: 'An illuminated riverside walk with music, food and family activities.', image: imageLibrary.park },
  { id: 'event-4', day: '22', month: 'OCT', title: 'New Voices Weekend', place: 'Riverside Playhouse', category: 'Culture', time: 'Various times', price: 'From £12', description: 'Three days of new theatre, comedy and talks beside the River Vale.', image: imageLibrary.theatre },
]

export const guides = [
  {
    slug: 'perfect-day',
    title: 'A perfect day in Valechester',
    eyebrow: 'One-day itinerary',
    duration: '1 day',
    description: 'Castle views, independent lunch spots and a golden-hour walk beside the river.',
    intro: 'See the town at its most characterful, from the old walls to the river, with time for independent shops and a relaxed lunch.',
    stops: ['list-001', 'list-009', 'list-011'],
    image: imageLibrary.hero,
  },
  {
    slug: 'family-weekend',
    title: 'The curious family weekend',
    eyebrow: '48 hours',
    duration: '2 days',
    description: 'Hands-on history, big green spaces and plenty of room for small adventurers.',
    intro: 'A playful two-day route balancing big heritage moments with interactive exhibits, gardens and easy places to pause.',
    stops: ['list-001', 'list-007', 'list-010', 'list-011'],
    image: imageLibrary.museum,
  },
  {
    slug: 'made-in-the-vale',
    title: 'Made in the Vale',
    eyebrow: 'Local guide',
    duration: '1–2 days',
    description: 'Meet the makers, distillers, booksellers and chefs giving the town its flavour.',
    intro: 'Follow the independent spirit of Valechester through small-batch drinks, local stories and the people making things happen.',
    stops: ['list-005', 'list-009', 'list-003'],
    image: imageLibrary.distillery,
  },
]

export const neighbourhoods = [
  { slug: 'castle-quarter', name: 'Castle Quarter', detail: 'Heritage, hidden lanes and skyline views', intro: 'The historic heart of Valechester, where old walls, gardens and independent streets reward an unhurried wander.', image: imageLibrary.castle },
  { slug: 'riverside', name: 'Riverside', detail: 'Theatre, gardens and waterside dining', intro: 'Follow the River Vale between performance, green spaces and relaxed places to eat with a view.', image: imageLibrary.park },
  { slug: 'market-vale', name: 'Market Vale', detail: 'Independents, makers and lively evenings', intro: 'A sociable neighbourhood of bookshops, makers, market stalls and characterful places to meet.', image: imageLibrary.books },
]
