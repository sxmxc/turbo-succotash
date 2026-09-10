import { test, expect, type Page } from "@playwright/test";
import { browserAccount } from "./global-setup.js";

const adminHeaders = { "x-admin-token": process.env.ADMIN_API_TOKEN ?? "" };
const authHeaders = {
  origin: new URL(
    process.env.SMOKE_URL ??
      process.env.PUBLIC_ORIGIN ??
      "http://localhost:8080",
  ).origin,
};
const password = "correct horse battery staple";

async function registerAndJoin(page: Page, email: string, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Need an account? Register" }).click();
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: `Hello, ${name}.` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter the Lobby" }).click();
  await expect(page.locator(".server-connection")).toContainText(/connected/i);
  await expect(page.locator("canvas")).toBeVisible();
}
test("beta gate invariants hold through the common-origin identity API", async ({
  request,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Identity race is exercised once by the desktop project.",
  );
  await request.patch("/identity/admin/registration", {
    headers: adminHeaders,
    data: { betaGateEnabled: true },
  });
  const issued = await request.post("/identity/admin/beta-keys", {
    headers: adminHeaders,
  });
  expect(issued.status()).toBe(201);
  const beta = await issued.json();
  const suffix = crypto.randomUUID();
  const candidates = [
    { email: `race-a-${suffix}@example.test`, name: "Race A" },
    { email: `race-b-${suffix}@example.test`, name: "Race B" },
  ];
  const results = await Promise.all(
    candidates.map((candidate) =>
      request.post("/identity/auth/sign-up/email", {
        data: { ...candidate, password, betaKey: beta.key },
      }),
    ),
  );
  expect(results.map((response) => response.status()).sort()).toEqual([
    200, 403,
  ]);
  const winner = candidates[results.findIndex((response) => response.ok())];
  expect(winner).toBeTruthy();

  const reuse = await request.post("/identity/auth/sign-up/email", {
    data: {
      email: `reuse-${suffix}@example.test`,
      name: "Reuse",
      password,
      betaKey: beta.key,
    },
  });
  expect(reuse.status()).toBe(403);

  const revokable = await request.post("/identity/admin/beta-keys", {
    headers: adminHeaders,
  });
  const revoked = await revokable.json();
  expect(
    (
      await request.delete(`/identity/admin/beta-keys/${revoked.id}`, {
        headers: adminHeaders,
      })
    ).status(),
  ).toBe(204);
  expect(
    (
      await request.post("/identity/auth/sign-up/email", {
        data: {
          email: `revoked-${suffix}@example.test`,
          name: "Revoked",
          password,
          betaKey: revoked.key,
        },
      })
    ).status(),
  ).toBe(403);

  await request.post("/identity/auth/sign-out", { headers: authHeaders });
  expect(
    (
      await request.post("/identity/auth/sign-in/email", {
        headers: authHeaders,
        data: { email: winner!.email, password, rememberMe: true },
      })
    ).status(),
  ).toBe(200);
});

test("saved appearance survives a new page load", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Appearance persistence is exercised once on desktop.");
  await page.goto("/");
  await page.getByLabel("Email").fill(browserAccount.email);
  await page.getByLabel("Password").fill(browserAccount.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: `Hello, ${browserAccount.name}.` }),
  ).toBeVisible();
  const shirt = page.getByLabel("Shirt color");
  try {
    await shirt.selectOption({ label: "Garden mint" });
    await page.getByRole("button", { name: "Save appearance" }).click();
    await expect(
      page.getByText("Appearance saved.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(shirt).toHaveValue(String(0xaadbc4));
  } finally {
    if (await shirt.isVisible().catch(() => false)) {
      await shirt.selectOption({ label: "Warm sand" });
      await page.getByRole("button", { name: "Save appearance" }).click();
    }
  }
});

