# UI sitemap & design system — PATRONOS Noir

## Sitemap
```
/                              Home — network hero + global search, shelves, pillars, countries, spotlight calendar, creators, journal
├─ /discover                   Countries by world region (?region=)
│  └─ /discover/[country]      Country directory (?region, city, industry, category, verification, collaboration, q, sort, view, page)
├─ /industries                 Industry tree with counts
│  └─ /industries/[slug]       Industry directory (parent includes sub-industries)
├─ /companies                  Full directory with all filters
│  └─ /companies/[slug]        Company profile (overview, services, collaborations, media, acquisition) + claim
├─ /artists                    Artists
│  └─ /artists/[slug]          Artist profile + gallery-wall works
├─ /art                        Gallery wall (true ratio)
│  └─ /art/[slug]              Artwork detail + provenance + Inquire
├─ /galleries                  Galleries (profiles in M2)
├─ /acquisitions               Listings
│  └─ /acquisitions/[slug]     Listing (no financials)
├─ /collaborations             Open artists + companies
├─ /advertise                  Fixed-price placements
├─ /search                     Global search (noindex)
├─ /journal, /journal/[slug]   Editorial
├─ /list-your-company          Find → claim → verify
├─ /about, /legal/[terms|privacy|cookies], /report
├─ /sign-in, /auth/callback, /dashboard, /forbidden
└─ /admin                      Overview
   ├─ /admin/claims            Claim queue (pending/approved/rejected)
   ├─ /admin/companies         Search, verify (admin), hide/restore
   ├─ /admin/audit             Audit log (admin)
   └─ /admin/settings          Demo visibility + purge (admin)
```

## Tokens (`src/app/globals.css`)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0a0a` | Page |
| `--bg-elevated` | `#111111` | Flat panels, tables (no blur) |
| `--surface-glass` | `rgba(255,255,255,.03)` + blur 10px | Overlapping layers only |
| `--border-glass` / `--border-strong` | `.10` / `.18` white | Card borders / hover |
| `--text` / `--text-muted` / `--text-faint` | `#f5f2ed` / `#a3a3a3` / `#8a8a8a` | Ivory primary, secondary, meta |
| `--gold` / `--gold-light` / `--gold-hover` | `#a78b71` / `#c9b8a0` / `#e8d5b7` | Accent spectrum |
| `--gold-tint` | `rgba(167,139,113,.10)` | Icon wells, Sponsored/DEMO chips |
| `--success` | `#4ade80` | Live + Verified only |
| `--ease` / `--ease-reveal` | `cubic-bezier(.4,0,.2,1)` / `(.16,1,.3,1)` | Transitions / entrances |

Fonts: Playfair Display Italic (display) + Inter Variable (UI), self-hosted via `@fontsource` (no Google Fonts request at runtime). Minimum text 11px; small caps labels tracked 0.2em.

## Components
`GlassCard (.glass)`, `.panel`, `.btn-solid/.btn-outline/.btn-gold`, `.field`, `.chip`, `VerificationBadge`, `DemoBadge`, `DemoBanner`, `SponsoredLabel`, `CollabChip`, `LivePill`, `Shelf`, `NeuralNetwork` + `Satellite`, `Reveal`, `CompanyCard` (grid/list/shelf), `ArtworkCard`, `ArtistCard`, `AcquisitionCard`, `SponsoredCompanyCard`, `PageHeader`, `CompanyDirectory`.

## Rules
- Artworks: true colour, true aspect ratio, never cropped/overlaid. `GenerativeArt decorativeCover` is for banners only.
- Grayscale → colour on hover only for portraits and editorial imagery (`.editorial-image`).
- Blur only on overlapping layers (nav, hero node/satellites, pills, filter bar).
- No blue/purple UI gradients; green only for Live/Verified.
- `prefers-reduced-motion` disables pulse, flow and reveal; content visible without JS (`.no-js`).
- Focus ring 2px `--gold-hover`; touch targets ≥ 44px.
