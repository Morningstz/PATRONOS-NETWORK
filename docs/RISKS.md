# Unresolved risks (after milestone 1)

Severity: 🔴 must fix before production · 🟠 fix in milestone 2 · 🟡 monitor

## Security
| Sev | Risk | Detail | Mitigation / next step |
|---|---|---|---|
| 🔴 | Supabase auth path untested | Magic-link sign-in, `/auth/callback` and middleware refresh were written against `@supabase/ssr` but **never run** — no Supabase project credentials in the build environment. Only dev auth was exercised by tests. | Create a Supabase project, set `AUTH_MODE=supabase`, add an e2e run against a Supabase test project. |
| 🔴 | Turnstile + Upstash optional | Without keys, bot checks are skipped and rate limiting is per-instance memory (ineffective on serverless). | Fail boot in production when keys are missing (M2-05). |
| 🟠 | CSP allows `'unsafe-inline'` scripts | Needed for Next.js inline bootstrap without nonces. Reduces XSS defense-in-depth (React escaping is still the primary defense). | Nonce-based CSP via middleware once pages can be dynamic anyway. |
| 🟠 | Prisma bypasses RLS | Authorization relies on the app policy layer; a new query path that skips it is not caught by the DB. | Keep public reads in `lib/queries/public.ts`; code review checklist; leak tests. |
| 🟠 | Dev auth exists in the codebase | Guarded (refused on Vercel / production unless `DEV_AUTH_LOCAL_TEST=1` on a local build) and unit-tested, but a misconfigured self-hosted production with that flag would allow passwordless sign-in as demo users. | Purge demo users in production; consider removing dev auth from production bundles via build flag. |
| 🟠 | No CSRF token on server actions | Next.js server actions verify `Origin` against `Host`; acceptable but relies on correct proxy headers. | Verify behind your proxy/CDN; set `serverActions.allowedOrigins` if a custom domain proxy is used. |
| 🟡 | Claim domain check is advisory | Moderators see "email domain matches website" but no email ownership proof is collected yet. | Send a verification code to the work email (M2). |

## Architecture & performance
| Sev | Risk | Detail | Next step |
|---|---|---|---|
| 🟠 | Every page renders per request | Nav reads the session, and data pages read live settings, so no ISR/CDN caching. Fine at MVP scale; costly at scale. | Move session UI to a client island; ISR public pages with on-demand revalidation (M3). |
| 🟠 | Search is `ILIKE` + trigram | Good to tens of thousands of rows; no relevance ranking or typo tolerance beyond trigram. | `SearchProvider` → Meilisearch/Typesense. |
| 🟠 | Impression/Click tables | Will grow fast once tracking ships. | Daily rollups + partitioning plan before launch. |
| 🟡 | Duplicate SVG ids | Generated art/portraits can appear twice on one page (desktop + mobile hero variants) with identical `<defs>` ids. Renders correctly; invalid HTML strictly. | Suffix ids with `useId` when convenient. |
| 🟡 | Prisma 6 | Prisma 7 is out with breaking changes (config file, adapters). | Upgrade deliberately; pinned to 6.19.3. |

## Product / compliance
| Sev | Risk | Next step |
|---|---|---|
| 🔴 | Legal pages are placeholders | Terms, privacy and cookie notices must be written and reviewed by counsel (esp. Indonesia PDP Law, GDPR if EU users). |
| 🟠 | Newsletter consent stored without double opt-in email | Implement confirmation email before sending any marketing (M2-11). |
| 🟠 | Acquisition listings | Even without brokerage, some jurisdictions regulate business-sale advertising. Legal review before real listings. |
| 🟡 | Demo names could collide with real entities | Names are coined, labeled DEMO, `noindex`; still search before launch and purge demo data once real listings exist. |
