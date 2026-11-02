import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";
import { ArtHouseNav } from "@/components/art/ArtHouseNav";
import { ArtLens } from "@/components/lens/ArtLens";

export const metadata: Metadata = { title: "Art Lens", description: "Photograph a room or anything you love and find artworks whose colours echo it. Your photo never leaves your device." };

export default function LensPage() {
  return (
    <>
      <PageHeader
        eyebrow="Art House"
        title="Art Lens"
        intro="Photograph your room, a fabric or a sunset. Art Lens reads its palette in your browser and finds the works whose colours belong with it."
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/art", label: "Art" },
          { href: "/lens", label: "Art Lens" },
        ]}
      >
        <ArtHouseNav current="/lens" />
      </PageHeader>
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-12">
        <ArtLens />
      </div>
    </>
  );
}
