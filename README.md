# Visit CRM

A working first model of a destination management CRM, built around the product blueprint for small DMOs and local-authority tourism teams.

## What is included

- Dashboard with tasks, renewals, member health, income and recent activity
- Organisation records with multiple contacts and a complete relationship view
- Membership pipeline with drag-and-drop stages
- Customer-defined membership levels, benefits and per-member usage tracking
- Website listings edited and published from the CRM record
- Invoices with draft/sent/overdue/paid states and reminder controls
- Membership agreement tracking and retained signing history
- Team task management and destination workspace settings
- Responsive layout and sample Shakespeare’s England-style data
- Browser persistence, so demo changes remain after refreshing

All names, contact details and transactions in the app are demonstration data. Email sending, authentication, e-signatures, database storage and deployment integrations are represented by complete interface flows but are not connected to live services.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

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
- `localStorage` data layer for the working model
- No credentials or private member data committed to the repository

The data layer is deliberately isolated behind `CRMProvider` in `src/store.tsx`, so it can be replaced with a hosted database and API without rebuilding the screens. Production work should add tenant-aware authentication and permissions, a relational database with audit history, object storage, transactional email, scheduled reminder jobs, an e-signing provider, backups, monitoring, accessibility testing and a proper preview/publish deployment workflow.
