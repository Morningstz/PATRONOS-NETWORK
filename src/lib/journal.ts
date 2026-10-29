/** Editorial content. Static in v1 (MDX/CMS later). Original writing by PATRONOS. */
export type Article = {
  slug: string;
  category: string;
  title: string;
  dek: string;
  readMinutes: number;
  publishedOn: string;
  hue: number;
  body: string[];
};

export const ARTICLES: Article[] = [
  {
    slug: "how-verification-works",
    category: "Trust",
    title: "What “Verified” means on PATRONOS",
    dek: "Three badges, three different promises. Here is exactly what each one says about a company — and what it doesn't.",
    readMinutes: 4,
    publishedOn: "2026-10-20",
    hue: 32,
    body: [
      "Every company on PATRONOS carries one of three states. Unverified means a profile exists, usually created from public information, and nobody from the company has confirmed it yet. Claimed means a representative signed in, proved they work there, and a moderator approved the claim. Verified is the strongest signal: our team has independently checked that the organisation exists and operates as described.",
      "Claimed is not the same as Verified. A claim tells you someone at the company manages the profile; verification tells you we checked the company itself. We show the date of verification on every badge so you can judge how fresh it is.",
      "Sample profiles you may see while we grow are always labeled DEMO. They are fictional, they can never be verified, and they cannot be claimed. We would rather show you an honest empty shelf than a convincing fake.",
      "Verification never covers financial performance. PATRONOS does not audit revenue or act as a broker, and we never publish private financial information on public profiles.",
    ],
  },
  {
    slug: "artwork-true-colour",
    category: "Craft",
    title: "Why we never crop or desaturate an artwork",
    dek: "Directory design loves uniform tiles. Art does not. A note on the gallery-wall grid.",
    readMinutes: 3,
    publishedOn: "2026-10-12",
    hue: 12,
    body: [
      "Most marketplaces squeeze every image into the same square. For products that is efficient. For a painting it is a small act of vandalism: the composition the artist chose is gone before a collector has even looked.",
      "On PATRONOS every artwork is shown at its true aspect ratio and in full colour. Our grid flows like a gallery wall instead, with generous space between works.",
      "You will notice some photographs of people turn from monochrome to colour as you hover. That treatment is reserved for portraits and editorial imagery. It never touches the work itself.",
    ],
  },
  {
    slug: "collaboration-briefs-artists-accept",
    category: "Collaboration",
    title: "Briefs that artists say yes to",
    dek: "What we have learned from studios and painters about the requests worth answering.",
    readMinutes: 5,
    publishedOn: "2026-10-03",
    hue: 140,
    body: [
      "Name the outcome, not the aesthetic. “A mural that makes our warehouse a place people want to visit” invites ideas; “something like your blue series but orange” invites a polite decline.",
      "State a budget range up front. Artists triage dozens of messages a month, and a range signals that you have thought about value.",
      "Offer time. Commissions compress badly. A realistic schedule is often worth more to an artist than a higher fee on an impossible deadline.",
      "Respect the rights. Say clearly how the work will be used, where, and for how long. Licensing conversations are easier at the start than after launch.",
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug) ?? null;
