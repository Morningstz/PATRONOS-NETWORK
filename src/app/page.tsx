import Link from "next/link";
import { db } from "@/lib/db";
import {
  acquisitionCardSelect,
  artistCardSelect,
  artworkCardSelect,
  companyCardSelect,
  countriesWithCounts,
  filterOptions,
  latestLiveEvent,
  liveSponsored,
  publicAcquisition,
  upcomingSpotlights,
  visibility,
} from "@/lib/queries/public";
import { ARTICLES } from "@/lib/journal";
import { NeuralNetwork } from "@/components/home/NeuralHero";
import { HeroSearch } from "@/components/home/HeroSearch";
import { Satellite } from "@/components/home/Satellite";
import { Shelf } from "@/components/ui/Shelf";
import { Reveal } from "@/components/ui/Reveal";
import { LivePill } from "@/components/ui/badges";
import { AcquisitionCard, ArtistCard, ArtworkCard, CompanyCard, SponsoredCompanyCard } from "@/components/cards";
import { GenerativeArt } from "@/components/art/GenerativeArt";
import { AbstractPortrait, Monogram } from "@/components/art/Monogram";

export const dynamic = "force-dynamic";

const MACRO_LABEL = { ASIA_PACIFIC: "Asia Pacific", EUROPE: "Europe", AMERICAS: "Americas", MIDDLE_EAST_AFRICA: "Middle East & Africa" } as const;

