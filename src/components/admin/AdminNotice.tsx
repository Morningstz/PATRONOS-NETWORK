"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  "claim-approved": "Claim approved. The claimant now manages the profile (status: Claimed).",
  "claim-rejected": "Claim rejected.",
  "company-saved": "Saved.",
  "demo-hidden": "Demo data is now hidden publicly.",
  "demo-shown": "Demo data is now visible publicly.",
  "demo-purged": "Demo data purged.",
};

/** Shows the result of the last admin action. Only known codes render — never arbitrary URL text. */
export function AdminNotice() {
  const code = useSearchParams().get("notice");
  const message = code ? MESSAGES[code] : undefined;
  if (!message) return null;
  return (
    <div role="status" className="mb-6 rounded-2xl border border-success/30 bg-success/[0.06] px-4 py-3 text-[14px] text-success">
      {message}
    </div>
  );
}
