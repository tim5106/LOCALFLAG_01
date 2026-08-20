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
* Mock spot list for development and API client fallback
* Express health check, spot query, and check-in precheck skeleton
* Standardized error response format and request trace IDs
* Base OpenAPI 3.1 contracts
* Initial Supabase migrations including PostGIS, RLS, and point ledger schema

Interactive map rendering, TourAPI synchronization, Supabase Auth integration, and point transactions will be implemented incrementally after configuring the required environment keys.