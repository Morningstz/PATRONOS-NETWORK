import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

const COMPANY = "/companies/e2e-real-studio";

test.describe.configure({ mode: "serial" });

test("admin area requires sign-in and a staff role", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin/);
  await signInAs(page, "member");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/forbidden/);
});

test("member claims a real company and sees it pending", async ({ page }) => {
  await signInAs(page, "member", COMPANY);
  await page.getByLabel("Work email").fill("founder@e2e-real-studio.test");
  await page.getByLabel("Your role").fill("Founder");
  await page.getByRole("button", { name: "Submit claim" }).click();
  // After the action the page re-renders server-side and shows the pending state
  await expect(page.getByRole("status").filter({ hasText: /Claim submitted|pending review/ })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.locator("#d-claims").locator("..")).toContainText("E2E Real Studio");
  await expect(page.locator("#d-claims").locator("..")).toContainText("pending");
});

test("moderator approves the claim but cannot verify or open settings", async ({ page }) => {
  await signInAs(page, "moderator", "/admin/claims");
  const row = page.getByRole("row", { name: /E2E Real Studio/ });
  await expect(row).toContainText("Email domain matches website");
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Claim approved." })).toBeVisible();

  await page.goto("/admin/companies?q=E2E");
  const companyRow = page.getByRole("row", { name: /E2E Real Studio/ });
  await expect(companyRow).toContainText("claimed");
  await expect(companyRow.getByRole("button", { name: "Verify" })).toHaveCount(0);

  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/forbidden/);
});

test("claimed company shows the Claimed badge publicly, not Verified", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto(COMPANY);
  await expect(page.getByText("Claimed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("This profile is managed by the company.")).toBeVisible();
});

test("admin verifies the company and the action is audit-logged", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  await signInAs(page, "admin", "/admin/companies?q=E2E");
  await page.getByRole("row", { name: /E2E Real Studio/ }).getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  await page.goto(COMPANY);
  await expect(page.getByTitle(/^Verified by PATRONOS on /).first()).toBeVisible();

  await page.goto("/admin/audit");
  await expect(page.getByRole("cell", { name: "company.verify" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "claim.approved" }).first()).toBeVisible();
});

test("the homepage Live pill reflects a real verification", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "New verified company" })).toContainText("E2E Real Studio");
});

test("demo companies can never be verified, even by an admin", async ({ page }) => {
  await signInAs(page, "admin", "/admin/companies?demo=1");
  await expect(page.getByRole("button", { name: "Verify" })).toHaveCount(0);
});

test("admin can hide demo data publicly and show it again", async ({ page }) => {
  await signInAs(page, "admin", "/admin/settings");
  await page.getByRole("button", { name: "Hide demo data" }).click();
  await expect(page.getByText("Demo data is now hidden publicly.")).toBeVisible();

  await page.goto("/companies");
  await expect(page.getByRole("status").first()).toHaveText(/^1 company$/);
  await expect(page.getByRole("link", { name: "E2E Real Studio" })).toBeVisible();
  await page.goto("/companies/ambrevale-agrisystems");
  await expect(page.getByText("This page isn’t in the collection.")).toBeVisible();

  await page.goto("/admin/settings");
  await page.getByRole("button", { name: "Show demo data" }).click();
  await expect(page.getByText("Demo data is now visible publicly.")).toBeVisible();
});

test("signed-in member can send an artwork inquiry", async ({ page }) => {
  await signInAs(page, "member", "/art/ochre-bloom-elodie-fanchere");
  await page.getByLabel(/Your message about/).fill("Could you share shipping options to Surabaya?");
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(page.getByRole("status")).toContainText("demo artwork");
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Ochre Bloom" })).toBeVisible();
});

test("dev sign-in rejects open redirects", async ({ page }) => {
  await signInAs(page, "member", "/dashboard");
  await page.context().clearCookies();
  await page.goto("/sign-in?next=https://evil.example");
  await page.getByRole("button", { name: /member@demo/ }).click();
  await page.waitForLoadState("networkidle");
  expect(new URL(page.url()).host).toBe(new URL(page.context().pages()[0]!.url()).host);
  await expect(page).toHaveURL(/\/dashboard$/);
});
