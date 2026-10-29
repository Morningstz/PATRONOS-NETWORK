import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/directory";

export const metadata: Metadata = { title: "List your company" };

export default function ListYourCompanyPage() {
  return (
    <>
      <PageHeader eyebrow="For companies" title="Put your company on the map" intro="Find your profile, claim it, and tell the world what you do. Claims are reviewed by a moderator; verification is a separate, stronger check." crumbs={[{ href: "/", label: "Home" }, { href: "/list-your-company", label: "List your company" }]} />
      <div className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6 lg:px-12">
        <form action="/companies" method="get" role="search" className="glass flex flex-col gap-3 p-6 sm:flex-row" aria-label="Find your company">
          <label htmlFor="lyc-q" className="sr-only">Company name</label>
          <input id="lyc-q" name="q" placeholder="Search for your company" className="field" maxLength={80} />
          <button className="btn btn-solid">Find my company</button>
        </form>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ["Find", "Search the directory for your company. If it isn't listed yet, new listings open in the next release."],
            ["Claim", "Sign in and submit a claim with your work email and role. A moderator reviews every claim."],
            ["Verify", "Once claimed, request verification. Our team checks that the organisation exists and operates as described."],
          ].map(([t, b], i) => (
            <li key={t} className="panel p-6">
              <span className="display nums text-[40px] text-gold">{i + 1}</span>
              <p className="mt-2 text-[18px] font-semibold">{t}</p>
              <p className="mt-2 text-[14px] text-muted">{b}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-[14px] text-muted">Want visibility now? See <Link href="/advertise" className="link-gold">sponsored placements</Link>.</p>
      </div>
    </>
  );
}
