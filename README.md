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
3. Deploy the `invite-workspace-user`, `manage-workspace-user`, `generate-listing-copy`, `process-invoice-reminders` and `process-automations` Edge Functions.
4. Create the first administrator in Supabase Auth and add the matching row to `public.profiles`.

Set `OPENAI_API_KEY` for AI listing copy. Set `RESEND_API_KEY`, `REMINDER_FROM_EMAIL` and `REMINDER_CRON_SECRET` for invoice reminder email. Schedule `process-invoice-reminders` daily from Supabase Cron or another scheduler and send the configured secret in the `x-cron-secret` header.

For background CRM automations, apply `20260923_automation_runs.sql`, set `AUTOMATION_CRON_SECRET`, and deploy `process-automations` with `supabase functions deploy process-automations --use-api --no-verify-jwt` (the function validates its own secret). Invoke it every minute from Supabase Cron or another scheduler with that secret in the `x-cron-secret` header. The function also needs Supabase's standard `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables. Open CRM sessions check due rules themselves; the scheduler is needed for reliable unattended runs. Automation emails are queued as communications, not sent, until an email-delivery provider and approved sending workflow are configured.

For CRM Communications, apply `supabase/migrations/20260924_communications.sql` and deploy `dispatch-communications`, `communication-webhook` and `unsubscribe-communication` Edge Functions. Configure `RESEND_API_KEY`, a verified `COMMUNICATION_FROM_EMAIL`, `COMMUNICATION_CRON_SECRET`, `COMMUNICATION_UNSUBSCRIBE_SECRET` (a long random signing secret), and `RESEND_WEBHOOK_SECRET` in Supabase secrets. Deploy all three with `--no-verify-jwt`: dispatch authenticates user requests or a cron secret, the webhook verifies Resend's Svix signature, and unsubscribe verifies a signed, expiring recipient token. Schedule an HTTP POST to `dispatch-communications` every minute with `x-cron-secret: <COMMUNICATION_CRON_SECRET>` so scheduled messages run when nobody has the CRM open. Create a Resend webhook pointing to `communication-webhook` for `email.delivered`, `email.bounced`, `email.failed`, `email.opened` and `email.clicked`. The CRM records a provider acceptance as “Sent” but only counts “Delivered” after a verified delivery webhook. Marketing messages carry a signed unsubscribe link; scheduled sends recheck contact preferences immediately before delivery. Without these services, drafts and templates remain usable, but test/send/schedule return an explicit configuration error and no delivery is claimed.

For the secure member/partner portal, apply `supabase/migrations/20260925_partner_portal.sql` and deploy `portal-access` with JWT verification enabled. Set the Edge Function secret `PORTAL_BASE_URL` to the production `/portal` URL and add that exact URL to the Supabase Auth redirect allowlist. Configure SMTP in Supabase Auth so invitations and password resets are delivered. Staff with Administrator or Membership manager role can invite organisation contacts and review submitted profile, listing and event changes from the organisation's Contacts tab. Invitees must set a password after following the invitation link. Portal accounts are never created by matching an email address automatically, and `/portal` does not load the CRM workspace providers. The portal requires the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; without them it shows a configuration state rather than sample CRM data. Portal images use the existing `listing-media` bucket with short-lived signed upload URLs. Documents appear only when the CRM has a published HTTPS resource URL eligible for that membership level. Portal event approvals enter the CRM event review queue; the destination team must publish them separately.

Campaign Management extends the existing tenant-scoped `platform_states` record; no separate campaign service is required. Campaign plans, partner contributions, budget lines, KPIs, channel results, asset links and activity are saved with the platform state. CRM tasks carry a `campaignId`, communications can be linked from their composer or the campaign, and member-value entries can be recorded against a campaign. For first-party website attribution, use the campaign ID (or exact campaign name) as the website link's `utm_campaign` value. Website visit, lead, referral and booking KPI actuals come from those tagged events; other outcomes and ROI require evidenced manual figures. The overall budget is the campaign spending ceiling; partner contributions and external funding are sources within it, not extra budget. Campaign budgets are management figures, not accounting transactions.

Member Value uses tenant-scoped manual entries in `platform_states` and read-only calculated lines from existing benefit usage, campaign participation, opportunity participation, FAM itineraries, PR coverage/opportunities and dated trade/business leads. Calculated lines are rebuilt from their source records, avoiding duplicate stored snapshots and assigning no monetary value automatically. Staff may enter an estimated or evidenced actual amount with a source and evidence. Reports use each organisation's membership start and renewal dates; previous-year comparisons appear only where dated source records exist. Cumulative listing views and enquiries, plus communications and event activity, are context only because their counters cannot reliably be assigned to a membership period. CSV export and browser print provide renewal-ready summaries. The estimated-value-to-fee comparison is **not** revenue or financial ROI.
The four unchanged, hard-coded demo value entries from earlier builds are excluded on load; edited or newly created records remain untouched.

Member/co-op Opportunities also persist in the tenant-scoped platform state. The destination team can set membership, geography, category and invitation-only eligibility, invite organisations, manage applications and capacity, and record participation. Recorded participation creates a linked Member Value entry once per organisation and opportunity; follow-ups are ordinary CRM tasks and email drafts use the Communications centre, where recipient eligibility and opt-in are rechecked. Portal interest, application, confirmation and withdrawal run through the authenticated `portal-access` function with organisation scoping, eligibility and a concurrency check on the platform state. Redeploy `portal-access` after updating this module. Drafts do not send email automatically; an email provider is required for sending through Communications.

This enables shared records, live multi-user updates, secure staff and event-organiser accounts, dashboard preferences, public submissions, published guides, itineraries and trails, image storage and tenant permissions. Configure an SMTP provider in Supabase before inviting real users or sending password resets.

Images are stored in Supabase Storage. Listing videos use hosted YouTube, Vimeo or Mux URLs. Open Banking, accounting, review and video-processing providers require the destination's own provider account and API credentials; the CRM exposes their configuration and connection state without embedding provider secrets in the browser.

## Quality checks

```bash
npm run lint
npm test
npm run build
```
