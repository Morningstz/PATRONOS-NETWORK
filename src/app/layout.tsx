import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/500-italic.css";
import "@fontsource/playfair-display/700-italic.css";
import "./globals.css";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env().NEXT_PUBLIC_SITE_URL),
  title: { default: "PATRONOS — Where companies meet culture", template: "%s · PATRONOS" },
  description: "Discover verified companies, artists, galleries and acquisition opportunities across the world — curated like an art collection.",
  openGraph: { siteName: "PATRONOS", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0a0a0a", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="no-js" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.remove('no-js')" }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-[100] rounded-full bg-white px-4 py-2 text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        <SiteNav />
        <main id="main" className="pt-16 lg:pt-[72px]">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
