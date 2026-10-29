import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/auth/session";
import { showDemoData } from "@/lib/settings";

export default async function AdminOverview() {
  await requirePageAccess("admin:access", "/admin");
  const [pendingClaims, companies, demoCompanies, verified, pendingCampaigns, openReports, inquiries, showDemo] = await Promise.all([
    db.companyClaim.count({ where: { status: "PENDING" } }),
    db.company.count({ where: { deletedAt: null } }),
    db.company.count({ where: { isDemo: true } }),
    db.company.count({ where: { verificationStatus: "VERIFIED" } }),
    db.campaign.count({ where: { status: "PENDING" } }),
    db.contentReport.count({ where: { status: "OPEN" } }),
    db.inquiry.count(),
    showDemoData(),
  ]);
  const tiles = [
    ["Pending claims", pendingClaims, "/admin/claims"],
    ["Campaigns awaiting review", pendingCampaigns, null],
    ["Open reports", openReports, null],
    ["Companies", companies, "/admin/companies"],
    ["Verified companies", verified, "/admin/companies?verification=VERIFIED"],
    ["Demo companies", demoCompanies, "/admin/companies?demo=1"],
    ["Inquiries", inquiries, null],
  ] as const;
  return (
    <div>
      <h1 className="display text-[2.5rem]">Overview</h1>
      <p className="mt-2 text-[14px] text-muted">Demo data is currently <strong className="text-gold-light">{showDemo ? "visible" : "hidden"}</strong> to the public.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([label, n, href]) => (
          <li key={label} className="panel relative p-5">
            <p className="eyebrow">{label}</p>
            <p className="nums mt-3 text-[34px] font-semibold">{n}</p>
            {href && <Link href={href} className="link-gold text-[12px] after:absolute after:inset-0">Open →</Link>}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-[13px] text-faint">Campaign review and content-report queues are modeled in the database; their review screens ship in milestone 2.</p>
    </div>
  );
}
