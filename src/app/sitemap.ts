import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ARTICLES } from "@/lib/journal";

export const dynamic = "force-dynamic";

/** Only non-demo, public records are listed (demo pages are noindex). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env().NEXT_PUBLIC_SITE_URL;
  const [countries, industries, companies, artists, artworks] = await Promise.all([
    db.country.findMany({ select: { slug: true } }),
    db.industry.findMany({ select: { slug: true } }),
    db.company.findMany({ where: { isDemo: false, status: "ACTIVE", deletedAt: null }, select: { slug: true, updatedAt: true } }),
    db.artist.findMany({ where: { isDemo: false, status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.artwork.findMany({ where: { isDemo: false, status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["", "/discover", "/companies", "/industries", "/artists", "/art", "/galleries", "/acquisitions", "/collaborations", "/advertise", "/journal", "/about"];
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}` })),
    ...countries.map((c) => ({ url: `${base}/discover/${c.slug}` })),
    ...industries.map((i) => ({ url: `${base}/industries/${i.slug}` })),
    ...companies.map((c) => ({ url: `${base}/companies/${c.slug}`, lastModified: c.updatedAt })),
    ...artists.map((a) => ({ url: `${base}/artists/${a.slug}`, lastModified: a.updatedAt })),
    ...artworks.map((a) => ({ url: `${base}/art/${a.slug}`, lastModified: a.updatedAt })),
    ...ARTICLES.map((a) => ({ url: `${base}/journal/${a.slug}`, lastModified: new Date(a.publishedOn) })),
  ];
}
