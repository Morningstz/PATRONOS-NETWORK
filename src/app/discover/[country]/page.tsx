import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyDirectory, PageHeader } from "@/components/directory";
import { getCountry } from "@/lib/queries/public";
import { parseCompanyFilters } from "@/lib/validation";

type Props = { params: Promise<{ country: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = await getCountry((await params).country);
  if (!country) return { title: "Country not found" };
  return { title: `Companies in ${country.name}`, description: `Discover companies, artists and galleries based in ${country.name}.`, alternates: { canonical: `/discover/${country.slug}` } };
}

export default async function CountryPage({ params, searchParams }: Props) {
  const country = await getCountry((await params).country);
  if (!country) notFound();
  const filters = parseCompanyFilters(await searchParams);
  return (
    <>
      <PageHeader eyebrow={country.iso2} title={country.name} intro={`Companies and creative studios based in ${country.name}. Narrow by region and city, industry, verification or collaboration.`} crumbs={[{ href: "/", label: "Home" }, { href: "/discover", label: "Discover" }, { href: `/discover/${country.slug}`, label: country.name }]}>
        {country.regions.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2" aria-label={`Regions of ${country.name}`}>
            {country.regions.map((r) => (
              <li key={r.slug}>
                <Link href={`/discover/${country.slug}?region=${r.slug}`} aria-current={filters.region === r.slug ? "page" : undefined} className={`chip !py-2 border ${filters.region === r.slug ? "border-[var(--gold)] text-gold-hover" : "border-white/15 text-muted hover:text-ink"}`}>
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageHeader>
      <CompanyDirectory filters={filters} basePath={`/discover/${country.slug}`} fixed={{ country: country.slug }} regions={country.regions} />
    </>
  );
}
