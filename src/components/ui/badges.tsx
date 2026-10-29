import type { CollaborationAvailability, VerificationStatus } from "@prisma/client";

const fmtDate = (d: Date) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(d);

export function VerificationBadge({ status, verifiedAt, isDemo }: { status: VerificationStatus; verifiedAt?: Date | null; isDemo?: boolean }) {
  if (isDemo) return <DemoBadge />;
  if (status === "VERIFIED") {
    const tip = verifiedAt ? `Verified by PATRONOS on ${fmtDate(verifiedAt)}` : "Verified by PATRONOS";
    return (
      <span className="chip border border-[var(--gold-line)] text-success" title={tip}>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6.5 4.8 9 10 3.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Verified
        <span className="sr-only">. {tip}</span>
      </span>
    );
  }
  if (status === "CLAIMED") {
    return (
      <span className="chip border border-[var(--gold-line)] text-gold-light" title="Claimed by a representative; not yet verified by PATRONOS">
        Claimed
      </span>
    );
  }
  return (
    <span className="chip border border-white/15 text-faint" title="Not yet claimed or verified">
      Unverified
    </span>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`chip bg-[var(--gold-tint)] text-gold-light ${className}`} title="Fictional sample data for demonstration — not a real entity">
      Demo
      <span className="sr-only"> — fictional sample data</span>
    </span>
  );
}

export function SponsoredLabel({ className = "" }: { className?: string }) {
  return (
    <span className={`chip bg-[var(--gold-tint)] text-gold ${className}`}>
      <span aria-hidden="true">Sponsored</span>
      <span className="sr-only">Sponsored listing</span>
    </span>
  );
}

const COLLAB_LABEL: Record<CollaborationAvailability, string> = {
  OPEN: "Open to collaboration",
  SELECTIVE: "Selective collaborations",
  CLOSED: "Not collaborating",
};

export function CollabChip({ value }: { value: CollaborationAvailability }) {
  if (value === "CLOSED") return null;
  return (
    <span className={`chip border ${value === "OPEN" ? "border-[var(--gold-line)] text-gold-hover" : "border-white/15 text-muted"}`}>
      {value === "OPEN" && <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-gold-hover" />}
      {COLLAB_LABEL[value]}
    </span>
  );
}

export function DemoBanner({ label = "DEMO — fictional sample data. This profile does not represent a real organisation." }: { label?: string }) {
  return (
    <div role="note" className="border-y border-[var(--gold-line)] bg-[var(--gold-tint)] px-6 py-2.5 text-center text-[12px] tracking-[0.14em] text-gold-light uppercase">
      {label}
    </div>
  );
}

export function LivePill({ event }: { event: { name: string; place: string } | null }) {
  if (!event) {
    return (
      <div className="glass inline-flex items-center gap-3 rounded-full px-4 py-2" style={{ borderRadius: 9999 }}>
        <span aria-hidden="true" className="size-2 rounded-full bg-gold" />
        <span className="text-[11px] font-bold tracking-[0.2em] text-gold-light uppercase">Demo</span>
        <span className="text-[12px] text-ink">Exploring with sample data · real listings coming soon</span>
      </div>
    );
  }
  return (
    <div className="glass inline-flex items-center gap-3 rounded-full px-4 py-2" style={{ borderRadius: 9999 }} role="status">
      <span aria-hidden="true" className="live-dot size-2 rounded-full bg-success" />
      <span className="text-[11px] font-bold tracking-[0.2em] text-success uppercase">Live</span>
      <span className="text-[12px] text-ink">
        New verified company · {event.name}, {event.place}
      </span>
    </div>
  );
}
