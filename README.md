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

## Production services

The interface works without credentials by using browser storage. A shared production workspace requires a Supabase project:

1. Run `supabase/schema.sql`, followed by the migrations in `supabase/migrations`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment environment.
3. Deploy the `invite-workspace-user`, `manage-workspace-user`, `generate-listing-copy` and `process-invoice-reminders` Edge Functions.
4. Create the first administrator in Supabase Auth and add the matching row to `public.profiles`.

Set `OPENAI_API_KEY` for AI listing copy. Set `RESEND_API_KEY`, `REMINDER_FROM_EMAIL` and `REMINDER_CRON_SECRET` for invoice reminder email. Schedule `process-invoice-reminders` daily from Supabase Cron or another scheduler and send the configured secret in the `x-cron-secret` header.

This enables shared records, live multi-user updates, secure staff and event-organiser accounts, dashboard preferences, public submissions, published guides, itineraries and trails, image storage and tenant permissions. Configure an SMTP provider in Supabase before inviting real users or sending password resets.

Images are stored in Supabase Storage. Listing videos use hosted YouTube, Vimeo or Mux URLs. Open Banking, accounting, review and video-processing providers require the destination's own provider account and API credentials; the CRM exposes their configuration and connection state without embedding provider secrets in the browser.

## Quality checks

```bash
npm run lint
npm test
npm run build
```
