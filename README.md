# Visit Valechester Platform

A working reference implementation of a configurable destination website and CRM for small DMOs and local-authority tourism teams.

## What is included

- Dashboard with tasks, renewals, member health, income and recent activity
- Tier 1–4 member counts and an optional social-performance dashboard module
- Organisation records with multiple contacts and a complete relationship view
- Membership pipeline with drag-and-drop stages
- Customer-defined membership levels, benefits and per-member usage tracking
- Website listings edited and published from the CRM record
- Invoices with draft/sent/overdue/paid states and reminder controls
- Membership agreement tracking and retained signing history
- Team task management and destination workspace settings
- Responsive Visit Valechester visitor website driven by approved CRM listings
- Shared tenant branding across the visitor website, account access and CRM
- Four demonstration user accounts with distinct workspace roles
- Configurable product modules rather than separate product variants
- Responsive layouts and fictional destination, member and transaction data
- Browser persistence, so demo changes remain after refreshing

All destination names, contact details and transactions in the app are fictional. The social dashboard is explicitly labelled with the supplied Shakespeare’s England figures used for the demo. Without Supabase environment variables, the app uses browser-persisted demo accounts and data. With Supabase connected, the account layer uses secure email/password authentication and the tenant-ready schema in `supabase/schema.sql`.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite. The visitor website is at `/` and the CRM sign-in is at `/crm`.

Demo password for every example account: `Demo123!`

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Technical shape

- React and TypeScript
- Vite build tooling
- Custom responsive design system
- `localStorage` demo data layer behind an isolated provider
- Supabase-ready authentication and multi-tenant database migration
- No credentials or private member data committed to the repository

The data layer is deliberately isolated behind `CRMProvider` in `src/store.tsx`. Production work should complete relational data persistence, object storage, transactional email, scheduled reminder jobs, e-signing, backups, monitoring, accessibility testing and the preview/publish deployment workflow.
