import { test } from "@playwright/test";
import { expectAccessible, signInAs } from "./helpers";

for (const path of ["/", "/companies", "/discover", "/discover/indonesia", "/companies/ambrevale-agrisystems", "/art", "/art/ochre-bloom-elodie-fanchere", "/artists/sekar-arundati", "/advertise", "/sign-in", "/journal/how-verification-works"]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("is-visible")));
    await page.waitForTimeout(800);
    await expectAccessible(page);
  });
}

test("no serious accessibility violations in the admin claims queue", async ({ page }) => {
  await signInAs(page, "admin", "/admin/claims");
  await expectAccessible(page);
});
