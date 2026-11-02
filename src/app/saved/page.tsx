import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/directory";
import { ArtHouseNav } from "@/components/art/ArtHouseNav";
import { AbstractPortrait } from "@/components/art/Monogram";
import { ArtworkCard } from "@/components/cards";
import { getSessionUser } from "@/lib/auth/session";
import { listFollowed, listSaved } from "@/lib/queries/art";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function SavedPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/saved");
  const tab = (await searchParams).tab === "following" ? "following" : "saves";
  const [works, artists] = await Promise.all([listSaved(user.id), listFollowed(user.id)]);
  return (
    <>
      <PageHeader
        eyebrow="Art House"
        title="Your collection"
        intro="Works you saved and artists you follow. Only you can see this page."
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/saved", label: "Saved" },
        ]}
      >
        <ArtHouseNav current="/saved" />
      </PageHeader>
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-12">
        <nav aria-label="Collection" className="mb-8 flex gap-2">
          <Link aria-current={tab === "saves" ? "page" : undefined} href="/saved" className={`btn ${tab === "saves" ? "btn-solid" : "btn-outline"}`}>
            Saves <span className="nums">({works.length})</span>
          </Link>
          <Link aria-current={tab === "following" ? "page" : undefined} href="/saved?tab=following" className={`btn ${tab === "following" ? "btn-solid" : "btn-outline"}`}>
            Following <span className="nums">({artists.length})</span>
          </Link>
        </nav>
        {tab === "saves" ? (
          works.length === 0 ? (
            <p className="panel p-10 text-center text-[15px] text-muted">
              Nothing saved yet. Tap the heart on any work, or try <Link href="/daily" className="link-gold">Discover Daily</Link>.
            </p>
          ) : (
            <div className="gallery-wall">
              {works.map((w) => (
                <ArtworkCard key={w.id} a={w} width="fluid" />
              ))}
            </div>
          )
        ) : artists.length === 0 ? (
          <p className="panel p-10 text-center text-[15px] text-muted">
            You don&rsquo;t follow anyone yet. <Link href="/artists" className="link-gold">Meet the artists</Link>.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {artists.map((a) => (
              <li key={a.id} className="group relative">
                <div className="overflow-hidden rounded-[20px] border border-white/10">
                  <AbstractPortrait name={a.name} hue={a.portraitHue} className="editorial-image" />
                </div>
                <h3 className="display mt-3 text-[19px]">
                  <Link href={`/artists/${a.slug}`} className="after:absolute after:inset-0">
                    {a.name}
                  </Link>
                </h3>
                <p className="text-[12px] text-muted">
                  {a.discipline} · {a.city?.name ?? a.country.name} · <span className="nums">{a._count.artworks}</span> works{a.isDemo ? " · DEMO" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
