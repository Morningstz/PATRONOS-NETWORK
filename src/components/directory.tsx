import Link from "next/link";
import type { CompanyFilters } from "@/lib/validation";
import { filterOptions, listCompanies, liveSponsored } from "@/lib/queries/public";
import { db } from "@/lib/db";
import { CompanyCard } from "./cards";
import { AutoSubmit } from "./ui/AutoSubmit";

export function PageHeader({ eyebrow, title, intro, crumbs, children }: { eyebrow: string; title: string; intro?: string; crumbs?: Array<{ href: string; label: string }>; children?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.06]">
      <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(180deg,#000,transparent)]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pt-12 pb-10 sm:px-6 md:pt-16 lg:px-12">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 text-[12px] tracking-[0.14em] text-faint uppercase">
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page" className="text-gold-light">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="hover:text-ink">
                      {c.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="display text-[clamp(2.25rem,5.5vw,4.25rem)]">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-[16px] text-muted">{intro}</p>}
        {children}
      </div>
    </header>
  );
}

type Fixed = Partial<Pick<CompanyFilters, "country" | "industry">>;

function hrefWith(base: string, f: CompanyFilters, patch: Partial<CompanyFilters>, fixed: Fixed) {
  const merged = { ...f, ...patch } as Record<string, unknown>;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === "") continue;
    if (k in fixed) continue;
    if ((k === "page" && v === 1) || (k === "sort" && v === "recent") || (k === "view" && v === "grid")) continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

/** Shared directory for /companies, /discover/[country] and /industries/[slug]. */
export async function CompanyDirectory({ filters, basePath, fixed = {}, regions }: { filters: CompanyFilters; basePath: string; fixed?: Fixed; regions?: Array<{ name: string; slug: string }> }) {
  const f = { ...filters, ...fixed };
  const [{ items, total, pages }, options, spotlight] = await Promise.all([listCompanies(f), filterOptions(), liveSponsored("DIRECTORY_SPOTLIGHT", 1)]);
  const cities = f.country
    ? await db.city.findMany({ where: { country: { slug: f.country }, ...(f.region ? { region: { slug: f.region } } : {}) }, orderBy: { name: "asc" }, select: { name: true, slug: true } })
    : [];
  const parents = options.industries.filter((i) => !i.parentId);
  const activeCount = ["q", "region", "city", "category", "verification", "collaboration", ...(fixed.country ? [] : ["country"]), ...(fixed.industry ? [] : ["industry"])].filter((k) => f[k as keyof CompanyFilters]).length;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-12">
      {/* Sticky glass filter bar — plain GET form, auto-submits on change when JS is available */}
      <form id="filters" action={basePath} method="get" className="glass sticky top-[76px] z-30 p-4 lg:top-[84px]" style={{ borderRadius: 22 }} aria-label="Directory filters">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <div className="col-span-2 xl:col-span-2">
            <label htmlFor="f-q" className="sr-only">
              Search within results
            </label>
            <input id="f-q" name="q" type="search" defaultValue={f.q ?? ""} placeholder="Name, industry or city" className="field" maxLength={80} />
          </div>
          {!fixed.country && (
            <Select id="f-country" name="country" label="Country" value={f.country} options={options.countries.map((c) => [c.slug, c.name])} />
          )}
          {regions && regions.length > 1 && <Select id="f-region" name="region" label="Region" value={f.region} options={regions.map((r) => [r.slug, r.name])} />}
          {cities.length > 0 && <Select id="f-city" name="city" label="City" value={f.city} options={cities.map((c) => [c.slug, c.name])} />}
          {!fixed.industry && (
            <div>
              <label htmlFor="f-industry" className="sr-only">
                Industry
              </label>
              <select id="f-industry" name="industry" defaultValue={f.industry ?? ""} className="field">
                <option value="">Industry</option>
                {parents.map((p) => (
                  <optgroup key={p.slug} label={p.name}>
                    <option value={p.slug}>All {p.name}</option>
                    {options.industries
                      .filter((c) => c.parentId === p.id)
                      .map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
          <Select id="f-category" name="category" label="Category" value={f.category} options={[["STARTUP", "Startup"], ["SME", "SME"], ["ENTERPRISE", "Enterprise"], ["CREATIVE_STUDIO", "Creative studio"], ["NONPROFIT", "Non-profit"]]} />
          <Select id="f-verification" name="verification" label="Verification" value={f.verification} options={[["VERIFIED", "Verified"], ["CLAIMED", "Claimed"], ["UNVERIFIED", "Unverified"]]} />
          <Select id="f-collab" name="collaboration" label="Collaboration" value={f.collaboration} options={[["OPEN", "Open to collaboration"], ["SELECTIVE", "Selective"], ["CLOSED", "Not collaborating"]]} />
        </div>
        <input type="hidden" name="view" value={f.view} />
        <input type="hidden" name="sort" value={f.sort} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="submit" className="btn btn-gold !min-h-10">
              Apply filters
            </button>
            {activeCount > 0 && (
              <Link href={basePath} className="link-gold text-[13px]">
                Clear {activeCount} filter{activeCount > 1 ? "s" : ""}
              </Link>
            )}
          </div>
          <AutoSubmit formId="filters" />
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[14px] text-muted" role="status">
          <span className="nums text-ink">{total.toLocaleString("en")}</span> {total === 1 ? "company" : "companies"}
        </p>
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-faint">Sort</span>
          <Link href={hrefWith(basePath, f, { sort: "recent", page: 1 }, fixed)} aria-current={f.sort === "recent" ? "true" : undefined} className={f.sort === "recent" ? "text-gold-hover" : "text-muted hover:text-ink"}>
            Newest
          </Link>
          <Link href={hrefWith(basePath, f, { sort: "name", page: 1 }, fixed)} aria-current={f.sort === "name" ? "true" : undefined} className={f.sort === "name" ? "text-gold-hover" : "text-muted hover:text-ink"}>
            A–Z
          </Link>
          <span aria-hidden="true" className="text-faint">|</span>
          <Link href={hrefWith(basePath, f, { view: "grid" }, fixed)} aria-label="Grid view" aria-current={f.view === "grid" ? "true" : undefined} className={f.view === "grid" ? "text-gold-hover" : "text-muted hover:text-ink"}>
            Grid
          </Link>
          <Link href={hrefWith(basePath, f, { view: "list" }, fixed)} aria-label="List view" aria-current={f.view === "list" ? "true" : undefined} className={f.view === "list" ? "text-gold-hover" : "text-muted hover:text-ink"}>
            List
          </Link>
        </div>
      </div>

      {spotlight[0]?.targetCompany && f.page === 1 && (
        <div className="mt-6">
          <CompanyCard c={spotlight[0].targetCompany} sponsored layout="list" />
        </div>
      )}

      {items.length === 0 ? (
        <div className="panel mt-6 px-6 py-16 text-center">
          <p className="display text-[28px]">No companies match these filters — yet.</p>
          <p className="mt-3 text-muted">Try removing a filter, or browse another country or industry.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={basePath} className="btn btn-outline">
              Clear filters
            </Link>
            <Link href="/discover" className="btn btn-outline">
              Browse countries
            </Link>
          </div>
        </div>
      ) : f.view === "list" ? (
        <ul className="mt-6 space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <CompanyCard c={c} layout="list" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((c) => (
            <li key={c.id} className="flex">
              <CompanyCard c={c} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
          {f.page > 1 && (
            <Link href={hrefWith(basePath, f, { page: f.page - 1 }, fixed)} className="btn btn-outline" rel="prev">
              ← Previous
            </Link>
          )}
          <span className="nums px-4 text-[14px] text-muted">
            Page {f.page} of {pages}
          </span>
          {f.page < pages && (
            <Link href={hrefWith(basePath, f, { page: f.page + 1 }, fixed)} className="btn btn-outline" rel="next">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Select({ id, name, label, value, options }: { id: string; name: string; label: string; value?: string; options: Array<[string, string]> }) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} className="field">
        <option value="">{label}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
