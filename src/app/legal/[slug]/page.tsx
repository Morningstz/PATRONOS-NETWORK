import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/directory";

const PAGES: Record<string, { title: string; body: string[] }> = {
  terms: { title: "Terms of use", body: ["These terms are a placeholder pending legal review and must not be relied upon.", "PATRONOS provides a directory and advertising service. Listings may include clearly labeled demo data. PATRONOS does not broker transactions, verify financial information, hold funds or provide investment advice."] },
  privacy: { title: "Privacy notice", body: ["This notice is a placeholder pending legal review.", "We store the minimum data needed to run the service. IP addresses used for rate limiting and ad-fraud prevention are stored only as salted one-way hashes. Claim evidence is stored privately and is never shown publicly.", "You can request an export or deletion of your data from your dashboard (self-serve tools arrive in the next release; until then, contact privacy@patronos.example)."] },
  cookies: { title: "Cookie preferences", body: ["PATRONOS currently uses only essential cookies: your sign-in session. We do not use analytics or advertising cookies.", "If we add optional cookies, they will be off by default and you will be able to change your choice here."] },
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = PAGES[(await params).slug];
  return { title: p?.title ?? "Not found", robots: { index: false } };
}

export default async function LegalPage({ params }: Props) {
  const p = PAGES[(await params).slug];
  if (!p) notFound();
  return (
    <>
      <PageHeader eyebrow="Legal" title={p.title} />
      <div className="mx-auto max-w-[760px] space-y-5 px-4 py-14 text-[16px] leading-[1.75] text-ink/90 sm:px-6">
        {p.body.map((b, i) => <p key={i}>{b}</p>)}
      </div>
    </>
  );
}
