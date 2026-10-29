/**
 * DEMO seed content. Every organisation and person below is FICTIONAL (coined names).
 * Geography and industries are real reference data.
 */
import type { CollaborationAvailability, CompanyCategory, MacroRegion } from "@prisma/client";

export const COUNTRIES: Array<{ name: string; slug: string; iso2: string; macro: MacroRegion; regions: Array<{ name: string; slug: string; cities: Array<[string, string]> }> }> = [
  { name: "Indonesia", slug: "indonesia", iso2: "ID", macro: "ASIA_PACIFIC", regions: [
    { name: "East Java", slug: "east-java", cities: [["Surabaya", "surabaya"], ["Malang", "malang"], ["Pasuruan", "pasuruan"]] },
    { name: "Jakarta", slug: "jakarta", cities: [["Jakarta", "jakarta"]] },
    { name: "Bali", slug: "bali", cities: [["Denpasar", "denpasar"], ["Ubud", "ubud"]] },
  ] },
  { name: "Singapore", slug: "singapore", iso2: "SG", macro: "ASIA_PACIFIC", regions: [{ name: "Central Region", slug: "central", cities: [["Singapore", "singapore"]] }] },
  { name: "Japan", slug: "japan", iso2: "JP", macro: "ASIA_PACIFIC", regions: [
    { name: "Kantō", slug: "kanto", cities: [["Tokyo", "tokyo"]] },
    { name: "Kansai", slug: "kansai", cities: [["Kyoto", "kyoto"], ["Osaka", "osaka"]] },
  ] },
  { name: "Australia", slug: "australia", iso2: "AU", macro: "ASIA_PACIFIC", regions: [{ name: "New South Wales", slug: "new-south-wales", cities: [["Sydney", "sydney"]] }] },
  { name: "Germany", slug: "germany", iso2: "DE", macro: "EUROPE", regions: [{ name: "Berlin", slug: "berlin", cities: [["Berlin", "berlin"]] }] },
  { name: "United Kingdom", slug: "united-kingdom", iso2: "GB", macro: "EUROPE", regions: [{ name: "England", slug: "england", cities: [["London", "london"], ["Manchester", "manchester"]] }] },
  { name: "France", slug: "france", iso2: "FR", macro: "EUROPE", regions: [{ name: "Île-de-France", slug: "ile-de-france", cities: [["Paris", "paris"]] }] },
  { name: "Netherlands", slug: "netherlands", iso2: "NL", macro: "EUROPE", regions: [{ name: "North Holland", slug: "north-holland", cities: [["Amsterdam", "amsterdam"]] }] },
  { name: "United States", slug: "united-states", iso2: "US", macro: "AMERICAS", regions: [
    { name: "New York", slug: "new-york", cities: [["New York", "new-york"]] },
    { name: "California", slug: "california", cities: [["San Francisco", "san-francisco"], ["Los Angeles", "los-angeles"]] },
  ] },
  { name: "Brazil", slug: "brazil", iso2: "BR", macro: "AMERICAS", regions: [{ name: "São Paulo", slug: "sao-paulo", cities: [["São Paulo", "sao-paulo"]] }] },
  { name: "Mexico", slug: "mexico", iso2: "MX", macro: "AMERICAS", regions: [{ name: "Mexico City", slug: "cdmx", cities: [["Mexico City", "mexico-city"]] }] },
  { name: "United Arab Emirates", slug: "united-arab-emirates", iso2: "AE", macro: "MIDDLE_EAST_AFRICA", regions: [{ name: "Dubai", slug: "dubai", cities: [["Dubai", "dubai"]] }] },
  { name: "Kenya", slug: "kenya", iso2: "KE", macro: "MIDDLE_EAST_AFRICA", regions: [{ name: "Nairobi County", slug: "nairobi", cities: [["Nairobi", "nairobi"]] }] },
  { name: "Nigeria", slug: "nigeria", iso2: "NG", macro: "MIDDLE_EAST_AFRICA", regions: [{ name: "Lagos State", slug: "lagos", cities: [["Lagos", "lagos"]] }] },
  { name: "South Africa", slug: "south-africa", iso2: "ZA", macro: "MIDDLE_EAST_AFRICA", regions: [{ name: "Western Cape", slug: "western-cape", cities: [["Cape Town", "cape-town"]] }] },
];

