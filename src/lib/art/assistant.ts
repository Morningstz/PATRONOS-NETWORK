/**
 * Art Assistant query parser (English + Bahasa Indonesia). Pure: turns a sentence like
 * "lukisan biru yang tenang di bawah 20 juta" or "calm blue abstract under 20m" into filters.
 * No AI service, no data leaves the server — just a transparent keyword grammar.
 */
import { COLOR_FAMILIES, type ColorFamily } from "./color";
import { CATEGORIES } from "./generative";

export type ArtQuery = {
  colorFamilies: ColorFamily[];
  categories: string[];
  moods: string[];
  minPrice?: number;
  maxPrice?: number;
  availableOnly: boolean;
  sort?: "price-asc" | "price-desc" | "newest";
  /** Words that were not understood — shown back to the user, never silently dropped. */
  unmatched: string[];
};

const COLOR_WORDS: Record<string, ColorFamily> = {
  blue: "Blue", navy: "Blue", indigo: "Blue", teal: "Blue", turquoise: "Blue", biru: "Blue", nila: "Blue", tosca: "Blue",
  red: "Red", crimson: "Red", maroon: "Red", merah: "Red",
  orange: "Orange & Yellow", yellow: "Orange & Yellow", gold: "Orange & Yellow", golden: "Orange & Yellow", oranye: "Orange & Yellow", jingga: "Orange & Yellow", kuning: "Orange & Yellow", emas: "Orange & Yellow",
  green: "Green", olive: "Green", emerald: "Green", hijau: "Green",
  purple: "Purple & Pink", violet: "Purple & Pink", pink: "Purple & Pink", magenta: "Purple & Pink", ungu: "Purple & Pink", "merah muda": "Purple & Pink",
  brown: "Earth", earth: "Earth", earthy: "Earth", terracotta: "Earth", sepia: "Earth", coklat: "Earth", cokelat: "Earth", tanah: "Earth",
  black: "Black & Grey", grey: "Black & Grey", gray: "Black & Grey", monochrome: "Black & Grey", hitam: "Black & Grey", abu: "Black & Grey", "abu-abu": "Black & Grey",
  white: "White & Cream", cream: "White & Cream", ivory: "White & Cream", putih: "White & Cream", krem: "White & Cream",
};

const CATEGORY_WORDS: Record<string, string> = {
  painting: "Painting", paintings: "Painting", lukisan: "Painting", melukis: "Painting",
  photo: "Photography", photograph: "Photography", photography: "Photography", foto: "Photography", fotografi: "Photography",
  sculpture: "Sculpture", sculptures: "Sculpture", patung: "Sculpture", skulptur: "Sculpture",
  print: "Print", prints: "Print", cetak: "Print", grafis: "Print",
  textile: "Textile", textiles: "Textile", batik: "Textile", tenun: "Textile", kain: "Textile",
  drawing: "Drawing", drawings: "Drawing", sketch: "Drawing", gambar: "Drawing", sketsa: "Drawing",
  digital: "Digital", "new media": "Digital", generative: "Digital",
  ceramic: "Ceramics", ceramics: "Ceramics", keramik: "Ceramics", gerabah: "Ceramics",
  mixed: "Mixed media", collage: "Mixed media", kolase: "Mixed media",
};

/** Maps to the mood vocabulary stored on artworks (see traitsForSeed). */
const MOOD_WORDS: Record<string, string> = {
  calm: "calm", serene: "calm", quiet: "calm", peaceful: "calm", relaxing: "calm", tenang: "calm", damai: "calm", teduh: "calm",
  bold: "bold", dramatic: "bold", strong: "bold", dramatis: "bold", berani: "bold", kontras: "bold",
  dynamic: "dynamic", energetic: "dynamic", energik: "dynamic", dinamis: "dynamic",
  playful: "playful", fun: "playful", ceria: "playful", "penuh warna": "playful", colourful: "playful", colorful: "playful", meriah: "playful",
  minimal: "minimal", minimalist: "minimal", simple: "minimal", minimalis: "minimal", sederhana: "minimal",
  geometric: "geometric", geometris: "geometric", geometri: "geometric",
  cosmic: "cosmic", space: "cosmic", kosmik: "cosmic", angkasa: "cosmic",
  bright: "light", light: "light", airy: "light", cerah: "light", terang: "light",
  dark: "dark", moody: "dark", night: "dark", gelap: "dark", malam: "dark",
  warm: "warm", hangat: "warm",
  cool: "cool", cold: "cool", dingin: "cool", sejuk: "cool",
};

const STOP = new Set(
  "a an the and or with in of for to some me show find i want looking something art artwork artworks work works piece pieces that is are please my room living bedroom office yang dan atau dengan di ke untuk karya seni cari carikan tampilkan saya ingin mau sebuah buat ada ruang kamar kantor tamu nuansa warna color colour style gaya".split(
    " ",
  ),
);

