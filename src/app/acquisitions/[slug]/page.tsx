import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAcquisition } from "@/lib/queries/public";
import { getSessionUser } from "@/lib/auth/session";
import { DemoBanner } from "@/components/ui/badges";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getAcquisition((await params).slug);
  return a ? { title: a.headline, robots: a.isDemo ? { index: false } : undefined } : { title: "Listing not found" };
}

export default async function AcquisitionPage({ params }: Props) {
  const a = await getAcquisition((await params).slug);
  if (!a) notFound();
  const user = await getSessionUser();
  return (
    <article>
      {a.isDemo && <DemoBanner label="DEMO — fictional acquisition listing." />}
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-12">
        <div>
          <nav aria-label="Breadcrumb" className="mb-6 text-[12px] tracking-[0.14em] text-faint uppercase">
            <Link href="/acquisitions" className="hover:text-ink">Acquisitions</Link>
          </nav>
          <p className="eyebrow">{a.industry.name} · {[a.region?.name, a.country.name].filter(Boolean).join(", ")}</p>
          <h1 className="display mt-3 text-[clamp(2.25rem,5vw,3.75rem)] leading-tight">{a.headline}</h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink/90">{a.summary}</p>
          <dl className="mt-10 grid gap-px overflow-hidden rounded-[20px] border border-white/10 bg-white/10 sm:grid-cols-3">
            {[["Status", "Open to offers"], ["Revenue", a.revenueRange ?? "Shared privately"], ["Reason for sale", a.reasonForSale ?? "—"]].map(([k, v]) => (
              <div key={k} className="bg-bg p-5">
                <dt className="eyebrow">{k}</dt>
                <dd className="nums mt-2 text-[15px]">{v}</dd>
              </div>
            ))}
          </dl>
          {a.company && (
            <p className="mt-6 text-[14px] text-muted">Company profile: <Link href={`/companies/${a.company.slug}`} className="link-gold">{a.company.name}</Link></p>
          )}
        </div>
        <aside className="glass h-fit p-6 lg:sticky lg:top-[100px]">
          <p className="eyebrow">Request information</p>
          <p className="mt-3 text-[14px] text-muted">
            Information requests open in the next release. They will be gated (signed-in, bot-checked) and the owner decides what to share.
          </p>
          {!user && <Link href={`/sign-in?next=/acquisitions/${a.slug}`} className="btn btn-outline mt-4 w-full">Sign in</Link>}
          <p className="mt-6 border-t border-white/10 pt-4 text-[12px] text-faint">PATRONOS does not verify financial information, act as a broker, or hold funds. Seek independent advice before any transaction.</p>
        </aside>
      </div>
    </article>
  );
}
