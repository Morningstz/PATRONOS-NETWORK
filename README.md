# PATRONOS — Business & Art Network (MVP · milestone 1)

Global business discovery, creative-economy and advertising marketplace. Next.js 15 · TypeScript · Tailwind v4 · Prisma · PostgreSQL / Supabase.

> All companies, artists, galleries, artworks and acquisition listings in the seed are **fictional DEMO data**, labeled as such everywhere.

## Quick start (local)

Requirements: Node 20+ (tested on 22), PostgreSQL 14+ (tested on 16), or Docker.

```bash
# 1. Postgres (skip if you already have one)
docker run -d --name patronos-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
docker exec patronos-db psql -U postgres -c "CREATE DATABASE patronos" -c "CREATE DATABASE patronos_test"

# 2. App
cp .env.example .env            # defaults work with the Postgres above
#   set SESSION_SECRET to 32+ random chars:  openssl rand -base64 48
npm install                     # also runs prisma generate
npx prisma migrate deploy       # creates tables + enables RLS
npm run db:seed                 # reference data + labeled DEMO data
npm run dev                     # http://localhost:3000
```

Sign in at `/sign-in`. With `AUTH_MODE=dev` you pick a seeded demo user:

| User | Roles | Try |
|---|---|---|
| Demo Admin | ADMIN | `/admin` — verify companies, audit log, demo visibility/purge |
| Demo Moderator | MODERATOR | `/admin/claims` — approve/reject claims |
| Demo Company Owner | COMPANY_OWNER, ADVERTISER | `/dashboard` |
| Demo Member | USER | claim a (non-demo) company, inquire on an artwork |

Dev sign-in is **refused on Vercel and in production builds**.

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `npm run typecheck` | ESLint · `tsc --noEmit` |
| `npm test` | Vitest: unit + DB integration tests (uses `patronos_test`, migrates + seeds it) |
| `npm run test:e2e` | Playwright e2e + axe accessibility (run `npm run build` first; uses `patronos_test`) |
| `npm run db:migrate` | `prisma migrate dev` (create new migrations) |
| `npm run db:deploy` | `prisma migrate deploy` (apply migrations) |
| `npm run db:seed` | Idempotent seed: reference data upserted, demo data purged + recreated |
| `npm run db:purge-demo` | Delete every DEMO record (reference data kept) |

Tests refuse to run against a database whose URL doesn't contain `test`. Override with `TEST_DATABASE_URL`.

First-time Playwright: `npx playwright install chromium`.

## Environment variables
See `.env.example` for the full annotated list.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase: pooled (6543, `?pgbouncer=true`) |
| `DIRECT_URL` | ✅ | Supabase: direct (5432) — migrations |
| `AUTH_MODE` | ✅ | `dev` locally, `supabase` everywhere else |
| `SESSION_SECRET` | dev auth | 32+ chars |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | deployed | Supabase Auth |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical URLs, sitemap, magic-link redirect |
| `IP_HASH_SALT` | ✅ prod | Salted IP hashing |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | ✅ prod | Bot protection (skipped locally when empty) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | ✅ prod | Shared rate limiting (memory fallback locally) |

## Deploying (Vercel + Supabase)
1. **Supabase**: create a project → Settings → Database → copy pooled + direct connection strings. Auth → URL configuration: Site URL = your domain; add `https://<domain>/auth/callback` to Redirect URLs. Enable Email (magic link).
2. **Migrate & seed** from your machine: `DATABASE_URL=<direct> DIRECT_URL=<direct> npx prisma migrate deploy && npm run db:seed`. Seed only if you want demo content; hide or purge it later from `/admin/settings`.
3. **Vercel**: import the repo, set all env vars above with `AUTH_MODE=supabase`. Build command `npm run build` (postinstall runs `prisma generate`).
4. **Make yourself admin**: sign in once via magic link, then in Supabase SQL editor:
   ```sql
   insert into "UserRole"(id, "userId", role) select gen_random_uuid(), id, 'ADMIN' from "User" where email = 'you@yourdomain.com';
   ```
5. **Before real traffic**: set Turnstile + Upstash keys, replace legal placeholders, review `docs/RISKS.md`.

Payments are **mock-only**. Do not add real Stripe credentials until explicit approval and a security review.

## Docs
- `docs/PRD.md` — requirements, permission matrix, trust rules, scope status
- `docs/ARCHITECTURE.md` — system design and key decisions (authz vs RLS, rendering, ads pipeline)
- `docs/ERD.md` — Mermaid ERD, constraints, indexes
- `docs/STRUCTURE.md` — repository layout
- `docs/SITEMAP_AND_DESIGN.md` — sitemap and PATRONOS Noir design system
- `docs/BACKLOG.md` — milestone 2 and 3 backlog
- `docs/RISKS.md` — unresolved security / architecture / compliance risks
