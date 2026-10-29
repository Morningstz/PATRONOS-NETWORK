# Prioritized implementation backlog

## Milestone 1 — Foundation ✅ (this delivery)
| ID | Item | Status |
|---|---|---|
| M1-01 | Full Prisma schema, migrations, RLS on all tables | ✅ |
| M1-02 | PATRONOS Noir design system + core components | ✅ |
| M1-03 | Homepage: network hero, search, shelves, pillars, countries, spotlight, creators, journal | ✅ |
| M1-04 | Country / region / city / industry directory with URL filters | ✅ |
| M1-05 | Company profile + JSON-LD + noindex for demo | ✅ |
| M1-06 | Auth: Supabase magic link + guarded local dev auth | ✅ (Supabase path not exercised — no project credentials) |
| M1-07 | Claim workflow + moderation queue + verification (admin) | ✅ |
| M1-08 | Admin: overview, companies, audit log, settings (demo toggle + purge) | ✅ |
| M1-09 | Demo seed (fictional, labeled) + purge command | ✅ |
| M1-10 | Artist, artwork (+ inquiry), galleries, acquisitions, collaborations, journal pages | ✅ lean |
| M1-11 | Tests: unit + DB integration (Vitest), e2e + axe (Playwright), CI workflow | ✅ |

## Milestone 2 — Revenue & engagement
| P | ID | Item |
|---|---|---|
| P0 | M2-01 | Sponsored checkout: placement → availability calendar (capacity) → creative upload → preview → **mock** payment → pending approval |
| P0 | M2-02 | Admin campaign/creative review queue + auto-activate/expire job (Vercel Cron) |
| P0 | M2-03 | Impression beacon + click redirect endpoints with dedupe, bot filtering, self-view exclusion |
| P0 | M2-04 | Advertiser dashboard: campaigns by status, impressions/clicks/CTR chart, filtered vs raw |
| P0 | M2-05 | Production hardening: Upstash limiter + Turnstile keys required at boot when `NODE_ENV=production` |
| P1 | M2-06 | Company owner editing: profile, services, media uploads (Supabase Storage, MIME magic-byte check, EXIF strip) |
| P1 | M2-07 | Claim evidence upload to private bucket + signed URLs for moderators |
| P1 | M2-08 | Collaboration requests (send, inbox, accept/decline) |
| P1 | M2-09 | Acquisition information requests (gated), owner-controlled sharing |
| P1 | M2-10 | Gallery profile + collection pages |
| P1 | M2-11 | Newsletter double opt-in email (Resend/Postmark) |
| P1 | M2-12 | Content report form → moderation queue |
| P2 | M2-13 | Sentry wiring + structured logging |
| P2 | M2-14 | Data export / account deletion self-service |
| P2 | M2-15 | Role assignment UI (admin) |
| P2 | M2-16 | ⌘K command palette |

## Milestone 3 — Scale
Real Stripe adapter (after approval + security review), Meilisearch/Typesense provider, ISR + client-side session island for cacheable public pages, nonce-based CSP, i18n (Bahasa Indonesia first), partner `VerificationProvider` (business registries), impression rollups/partitioning.
