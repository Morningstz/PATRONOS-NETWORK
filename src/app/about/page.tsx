import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="Where companies meet culture" crumbs={[{ href: "/", label: "Home" }, { href: "/about", label: "About" }]} />
      <div className="mx-auto max-w-[760px] space-y-6 px-4 py-14 text-[17px] leading-[1.75] text-ink/90 sm:px-6">
        <p>PATRONOS is a global directory of companies, artists and galleries — and a place where they find each other. We present businesses the way a good gallery presents art: with context, provenance, and honesty about what has and hasn&rsquo;t been verified.</p>
        <p>We make money from clearly labeled, fixed-price sponsored placements. We never sell rankings, and sponsored content never outranks an exact match for what you searched.</p>
        <p>We do not broker transactions, hold funds, issue securities or verify company financials. Where those services are needed, we will work with licensed partners.</p>
      </div>
    </>
  );
}
