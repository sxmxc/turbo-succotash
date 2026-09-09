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
  const room = page.locator(".room-canvas");
  await room.focus();
  await expect
    .poll(async () => Number(await room.getAttribute("data-player-x")))
    .toBeGreaterThan(0);
  const beforeX = Number(await room.getAttribute("data-player-x"));
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(async () => Number(await room.getAttribute("data-player-x")))
    .toBeGreaterThan(beforeX);
  await page.keyboard.up("ArrowRight");
  const afterKeyboardX = Number(await room.getAttribute("data-player-x"));
  const afterKeyboardY = Number(await room.getAttribute("data-player-y"));
  const canvas = page.locator("canvas");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Missing canvas bounds");
  expect(canvasBox.width).toBeGreaterThanOrEqual(isMobile ? 300 : 800);
  const canvasSize = await canvas.evaluate((element) => {
    const surface = element as HTMLCanvasElement;
    return { width: surface.width, height: surface.height };
  });
  const scrollX = Number(await room.getAttribute("data-camera-scroll-x"));
  const scrollY = Number(await room.getAttribute("data-camera-scroll-y"));
  await page.mouse.click(
    canvasBox.x +
      ((afterKeyboardX + 24 - scrollX) / canvasSize.width) * canvasBox.width,
    canvasBox.y +
      ((afterKeyboardY - scrollY) / canvasSize.height) * canvasBox.height,
  );
  await expect
    .poll(async () => Number(await room.getAttribute("data-player-x")))
    .toBeGreaterThan(afterKeyboardX);
  const panel = page.getByRole("region", { name: "Room panel" });
  const initial = await panel.boundingBox();
  expect(initial).toBeTruthy();
  if (!isMobile && initial) {
    const handle = page.getByRole("button", {
      name: "Move room panel with arrow keys or drag",
    });
    const box = await handle.boundingBox();
    if (!box) throw new Error("Missing handle");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
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
    await page.getByPlaceholder("Say hello…").scrollIntoViewIfNeeded();
    await expect(page.getByPlaceholder("Say hello…")).toBeVisible();
  } else {
    await panel.scrollIntoViewIfNeeded();
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }
  expect(errors).toEqual([]);
});
