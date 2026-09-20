# Visit Valechester Platform

A configurable destination website and CRM for destination management organisations and local-authority tourism teams.

## Product areas

- Visitor website with taxonomy-led search, saved places, enquiries, events and itinerary planning
- Event organiser registration, sign-in, submission tracking and moderation
- Public events directory with 50 seeded events, search and category filters
- CRM event editing and publication for member and non-member venues
- Tier-differentiated member listings and review-supported visitor highlights
- At least 15 listed businesses in each of the six membership types
- CRM dashboard with per-user widget selection, drag-and-drop ordering and persistent layouts
- Membership pipeline, configurable levels, benefits and benefit usage
- Organisations, contacts, listings, billing, agreements and tasks
- User administration with roles, suspension, password reset and access controls
- Optional visitor economy, social, accounting and Open Banking data sources
- Supabase-ready tenant authentication and persistence

## Run locally

```bash
npm install
npm run dev
```

The visitor website is at `/` and the destination workspace is at `/crm`.

## Quality checks

```bash
npm run lint
npm test
npm run build
```