export default async function HomePage() {
  const v = await visibility();
  const live = { ...v, deletedAt: null };

  const [options, verified, newest, openCompanies, openArtists, artworks, acquisitions, galleries, countries, sponsored, spotlights, liveEvent] = await Promise.all([
    filterOptions(),
    db.company.findMany({ where: { ...live, verificationStatus: "VERIFIED" }, orderBy: { verifiedAt: "desc" }, take: 10, select: companyCardSelect }),
    db.company.findMany({ where: live, orderBy: { createdAt: "desc" }, take: 10, select: companyCardSelect }),
    db.company.findMany({ where: { ...live, collaboration: "OPEN" }, orderBy: { createdAt: "desc" }, take: 6, select: companyCardSelect }),
    db.artist.findMany({ where: { ...v, collaboration: "OPEN" }, orderBy: { createdAt: "desc" }, take: 6, select: artistCardSelect }),
    db.artwork.findMany({ where: { ...v, availability: { in: ["AVAILABLE", "ON_REQUEST"] } }, orderBy: { createdAt: "desc" }, take: 12, select: artworkCardSelect }),
    db.acquisitionListing.findMany({ where: { status: "PUBLISHED", ...(v.isDemo === false ? { isDemo: false } : {}) }, orderBy: { createdAt: "desc" }, take: 8, select: acquisitionCardSelect }),
    db.gallery.findMany({ where: v, take: 8, select: { slug: true, name: true, isDemo: true, city: { select: { name: true } }, country: { select: { name: true } }, _count: { select: { artists: true, artworks: true } } } }),
    countriesWithCounts(),
    liveSponsored("HOMEPAGE_SHELF", 2),
    upcomingSpotlights(6),
    latestLiveEvent(),
  ]);

  const companyShelf = verified.length > 0 ? { title: "Recently verified companies", eyebrow: "Verified", items: verified } : { title: "Newly listed companies", eyebrow: "Just added", items: newest };
  const featuredCreators = openArtists.slice(0, 2);
  const topCountries = [...countries].sort((a, b) => b._count.companies + b._count.artists - (a._count.companies + a._count.artists)).slice(0, 8);

  const heroCompany = newest[0];
  const heroArtist = openArtists[0];
  const heroArtwork = artworks[0];
  const heroAcq = acquisitions[0] ? publicAcquisition(acquisitions[0]) : undefined;
  const heroCountry = topCountries[0];

  const satellites = [
    heroArtwork && {
      key: "artwork",
      position: "left-0 top-6",
      content: <Satellite type="Artwork" href={`/art/${heroArtwork.slug}`} title={heroArtwork.title} meta={heroArtwork.artist.name} isDemo={heroArtwork.isDemo} width={240} media={<GenerativeArt seed={heroArtwork.generativeSeed ?? 1} ratio={1.25} title={heroArtwork.title} />} />,
    },
    heroCompany && {
      key: "company",
      position: "right-0 top-0",
      content: (
        <Satellite
          type="Company"
          href={`/companies/${heroCompany.slug}`}
          title={heroCompany.name}
          meta={`${heroCompany.industry.name} · ${heroCompany.country.name}`}
          isDemo={heroCompany.isDemo}
          width={250}
          media={
            <div className="flex h-[110px] items-center gap-3 bg-[linear-gradient(140deg,#1a1714,#0f0e0d)] px-4">
              <Monogram name={heroCompany.name} hue={heroCompany.logoHue} size={52} />
              <p className="line-clamp-3 text-[12.5px] text-muted">{heroCompany.tagline}</p>
            </div>
          }
        />
      ),
    },
    heroArtist && {
      key: "artist",
      position: "left-[3%] bottom-0",
      content: <Satellite type="Artist" href={`/artists/${heroArtist.slug}`} title={heroArtist.name} meta={`${heroArtist.discipline} · ${heroArtist.city?.name ?? heroArtist.country.name}`} isDemo={heroArtist.isDemo} width={220} media={<div className="h-[150px] overflow-hidden"><AbstractPortrait name={heroArtist.name} hue={heroArtist.portraitHue} className="editorial-image -mt-6" /></div>} />,
    },
    heroAcq && {
      key: "acquisition",
      position: "right-[2%] bottom-4",
      content: (
        <Satellite
          type="Acquisition"
          href={`/acquisitions/${heroAcq.slug}`}
          title={heroAcq.headline}
          meta={`${heroAcq.industry.name} · ${heroAcq.country.name}`}
          isDemo={heroAcq.isDemo}
          width={270}
          media={<div className="flex h-[92px] flex-col justify-end bg-[radial-gradient(120%_120%_at_0%_0%,rgba(167,139,113,0.28),transparent_60%)] p-4"><span className="display text-[22px] text-gold-hover">Open to offers</span><span className="nums text-[12px] text-muted">{heroAcq.revenueRange ? `Revenue ${heroAcq.revenueRange}` : "Details on request"}</span></div>}
        />
      ),
    },
    heroCountry && {
      key: "country",
      position: "left-1/2 -translate-x-1/2 bottom-0",
      content: (
        <Satellite
          type="Country"
          href={`/discover/${heroCountry.slug}`}
          title={heroCountry.name}
          meta={`${heroCountry._count.companies} companies · ${heroCountry._count.artists} artists`}
          width={220}
          media={<div className="flex h-[64px] items-center bg-[linear-gradient(90deg,rgba(167,139,113,0.16),transparent)] px-4"><span className="display text-[26px] text-gold-light">{heroCountry.name}</span></div>}
        />
      ),
    },
  ].filter(Boolean) as Array<{ key: string; position: string; content: React.ReactNode }>;

  return (
    <>
      {/* ───────── Hero — The Network ───────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
        <div className="relative mx-auto max-w-[1440px] px-4 pt-14 pb-12 sm:px-6 md:pt-20 lg:px-12">
          <div className="mx-auto max-w-5xl text-center">
            <p className="eyebrow mb-6">The global network for companies & culture</p>
            <h1 className="display text-[clamp(2.5rem,8vw,6rem)] leading-[1.02]">
              Discover the companies and creators <span className="text-gold">shaping</span> what&rsquo;s next.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] text-muted">
              Verified businesses, artists, galleries and acquisition opportunities across {countries.length} countries — curated like a collection, searchable like an index.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/companies" className="btn btn-outline">
                Explore the directory
              </Link>
              <Link href="/advertise" className="btn btn-solid">
                Advertise with PATRONOS
              </Link>
            </div>
            <div className="mt-8 flex justify-center">
              <LivePill event={liveEvent ? { name: liveEvent.name, place: liveEvent.city?.name ?? liveEvent.country.name } : null} />
            </div>
          </div>

          <div className="mt-12 lg:mt-6">
            <NeuralNetwork node={<HeroSearch idPrefix="hero" options={options} />} nodeMobile={<HeroSearch idPrefix="hero-m" options={options} />} satellites={satellites} />
          </div>
        </div>
      </section>

      {/* ───────── Curated shelves ───────── */}
      <Shelf eyebrow={companyShelf.eyebrow} title={companyShelf.title} href="/companies" empty={companyShelf.items.length === 0 && sponsored.length === 0}>
        {sponsored[0]?.targetCompany && <SponsoredCompanyCard headline={sponsored[0].headline} body={sponsored[0].body} company={sponsored[0].targetCompany} />}
        {companyShelf.items.slice(0, 5).map((c) => (
          <CompanyCard key={c.id} c={c} layout="shelf" />
        ))}
        {sponsored[1]?.targetCompany && <SponsoredCompanyCard headline={sponsored[1].headline} body={sponsored[1].body} company={sponsored[1].targetCompany} />}
        {companyShelf.items.slice(5).map((c) => (
          <CompanyCard key={c.id} c={c} layout="shelf" />
        ))}
      </Shelf>

      <Shelf eyebrow="Collaborations" title="Open to collaboration" href="/collaborations" empty={openCompanies.length + openArtists.length === 0}>
        {openArtists.slice(0, 3).map((a) => (
          <ArtistCard key={a.id} a={a} />
        ))}
        {openCompanies.map((c) => (
          <CompanyCard key={c.id} c={c} layout="shelf" />
        ))}
        {openArtists.slice(3).map((a) => (
          <ArtistCard key={a.id} a={a} />
        ))}
      </Shelf>

      <Shelf eyebrow="Art" title="Featured artworks" href="/art" empty={artworks.length === 0}>
        {artworks.map((a) => (
          <div key={a.id} className="self-end">
            <ArtworkCard a={a} />
          </div>
        ))}
      </Shelf>

      <Shelf eyebrow="Acquisitions" title="Acquisition opportunities" href="/acquisitions" empty={acquisitions.length === 0}>
        {acquisitions.map((a) => (
          <AcquisitionCard key={a.id} a={publicAcquisition(a)} />
        ))}
      </Shelf>

      <Shelf eyebrow="Galleries" title="Galleries to follow" href="/galleries" empty={galleries.length === 0}>
        {galleries.map((g, i) => (
          <article key={g.slug} className="glass card-hover relative flex w-[280px] flex-col gap-4 overflow-hidden p-0">
            <div className="h-[140px] overflow-hidden">
              <GenerativeArt seed={400 + i * 13} ratio={2} title={`${g.name} exhibition view`} />
            </div>
            <div className="px-5 pb-5">
              <h3 className="display text-[21px]">
                <Link href={`/galleries#${g.slug}`} className="after:absolute after:inset-0">
                  {g.name}
                </Link>
              </h3>
              <p className="mt-1 text-[13px] text-muted">
                {g.city?.name}, {g.country.name}
              </p>
              <p className="nums mt-3 text-[12px] tracking-[0.14em] text-gold-light uppercase">
                {g._count.artists} artists · {g._count.artworks} works
              </p>
            </div>
          </article>
        ))}
      </Shelf>

      {/* ───────── Four pillars ───────── */}
      <section aria-labelledby="pillars" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-12">
        <Reveal>
          <p className="eyebrow mb-2">One network</p>
          <h2 id="pillars" className="display max-w-2xl text-[2.25rem] sm:text-[2.75rem]">
            Four ways in.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 60}>
              <article className="glass group relative h-full p-7 transition-[border-color] duration-300 hover:border-[var(--border-strong)]">
                <div className="grid size-12 place-items-center rounded-xl bg-[var(--gold-tint)] text-gold transition-transform duration-300 group-hover:scale-110">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={p.icon} />
                  </svg>
                </div>
                <h3 className="mt-6 text-[20px] font-bold">{p.title}</h3>
                <p className="mt-2 text-[14px] text-muted">{p.body}</p>
                <Link href={p.href} className="link-gold mt-5 inline-block text-[12px] tracking-[0.18em] uppercase after:absolute after:inset-0">
                  Explore →
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── Explore by country ───────── */}
      <section aria-labelledby="countries" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-2">Discover</p>
            <h2 id="countries" className="display text-[2.25rem] sm:text-[2.75rem]">
              Explore by country
            </h2>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Filter by region">
            {Object.entries(MACRO_LABEL).map(([k, label]) => (
              <li key={k}>
                <Link href={`/discover?region=${k}`} className="chip border border-white/15 !py-2 text-muted transition-colors hover:border-[var(--gold)] hover:text-gold-hover">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-[24px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {topCountries.map((c) => (
            <li key={c.slug} className="bg-bg">
              <Link href={`/discover/${c.slug}`} className="group relative block p-7 transition-colors duration-300 hover:bg-white/[0.02]">
                <span className="display block text-[28px] text-ink transition-colors group-hover:text-gold-hover">{c.name}</span>
                <span className="nums mt-2 block text-[13px] text-muted">
                  {c._count.companies} companies · {c._count.artists} artists
                </span>
                <span aria-hidden="true" className="absolute bottom-0 left-7 h-px w-0 bg-gold transition-[width] duration-500 group-hover:w-[calc(100%-56px)]" />
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/discover" className="link-gold mt-6 inline-block text-[12px] tracking-[0.2em] uppercase">
          All {countries.length} countries →
        </Link>
      </section>

      {/* ───────── Spotlight calendar ───────── */}
      <section aria-labelledby="spotlight" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-12">
        <p className="eyebrow mb-2">Spotlight calendar</p>
        <h2 id="spotlight" className="display text-[2.25rem] sm:text-[2.75rem]">
          Coming up on PATRONOS
        </h2>
        <div className="shelf-track mt-8 pb-2" role="region" aria-label="Upcoming spotlights" tabIndex={0}>
          {spotlights.map((s) => (
            <article key={s.id} className="panel flex w-[260px] gap-4 p-5">
              <div className="flex w-14 shrink-0 flex-col items-center border-r border-white/10 pr-4">
                <span className="display nums text-[34px] leading-none">{s.startsAt.getUTCDate()}</span>
                <span className="eyebrow mt-1">{s.startsAt.toLocaleString("en", { month: "short", timeZone: "UTC" })}</span>
              </div>
              <div className="min-w-0">
                <span className="chip bg-[var(--gold-tint)] text-gold">Sponsored</span>
                <p className="mt-2 truncate text-[15px] font-semibold">{s.company ? <Link href={`/companies/${s.company.slug}`}>{s.company.name}</Link> : s.name}</p>
                <p className="text-[13px] text-muted">{s.placement.name}</p>
                {s.isDemo && <p className="mt-1 text-[11px] tracking-[0.16em] text-faint uppercase">Demo booking</p>}
              </div>
            </article>
          ))}
          <Link href="/advertise" className="glass card-hover flex w-[240px] flex-col justify-center p-6" style={{ borderColor: "var(--gold-line)" }}>
            <span className="display text-[22px] text-gold-hover">Book a spotlight</span>
            <span className="mt-2 text-[13px] text-muted">Fixed-price placements, approved by our moderators.</span>
          </Link>
        </div>
      </section>

      {/* ───────── Featured creators ───────── */}
      {featuredCreators.length > 0 && (
        <section aria-labelledby="creators" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-12">
          <p className="eyebrow mb-2">Featured creators</p>
          <h2 id="creators" className="display text-[2.25rem] sm:text-[2.75rem]">
            In the studio
          </h2>
          <div className="mt-10 grid max-w-[1100px] gap-10 md:grid-cols-2">
            {featuredCreators.map((a, i) => (
              <Reveal key={a.id} delay={i * 80}>
                <ArtistCard a={a} size="feature" />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ───────── Journal ───────── */}
      <section aria-labelledby="journal" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">Journal</p>
            <h2 id="journal" className="display text-[2.25rem] sm:text-[2.75rem]">
              Notes from the network
            </h2>
          </div>
          <Link href="/journal" className="link-gold hidden text-[12px] tracking-[0.2em] uppercase sm:inline">
            All stories →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {ARTICLES.slice(0, 1).map((a) => (
            <JournalCard key={a.slug} a={a} large />
          ))}
          <div className="grid gap-6">
            {ARTICLES.slice(1, 3).map((a) => (
              <JournalCard key={a.slug} a={a} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function JournalCard({ a, large = false }: { a: (typeof ARTICLES)[number]; large?: boolean }) {
  return (
    <article className={`group glass relative overflow-hidden p-0 ${large ? "" : "sm:flex"}`}>
      <div className={`overflow-hidden ${large ? "aspect-[16/9]" : "aspect-[16/9] sm:aspect-auto sm:w-[40%] sm:shrink-0"}`}>
        <div className="editorial-image h-full">
          <GenerativeArt seed={a.hue * 3 + 7} ratio={large ? 1.78 : 1.2} title={a.title} decorativeCover />
        </div>
      </div>
      <div className="p-6 sm:p-7">
        <p className="eyebrow">{a.category}</p>
        <h3 className={`display mt-3 leading-tight ${large ? "text-[2rem]" : "text-[24px]"}`}>
          <Link href={`/journal/${a.slug}`} className="after:absolute after:inset-0">
            {a.title}
          </Link>
        </h3>
        <p className="mt-3 text-[14px] text-muted">{a.dek}</p>
        <p className="mt-4 text-[12px] text-faint">{a.readMinutes} min read</p>
      </div>
    </article>
  );
}

const PILLARS = [
  { title: "Verified Companies", href: "/companies", body: "Profiles with clear verification states, from early-stage startups to established enterprises in every region.", icon: "M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Zm-3 9 2 2 4-4" },
  { title: "Artists & Galleries", href: "/artists", body: "Painters, sculptors, studios and galleries — their work shown in true colour, never cropped.", icon: "M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5" },
  { title: "Collaborations", href: "/collaborations", body: "Find artists and studios open to commissions, campaigns and brand partnerships.", icon: "M8 12h8M12 8v8M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0" },
  { title: "Acquisitions", href: "/acquisitions", body: "Discreet listings of businesses for sale. Financial details are shared privately, never published.", icon: "M4 7h16v12H4zM9 7V5h6v2M4 12h16" },
];