test("two sessions use mentions, reactions, friendship, and cross-room DMs", async ({
  browser,
  request,
  isMobile,
}) => {
  test.setTimeout(90_000);
  test.skip(
    isMobile,
    "Two-session flow is exercised once by the desktop project.",
  );
  await request.patch("/identity/admin/registration", {
    headers: adminHeaders,
    data: { betaGateEnabled: false },
  });
  const suffix = crypto.randomUUID();
  const firstEmail = `one-${suffix}@example.test`;
  const secondEmail = `two-${suffix}@example.test`;
  const desktopViewport = { width: 1920, height: 1080 };
  const firstContext = await browser.newContext({ viewport: desktopViewport });
  const secondContext = await browser.newContext({ viewport: desktopViewport });
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await Promise.all([
      registerAndJoin(first, firstEmail, "One"),
      registerAndJoin(second, secondEmail, "Two"),
    ]);
    await expect(first.locator(".room-presence")).toHaveText(/\d+ online now/);
    await expect(second.locator(".room-presence")).toHaveText(/\d+ online now/);
    for (const page of [first, second]) {
      await expect
        .poll(async () =>
          Number(
            await page
              .locator(".room-canvas")
              .getAttribute("data-rendered-player-count"),
          ),
        )
        .toBeGreaterThanOrEqual(2);
      await page
        .getByRole("button", { name: "Open Room conversation" })
        .click();
    }

    await first.reload();
    await expect(
      first.getByRole("heading", { name: "Hello, One." }),
    ).toBeVisible();
    await first.getByRole("button", { name: "Enter the Lobby" }).click();
    await expect(first.locator(".server-connection")).toContainText(
      /connected/i,
    );
    for (const page of [first, second]) {
      await expect(page.locator(".room-presence")).toHaveText(/\d+ online now/);
      await expect
        .poll(async () =>
          Number(
            await page
              .locator(".room-canvas")
              .getAttribute("data-rendered-player-count"),
          ),
        )
        .toBeGreaterThanOrEqual(2);
    }
    await first.getByRole("button", { name: "Open Room conversation" }).click();

    const chat = first.getByPlaceholder("Say hello…");
    const firstRoom = first.locator(".room-canvas");
    await expect
      .poll(async () => Number(await firstRoom.getAttribute("data-player-x")))
      .toBeGreaterThan(0);
    const stableX = await firstRoom.getAttribute("data-player-x");
    const stableY = await firstRoom.getAttribute("data-player-y");
    await chat.click();
    await first.keyboard.type("wasd with spaces");
    await expect(chat).toHaveValue("wasd with spaces");
    await first.waitForTimeout(450);
    expect(await firstRoom.getAttribute("data-player-x")).toBe(stableX);
    expect(await firstRoom.getAttribute("data-player-y")).toBe(stableY);
    await chat.fill("hello from one");
    await chat.press("Enter");
    await expect(
      second
        .locator(".acc-message-row")
        .getByText("hello from one", { exact: true }),
    ).toBeVisible();
    await expect(
      first
        .locator(".acc-message-row-me")
        .filter({ hasText: "hello from one" })
        .locator(".acc-message-meta svg"),
    ).toHaveCount(0);

    const mentionedChat = first.getByPlaceholder("Say hello…");
    await mentionedChat.fill("@Tw");
    await first.locator(".acc-tags-username", { hasText: "Two" }).click();
    await mentionedChat.pressSequentially("come say hello");
    await mentionedChat.press("Enter");
    await expect(
      second.locator(".acc-message-row").getByText(/@Two come say hello/),
    ).toBeVisible();

    const receivedMessage = second
      .locator(".acc-message-row")
      .filter({ hasText: "hello from one" });
    await receivedMessage.hover();
    await receivedMessage.getByRole("button", { name: "Add reaction" }).click();
    await second.getByRole("menuitem", { name: "React with 👍" }).click();
    await expect(
      first.getByRole("button", { name: /👍 reaction from 1 person/ }),
    ).toBeVisible();

    await first.getByRole("button", { name: /Friends & people/ }).click();
    await expect(
      first.getByRole("dialog", { name: "Friends & people" }),
    ).toBeVisible();
    await first
      .locator(".person-row", { hasText: "Two" })
      .getByRole("button", { name: "Add friend" })
      .click();
    await expect(
      first.getByText("Request sent", { exact: true }),
    ).toBeVisible();
    await second.getByRole("button", { name: /Friends & people/ }).click();
    await second.getByRole("button", { name: "Refresh" }).click();
    await second
      .locator(".person-row")
      .filter({ hasText: "wants to be friends" })
      .getByRole("button", { name: "Accept" })
      .click();
    await first.getByRole("button", { name: "Refresh" }).click();
    await first
      .getByRole("button", { name: "Close friends and people" })
      .click();
    await second
      .getByRole("button", { name: "Close friends and people" })
      .click();
    if (!(await first.getByRole("button", { name: "Open Two" }).isVisible()))
      await first.getByRole("button", { name: "Toggle chat list" }).click();
    if (!(await second.getByRole("button", { name: "Open One" }).isVisible()))
      await second.getByRole("button", { name: "Toggle chat list" }).click();
    await expect(first.getByRole("button", { name: "Open Two" })).toBeVisible();

    const secondRoom = second.locator(".room-canvas");
    const secondCanvas = second.locator("canvas");
    const secondBox = await secondCanvas.boundingBox();
    if (!secondBox) throw new Error("Missing second canvas bounds");
    const secondSize = await secondCanvas.evaluate((element) => {
      const surface = element as HTMLCanvasElement;
      return { width: surface.width, height: surface.height };
    });
    const secondScrollX = Number(
      await secondRoom.getAttribute("data-camera-scroll-x"),
    );
    const secondScrollY = Number(
      await secondRoom.getAttribute("data-camera-scroll-y"),
    );
    await second.mouse.click(
      secondBox.x +
        ((624 - secondScrollX) / secondSize.width) * secondBox.width,
      secondBox.y +
        ((192 - secondScrollY) / secondSize.height) * secondBox.height,
    );
    await expect(secondRoom).toHaveAttribute("data-active-interaction", "13", {
      timeout: 10_000,
    });
    await secondRoom.focus();
    await second.keyboard.press("E");
    await expect(second.locator(".room-label")).toContainText("Apartment");

    await first.getByRole("button", { name: "Open Two" }).click();
    await first.getByPlaceholder("Say hello…").fill("typing privately");
    await expect(
      second.getByRole("button", { name: "Open One" }).locator(".."),
    ).toContainText(/typing/i);
    await first.getByPlaceholder("Say hello…").fill("private hello");
    await first.getByPlaceholder("Say hello…").press("Enter");
    const oneChat = second
      .getByRole("button", { name: "Open One" })
      .locator("..");
    await expect(oneChat).toContainText("private hello");
    await expect(oneChat.locator(".acc-room-badge")).toHaveText("1");
    await second.getByRole("button", { name: "Open One" }).click();
    await expect(
      second
        .locator(".acc-message-row")
        .getByText("private hello", { exact: true }),
    ).toBeVisible();
    await expect(
      first
        .locator(".acc-message-row-me")
        .filter({ hasText: "private hello" })
        .locator('.acc-message-meta [id*="seen"]'),
    ).toBeVisible();

    await second.getByRole("button", { name: "Sign out" }).click();
    await expect(second.getByRole("button", { name: "Sign in" })).toBeVisible();
    await first.getByRole("button", { name: /Friends & people/ }).click();
    await first.getByRole("button", { name: "Refresh" }).click();
    await expect(
      first
        .locator(".person-row", { hasText: "Two" })
        .locator(".online-dot.offline"),
    ).toBeVisible();
    await first
      .getByRole("button", { name: "Close friends and people" })
      .click();

    await first.getByPlaceholder("Say hello…").fill("sent while offline");
    await first.getByPlaceholder("Say hello…").press("Enter");
    await expect(
      first
        .locator(".acc-message-row-me")
        .filter({ hasText: "sent while offline" })
        .locator("#acc-icon-checkmark"),
    ).toBeVisible();

    const signIn = await secondContext.request.post(
      "/identity/auth/sign-in/email",
      {
        headers: authHeaders,
        data: { email: secondEmail, password, rememberMe: true },
      },
    );
    expect(signIn.ok()).toBe(true);
    await second.reload();
    await expect(
      second.getByRole("heading", { name: "Hello, Two." }),
    ).toBeVisible();
    await second.getByRole("button", { name: "Enter the Lobby" }).click();
    await expect(second.locator(".server-connection")).toContainText(
      /connected/i,
    );
    const persistedChat = second
      .getByRole("button", { name: "Open One" })
      .locator("..");
    await expect(persistedChat).toContainText("sent while offline");
    await expect(persistedChat.locator(".acc-room-badge")).toHaveText("1");
    await second.getByRole("button", { name: "Open One" }).click();
    await expect(
      second
        .locator(".acc-message-row")
        .getByText("sent while offline", { exact: true }),
    ).toBeVisible();
    await expect(
      first
        .locator(".acc-message-row-me")
        .filter({ hasText: "sent while offline" })
        .locator('.acc-message-meta [id*="seen"]'),
    ).toBeVisible();
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
    await request.patch("/identity/admin/registration", {
      headers: adminHeaders,
      data: { betaGateEnabled: true },
    });
  }
});
