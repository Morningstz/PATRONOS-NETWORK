import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CompanyDirectory, PageHeader } from "@/components/directory";
import { getIndustry } from "@/lib/queries/public";
import { parseCompanyFilters } from "@/lib/validation";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ind = await getIndustry((await params).slug);
  return ind ? { title: `${ind.name} companies`, alternates: { canonical: `/industries/${ind.slug}` } } : { title: "Industry not found" };
}

export default async function IndustryPage({ params, searchParams }: Props) {
  const ind = await getIndustry((await params).slug);
  if (!ind) notFound();
  const filters = parseCompanyFilters(await searchParams);
  const crumbs = [{ href: "/", label: "Home" }, { href: "/industries", label: "Industries" }, ...(ind.parent ? [{ href: `/industries/${ind.parent.slug}`, label: ind.parent.name }] : []), { href: `/industries/${ind.slug}`, label: ind.name }];
  return (
    <>
      <PageHeader eyebrow="Industry" title={ind.name} intro={ind.description ?? undefined} crumbs={crumbs}>
        {ind.children.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Sub-industries">
            {ind.children.map((c) => (
              <li key={c.slug}>
                <Link href={`/industries/${c.slug}`} className="chip border border-white/15 !py-2 text-muted hover:text-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageHeader>
      <CompanyDirectory filters={filters} basePath={`/industries/${ind.slug}`} fixed={{ industry: ind.slug }} />
    </>
  );
}