export const INDUSTRIES: Array<{ name: string; slug: string; description: string; children: Array<[string, string]> }> = [
  { name: "Technology", slug: "technology", description: "Software, platforms, financial technology and applied AI.", children: [["Software & SaaS", "software-saas"], ["Fintech", "fintech"], ["AI & Data", "ai-data"]] },
  { name: "Consumer", slug: "consumer", description: "Brands and products people use every day.", children: [["Food & Beverage", "food-beverage"], ["Fashion & Apparel", "fashion-apparel"], ["Beauty & Wellness", "beauty-wellness"]] },
  { name: "Agriculture & Industry", slug: "agriculture-industry", description: "Growing, making and moving physical goods.", children: [["Agritech", "agritech"], ["Manufacturing", "manufacturing"], ["Logistics", "logistics"]] },
  { name: "Creative Economy", slug: "creative-economy", description: "Studios, publishers and spatial design practices.", children: [["Design & Branding", "design-branding"], ["Media & Publishing", "media-publishing"], ["Architecture", "architecture"]] },
  { name: "Health", slug: "health", description: "Care delivery and health technology.", children: [["Healthtech", "healthtech"]] },
  { name: "Hospitality & Travel", slug: "hospitality-travel", description: "Places to stay and experiences worth travelling for.", children: [["Hotels & Experiences", "hotels-experiences"]] },
  { name: "Energy & Climate", slug: "energy-climate", description: "Clean power and climate solutions.", children: [["Renewables", "renewables"]] },
];

type C = [name: string, industry: string, country: string, city: string, category: CompanyCategory, collab: CollaborationAvailability, founded: number, employees: string, tagline: string];

