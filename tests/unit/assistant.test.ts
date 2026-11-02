import { describe, expect, it } from "vitest";
import { describeQuery, formatIdr, parseAmount, parseArtQuery, shortIdr } from "@/lib/art/assistant";

describe("parseAmount", () => {
  it("reads Indonesian and English units", () => {
    expect(parseAmount("20 juta")).toBe(20_000_000);
    expect(parseAmount("20jt")).toBe(20_000_000);
    expect(parseAmount("500rb")).toBe(500_000);
    expect(parseAmount("1,5 juta")).toBe(1_500_000);
    expect(parseAmount("20m")).toBe(20_000_000);
    expect(parseAmount("Rp 15.000.000")).toBe(15_000_000);
    expect(parseAmount("2 miliar")).toBe(2_000_000_000);
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("parseArtQuery", () => {
  it("parses a Bahasa Indonesia request", () => {
    const q = parseArtQuery("Carikan lukisan biru yang tenang di bawah 20 juta yang tersedia");
    expect(q.categories).toEqual(["Painting"]);
    expect(q.colorFamilies).toEqual(["Blue"]);
    expect(q.moods).toEqual(["calm"]);
    expect(q.maxPrice).toBe(20_000_000);
    expect(q.availableOnly).toBe(true);
    expect(q.unmatched).toEqual([]);
  });

  it("parses an English request with a range and sort", () => {
    const q = parseArtQuery("bold red and gold prints between 10m and 30m, cheapest first");
    expect(q.categories).toEqual(["Print"]);
    expect(q.colorFamilies).toEqual(["Red", "Orange & Yellow"]);
    expect(q.moods).toEqual(["bold"]);
    expect(q.minPrice).toBe(10_000_000);
    expect(q.maxPrice).toBe(30_000_000);
    expect(q.sort).toBe("price-asc");
  });

  it("handles multi-word colours and keeps unknown words visible", () => {
    const q = parseArtQuery("karya merah muda untuk kamar zebra");
    expect(q.colorFamilies).toEqual(["Purple & Pink"]);
    expect(q.unmatched).toEqual(["zebra"]);
  });

  it("describes the interpretation as chips", () => {
    expect(describeQuery(parseArtQuery("calm green photography over 5 juta"))).toEqual(["Photography", "Green", "Calm", "Over Rp 5 juta"]);
  });
});

describe("IDR formatting", () => {
  it("uses Indonesian grouping", () => {
    expect(formatIdr(45_000_000)).toBe("Rp 45.000.000");
    expect(shortIdr(12_500_000)).toBe("Rp 12,5 juta");
  });
});
