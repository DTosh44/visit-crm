# VisitMade destination website and CRM

VisitMade helps destination teams manage business relationships, recruit and retain members, maintain a public destination website and evidence the value they deliver. The demo destination is Visit Valechester.

## Launch product

- Home dashboard, team tasks, notifications and a shared approval queue
- Organisations, people and a sales pipeline with won/lost outcomes
- Membership levels, benefits, renewals, agreements, membership value and member opportunities
- Invoices, payment recording, reminders and exports
- Targeted communications, reusable templates, preferences and provider-confirmed delivery states
- Campaigns with objectives, owners, dates, participating members, management budgets, linked work and recorded results
- Public listings, events, pages, guides, itineraries, trails, imagery, enquiries, map configuration and actionable website checks
- Membership, website and supplied destination reports with stated periods and data sources
- Secure member portal for organisation-scoped profile, listing and event submissions
- Optional PR & Media, Travel Trade and Business Events workflows using shared CRM records

A/B testing, Open Banking, unsupported accounting connections, the survey builder, press releases and automated review intelligence are not part of the launch interface. Historical experiment and survey records remain stored. Existing published survey links remain readable so customer commitments are not silently broken, but surveys cannot be created or promoted in the CRM. Public content never applies experiment variants.

## Run locally

```bash
npm install
npm run dev
```

The visitor website is at `/`, the destination workspace at `/crm`, and the member portal at `/portal`.

Without Supabase configuration the app is an explicitly local demo using browser storage and sample records. Do not use that mode for customer data.

## Production configuration

1. Create a Supabase project and apply `supabase/schema.sql`, then every file in `supabase/migrations` in filename order.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment environment.
3. Create the first administrator in Supabase Auth and add its tenant-scoped row to `public.profiles`.
4. Deploy the repository’s Edge Functions. Use JWT verification for `portal-access`; the cron and webhook functions validate their own secrets as described below.
5. Configure Supabase Auth SMTP, the exact production `/portal` redirect URL and the `listing-media` storage bucket before inviting customers.

### Communications and reminders

Set `RESEND_API_KEY`, `COMMUNICATION_FROM_EMAIL`, `COMMUNICATION_CRON_SECRET`, `COMMUNICATION_UNSUBSCRIBE_SECRET`, `RESEND_WEBHOOK_SECRET`, `REMINDER_FROM_EMAIL`, `REMINDER_CRON_SECRET` and `AUTOMATION_CRON_SECRET` as Supabase Function secrets.

Deploy `dispatch-communications`, `communication-webhook`, `unsubscribe-communication`, `process-invoice-reminders` and `process-automations`. Schedule the dispatch and automation functions every minute and invoice reminders daily. Configure a Resend webhook for delivered, bounced, failed, opened and clicked events.

A queued communication is not a sent email. Provider acceptance is recorded as sent-to-provider, and delivery is recorded only after a verified webhook. Marketing sends recheck preferences and include a signed unsubscribe link. Without the provider and scheduler, drafts/templates remain usable but email delivery and unattended reminders are not verified.

### Portal and media

Deploy `portal-access`, set `PORTAL_BASE_URL`, configure Auth SMTP and add the exact redirect URL to the Supabase allowlist. Portal access is invitation-based and organisation-scoped. Images use Supabase Storage; listing videos use hosted URLs.

## Data and reporting rules

- Campaign budgets are management figures, not accounting transactions.
- Membership revenue means contracted membership fees; cash received comes from paid invoices.
- Membership value can include optional estimated amounts, but estimates are labelled and are not financial ROI.
- Website analytics is first-party and consent-dependent. Reports show their period and source.
- Unknown figures are shown as unknown rather than zero.
- Optional modules reuse organisations, people, listings, tasks and communications and respect existing permissions.

## Historical data

Retired feature tables and fields are intentionally not dropped. Do not delete experiment or survey history during deployment. The launch UI and search do not expose those builders, and the public site ignores experiment assignments.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

Production authentication, tenant isolation, email delivery, scheduled execution, image storage, invitations and password resets require the configured services above and cannot be verified by the local demo alone.