export const COMPANIES: C[] = [
  ["Ambrevale Agrisystems", "agritech", "indonesia", "pasuruan", "STARTUP", "OPEN", 2021, "11–50", "Sensor-led irrigation for smallholder rice and sugarcane farms."],
  ["Corvessa Kopi Works", "food-beverage", "indonesia", "malang", "SME", "OPEN", 2017, "11–50", "Single-estate East Java coffee roasted for specialty cafés."],
  ["Lumaro Pay", "fintech", "indonesia", "jakarta", "STARTUP", "SELECTIVE", 2020, "51–200", "Invoice financing rails for Southeast Asian SMEs."],
  ["Nethrin Batik Atelier", "fashion-apparel", "indonesia", "surabaya", "CREATIVE_STUDIO", "OPEN", 2015, "1–10", "Contemporary hand-drawn batik for global fashion houses."],
  ["Tessaveil Retreats", "hotels-experiences", "indonesia", "ubud", "SME", "OPEN", 2016, "51–200", "Slow-travel villas built around local craft residencies."],
  ["Quorran Logistics", "logistics", "indonesia", "surabaya", "SME", "CLOSED", 2012, "201–500", "Cold-chain freight between Java's ports and highland farms."],
  ["Solvaine Energy", "renewables", "indonesia", "denpasar", "STARTUP", "SELECTIVE", 2022, "11–50", "Community solar micro-grids for island villages."],
  ["Kiravo Systems", "software-saas", "singapore", "singapore", "STARTUP", "SELECTIVE", 2019, "51–200", "Procurement software for regional hospitality groups."],
  ["Orrindel Health", "healthtech", "singapore", "singapore", "STARTUP", "CLOSED", 2020, "51–200", "Remote monitoring for post-operative cardiac patients."],
  ["Marrowind Studio", "design-branding", "singapore", "singapore", "CREATIVE_STUDIO", "OPEN", 2014, "11–50", "Identity systems for cultural institutions across Asia."],
  ["Hanzuki Ceramics", "manufacturing", "japan", "kyoto", "SME", "OPEN", 1987, "11–50", "Third-generation kiln producing tableware for chefs."],
  ["Teruvane Robotics", "ai-data", "japan", "tokyo", "STARTUP", "SELECTIVE", 2018, "51–200", "Vision systems that grade produce on the packing line."],
  ["Kyomori Editions", "media-publishing", "japan", "tokyo", "SME", "OPEN", 2009, "11–50", "Independent publisher of photography monographs."],
  ["Osuvela Textiles", "fashion-apparel", "japan", "osaka", "SME", "SELECTIVE", 1998, "51–200", "Indigo-dyed denim woven on vintage shuttle looms."],
  ["Barrowgale Analytics", "ai-data", "australia", "sydney", "STARTUP", "CLOSED", 2021, "11–50", "Bushfire risk models for insurers and councils."],
  ["Wattlemere Provisions", "food-beverage", "australia", "sydney", "SME", "OPEN", 2013, "11–50", "Native-botanical pantry goods for restaurants."],
  ["Fennwerk Architekten", "architecture", "germany", "berlin", "CREATIVE_STUDIO", "OPEN", 2008, "11–50", "Adaptive reuse of industrial buildings into cultural spaces."],
  ["Klarstein Mobility", "software-saas", "germany", "berlin", "STARTUP", "SELECTIVE", 2019, "51–200", "Fleet scheduling software for cargo-bike couriers."],
  ["Volkerhaus Print", "media-publishing", "germany", "berlin", "SME", "OPEN", 2004, "11–50", "Risograph and offset studio for artists' books."],
  ["Ashcombe & Rye", "beauty-wellness", "united-kingdom", "london", "SME", "SELECTIVE", 2016, "11–50", "Botanical skincare made in small, traceable batches."],
  ["Penvarrow Capital Tech", "fintech", "united-kingdom", "london", "ENTERPRISE", "CLOSED", 2011, "501–1000", "Treasury tooling for mid-market exporters."],
  ["Thistlegrove Studio", "design-branding", "united-kingdom", "manchester", "CREATIVE_STUDIO", "OPEN", 2017, "1–10", "Packaging and spatial graphics for independent brands."],
  ["Maison Orlevane", "fashion-apparel", "france", "paris", "SME", "SELECTIVE", 2012, "11–50", "Made-to-order outerwear from deadstock wool."],
  ["Clairmont Lumière", "architecture", "france", "paris", "CREATIVE_STUDIO", "OPEN", 2010, "11–50", "Lighting design for museums and galleries."],
  ["Veldhoven Fresh", "agritech", "netherlands", "amsterdam", "STARTUP", "SELECTIVE", 2020, "51–200", "Vertical-farm modules for supermarket rooftops."],
  ["Grachtwerk Digital", "software-saas", "netherlands", "amsterdam", "SME", "OPEN", 2015, "11–50", "Collection-management software for small museums."],
  ["Hollowpine Robotics", "manufacturing", "united-states", "san-francisco", "STARTUP", "SELECTIVE", 2018, "51–200", "Collaborative robots for furniture workshops."],
  ["Brightwater Ledger", "fintech", "united-states", "new-york", "STARTUP", "CLOSED", 2021, "11–50", "Royalty accounting for independent artists and labels."],
  ["Cindervale Media", "media-publishing", "united-states", "los-angeles", "SME", "OPEN", 2013, "51–200", "Documentary studio covering craft and design."],
  ["Mesquite & Moss", "beauty-wellness", "united-states", "los-angeles", "SME", "OPEN", 2019, "11–50", "Desert-botanical fragrances in refillable glass."],
  ["Arvoredo Café Co.", "food-beverage", "brazil", "sao-paulo", "SME", "OPEN", 2014, "51–200", "Direct-trade coffee from Minas Gerais micro-lots."],
  ["Paulistana Design Lab", "design-branding", "brazil", "sao-paulo", "CREATIVE_STUDIO", "OPEN", 2011, "11–50", "Type design and identity for Latin American brands."],
  ["Tlacuilo Estudio", "architecture", "mexico", "mexico-city", "CREATIVE_STUDIO", "OPEN", 2016, "1–10", "Earthen-material architecture and furniture."],
  ["Nopalia Foods", "food-beverage", "mexico", "mexico-city", "STARTUP", "SELECTIVE", 2020, "11–50", "Shelf-stable heritage-corn snacks."],
  ["Zaferan Hospitality", "hotels-experiences", "united-arab-emirates", "dubai", "ENTERPRISE", "SELECTIVE", 2009, "1000+", "Boutique desert camps with artist-designed suites."],
  ["Qamari Solar", "renewables", "united-arab-emirates", "dubai", "STARTUP", "CLOSED", 2022, "11–50", "Self-cleaning PV coatings for desert installations."],
  ["Savanta Health", "healthtech", "kenya", "nairobi", "STARTUP", "SELECTIVE", 2019, "51–200", "Pharmacy inventory software for East African clinics."],
  ["Mavuno Fields", "agritech", "kenya", "nairobi", "STARTUP", "OPEN", 2018, "51–200", "Credit-linked seed and input bundles for smallholders."],
  ["Adire House", "fashion-apparel", "nigeria", "lagos", "CREATIVE_STUDIO", "OPEN", 2017, "11–50", "Indigo resist-dye textiles for interiors and fashion."],
  ["Ikorodu Freight", "logistics", "nigeria", "lagos", "SME", "CLOSED", 2014, "201–500", "Last-mile delivery for Lagos e-commerce."],
  ["Fynbos & Co.", "beauty-wellness", "south-africa", "cape-town", "SME", "OPEN", 2015, "11–50", "Wild-harvested fynbos oils, fairly sourced."],
  ["Capeline Studios", "media-publishing", "south-africa", "cape-town", "SME", "OPEN", 2012, "11–50", "Photography and film production for brands with a story."],
];

