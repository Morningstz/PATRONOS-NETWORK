import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/journal";
import { GenerativeArt } from "@/components/art/GenerativeArt";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = getArticle((await params).slug);
  return a ? { title: a.title, description: a.dek, openGraph: { type: "article", title: a.title, description: a.dek } } : { title: "Not found" };
}

export default async function ArticlePage({ params }: Props) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  return (
    <article className="mx-auto max-w-[760px] px-4 py-14 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-[12px] tracking-[0.14em] text-faint uppercase"><Link href="/journal" className="hover:text-ink">Journal</Link></nav>
      <p className="eyebrow">{a.category}</p>
      <h1 className="display mt-3 text-[clamp(2.25rem,6vw,3.75rem)] leading-tight">{a.title}</h1>
      <p className="mt-5 text-[19px] text-muted">{a.dek}</p>
      <p className="mt-4 text-[13px] text-faint"><time dateTime={a.publishedOn}>{new Date(a.publishedOn).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })}</time> · {a.readMinutes} min read</p>
      <div className="group mt-10 overflow-hidden rounded-[24px] border border-white/10"><div className="editorial-image"><GenerativeArt seed={a.hue * 3 + 7} ratio={1.8} title={a.title} /></div></div>
      <div className="mt-10 space-y-6 text-[17px] leading-[1.75] text-ink/90">
        {a.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </article>
  );
}
