# Repository structure

```
patronos/
├─ .github/workflows/ci.yml      # lint, typecheck, unit + integration, build, e2e (Postgres service)
├─ docs/                         # PRD, architecture, ERD, structure, sitemap & design, backlog, risks
├─ prisma/
│  ├─ schema.prisma              # full v1 data model
│  ├─ migrations/                # init, enable_rls, site_settings_and_newsletter
│  ├─ seed-data.ts               # fictional DEMO content + real reference geography/industries
│  ├─ seed.ts                    # idempotent: upsert reference, purge + recreate demo
│  └─ purge-demo.ts              # npm run db:purge-demo
├─ public/
├─ scripts/screenshot.mjs        # local visual checks (Playwright)
├─ src/
│  ├─ middleware.ts              # Supabase session refresh only (no authz here)
│  ├─ app/
│  │  ├─ layout.tsx, page.tsx    # shell + homepage
│  │  ├─ globals.css             # PATRONOS Noir tokens & components
│  │  ├─ actions/                # server actions: public.ts, auth.ts, admin.ts
│  │  ├─ admin/                  # overview, claims, companies, audit, settings
│  │  ├─ companies/, discover/, industries/, search/
│  │  ├─ artists/, art/, galleries/, acquisitions/, collaborations/
│  │  ├─ advertise/, journal/, about/, legal/, report/, list-your-company/
│  │  ├─ sign-in/, auth/callback/, dashboard/, forbidden/
│  │  ├─ error.tsx, not-found.tsx, robots.ts, sitemap.ts
│  ├─ components/
│  │  ├─ art/                    # GenerativeArt (demo artworks), Monogram, AbstractPortrait
│  │  ├─ home/                   # NeuralNetwork hero, HeroSearch, Satellite
│  │  ├─ layout/                 # SiteNav, NavClient, SiteFooter, NewsletterForm
│  │  ├─ ui/                     # badges (Verification, Demo, Sponsored, Live), Shelf, Reveal, AutoSubmit
│  │  ├─ forms/                  # ClaimForm, InquiryForm, MagicLinkForm, Turnstile
│  │  ├─ admin/                  # ActionForm, AdminNotice
│  │  ├─ cards.tsx, directory.tsx
│  └─ lib/
│     ├─ authz.ts                # permission matrix (pure, unit-tested)
│     ├─ auth/                   # session.ts, supabase.ts, dev-session.ts
│     ├─ queries/public.ts       # the ONLY public read path
│     ├─ providers/              # Payment/Escrow/Verification/KYC/Search interfaces
│     ├─ db.ts, env.ts, validation.ts, rate-limit.ts, turnstile.ts, audit.ts, hash.ts, settings.ts, demo.ts, journal.ts
└─ tests/
   ├─ unit/                      # authz, validation, env guard, rate limit, data-layer integration
   └─ e2e/                       # smoke, directory, auth + admin flows, accessibility (axe)
```
