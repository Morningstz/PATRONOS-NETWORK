import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/auth/session";
import { reviewClaim } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Claims" };

export default async function ClaimsQueue({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePageAccess("moderation:claims", "/admin/claims");
  const requested = (await searchParams).status;
  const status = (["PENDING", "APPROVED", "REJECTED"] as const).find((s) => s === requested) ?? "PENDING";
  const claims = await db.companyClaim.findMany({
    where: { status },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    take: 100,
    select: {
      id: true, workEmail: true, roleTitle: true, message: true, createdAt: true, reviewNote: true, reviewedAt: true,
      user: { select: { email: true, profile: { select: { displayName: true } } } },
      company: { select: { name: true, slug: true, website: true, isDemo: true } },
      reviewedBy: { select: { email: true } },
    },
  });
  return (
    <div>
      <h1 className="display text-[2.5rem]">Company claims</h1>
      <nav aria-label="Claim status" className="mt-5 flex gap-2">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <Link key={s} href={`/admin/claims?status=${s}`} aria-current={s === status ? "page" : undefined} className={`chip border !py-1.5 ${s === status ? "border-[var(--gold)] text-gold-hover" : "border-white/15 text-muted"}`}>{s.toLowerCase()}</Link>
        ))}
      </nav>
      {claims.length === 0 ? <p className="panel mt-6 p-8 text-center text-muted">Queue is empty.</p> : (
        <div className="panel mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-[14px]">
            <caption className="sr-only">{status.toLowerCase()} claims</caption>
            <thead className="border-b border-white/10 text-[11px] tracking-[0.16em] text-gold-light uppercase">
              <tr><th scope="col" className="p-4">Company</th><th scope="col" className="p-4">Claimant</th><th scope="col" className="p-4">Evidence</th><th scope="col" className="p-4">Submitted</th><th scope="col" className="p-4">{status === "PENDING" ? "Decision" : "Review"}</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {claims.map((c) => {
                const domainMatch = c.company.website ? c.workEmail.endsWith("@" + new URL(c.company.website).hostname.replace(/^www\./, "")) : null;
                return (
                  <tr key={c.id} className="align-top">
                    <td className="p-4"><Link href={`/companies/${c.company.slug}`} className="hover:text-gold-hover">{c.company.name}</Link>{c.company.isDemo && <span className="ml-2 text-[11px] text-gold-light uppercase">demo</span>}</td>
                    <td className="p-4">{c.user.profile?.displayName}<span className="block text-[12px] text-faint">{c.user.email}</span></td>
                    <td className="p-4">{c.workEmail}<span className="block text-[12px] text-faint">{c.roleTitle}</span>{domainMatch !== null && <span className={`block text-[12px] ${domainMatch ? "text-success" : "text-danger"}`}>{domainMatch ? "Email domain matches website" : "Email domain does not match website"}</span>}{c.message && <span className="mt-1 block max-w-xs text-[12px] text-muted">“{c.message}”</span>}</td>
                    <td className="nums p-4 text-muted">{c.createdAt.toLocaleDateString("en")}</td>
                    <td className="p-4">
                      {status === "PENDING" ? (
                        <div className="flex flex-col gap-2">
                          <ActionForm action={reviewClaim} fields={{ claimId: c.id, decision: "APPROVED" }} submitLabel="Approve" variant="gold" />
                          <ActionForm action={reviewClaim} fields={{ claimId: c.id, decision: "REJECTED" }} submitLabel="Reject" variant="danger" className="flex flex-col gap-1">
                            <label className="sr-only" htmlFor={`note-${c.id}`}>Rejection note</label>
                            <input id={`note-${c.id}`} name="note" placeholder="Note (optional)" className="field !min-h-9 !text-[12px]" maxLength={1000} />
                          </ActionForm>
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted">{c.reviewedBy?.email ?? "system"} · {c.reviewedAt?.toLocaleDateString("en")}{c.reviewNote && <span className="block">{c.reviewNote}</span>}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
