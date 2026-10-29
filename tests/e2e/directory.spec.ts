import { expect, test } from "@playwright/test";

test("country directory only lists companies from that country", async ({ page }) => {
  await page.goto("/discover/japan");
  await expect(page.getByRole("heading", { level: 1, name: "Japan" })).toBeVisible();
  const cards = page.locator("main ul li article");
  await expect(cards.first()).toBeVisible();
  for (const text of await cards.allInnerTexts()) expect(text).toContain("Japan");
});

test("filters are reflected in the URL and narrow results", async ({ page }) => {
  await page.goto("/companies");
  const total = Number((await page.getByRole("status").first().innerText()).replace(/\D/g, ""));
  await page.getByLabel("Collaboration").selectOption("OPEN");
  await page.waitForURL(/collaboration=OPEN/);
  const filtered = Number((await page.getByRole("status").first().innerText()).replace(/\D/g, ""));
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(total);
  await expect(page.locator("main ul article").first()).toContainText("Open to collaboration");
});

test("invalid filter values are ignored instead of erroring", async ({ page }) => {
  const res = await page.goto("/companies?verification=HACKED&page=-9&country=%3Cscript%3E");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Companies" })).toBeVisible();
});

test("industry pages include sub-industries", async ({ page }) => {
  await page.goto("/industries/creative-economy");
  await expect(page.getByRole("link", { name: "Design & Branding" })).toBeVisible();
  const count = Number((await page.getByRole("status").first().innerText()).replace(/\D/g, ""));
  expect(count).toBeGreaterThan(0);
});

test("demo company profile is labeled and cannot be claimed", async ({ page }) => {
  await page.goto("/companies/ambrevale-agrisystems");
  await expect(page.getByRole("note")).toContainText("DEMO");
  await expect(page.getByText("This is a fictional demo profile, so it can’t be claimed.")).toBeVisible();
  // demo pages are not indexable
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("artwork pages show the work and its provenance", async ({ page }) => {
  await page.goto("/art");
  await page.locator("main article h3 a").first().click();
  await expect(page.getByRole("heading", { name: "Provenance & history" })).toBeVisible();
  await expect(page.getByRole("img", { name: /generated demo artwork/ }).first()).toBeVisible();
});
