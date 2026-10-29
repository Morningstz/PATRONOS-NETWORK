import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";
import { listAcquisitions } from "@/lib/queries/public";
import { AcquisitionCard } from "@/components/cards";

export const metadata: Metadata = { title: "Acquisitions", description: "Businesses open to acquisition. Financial details are shared privately, never published." };

export default async function AcquisitionsPage() {
  const items = await listAcquisitions(48);
  return (
    <>
      <PageHeader eyebrow="Acquisitions" title="Businesses open to offers" intro="Discreet listings from owners considering a sale. PATRONOS does not verify financials or act as a broker — detailed information is shared privately by the owner." crumbs={[{ href: "/", label: "Home" }, { href: "/acquisitions", label: "Acquisitions" }]} />
      <ul className="mx-auto grid max-w-[1440px] gap-5 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-12">
        {items.map((a) => (
          <li key={a.id} className="flex">
            <AcquisitionCard a={a} layout="grid" />
          </li>
        ))}
      </ul>
    </>
  );
}
