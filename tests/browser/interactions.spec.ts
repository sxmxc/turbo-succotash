import { expect, test } from "@playwright/test";
import { loginAndJoin } from "./helpers.js";

test("an authored elevator exposes a local interaction dialog", async ({
  page,
}) => {
  await loginAndJoin(page, "Soft lilac");
  const room = page.locator(".room-canvas");
  await room.focus();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Missing canvas bounds");
  const size = await canvas.evaluate((element) => {
    const surface = element as HTMLCanvasElement;
    return { width: surface.width, height: surface.height };
  });
  const scrollX = Number(await room.getAttribute("data-camera-scroll-x"));
  const scrollY = Number(await room.getAttribute("data-camera-scroll-y"));

  // The authored rectangle is x=640..704, y=160..224. A click-to-move
  // target in its center exercises the same authoritative movement path as play.
  await page.mouse.click(
    box.x + ((672 - scrollX) / size.width) * box.width,
    box.y + ((192 - scrollY) / size.height) * box.height,
  );
  await expect(room).toHaveAttribute("data-active-interaction", "3", {
    timeout: 10_000,
  });
  await page.keyboard.press("E");
  await expect(page.getByRole("dialog")).toHaveAccessibleName(/elevator/i);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("elevator creates a room and navigates back to Floor 0", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The complete creation flow is exercised on desktop.");
  await loginAndJoin(page, "Garden mint");
  const room = page.locator(".room-canvas");
  const moveTo = async (x: number, y: number, interactionId: string) => {
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Missing canvas bounds");
    const size = await canvas.evaluate((element) => {
      const surface = element as HTMLCanvasElement;
      return { width: surface.width, height: surface.height };
    });
    const scrollX = Number(await room.getAttribute("data-camera-scroll-x"));
    const scrollY = Number(await room.getAttribute("data-camera-scroll-y"));
    await page.mouse.click(
      box.x + ((x - scrollX) / size.width) * box.width,
      box.y + ((y - scrollY) / size.height) * box.height,
    );
    await expect(room).toHaveAttribute(
      "data-active-interaction",
      interactionId,
      { timeout: 10_000 },
    );
    await room.focus();
    await page.keyboard.press("E");
  };

  await moveTo(672, 192, "3");
  const roomName = `Browser Room ${crypto.randomUUID().slice(0, 8)}`;
  await page.getByLabel("Room name").fill(roomName);
  await page.getByRole("button", { name: "Create and enter" }).click();
  await expect(page.locator(".room-label")).toContainText(roomName);
  await expect(page.locator("canvas")).toHaveJSProperty("width", 800);
  await expect(room).toHaveAttribute("data-camera-scroll-x", "-160");
  await expect(room).toHaveAttribute("data-camera-scroll-y", "-140");

  await moveTo(240, 286, "1");
  await page.getByRole("button", { name: /F000-R000 · Floor 0 Lobby/ }).click();
  await expect(page.locator(".room-label")).toContainText("F000-R000");
  await expect(page.locator("canvas")).toHaveJSProperty("width", 800);
});

test("room allocation is concurrent and private admission is enforced", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The API invariants are exercised once on desktop.");
  await loginAndJoin(page, "Warm sand");
  const suffix = crypto.randomUUID().slice(0, 8);
  const created = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      page.request.post("/api/v1/rooms", {
        data: { name: `Concurrent ${suffix}-${index}`, private: false },
      }),
    ),
  );
  expect(created.every((response) => response.status() === 201)).toBe(true);
  const addresses = await Promise.all(
    created.map(async (response) => (await response.json()).address as string),
  );
  expect(new Set(addresses).size).toBe(addresses.length);
  expect(
    addresses.every((address) =>
      /^F\d{3}-R(?:00[1-9]|0[1-9]\d|[1-4]\d{2}|500)$/.test(address),
    ),
  ).toBe(true);
  const directory = await (await page.request.get("/api/v1/rooms")).json();
  expect(directory.rooms).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ address: "F000-R000", name: "Floor 0 Lobby" }),
      expect.objectContaining({ address: "F001-R000", name: "Floor 1 Lobby" }),
    ]),
  );

  const password = "private room password";
  const privateResponse = await page.request.post("/api/v1/rooms", {
    data: { name: `Private ${suffix}`, private: true, password },
  });
  expect(privateResponse.status()).toBe(201);
  const privateRoom = await privateResponse.json();
  expect(
    (
      await page.request.post(
        `/api/v1/rooms/${privateRoom.address}/admission`,
        { data: { password: "incorrect password" } },
      )
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(
        `/api/v1/rooms/${privateRoom.address}/admission`,
        { data: { password } },
      )
    ).status(),
  ).toBe(200);
});