type A = [name: string, discipline: string, country: string, city: string, collab: CollaborationAvailability, bio: string, hue: number];

export const ARTISTS: A[] = [
  ["Sekar Arundati", "Painter", "indonesia", "surabaya", "OPEN", "Large colour-field paintings drawing on the light over the Madura Strait.", 28],
  ["Bayu Wiratmaja", "Sculptor", "indonesia", "ubud", "SELECTIVE", "Carved volcanic stone and teak, exploring weight and balance.", 18],
  ["Mireille Okonta", "Textile artist", "nigeria", "lagos", "OPEN", "Monumental resist-dyed hangings that map family migrations.", 210],
  ["Haruto Kesamaki", "Ceramicist", "japan", "kyoto", "SELECTIVE", "Wood-fired vessels with ash glazes; each firing lasts five days.", 35],
  ["Liesel Varnholt", "Printmaker", "germany", "berlin", "OPEN", "Layered risograph prints about cities after dark.", 200],
  ["Tomás Ilvaredo", "Painter", "mexico", "mexico-city", "OPEN", "Geometric abstraction rooted in pre-Hispanic textile patterns.", 12],
  ["Amara Selwyn", "Photographer", "united-kingdom", "london", "SELECTIVE", "Long-exposure studies of coastlines and tides.", 190],
  ["Inês Valcorra", "Painter", "brazil", "sao-paulo", "OPEN", "Tropical modernism reimagined through bold, flat colour.", 140],
  ["Noor Al-Rashani", "Digital artist", "united-arab-emirates", "dubai", "OPEN", "Generative compositions built from desert wind data.", 40],
  ["Wanjiru Kamau", "Mixed media", "kenya", "nairobi", "SELECTIVE", "Collage and paint on reclaimed sacking from coffee exports.", 25],
  ["Elodie Fanchère", "Painter", "france", "paris", "CLOSED", "Quiet interiors and still lifes in muted, chalky tones.", 330],
  ["Callum Retherby", "Sculptor", "australia", "sydney", "OPEN", "Bent-steel forms that echo eucalyptus branches.", 160],
];

export const ARTWORK_TITLES = [
  "Strait at Dusk", "Salt Garden", "Inventory of Light", "The Long Field", "Monsoon Ledger", "Quiet Engine", "Night Cartography", "Tide Tables",
  "Second Harvest", "Kiln Memory", "Orchard in Blue", "Threshold", "Atlas of Small Rooms", "Wind Census", "Red Meridian", "The Patient Hour",
  "Fold & Return", "Ember Study", "Cloud Accounting", "Mangrove Hymn", "Departure Board", "Indigo Weather", "Ash Glaze No. 4", "Common Ground",
  "Low Sun", "Archive of Rain", "Desert Signal", "Market Morning", "Stone Breath", "Field Notes II", "Gilded Shadow", "Harbour Lights",
  "Ochre Bloom", "Sleeping Volcano", "Tin Roof Rain", "The Weight of Water",
];

export const MEDIUMS: Record<string, string[]> = {
  Painter: ["Oil on linen", "Acrylic on canvas", "Gouache on paper"],
  Sculptor: ["Carved andesite", "Teak and brass", "Bent mild steel"],
  "Textile artist": ["Adire on cotton", "Hand-dyed silk, stitched"],
  Ceramicist: ["Wood-fired stoneware", "Ash-glazed porcelain"],
  Printmaker: ["Three-colour risograph", "Etching and aquatint"],
  Photographer: ["Archival pigment print", "Silver gelatin print"],
  "Digital artist": ["Generative code, archival print", "Algorithmic drawing on paper"],
  "Mixed media": ["Collage on jute", "Acrylic and thread on sacking"],
};

export const GALLERIES: Array<[name: string, country: string, city: string, description: string, artistIdx: number[]]> = [
  ["Rumah Cahaya Gallery", "indonesia", "surabaya", "A converted colonial warehouse showing contemporary Indonesian painting and sculpture.", [0, 1]],
  ["Kiln & Grain", "japan", "kyoto", "Ceramics and craft gallery with a residency programme.", [3]],
  ["Hollandia Works", "germany", "berlin", "Print and works-on-paper gallery in a former tram depot.", [4, 10]],
  ["Lagoon House Gallery", "nigeria", "lagos", "Textile and mixed-media gallery championing West and East African artists.", [2, 9]],
];

