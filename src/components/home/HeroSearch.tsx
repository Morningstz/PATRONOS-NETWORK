import type { filterOptions } from "@/lib/queries/public";

type Options = Awaited<ReturnType<typeof filterOptions>>;

/** Global search inside the hero's central glass node. Plain GET form — works without JS. */
export function HeroSearch({ idPrefix, options }: { idPrefix: string; options: Options }) {
  const parents = options.industries.filter((i) => !i.parentId);
  return (
    <div className="glass glow relative overflow-hidden p-6 sm:p-8 md:aspect-video md:p-8" style={{ borderRadius: 32 }}>
      <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 opacity-60" />
      <form action="/search" method="get" role="search" aria-label="Search PATRONOS" className="relative flex h-full flex-col justify-center gap-4">
        <p className="eyebrow">Search the network</p>
        <label htmlFor={`${idPrefix}-q`} className="sr-only">
          Search companies, artists, artworks and acquisitions
        </label>
        <input id={`${idPrefix}-q`} name="q" type="search" placeholder="Companies, artists, artworks…" className="field !min-h-[52px] !rounded-full !text-[16px]" autoComplete="off" maxLength={80} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`${idPrefix}-type`} className="sr-only">
              Type
            </label>
            <select id={`${idPrefix}-type`} name="type" className="field !rounded-full" defaultValue="all">
              <option value="all">Everything</option>
              <option value="companies">Companies</option>
              <option value="artists">Artists</option>
              <option value="art">Art</option>
              <option value="acquisitions">Acquisitions</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-country`} className="sr-only">
              Country
            </label>
            <select id={`${idPrefix}-country`} name="country" className="field !rounded-full" defaultValue="">
              <option value="">Any country</option>
              {options.countries.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-industry`} className="sr-only">
              Industry
            </label>
            <select id={`${idPrefix}-industry`} name="industry" className="field !rounded-full" defaultValue="">
              <option value="">Any industry</option>
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
        </div>
        <button type="submit" className="btn btn-gold !min-h-[48px]">
          Search
        </button>
      </form>
    </div>
  );
}
