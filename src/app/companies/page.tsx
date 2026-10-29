import type { Metadata } from "next";
import { CompanyDirectory, PageHeader } from "@/components/directory";
import { parseCompanyFilters } from "@/lib/validation";

export const metadata: Metadata = { title: "Companies", description: "Browse companies by country, city, industry, verification status and collaboration availability." };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseCompanyFilters(await searchParams);
  return (
    <>
      <PageHeader eyebrow="Directory" title="Companies" intro="Startups, studios and established businesses — filter by place, industry, verification and whether they're open to collaborate." crumbs={[{ href: "/", label: "Home" }, { href: "/companies", label: "Companies" }]} />
      <CompanyDirectory filters={filters} basePath="/companies" />
    </>
  );
}
