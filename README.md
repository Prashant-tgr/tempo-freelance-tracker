# Tempo — Freelancer Time Tracker

A full-stack time tracking workspace for independent freelancers. The repository starts from an empty directory and provides a React/TypeScript client and an Express/TypeScript API backed by PostgreSQL and Prisma.

## Features

- Email/password registration and login with bcrypt password hashes and seven-day signed bearer tokens.
- User-owned clients and projects with server-side validation and safe deletion checks.
- Server-persisted timer, manual time entries, and protected edit/delete for invoiced entries.
- Weekly Monday-to-Sunday view and billable/non-billable totals.
- Invoice preview and creation from eligible billable work, immutable line snapshots, detail and browser print.
- Responsive dashboard and management pages with loading, empty, and error feedback.

## Architecture and data

`client/` contains the Vite React application and reusable layout, form, table, and page components. `server/src/index.ts` contains Express request handling and validation; Prisma models form the data layer. `server/prisma/schema.prisma` defines User → Client → Project → TimeEntry, one ActiveTimer per User, and Invoice → InvoiceLine. All record queries are scoped by the verified user ID.

Postgres `ActiveTimer.userId @unique` allows one active timer per user, even under concurrent starts. Stopping the timer deletes the active row and writes its time entry in one transaction; a racing stop can only claim the row once. Invoice lines have a unique `timeEntryId`, and invoice selection/creation runs in a serializable transaction. Line items snapshot hours, rate, description, date, and amount. Invoices cannot mix currencies.

Time entry date ranges use the entry's start timestamp. Invoice date ranges are inclusive by calendar date in UTC (the `to` date is included through the next UTC midnight). Timesheet week boundaries are Monday 00:00 UTC through the following Monday; each entry is counted on its start date.

## Setup

Prerequisites: Node.js 20+, npm, and PostgreSQL 14+.

```powershell
npm install
Copy-Item .env.example server/.env
# Set DATABASE_URL and replace JWT_SECRET in server/.env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The Vite client is at http://localhost:5173 and the API at http://localhost:4000. `DATABASE_URL`, `JWT_SECRET`, `PORT`, and `CLIENT_ORIGIN` are read by the server from `server/.env`. `.env.example` uses local-only placeholders. Never use those values in a deployed environment.

### Demo account

- Email: `demo@tracker.local`
- Password: `ChangeMe123!` (unless overridden with `DEMO_PASSWORD` before seeding)

The repeatable seed script resets demo-owned clients, projects, entries, timers and invoices, then creates two demo clients, projects, and historical billable/non-billable entries. Use a dedicated local database; do not run the demo seed against production data.

## Commands

```powershell
npm run db:generate   # generate Prisma client
npm run db:migrate    # apply development migrations
npm run db:seed       # seed demo account and records
npm run dev           # run API and Vite together
npm test              # backend test suite
npm run build         # production TypeScript and Vite builds
```

## API overview

All `/api` routes except `/health` and `/auth/{login,register}` require `Authorization: Bearer <token>`. Responses use `{data: ...}`; failures use `{error:{message}}` and centralized status mapping.

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Clients/projects: `/api/clients`, `/api/projects` (GET/POST and PATCH/DELETE by ID)
- Timer: `GET /api/timer`, `POST /api/timer/start`, `POST /api/timer/stop`
- Entries: `/api/entries` (GET/POST and PATCH/DELETE by ID)
- Timesheet: `GET /api/timesheet?weekStart=YYYY-MM-DD`
- Invoices: `GET /api/invoices`, `GET /api/invoices/preview?clientId=…&from=…&to=…`, `POST /api/invoices`, `GET /api/invoices/:id`

## Testing and current status

Backend tests live in `server/tests/` and use Vitest plus Supertest. Ten unit tests cover elapsed-time calculation, Monday-to-Sunday UTC boundaries, invoice amount rounding, and invoice eligibility filters. Eleven database-backed API integration tests cover timer start/stop/state, the single-active-timer constraint, invalid input, timesheet totals, invoice eligibility, non-billable exclusion, duplicate billing, concurrent invoice requests, and authentication. Integration tests require `TEST_DATABASE_URL` to point to a dedicated database whose name contains `test`; the setup fails closed for any other database name. They clean up only the fixture account and its records.

The server TypeScript build and client TypeScript/Vite production build both completed successfully with `npm run build`. The final run passed all 21 tests against an isolated temporary PostgreSQL cluster; migrations and demo seeding also completed there. The existing PostgreSQL service was not modified. Browser end-to-end verification has not been performed. Printing is implemented through the invoice detail page's browser print action.

For isolated API integration checks, configure a separate database name containing `test`, then in PowerShell set both values before migrating and testing:

```powershell
$env:TEST_DATABASE_URL = "postgresql://USER:PASSWORD@localhost:5432/freelancer_tracker_test?schema=public"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:migrate
npm test
```

## Deployment

No deployment or live demo is configured. For a deployment, provide a managed PostgreSQL database and strong `DATABASE_URL` and `JWT_SECRET` secrets, set `CLIENT_ORIGIN` to the deployed client origin, build with `npm run build`, apply migrations with `npm run db:migrate`, and run the server with `npm --workspace server start`. Serve the built `client/dist` directory from a static host with `/api` proxied to the Express service. A production static host/API proxy configuration is not included yet.

Known limitations: bearer tokens are stored in localStorage and expire after seven days; there is no refresh-token flow or email verification. Invoice status and PDF file generation are not included (browser printing can save as PDF). Email delivery, time zone preferences, pagination, and deployment are not configured. With more time, add token rotation/revocation, invoice status, accessibility review, and deployment configuration.

AI assistance was used to scaffold and implement the application and documentation. No deployment was performed.
