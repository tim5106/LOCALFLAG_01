# Local Flag

A location-based tourism PWA where users discover lesser-known local spots, verify their physical presence on site, and accumulate point rewards and flag records.

For product, collaboration, and API standards regarding this project, please refer to [LOCAL_FLAG_PROJECT.md](https://www.google.com/search?q=./LOCAL_FLAG_PROJECT.md).

## Repository Structure

```text
.
├─ apps/
│  ├─ web/                 # React + Vite mobile-first PWA
│  └─ api/                 # Express + TypeScript REST API
├─ packages/
│  └─ contracts/           # OpenAPI 3.1 contracts
├─ supabase/
│  └─ migrations/          # PostgreSQL + PostGIS schemas
├─ docs/
│  └─ decisions/           # Architecture & policy Decision Records (ADR)
└─ LOCAL_FLAG_PROJECT.md   # Project planning and development specification

```

## Getting Started

### Prerequisites

* Node.js 22 or higher
* npm 10 or higher
* Optional: Supabase CLI or a Supabase project

### Installation

```bash
npm install

```

### Environment Variables

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

```

On Windows PowerShell, run:

```powershell
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/api/.env.example apps/api/.env

```

### Development Server

Run the following commands in separate terminal windows:

```bash
npm run dev:web
npm run dev:api

```

* Web: [http://localhost:5173](http://localhost:5173)
* API: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)
* OpenAPI: `packages/contracts/openapi.yaml`

## Verification Commands

```bash
npm run typecheck
npm test
npm run build

```

## Current Implementation Scope

* 3-tab UI shell: Discovery, On-site Check-in, and My Flag
* PostgreSQL/PostGIS-backed discovery, recommendation, nearby, and user read APIs
* Supabase bearer-token authentication with profile status enforcement
* Transactional PostGIS check-in, idempotency, risk review, point ledger, and balance engine
* Express health check and advisory check-in precheck
* Standardized error response format and request trace IDs
* Base OpenAPI 3.1 contracts
* Initial Supabase migrations including PostGIS, RLS, and point ledger schema

### TourAPI development sync

After applying the Supabase migration, configure the backend-only
`SUPABASE_DB_URL` and `TOUR_API_SERVICE_KEY` values
in `apps/api/.env`, then run:

```bash
npm run sync:tour-spots
```

The command fetches paginated TourAPI `*2` records and detail payloads, skips
unusable coordinates, and transactionally upserts `tour_spots` with its
`spot_scores` row. Execution status and counts are written to `batch_runs`.
For development smoke tests only, set `TOUR_SYNC_LIMIT` to a positive integer
to cap selected tourism or festival source spots. Leave it empty for the
normal, unlimited synchronization behavior.

### Internal operations

The API requires `INTERNAL_CRON_SECRET` (at least 16 characters) and the
TourAPI credentials at startup. An external HTTPS scheduler can invoke these
endpoints with the secret in `X-Internal-Secret`:

- `POST /api/v1/internal/jobs/tour-spots/sync`
- `POST /api/v1/internal/jobs/festivals/sync`
- `POST /api/v1/internal/jobs/spot-scores/recalculate`

The same internal authentication protects check-in REVIEW resolution. Never
place the internal secret in frontend environment variables or client code.

Interactive map rendering, TourAPI synchronization, Supabase Auth integration, and point transactions will be implemented incrementally after configuring the required environment keys.
