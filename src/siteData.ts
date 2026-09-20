export const imageLibrary: Record<string, string> = {
  hero: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=2200&q=88',
  castle: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=1200&q=84',
  lodge: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=84',
  theatre: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=84',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=84',
  distillery: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=84',
  museum: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=84',
  gallery: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=84',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=84',
  books: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1200&q=84',
  gardens: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=84',
  park: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=84',
}

export const events = [
  { id: 'event-1', day: '26', month: 'SEP', title: 'Valechester After Dark', place: 'Castle Quarter', category: 'Festival', image: imageLibrary.castle },
  { id: 'event-2', day: '03', month: 'OCT', title: 'Harvest & Makers Market', place: 'Market Square', category: 'Food & drink', image: imageLibrary.restaurant },
  { id: 'event-3', day: '17', month: 'OCT', title: 'Light on the River', place: 'Riverside Gardens', category: 'Family', image: imageLibrary.park },
  { id: 'event-4', day: '22', month: 'OCT', title: 'New Voices Weekend', place: 'Riverside Playhouse', category: 'Culture', image: imageLibrary.theatre },
]

export const guides = [
  {
    title: 'A perfect day in Valechester',
    eyebrow: 'One-day itinerary',
    description: 'Castle views, independent lunch spots and a golden-hour walk beside the river.',
    image: imageLibrary.hero,
  },
  {
    title: 'The curious family weekend',
    eyebrow: '48 hours',
    description: 'Hands-on history, big green spaces and plenty of room for small adventurers.',
    image: imageLibrary.museum,
  },
  {
    title: 'Made in the Vale',
    eyebrow: 'Local guide',
    description: 'Meet the makers, distillers, booksellers and chefs giving the town its flavour.',
    image: imageLibrary.distillery,
  },
]

export const neighbourhoods = [
  { name: 'Castle Quarter', detail: 'Heritage, hidden lanes and skyline views', image: imageLibrary.castle },
  { name: 'Riverside', detail: 'Theatre, gardens and waterside dining', image: imageLibrary.park },
  { name: 'Market Vale', detail: 'Independents, makers and lively evenings', image: imageLibrary.books },
]
