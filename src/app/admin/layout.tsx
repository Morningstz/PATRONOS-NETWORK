import Link from "next/link";
import type { Metadata } from "next";
import { requirePageAccess } from "@/lib/auth/session";
import { can } from "@/lib/authz";
import { Suspense } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · PATRONOS" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageAccess("admin:access", "/admin");
  const links = [
    ["/admin", "Overview", true],
    ["/admin/claims", "Claims", true],
    ["/admin/companies", "Companies", true],
    ["/admin/audit", "Audit log", can(user, "audit:read")],
    ["/admin/settings", "Settings", can(user, "settings:manage")],
  ] as const;
  return (
    <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-12">
      <aside>
        <p className="eyebrow mb-1">Moderation</p>
        <p className="mb-6 text-[13px] text-faint">{user.displayName} · {user.roles.filter((r) => r !== "USER").join(", ")}</p>
        <nav aria-label="Admin">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {links.filter(([, , show]) => show).map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="block rounded-xl px-3 py-2 text-[14px] whitespace-nowrap text-muted hover:bg-white/[0.04] hover:text-ink">{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0">
        <Suspense fallback={null}>
          <AdminNotice />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
