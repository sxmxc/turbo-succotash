import { test, expect } from "@playwright/test";
import { loginAndJoin } from "./helpers.js";

test("canvas loads, movement responds, and panel remains reachable", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await loginAndJoin(page, "Soft lilac");
  await expect(page.getByText("Scene ready", { exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.locator(".room-canvas").focus();
  const before = await page.locator("canvas").screenshot();
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => before.equals(await page.locator("canvas").screenshot()))
    .toBe(false);
  await page.keyboard.up("ArrowRight");
  const after = await page.locator("canvas").screenshot();
  expect(before.equals(after)).toBe(false);
  const panel = page.getByRole("region", { name: "Room panel" });
  const initial = await panel.boundingBox();
  expect(initial).toBeTruthy();
  if (!isMobile && initial) {
    const handle = page.getByRole("button", {
      name: "Move room panel with arrow keys or drag",
    });
    const box = await handle.boundingBox();
    if (!box) throw new Error("Missing handle");
    await page.mouse.move(box.x + 70, box.y + 15);
    await page.mouse.down();
    await page.mouse.move(box.x + 370, box.y + 170, { steps: 8 });
    await page.mouse.up();
    const moved = await panel.boundingBox();
    expect(moved!.x).toBeGreaterThan(initial.x + 100);
    await handle.focus();
    await page.keyboard.press("ArrowLeft");
    expect((await panel.boundingBox())!.x).toBeLessThan(moved!.x);
    await page.setViewportSize({ width: 700, height: 600 });
    const resized = await panel.boundingBox();
    expect(resized!.x + resized!.width).toBeLessThanOrEqual(700);
    expect(resized!.y + resized!.height).toBeLessThanOrEqual(600);
    await page.setViewportSize({ width: 900, height: 300 });
    const short = await panel.boundingBox();
    expect(short!.y + short!.height).toBeLessThanOrEqual(300);
    await page.getByLabel("Message the room").scrollIntoViewIfNeeded();
    await expect(page.getByLabel("Message the room")).toBeVisible();
  } else {
    await panel.scrollIntoViewIfNeeded();
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }
  expect(errors).toEqual([]);
});
