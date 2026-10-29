# PATRONOS — Product Requirements (MVP)

## 1. Summary
PATRONOS is a global business discovery, creative-economy and advertising marketplace. It presents companies the way a curated art platform presents work: editorial context, provenance and an explicit verification state on every profile. Revenue in v1 comes from **fixed-price, clearly labeled sponsored placements**.

Positioning: *Where companies meet culture.*

## 2. Goals (v1)
| # | Goal | Measure |
|---|------|---------|
| G1 | Visitors can discover companies by country, region, city and industry | Directory + filters + search shipped |
| G2 | Companies can claim and manage their profile; staff can verify | Claim → moderation → verification flow |
| G3 | Artists, galleries and artworks are discoverable and inquirable | Artist/artwork pages + inquiry |
| G4 | First advertising revenue without auctions | Fixed-price placements, labeled, admin-approved |
| G5 | Trust: no fake verification, no hidden ads, no leaked financials | Enforced in code + tests |

## 3. Non-goals (v1) — compliance boundary
Fractional art investment, securities issuance, custody, escrow, art checkout, brokerage, automated revenue verification, real-time ad bidding, real payment credentials. Extension interfaces exist in `src/lib/providers` for licensed partners later.

## 4. Users & roles
| Role | Who | Key needs |
|------|-----|-----------|
| Visitor | Anyone | Browse, search, read |
| Registered user | Signed-in person | Claim companies, send inquiries, newsletter |
| Company owner | Approved claimant | Manage company profile, advertise |
| Artist | Creator with a profile | Manage works, accept collaborations |
| Gallery operator | Gallery staff | Manage gallery, represented artists |
| Advertiser | Buys placements | Book, track campaigns |
| Moderator | Staff | Review claims, companies, campaigns, reports |
| Administrator | Staff | Everything + verify, settings, demo purge, audit, roles |

Users can hold several roles at once.

## 5. Permission matrix
Source of truth: `src/lib/authz.ts` (`PERMISSIONS`), unit-tested in `tests/unit/authz.test.ts`.

| Action | Visitor | User | Owner | Artist | Gallery | Advertiser | Moderator | Admin |
|---|---|---|---|---|---|---|---|---|
| Read directory | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Claim company | – | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send inquiry / collaboration request | – | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit company | – | – | ✅ own only | – | – | – | ✅ | ✅ |
| Create / read own campaigns | – | – | ✅ | – | – | ✅ | – | ✅ |
| Access admin | – | – | – | – | – | – | ✅ | ✅ |
| Review claims / companies / campaigns / reports | – | – | – | – | – | – | ✅ | ✅ |
| Mark company **Verified** | – | – | – | – | – | – | – | ✅ |
| Read audit log | – | – | – | – | – | – | – | ✅ |
| Site settings, demo visibility, demo purge | – | – | – | – | – | – | – | ✅ |
| Assign roles | – | – | – | – | – | – | – | ✅ |

## 6. Trust rules (must never break)
1. **Three verification states**: Unverified → Claimed (moderator approved a claim) → Verified (admin independently checked). Claiming never sets Verified.
2. **Demo data** is flagged `isDemo`, always shows a DEMO badge/banner, is `noindex`, can never be Verified or claimed, and can be hidden or purged by an admin.
3. **Sponsored content** always carries a visible “Sponsored” label plus screen-reader text, and never outranks an exact name match.
4. **Private data** (acquisition financials, claim evidence, personal emails, private notes) is never selected by public queries (enforced by `src/lib/queries/public.ts`, tested).
5. Live status pill shows only real (non-demo) verification events; otherwise it reads DEMO.

## 7. MVP scope & status
| Screen | Status (milestone 1) |
|---|---|
| Homepage with global search | ✅ Built |
| Country directory (country → region → city) | ✅ Built |
| Industry directory (incl. sub-industries) | ✅ Built |
| Company profile | ✅ Built |
| Artist profile, artwork detail (+ inquiry) | ✅ Built (lean) |
| Galleries, acquisitions, collaborations lists | ✅ Built (lean, read-only) |
| Company claim workflow | ✅ Built |
| User dashboard | ✅ Built (claims, inquiries, companies) |
| Admin moderation (claims, companies, audit, settings) | ✅ Built |
| Advertising landing page | ✅ Built (booking disabled) |
| Sponsored listing checkout | ⏳ Milestone 2 |
| Advertiser dashboard | ⏳ Milestone 2 |
| Impression / click tracking | ⏳ Milestone 2 (schema ready) |
| Gallery profile pages, collection pages | ⏳ Milestone 2 |
| Collaboration requests, acquisition info requests | ⏳ Milestone 2 (schema ready) |

## 8. Functional requirements (milestone 1)
- **Search**: keyword + type (companies, artists, art, acquisitions) + country + industry. Postgres `ILIKE` backed by `pg_trgm` GIN indexes, behind a `SearchProvider` interface.
- **Directory filters**: country, region, city, industry (parent includes children), category, verification, collaboration; sort newest / A–Z; grid / list; pagination (24). Filters live in the URL; invalid values are dropped, never 500.
- **Claim**: signed-in; work email + role + optional note; Turnstile when configured; rate-limited (5/hour/user); one pending claim per user per company; not allowed for demo or already-claimed companies; audit-logged.
- **Moderation**: approve → membership OWNER + role COMPANY_OWNER + status CLAIMED, auto-reject other pending claims; reject with note; cannot review own claim; email-domain-vs-website hint.
- **Verification**: admin only, never on demo; writes `CompanyVerification` + audit.
- **Inquiry**: signed-in, 10–2000 chars, rate-limited, Turnstile; blocked on sold / not-for-sale works.
- **Newsletter**: email + explicit consent checkbox → `ConsentRecord` (confirmation email is milestone 2).

## 9. Non-functional requirements
Mobile-first, WCAG 2.2 AA (axe in CI), LCP < 2.5 s on 4G mid-range, JS ≤ 200 KB gzip public pages (currently ~108 KB first load), server-rendered SEO pages with metadata, JSON-LD, sitemap and robots.
