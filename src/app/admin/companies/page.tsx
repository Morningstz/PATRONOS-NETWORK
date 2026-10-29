import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/auth/session";
import { can } from "@/lib/authz";
import { moderateCompany } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Companies" };

export default async function AdminCompanies({ searchParams }: { searchParams: Promise<{ q?: string; verification?: string; demo?: string; status?: string }> }) {
  const user = await requirePageAccess("moderation:companies", "/admin/companies");
  const sp = await searchParams;
  const where: Prisma.CompanyWhereInput = { deletedAt: null };
  if (sp.q) where.name = { contains: sp.q.slice(0, 80), mode: "insensitive" };
  if (sp.verification === "VERIFIED" || sp.verification === "CLAIMED" || sp.verification === "UNVERIFIED") where.verificationStatus = sp.verification;
  if (sp.demo === "1") where.isDemo = true;
  if (sp.demo === "0") where.isDemo = false;
  if (sp.status === "HIDDEN") where.status = "HIDDEN";
  const [total, companies] = await Promise.all([
    db.company.count({ where }),
    db.company.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, name: true, slug: true, isDemo: true, status: true, verificationStatus: true, country: { select: { name: true } }, _count: { select: { members: true } } } }),
  ]);
  const canVerify = can(user, "company:verify");
  return (
    <div>
      <h1 className="display text-[2.5rem]">Companies</h1>
      <form method="get" className="mt-5 flex flex-wrap gap-3" aria-label="Filter companies">
        <label htmlFor="ac-q" className="sr-only">Search</label>
        <input id="ac-q" name="q" defaultValue={sp.q} placeholder="Search by name" className="field max-w-xs" />
        <label htmlFor="ac-v" className="sr-only">Verification</label>
        <select id="ac-v" name="verification" defaultValue={sp.verification ?? ""} className="field max-w-[180px]"><option value="">Any status</option><option value="VERIFIED">Verified</option><option value="CLAIMED">Claimed</option><option value="UNVERIFIED">Unverified</option></select>
        <label htmlFor="ac-d" className="sr-only">Data</label>
        <select id="ac-d" name="demo" defaultValue={sp.demo ?? ""} className="field max-w-[180px]"><option value="">Demo + real</option><option value="0">Real only</option><option value="1">Demo only</option></select>
        <button className="btn btn-outline">Filter</button>
      </form>
      <p className="mt-4 text-[13px] text-muted"><span className="nums">{total}</span> companies{total > 100 && " (showing 100)"}</p>
      <div className="panel mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <caption className="sr-only">Companies</caption>
          <thead className="border-b border-white/10 text-[11px] tracking-[0.16em] text-gold-light uppercase">
            <tr><th scope="col" className="p-4">Name</th><th scope="col" className="p-4">Country</th><th scope="col" className="p-4">Verification</th><th scope="col" className="p-4">Visibility</th><th scope="col" className="p-4">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {companies.map((c) => (
              <tr key={c.id}>
                <td className="p-4"><Link href={`/companies/${c.slug}`} className="hover:text-gold-hover">{c.name}</Link>{c.isDemo && <span className="ml-2 text-[11px] text-gold-light uppercase">demo</span>}</td>
                <td className="p-4 text-muted">{c.country.name}</td>
                <td className="p-4">{c.verificationStatus.toLowerCase()}</td>
                <td className="p-4">{c.status.toLowerCase()}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {canVerify && !c.isDemo && c.verificationStatus !== "VERIFIED" && <ActionForm action={moderateCompany} fields={{ companyId: c.id, op: "verify" }} submitLabel="Verify" variant="gold" confirm={`Mark ${c.name} as VERIFIED? Only do this after an independent check.`} />}
                    {canVerify && c.verificationStatus === "VERIFIED" && <ActionForm action={moderateCompany} fields={{ companyId: c.id, op: "unverify" }} submitLabel="Remove verification" />}
                    {c.status === "ACTIVE" ? <ActionForm action={moderateCompany} fields={{ companyId: c.id, op: "hide" }} submitLabel="Hide" variant="danger" /> : <ActionForm action={moderateCompany} fields={{ companyId: c.id, op: "restore" }} submitLabel="Restore" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
