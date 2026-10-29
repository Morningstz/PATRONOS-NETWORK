import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";
import { activePlacements } from "@/lib/queries/public";
import { PricingToggle } from "@/components/advertise/PricingToggle";

export const metadata: Metadata = { title: "Advertise", description: "Fixed-price sponsored placements on PATRONOS — always labeled, always moderator-approved." };

export default async function AdvertisePage() {
  const placements = await activePlacements();
  return (
    <>
      <PageHeader eyebrow="Advertise" title="Be seen by the people building what's next" intro="Fixed-price sponsored placements. No auctions, no bidding wars — every placement is clearly labeled “Sponsored” and approved by our moderators before it goes live." crumbs={[{ href: "/", label: "Home" }, { href: "/advertise", label: "Advertise" }]} />
      <section id="packages" aria-labelledby="pk" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-14 sm:px-6 lg:px-12">
        <h2 id="pk" className="sr-only">Placement packages</h2>
        <PricingToggle
          placements={placements.map((p) => ({ key: p.key, name: p.name, description: p.description, priceCents: p.priceCents, currency: p.currency, durationDays: p.durationDays, capacity: p.capacity, location: p.location }))}
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            ["Always labeled", "Every sponsored card carries a visible “Sponsored” label and screen-reader text. Sponsored results never outrank an exact name match."],
            ["Human-approved", "A moderator reviews each creative and its destination before a campaign goes live."],
            ["Honest reporting", "Impressions count only when at least half the card is visible for one second; repeat and bot traffic are filtered."],
          ].map(([t, b]) => (
            <div key={t} className="panel p-6">
              <p className="text-[17px] font-semibold">{t}</p>
              <p className="mt-2 text-[14px] text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
