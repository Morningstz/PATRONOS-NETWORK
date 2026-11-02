import { expect, test } from "@playwright/test";
import { expectAccessible, signInAs } from "./helpers";

test.describe("Studio", () => {
  test("paints, animates, writes prompts and exports a PNG", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/studio");
    const canvas = page.getByTestId("studio-canvas");
    await expect(canvas).toHaveAttribute("data-progress", "100", { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Pause motion" })).toBeVisible();

    await page.getByRole("button", { name: "Stained Glass" }).click();
    await page.getByRole("button", { name: "Harbour at night" }).click();
    await expect(canvas).toHaveAttribute("data-progress", "100", { timeout: 30_000 });
    // The canvas actually has paint on it
    const painted = await canvas.evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 400) if (d[i]! + d[i + 1]! + d[i + 2]! > 60) lit++;
      return lit;
    });
    expect(painted).toBeGreaterThan(100);

    await page.getByLabel("What is in the picture?").fill("a harbour at night with fishing boats");
    await page.getByRole("tab", { name: "Animation" }).click();
    await expect(page.getByTestId("prompt-text")).toContainText("seamless 6-second loop");
    await page.getByRole("tab", { name: "Image" }).click();
    await expect(page.getByTestId("prompt-text")).toContainText("a harbour at night with fishing boats");
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("stained-glass window of a harbour at night");

    const download = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByRole("button", { name: "PNG 2048" }).click();
    expect((await download).suggestedFilename()).toMatch(/2048px\.png$/);
  });

  test("is accessible", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByTestId("studio-canvas")).toHaveAttribute("data-progress", "100", { timeout: 30_000 });
    await expectAccessible(page);
  });
});

test("Art Lens finds colour matches without uploading the photo", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => r.method() === "POST" && posts.push(r.postData() ?? ""));
  await page.goto("/lens");
  await page.getByRole("button", { name: "Volcano at dawn" }).click();
  await expect(page.getByTestId("lens-matches").getByRole("listitem").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/% colour match/).first()).toBeVisible();
  // Only numbers go to the server — never image data
  expect(posts.join("").includes("data:image")).toBe(false);
  await expectAccessible(page);
});

test("Art Assistant reads Bahasa Indonesia and English", async ({ page }) => {
  await page.goto("/assistant");
  await page.getByLabel("What are you looking for?").fill("karya biru yang tenang di bawah 30 juta");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText("How I read it")).toBeVisible();
  for (const chip of ["Blue", "Calm", "Under Rp 30 juta"]) await expect(page.locator(".chip", { hasText: chip })).toBeVisible();
  await expectAccessible(page);
});

test("Browse filters narrow the gallery wall", async ({ page }) => {
  await page.goto("/art");
  const all = await page.locator(".gallery-wall article").count();
  await page.getByLabel("Colour").selectOption("Blue");
  await page.waitForURL(/color=Blue/);
  const blue = await page.locator(".gallery-wall article").count();
  expect(blue).toBeGreaterThan(0);
  expect(blue).toBeLessThanOrEqual(all);
});

test("Discover Daily, saving and the collection page", async ({ page }) => {
  await page.goto("/daily");
  await expect(page.getByText("1 / 10")).toBeVisible();
  await page.getByRole("button", { name: "Keep →" }).click();
  await expect(page.getByText("2 / 10")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("3 / 10")).toBeVisible();

  await signInAs(page, "member", "/art");
  await page.locator(".gallery-wall article a").first().click();
  await page.waitForURL(/\/art\/[^/?]+$/);
  const title = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const save = page.getByRole("button", { name: /Save this work|Remove from saved/ });
  if ((await save.getAttribute("aria-pressed")) === "true") {
    await save.click();
    await expect(page.getByRole("button", { name: "Save this work" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Save this work" }).click();
  await expect(page.getByRole("button", { name: "Remove from saved" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "View in a room" }).click();
  await expect(page.getByText(/Shown to scale beside a 210 cm sofa/)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expectAccessible(page);
});

test("signed-out visitors are asked to sign in before saving", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/saved");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fsaved|\/sign-in\?next=\/saved/);
});
