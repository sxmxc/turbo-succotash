import { test, expect } from "@playwright/test";
test("canvas loads, preview responds, and panel remains reachable", async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Scene ready", { exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  const before = await page.locator("canvas").screenshot();
  await page.getByLabel("Preview tint").selectOption({ label: "Soft lilac" });
  await page.waitForTimeout(100);
  const after = await page.locator("canvas").screenshot();
  expect(before.equals(after)).toBe(false);
  const panel = page.getByRole("region", { name: "Preview panel" });
  const initial = await panel.boundingBox();
  expect(initial).toBeTruthy();
  if (!isMobile && initial) {
    const handle = page.getByRole("button", {
      name: "Move preview panel with arrow keys or drag",
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
  } else {
    await panel.scrollIntoViewIfNeeded();
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }
  expect(errors).toEqual([]);
});
