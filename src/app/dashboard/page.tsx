import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { signOut } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const STATUS_STYLE = { PENDING: "text-gold-light border-[var(--gold-line)]", APPROVED: "text-success border-success/40", REJECTED: "text-danger border-danger/40" } as const;

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard");
  const [claims, inquiries, companies] = await Promise.all([
    db.companyClaim.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, createdAt: true, reviewNote: true, company: { select: { name: true, slug: true } } } }),
    db.inquiry.findMany({ where: { senderId: user.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, status: true, createdAt: true, artwork: { select: { title: true, slug: true } } } }),
    db.companyMember.findMany({ where: { userId: user.id }, select: { role: true, company: { select: { name: true, slug: true, verificationStatus: true } } } }),
  ]);
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="display mt-2 text-[3rem]">{user.displayName}</h1>
          <p className="mt-1 text-[14px] text-muted">{user.email} · {user.roles.join(", ")}{user.isDemo && " · demo account"}</p>
        </div>
        <form action={signOut}><button className="btn btn-outline">Sign out</button></form>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <section className="panel p-6" aria-labelledby="d-companies">
          <h2 id="d-companies" className="eyebrow mb-4">Your companies</h2>
          {companies.length === 0 ? <p className="text-[14px] text-muted">None yet. <Link href="/list-your-company" className="link-gold">Claim your company</Link>.</p> : (
            <ul className="space-y-2">{companies.map((m) => <li key={m.company.slug} className="flex justify-between text-[14px]"><Link href={`/companies/${m.company.slug}`} className="hover:text-gold-hover">{m.company.name}</Link><span className="text-faint">{m.role.toLowerCase()} · {m.company.verificationStatus.toLowerCase()}</span></li>)}</ul>
          )}
        </section>
        <section className="panel p-6" aria-labelledby="d-claims">
          <h2 id="d-claims" className="eyebrow mb-4">Claims</h2>
          {claims.length === 0 ? <p className="text-[14px] text-muted">No claims submitted.</p> : (
            <ul className="space-y-3">{claims.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 text-[14px]">
                <span><Link href={`/companies/${c.company.slug}`} className="hover:text-gold-hover">{c.company.name}</Link>{c.reviewNote && <span className="block text-[12px] text-faint">{c.reviewNote}</span>}</span>
                <span className={`chip border ${STATUS_STYLE[c.status]}`}>{c.status.toLowerCase()}</span>
              </li>
            ))}</ul>
          )}
        </section>
        <section className="panel p-6 md:col-span-2" aria-labelledby="d-inq">
          <h2 id="d-inq" className="eyebrow mb-4">Inquiries sent</h2>
          {inquiries.length === 0 ? <p className="text-[14px] text-muted">No inquiries yet. Browse <Link href="/art" className="link-gold">art</Link>.</p> : (
            <ul className="divide-y divide-white/[0.06]">{inquiries.map((i) => (
              <li key={i.id} className="flex justify-between py-2.5 text-[14px]">
                <span>{i.artwork ? <Link href={`/art/${i.artwork.slug}`} className="hover:text-gold-hover">{i.artwork.title}</Link> : "Inquiry"}</span>
                <span className="text-faint">{i.status.toLowerCase()} · {i.createdAt.toLocaleDateString("en")}</span>
              </li>
            ))}</ul>
          )}
        </section>
        <section className="panel p-6 md:col-span-2" aria-labelledby="d-privacy">
          <h2 id="d-privacy" className="eyebrow mb-3">Privacy</h2>
          <p className="text-[14px] text-muted">Self-serve data export and account deletion arrive in the next release. Until then, see the <Link href="/legal/privacy" className="link-gold">privacy notice</Link>.</p>
        </section>
      </div>
    </div>
  );
}
