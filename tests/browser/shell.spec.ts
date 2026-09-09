import { test, expect } from "@playwright/test";
import { loginAndJoin } from "./helpers.js";

test("canvas loads, movement responds, and chat remains reachable", async ({
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
  expect(canvasBox.width).toBeGreaterThanOrEqual(isMobile ? 300 : 700);
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
  const chat = page.getByRole("complementary", {
    name: "Chat and direct messages",
  });
  await chat.scrollIntoViewIfNeeded();
  await expect(chat).toBeVisible();
  const bounds = await chat.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.getByRole("button", { name: "Toggle room fullscreen" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.fullscreenElement?.className ?? ""),
    )
    .toContain("play-layout");
  await expect(chat).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});