export const ACQUISITIONS: Array<{ companyIdx: number | null; slug: string; headline: string; summary: string; industry: string; country: string; region: string | null; revenueRange: string | null; show: boolean; reason: string; fin: [currency: string, asking: number, revenue: number, ebitda: number] }> = [
  { companyIdx: 1, slug: "specialty-coffee-roaster-east-java", headline: "Specialty coffee roaster with café wholesale book", summary: "Established roastery supplying 60+ specialty cafés across Java and Bali, with export-ready certifications.", industry: "food-beverage", country: "indonesia", region: "east-java", revenueRange: "USD 1–2M", show: true, reason: "Founder relocating overseas.", fin: ["USD", 1800000, 1450000, 310000] },
  { companyIdx: null, slug: "boutique-villa-portfolio-bali", headline: "Boutique villa portfolio with craft residency", summary: "Four villas and a working studio with strong repeat bookings and an artist-in-residence programme.", industry: "hotels-experiences", country: "indonesia", region: "bali", revenueRange: null, show: false, reason: "Owners pursuing a new venture.", fin: ["USD", 4200000, 980000, 260000] },
  { companyIdx: null, slug: "museum-collection-software-europe", headline: "Collection-management SaaS for small museums", summary: "Recurring-revenue software used by 140 regional museums, with a lean support team.", industry: "software-saas", country: "netherlands", region: "north-holland", revenueRange: "EUR 0.5–1M ARR", show: true, reason: "Seeking a strategic owner to scale.", fin: ["EUR", 3100000, 820000, 240000] },
  { companyIdx: null, slug: "artisan-ceramics-workshop-kyoto", headline: "Artisan ceramics workshop and retail space", summary: "Kiln, studio and street-front shop with relationships with Michelin-starred restaurants.", industry: "manufacturing", country: "japan", region: "kansai", revenueRange: null, show: false, reason: "Succession — no family successor.", fin: ["JPY", 95000000, 61000000, 9500000] },
  { companyIdx: null, slug: "cold-chain-freight-operator-java", headline: "Regional cold-chain freight operator", summary: "Refrigerated fleet and two depots serving produce corridors between highland farms and ports.", industry: "logistics", country: "indonesia", region: "east-java", revenueRange: "USD 5–10M", show: true, reason: "Consolidating holdings.", fin: ["USD", 9500000, 7200000, 1100000] },
  { companyIdx: null, slug: "natural-skincare-brand-cape-town", headline: "Natural skincare brand with retail distribution", summary: "Botanical skincare line stocked in 80 retailers with a growing direct-to-consumer channel.", industry: "beauty-wellness", country: "south-africa", region: "western-cape", revenueRange: null, show: false, reason: "Founder retiring.", fin: ["ZAR", 18000000, 11000000, 2100000] },
];

export const PLACEMENTS = [
  { key: "directory-spotlight", name: "Directory Spotlight", location: "DIRECTORY_SPOTLIGHT" as const, description: "Top-of-results placement in one country or industry directory.", priceCents: 24000, durationDays: 14, capacity: 3 },
  { key: "homepage-shelf", name: "Homepage Shelf", location: "HOMEPAGE_SHELF" as const, description: "A labeled card inside a curated homepage shelf, seen by every visitor.", priceCents: 68000, durationDays: 14, capacity: 2 },
  { key: "country-feature", name: "Country Feature", location: "COUNTRY_FEATURE" as const, description: "Editorial feature banner on a country page plus a Digest mention.", priceCents: 42000, durationDays: 14, capacity: 1 },
];

export const DEMO_USERS = [
  { email: "admin@demo.patronos.local", name: "Demo Admin", roles: ["USER", "ADMIN"] as const },
  { email: "moderator@demo.patronos.local", name: "Demo Moderator", roles: ["USER", "MODERATOR"] as const },
  { email: "owner@demo.patronos.local", name: "Demo Company Owner", roles: ["USER", "COMPANY_OWNER", "ADVERTISER"] as const },
  { email: "artist@demo.patronos.local", name: "Demo Artist", roles: ["USER", "ARTIST"] as const },
  { email: "member@demo.patronos.local", name: "Demo Member", roles: ["USER"] as const },
];
