import Link from "next/link";
import type { AcquisitionCard as AcqT, ArtistCard as ArtistT, ArtworkCard as ArtworkT, CompanyCard as CompanyT } from "@/lib/queries/public";
import { GenerativeArt } from "./art/GenerativeArt";
import { AbstractPortrait, Monogram } from "./art/Monogram";
import { CollabChip, DemoBadge, SponsoredLabel, VerificationBadge } from "./ui/badges";

const CATEGORY_LABEL: Record<string, string> = {
  STARTUP: "Startup",
  SME: "SME",
  ENTERPRISE: "Enterprise",
  CREATIVE_STUDIO: "Creative studio",
  NONPROFIT: "Non-profit",
};

const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: "Available",
  ON_REQUEST: "Price on request",
  SOLD: "Sold",
  NOT_FOR_SALE: "Not for sale",
};

export function CompanyCard({ c, sponsored = false, layout = "grid" }: { c: CompanyT; sponsored?: boolean; layout?: "grid" | "list" | "shelf" }) {
  const place = [c.city?.name, c.country.name].filter(Boolean).join(", ");
  if (layout === "list") {
    return (
      <article className="panel card-hover relative flex items-center gap-4 p-4 sm:gap-6 sm:p-5">
        <Monogram name={c.name} hue={c.logoHue} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold">
            <Link href={`/companies/${c.slug}`} className="after:absolute after:inset-0">
              {c.name}
            </Link>
          </h3>
          <p className="truncate text-[14px] text-muted">{c.tagline}</p>
        </div>
        <div className="hidden flex-col items-end gap-2 text-right md:flex">
          <span className="text-[13px] text-muted">{place}</span>
          <span className="text-[12px] text-faint">{c.industry.name}</span>
        </div>
        <div className="relative z-10 flex shrink-0 flex-col items-end gap-1.5">
          {sponsored && <SponsoredLabel />}
          <VerificationBadge status={c.verificationStatus} verifiedAt={c.verifiedAt} isDemo={c.isDemo} />
        </div>
      </article>
    );
  }
  return (
    <article className={`glass card-hover group relative flex flex-col gap-4 p-6 ${layout === "shelf" ? "w-[280px] sm:w-[300px]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <Monogram name={c.name} hue={c.logoHue} />
        <div className="flex flex-col items-end gap-1.5">
          {sponsored && <SponsoredLabel />}
          <VerificationBadge status={c.verificationStatus} verifiedAt={c.verifiedAt} isDemo={c.isDemo} />
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="text-[19px] leading-snug font-semibold">
          <Link href={`/companies/${c.slug}`} className="after:absolute after:inset-0 after:rounded-[24px]">
            {c.name}
          </Link>
        </h3>
        {c.tagline && <p className="mt-1.5 line-clamp-2 text-[14px] text-muted">{c.tagline}</p>}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.07] pt-4 text-[13px] text-muted">
        <span>{place}</span>
        <span aria-hidden="true" className="text-faint">·</span>
        <span>{c.industry.name}</span>
        <span aria-hidden="true" className="text-faint">·</span>
        <span>{CATEGORY_LABEL[c.category]}</span>
      </div>
      {c.collaboration !== "CLOSED" && (
        <div>
          <CollabChip value={c.collaboration} />
        </div>
      )}
    </article>
  );
}

export function ArtworkCard({ a, width = "shelf" }: { a: ArtworkT; width?: "shelf" | "fluid" }) {
  return (
    <article className={`group relative ${width === "shelf" ? "w-[240px] sm:w-[280px]" : "w-full"}`}>
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-elevated transition-[box-shadow,transform] duration-700 group-hover:shadow-[var(--glow-card)]">
        {/* Artworks: true colour, true ratio — never cropped or desaturated */}
        <GenerativeArt seed={a.generativeSeed ?? 1} ratio={a.aspectRatio} title={a.title} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="display truncate text-[18px]">
            <Link href={`/art/${a.slug}`} className="after:absolute after:inset-0">
              {a.title}
            </Link>
          </h3>
          <p className="truncate text-[13px] text-muted">
            {a.artist.name}
            {a.year ? `, ${a.year}` : ""}
          </p>
        </div>
        {a.isDemo && <DemoBadge className="relative z-10 shrink-0" />}
      </div>
      <p className="mt-1 text-[12px] tracking-[0.12em] text-gold-light uppercase">{AVAILABILITY_LABEL[a.availability]}</p>
    </article>
  );
}

export function ArtistCard({ a, size = "shelf" }: { a: ArtistT; size?: "shelf" | "feature" }) {
  return (
    <article className={`group relative ${size === "shelf" ? "w-[220px] sm:w-[240px]" : "w-full"}`}>
      <div className="overflow-hidden rounded-[20px] border border-white/10">
        {/* Portrait (decorative) — grayscale → colour on hover is allowed for portraits only */}
        <AbstractPortrait name={a.name} hue={a.portraitHue} className="editorial-image" />
      </div>
      <div className="mt-4">
        <h3 className={`display ${size === "feature" ? "text-[2rem]" : "text-[21px]"}`}>
          <Link href={`/artists/${a.slug}`} className="after:absolute after:inset-0">
            {a.name}
          </Link>
        </h3>
        <p className="mt-1 text-[11px] font-light tracking-[0.28em] text-gold uppercase">
          {a.discipline} · {a.city?.name ?? a.country.name}
        </p>
        <div className="relative z-10 mt-3 flex flex-wrap gap-2">
          {a.isDemo && <DemoBadge />}
          <CollabChip value={a.collaboration} />
        </div>
      </div>
    </article>
  );
}

export function AcquisitionCard({ a, layout = "shelf" }: { a: AcqT; layout?: "shelf" | "grid" }) {
  return (
    <article className={`glass card-hover relative flex flex-col gap-3 p-6 ${layout === "shelf" ? "w-[300px] sm:w-[340px]" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{a.industry.name}</span>
        {a.isDemo && <DemoBadge />}
      </div>
      <h3 className="display text-[22px] leading-tight">
        <Link href={`/acquisitions/${a.slug}`} className="after:absolute after:inset-0 after:rounded-[24px]">
          {a.headline}
        </Link>
      </h3>
      <p className="line-clamp-3 text-[14px] text-muted">{a.summary}</p>
      <div className="mt-auto flex flex-wrap gap-x-3 border-t border-white/[0.07] pt-3 text-[13px] text-muted">
        <span>{[a.region?.name, a.country.name].filter(Boolean).join(", ")}</span>
        {a.revenueRange && (
          <>
            <span aria-hidden="true" className="text-faint">·</span>
            <span className="nums">Revenue {a.revenueRange}</span>
          </>
        )}
      </div>
    </article>
  );
}

export function SponsoredCompanyCard({ headline, body, company }: { headline: string; body: string | null; company: CompanyT }) {
  return (
    <article className="glass card-hover relative flex w-[300px] flex-col gap-4 border-[var(--gold-line)] p-6 sm:w-[320px]" style={{ borderColor: "var(--gold-line)" }}>
      <div className="flex items-start justify-between">
        <SponsoredLabel />
        {company.isDemo && <DemoBadge />}
      </div>
      <div className="flex items-center gap-3">
        <Monogram name={company.name} hue={company.logoHue} size={44} />
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-semibold">
            <Link href={`/companies/${company.slug}`} className="after:absolute after:inset-0 after:rounded-[24px]">
              {company.name}
            </Link>
          </h3>
          <p className="text-[13px] text-muted">{company.country.name}</p>
        </div>
      </div>
      <p className="display text-[20px] leading-snug text-gold-hover">{headline}</p>
      {body && <p className="text-[14px] text-muted">{body}</p>}
    </article>
  );
}
