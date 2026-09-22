export const imageLibrary: Record<string, string> = {
  hero: '/images/valechester-riverside-hero.webp',
  castle: '/images/valechester-castle-family.webp',
  lodge: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=84',
  theatre: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=84',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=84',
  distillery: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=84',
  museum: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=84',
  gallery: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=84',
  restaurant: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=84',
  books: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=84',
  gardens: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=84',
  park: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=84',
}

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
  { slug: 'eastgate', name: 'Eastgate', detail: 'Museums, creative spaces and family discoveries', intro: 'A lively cultural quarter where hands-on museums, studios and welcoming places to eat make an easy day out.', image: imageLibrary.museum },
  { slug: 'north-vale', name: 'North Vale', detail: 'Open parkland, galleries and big skies', intro: 'The greener side of Valechester, pairing contemporary culture with spacious parks and slower afternoons.', image: imageLibrary.gallery },
  { slug: 'willowmere', name: 'Willowmere', detail: 'Country lanes, local flavours and seasonal gatherings', intro: 'A relaxed village escape known for makers, gardens and food-and-drink experiences rooted in the Vale.', image: imageLibrary.distillery },
]
