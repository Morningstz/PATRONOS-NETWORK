import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const USERS = {
  admin: "admin@demo.patronos.local",
  moderator: "moderator@demo.patronos.local",
  owner: "owner@demo.patronos.local",
  member: "member@demo.patronos.local",
} as const;

export async function signInAs(page: Page, who: keyof typeof USERS, next = "/dashboard") {
  await page.context().clearCookies();
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: new RegExp(USERS[who].replace(/\./g, "\\.")) }).click();
  await page.waitForURL((u) => u.pathname === next.split("?")[0]);
}

/** Fails on any serious or critical WCAG A/AA violation. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes) e.g. ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}
