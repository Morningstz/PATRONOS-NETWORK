import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";

export const metadata: Metadata = { title: "Report content", robots: { index: false } };

export default function ReportPage() {
  return (
    <>
      <PageHeader eyebrow="Trust & safety" title="Report content" intro="Seen something inaccurate, infringing or harmful? Tell us and a moderator will review it." />
      <div className="mx-auto max-w-[760px] space-y-5 px-4 py-14 text-[16px] text-ink/90 sm:px-6">
        <p>In-app reporting arrives in the next release (the moderation queue is already in place). Until then, email <a className="link-gold" href="mailto:trust@patronos.example">trust@patronos.example</a> with the page link and what&rsquo;s wrong.</p>
      </div>
    </>
  );
}
