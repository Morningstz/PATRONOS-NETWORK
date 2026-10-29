import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/auth/session";

export const metadata = { title: "Audit log" };

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ action?: string; entity?: string }> }) {
  await requirePageAccess("audit:read", "/admin/audit");
  const sp = await searchParams;
  const rows = await db.auditLog.findMany({
    where: { ...(sp.action ? { action: { startsWith: sp.action.slice(0, 60) } } : {}), ...(sp.entity ? { entityType: sp.entity.slice(0, 60) } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true, actor: { select: { email: true } } },
  });
  return (
    <div>
      <h1 className="display text-[2.5rem]">Audit log</h1>
      <form method="get" className="mt-5 flex flex-wrap gap-3" aria-label="Filter audit log">
        <label htmlFor="al-a" className="sr-only">Action prefix</label>
        <input id="al-a" name="action" defaultValue={sp.action} placeholder="Action, e.g. claim." className="field max-w-xs" />
        <label htmlFor="al-e" className="sr-only">Entity type</label>
        <input id="al-e" name="entity" defaultValue={sp.entity} placeholder="Entity, e.g. Company" className="field max-w-xs" />
        <button className="btn btn-outline">Filter</button>
      </form>
      <div className="panel mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <caption className="sr-only">Most recent 200 audit events</caption>
          <thead className="border-b border-white/10 text-[11px] tracking-[0.16em] text-gold-light uppercase">
            <tr><th scope="col" className="p-3">When</th><th scope="col" className="p-3">Actor</th><th scope="col" className="p-3">Action</th><th scope="col" className="p-3">Entity</th><th scope="col" className="p-3">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] font-mono">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="nums p-3 whitespace-nowrap text-muted">{r.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
                <td className="p-3">{r.actor?.email ?? "system"}</td>
                <td className="p-3 text-gold-light">{r.action}</td>
                <td className="p-3">{r.entityType}{r.entityId && <span className="block text-faint">{r.entityId.slice(0, 8)}…</span>}</td>
                <td className="max-w-xs truncate p-3 text-muted">{r.metadata ? JSON.stringify(r.metadata) : ""}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">No events.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
