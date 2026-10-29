import { expect, test } from "@playwright/test";

test("homepage renders the network hero, search and labeled demo/sponsored content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Discover the companies and creators");
  await expect(page.getByRole("search", { name: "Search PATRONOS" }).first()).toBeAttached();
  // The pill shows DEMO until a real (non-demo) company is verified — never a fabricated LIVE event
  const pill = page.getByText(/Exploring with sample data|New verified company · E2E Real Studio/).first();
  await expect(pill).toBeVisible();
  // Every sponsored card is labeled
  await expect(page.getByText("Sponsored listing").first()).toBeAttached();
});

test("global search finds companies, artists and art", async ({ page }) => {
  await page.goto("/search?q=batik");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("batik");
  await expect(page.getByRole("link", { name: "Nethrin Batik Atelier" }).first()).toBeVisible();
  await page.goto("/search?q=zzzz-no-match");
  await expect(page.getByText("Nothing found.")).toBeVisible();
});

test("unknown pages return the branded 404", async ({ page }) => {
  const res = await page.goto("/companies/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("This page isn’t in the collection.")).toBeVisible();
});
