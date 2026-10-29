import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompany, relatedCompanies, publicAcquisition } from "@/lib/queries/public";
import { getSessionUser } from "@/lib/auth/session";
import { Monogram } from "@/components/art/Monogram";
import { GenerativeArt } from "@/components/art/GenerativeArt";
import { CollabChip, DemoBanner, VerificationBadge } from "@/components/ui/badges";
import { AcquisitionCard, CompanyCard } from "@/components/cards";
import { Shelf } from "@/components/ui/Shelf";
import { ClaimForm } from "@/components/forms/ClaimForm";
import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

const CATEGORY = { STARTUP: "Startup", SME: "SME", ENTERPRISE: "Enterprise", CREATIVE_STUDIO: "Creative studio", NONPROFIT: "Non-profit" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCompany((await params).slug);
  if (!c) return { title: "Company not found" };
  return {
    title: c.name,
    description: c.tagline ?? undefined,
    alternates: { canonical: `/companies/${c.slug}` },
    robots: c.isDemo ? { index: false, follow: true } : undefined,
    openGraph: { title: c.name, description: c.tagline ?? undefined, type: "profile" },
  };
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCompany(slug);
  if (!c) notFound();
  const [user, related] = await Promise.all([getSessionUser(), relatedCompanies(c.id, c.industry.slug, c.country.slug)]);
  const pendingClaim = user ? await db.companyClaim.findFirst({ where: { companyId: c.id, userId: user.id, status: "PENDING" }, select: { id: true } }) : null;
  const canClaim = !c.isDemo && c._count.members === 0;
  const place = [c.city?.name, c.region?.name, c.country.name].filter(Boolean).join(", ");
  const acquisition = c.acquisitions[0] ? publicAcquisition(c.acquisitions[0]) : null;

  const jsonLd = !c.isDemo
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: c.name,
        description: c.tagline ?? undefined,
        url: c.website ?? undefined,
        foundingDate: c.foundedYear ? String(c.foundedYear) : undefined,
        address: { "@type": "PostalAddress", addressLocality: c.city?.name, addressCountry: c.country.iso2 },
      }
    : null;

  return (
    <article>
      {c.isDemo && <DemoBanner />}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}

      {/* Editorial cover (decorative; grayscale → colour on hover is allowed for non-artwork imagery) */}
      <div className="group relative h-[200px] overflow-hidden border-b border-white/10 sm:h-[280px]">
        <div className="editorial-image absolute inset-0 opacity-60">
          <GenerativeArt seed={(c.logoHue ?? 3) * 11 + c.name.length} ratio={4} title={`${c.name} cover`} decorativeCover />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[rgba(10,10,10,0.2)] via-[rgba(10,10,10,0.45)] to-bg" />
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
        <header className="relative">
          <Monogram name={c.name} hue={c.logoHue} size={104} className="relative -mt-14 ring-4 ring-bg" />
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <nav aria-label="Breadcrumb" className="mb-2 text-[12px] tracking-[0.14em] text-faint uppercase">
                <Link href="/companies" className="hover:text-ink">Companies</Link> <span aria-hidden="true">/</span>{" "}
                <Link href={`/discover/${c.country.slug}`} className="hover:text-ink">{c.country.name}</Link>
              </nav>
              <h1 className="display text-[clamp(2.25rem,5vw,3.75rem)]">{c.name}</h1>
              {c.tagline && <p className="mt-2 max-w-2xl text-[17px] text-muted">{c.tagline}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <VerificationBadge status={c.verificationStatus} verifiedAt={c.verifiedAt} isDemo={c.isDemo} />
              <CollabChip value={c.collaboration} />
            </div>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/industries/${c.industry.slug}`} className="chip border border-white/15 !py-1.5 text-muted hover:text-ink">{c.industry.name}</Link>
          {c.tags.map(({ tag }) => (
            <span key={tag.slug} className="chip border border-white/10 !py-1.5 text-faint">{tag.name}</span>
          ))}
        </div>

        <nav aria-label="Profile sections" className="sticky top-16 z-20 mt-10 -mx-4 border-b border-white/10 bg-[rgba(10,10,10,0.85)] px-4 backdrop-blur-[10px] sm:mx-0 sm:px-0 lg:top-[72px]">
          <ul className="flex gap-7 overflow-x-auto text-[12px] tracking-[0.18em] uppercase">
            {[["overview", "Overview"], ["services", "Products & services"], ["collaborations", "Collaborations"], ["media", "Media"], ...(acquisition ? [["acquisition", "Acquisition"]] : [])].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block border-b-2 border-transparent py-4 text-muted hover:border-[var(--gold)] hover:text-ink">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-14">
            <section id="overview" aria-labelledby="h-overview" className="scroll-mt-40">
              <h2 id="h-overview" className="display text-[30px]">Overview</h2>
              <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-ink/90">{c.description}</p>
              <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-white/10 bg-white/10 sm:grid-cols-4">
                {[["Location", place], ["Founded", c.foundedYear ? String(c.foundedYear) : "—"], ["Team", c.employeeRange ?? "—"], ["Category", CATEGORY[c.category]]].map(([k, v]) => (
                  <div key={k} className="bg-bg p-5">
                    <dt className="eyebrow">{k}</dt>
                    <dd className="nums mt-2 text-[15px]">{v}</dd>
                  </div>
                ))}
              </dl>
              {c.website && (
                <p className="mt-6">
                  <a href={c.website} rel="noopener noreferrer nofollow" target="_blank" className="link-gold text-[14px]">Visit website ↗</a>
                </p>
              )}
            </section>

            <section id="services" aria-labelledby="h-services" className="scroll-mt-40">
              <h2 id="h-services" className="display text-[30px]">Products & services</h2>
              <p className="mt-4 text-muted">{c._count.members > 0 ? "The company hasn't published its products and services yet." : "Products and services appear here once a representative claims this profile."}</p>
            </section>

            <section id="collaborations" aria-labelledby="h-collab" className="scroll-mt-40">
              <h2 id="h-collab" className="display text-[30px]">Collaborations</h2>
              <p className="mt-4 text-muted">
                {c.collaboration === "OPEN" ? `${c.name} is open to collaborations with artists, studios and other companies.` : c.collaboration === "SELECTIVE" ? `${c.name} considers selected collaborations.` : `${c.name} is not currently seeking collaborations.`}
              </p>
            </section>

            <section id="media" aria-labelledby="h-media" className="scroll-mt-40">
              <h2 id="h-media" className="display text-[30px]">Media</h2>
              <p className="mt-4 text-muted">No press or media has been added yet.</p>
            </section>

            {acquisition && (
              <section id="acquisition" aria-labelledby="h-acq" className="scroll-mt-40">
                <h2 id="h-acq" className="display text-[30px]">Acquisition</h2>
                <div className="mt-5 max-w-md">
                  <AcquisitionCard a={acquisition} layout="grid" />
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-[150px] lg:self-start" aria-label="Actions">
            <div className="glass p-6">
              <p className="eyebrow">Collaborate</p>
              <p className="mt-3 text-[14px] text-muted">Direct collaboration requests open in the next release. Until then, use the company&rsquo;s website.</p>
              <button type="button" disabled className="btn btn-outline mt-4 w-full">Request collaboration</button>
            </div>
            <div className="glass p-6">
              <p className="eyebrow mb-3">Claim this company</p>
              {c.isDemo ? (
                <p className="text-[14px] text-muted">This is a fictional demo profile, so it can&rsquo;t be claimed.</p>
              ) : !canClaim ? (
                <p className="text-[14px] text-muted">This profile is managed by the company.</p>
              ) : pendingClaim ? (
                <p role="status" className="text-[14px] text-gold-hover">Your claim is pending review. Track it on your <Link href="/dashboard" className="underline">dashboard</Link>.</p>
              ) : user ? (
                <ClaimForm companyId={c.id} companyName={c.name} />
              ) : (
                <>
                  <p className="text-[14px] text-muted">Sign in to claim and manage this profile.</p>
                  <Link href={`/sign-in?next=/companies/${c.slug}`} className="btn btn-solid mt-4 w-full">Sign in to claim</Link>
                </>
              )}
            </div>
            <p className="px-2 text-[12px] text-faint">
              Source: {c.dataSource.kind === "DEMO" ? "PATRONOS demo seed (fictional)" : c.dataSource.name}. Last updated {c.updatedAt.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}.{" "}
              <Link href={`/report?entity=company&id=${c.id}`} className="underline hover:text-ink">Report</Link>
            </p>
          </aside>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <Shelf eyebrow="Related" title={`More in ${c.industry.name} & ${c.country.name}`} href={`/industries/${c.industry.slug}`}>
            {related.map((r) => (
              <CompanyCard key={r.id} c={r} layout="shelf" />
            ))}
          </Shelf>
        </div>
      )}
    </article>
  );
}
