import type { Metadata } from "next";
import { PageHeader } from "@/components/directory";
import { StudioApp } from "@/components/studio/StudioApp";
import { ArtHouseNav } from "@/components/art/ArtHouseNav";

export const metadata: Metadata = {
  title: "Studio — paint, animate and prompt",
  description:
    "Turn a photo or a sample scene into a painting in eleven styles, watch it being painted, bring it to life as a seamless loop, and get detailed image, animation and print prompts.",
};

export default function StudioPage() {
  return (
    <>
      <PageHeader
        eyebrow="PATRONOS Studio"
        title="Paint it. Watch it live."
        intro="Choose a scene or your own photo, pick a style and watch the painting appear stroke by stroke. Then set it in motion, export print-ready files or a video loop, and take detailed prompts to any image or video model."
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/studio", label: "Studio" },
        ]}
      >
        <ArtHouseNav current="/studio" />
      </PageHeader>
      <StudioApp />
    </>
  );
}
