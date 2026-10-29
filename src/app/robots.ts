import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env().NEXT_PUBLIC_SITE_URL;
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/sign-in", "/search", "/auth"] }], sitemap: `${base}/sitemap.xml` };
}