/** "20 juta" → 20_000_000, "500rb" → 500_000, "20m" → 20_000_000, "Rp 15.000.000" → 15_000_000 */
export function parseAmount(raw: string): number | null {
  const s = raw.toLowerCase().replace(/rp\.?\s*/g, "").trim();
  const m = s.match(/^(\d+(?:[.,]\d+)*)\s*(juta|jt|million|mil|m|ribu|rb|k|thousand|miliar|milyar|billion|bn|b)?$/);
  if (!m) return null;
  const numStr = m[1]!;
  const unit = m[2];
  let n: number;
  if (!unit && /^\d{1,3}([.,]\d{3})+$/.test(numStr)) n = Number(numStr.replace(/[.,]/g, ""));
  else n = Number(numStr.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (unit && /^(juta|jt|million|mil|m)$/.test(unit)) n *= 1_000_000;
  else if (unit && /^(ribu|rb|k|thousand)$/.test(unit)) n *= 1_000;
  else if (unit && /^(miliar|milyar|billion|bn|b)$/.test(unit)) n *= 1_000_000_000;
  return Math.round(n);
}

const AMOUNT = String.raw`((?:rp\.?\s*)?\d+(?:[.,]\d+)*\s*(?:juta|jt|million|mil|m|ribu|rb|k|thousand|miliar|milyar|billion|bn|b)?)\b`;

export function parseArtQuery(input: string): ArtQuery {
  let q = ` ${input.toLowerCase().replace(/[!?;:]/g, " ").replace(/\s+/g, " ")} `;
  const out: ArtQuery = { colorFamilies: [], categories: [], moods: [], availableOnly: false, unmatched: [] };
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    let m: RegExpMatchArray | null;
    while ((m = q.match(re))) {
      fn(m);
      q = q.replace(m[0], " ");
    }
  };

  take(new RegExp(String.raw`\b(?:between|antara)\s+${AMOUNT}\s*(?:and|-|–|to|dan|sampai|hingga)\s*${AMOUNT}`), (m) => {
    const a = parseAmount(m[1]!), b = parseAmount(m[2]!);
    if (a !== null && b !== null) {
      out.minPrice = Math.min(a, b);
      out.maxPrice = Math.max(a, b);
    }
  });
  take(new RegExp(String.raw`\b(?:under|below|less than|max(?:imum)?|up to|budget|di ?bawah|kurang dari|maks(?:imal)?|maksimum|sampai|hingga|budget)\s+${AMOUNT}`), (m) => {
    const a = parseAmount(m[1]!);
    if (a !== null) out.maxPrice = a;
  });
  take(new RegExp(String.raw`\b(?:over|above|more than|at least|min(?:imum)?|di ?atas|lebih dari|minimal)\s+${AMOUNT}`), (m) => {
    const a = parseAmount(m[1]!);
    if (a !== null) out.minPrice = a;
  });
  take(/\b(cheapest|termurah|murah|lowest price|affordable|terjangkau)\b/, () => (out.sort = "price-asc"));
  take(/\b(most expensive|termahal|premium|highest price)\b/, () => (out.sort = "price-desc"));
  take(/\b(newest|latest|terbaru|baru)\b/, () => (out.sort = "newest"));
  take(/\b(available|for sale|buy|dijual|tersedia|beli|bisa dibeli)\b/, () => (out.availableOnly = true));

  // Multi-word keys first
  const multi = (dict: Record<string, string>, push: (v: string) => void) => {
    for (const k of Object.keys(dict).filter((x) => x.includes(" ") || x.includes("-"))) {
      const re = new RegExp(`\\b${k.replace(/[-]/g, "\\-")}\\b`);
      if (re.test(q)) {
        push(dict[k]!);
        q = q.replace(re, " ");
      }
    }
  };
  const addUnique = <T,>(arr: T[], v: T) => {
    if (!arr.includes(v)) arr.push(v);
  };
  multi(COLOR_WORDS, (v) => addUnique(out.colorFamilies, v as ColorFamily));
  multi(MOOD_WORDS, (v) => addUnique(out.moods, v));
  multi(CATEGORY_WORDS, (v) => addUnique(out.categories, v));

  for (const word of q.split(/[\s,./]+/).filter(Boolean)) {
    if (COLOR_WORDS[word]) addUnique(out.colorFamilies, COLOR_WORDS[word]!);
    else if (CATEGORY_WORDS[word]) addUnique(out.categories, CATEGORY_WORDS[word]!);
    else if (MOOD_WORDS[word]) addUnique(out.moods, MOOD_WORDS[word]!);
    else if (!STOP.has(word) && !/^\d+$/.test(word) && word.length > 1) out.unmatched.push(word);
  }
  out.colorFamilies = out.colorFamilies.filter((c) => COLOR_FAMILIES.includes(c));
  out.categories = out.categories.filter((c) => (CATEGORIES as readonly string[]).includes(c));
  return out;
}

export function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n).replace(/ /g, " ");
}

/** Short IDR for chips: 20000000 → "Rp 20 juta" */
export function shortIdr(n: number): string {
  const d = (x: number) => String(+x.toFixed(1)).replace(".", ",");
  if (n >= 1_000_000_000) return `Rp ${d(n / 1_000_000_000)} miliar`;
  if (n >= 1_000_000) return `Rp ${d(n / 1_000_000)} juta`;
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)} ribu`;
  return `Rp ${n}`;
}

export function formatPrice(amount: number, currency: string): string {
  if (currency === "IDR") return formatIdr(amount);
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function describeQuery(q: ArtQuery): string[] {
  const chips: string[] = [];
  chips.push(...q.categories, ...q.colorFamilies, ...q.moods.map((m) => m[0]!.toUpperCase() + m.slice(1)));
  if (q.minPrice !== undefined && q.maxPrice !== undefined) chips.push(`${shortIdr(q.minPrice)} – ${shortIdr(q.maxPrice)}`);
  else if (q.maxPrice !== undefined) chips.push(`Under ${shortIdr(q.maxPrice)}`);
  else if (q.minPrice !== undefined) chips.push(`Over ${shortIdr(q.minPrice)}`);
  if (q.availableOnly) chips.push("Available now");
  if (q.sort === "price-asc") chips.push("Lowest price first");
  if (q.sort === "price-desc") chips.push("Highest price first");
  if (q.sort === "newest") chips.push("Newest first");
  return chips;
}
