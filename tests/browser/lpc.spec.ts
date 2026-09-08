import { test, expect } from "@playwright/test";
import { catalog } from "../../apps/web/src/game/appearance.js";
import { loginAndJoin } from "./helpers.js";

test("local LPC files load and all directions stand and walk", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await loginAndJoin(page);
  await expect(page.getByText("Scene ready", { exact: true })).toBeVisible();
  for (const asset of catalog) {
    const response = await page.request.get(asset.url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  const canvas = page.locator("canvas");
  for (const [index, key] of ["w", "a", "s", "d"].entries()) {
    if (index > 0) {
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Hello, Browser Regression." }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Enter the Lobby" }).click();
      await expect(
        page.getByText("Scene ready", { exact: true }),
      ).toBeVisible();
    }
    await page.locator(".room-canvas").focus();
    const standing = await canvas.screenshot();
    await page.keyboard.down(key);
    await expect
      .poll(async () => standing.equals(await canvas.screenshot()), {
        message: `${key} should render a walking frame or moved position`,
      })
      .toBe(false);
    await page.keyboard.up(key);
    await page.waitForTimeout(500);
    const stopped = await canvas.screenshot();
    await page.waitForTimeout(120);
    expect(stopped.equals(await canvas.screenshot())).toBe(true);
  }
  await page.getByRole("link", { name: "Character art credits" }).click();
  await expect(
    page.getByRole("heading", { name: "Character art credits" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download original PNG" }),
  ).toHaveCount(5);
  expect(failures).toEqual([]);
});

test("missing LPC asset reports failure instead of ready", async ({ page }) => {
  await page.route("**/assets/lpc/hair.png", (route) => route.abort());
  await loginAndJoin(page, "Warm sand", false);
  await expect(
    page.getByText("Character assets failed to load. Reload to retry."),
  ).toBeVisible();
  await expect(page.getByText("Scene ready", { exact: true })).toHaveCount(0);
});
