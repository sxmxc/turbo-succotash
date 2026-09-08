import { test, expect, type Page } from "@playwright/test";

const adminHeaders = { "x-admin-token": process.env.ADMIN_API_TOKEN ?? "" };
const authHeaders = {
  origin: new URL(process.env.SMOKE_URL ?? "http://localhost:8080").origin,
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
  await expect(page.locator(".milestone")).toContainText("connected");
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

test("two authenticated sessions move and exchange live-only room chat", async ({
  browser,
  request,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Two-session flow is exercised once by the desktop project.",
  );
  await request.patch("/identity/admin/registration", {
    headers: adminHeaders,
    data: { betaGateEnabled: false },
  });
  const suffix = crypto.randomUUID();
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const lateContext = await browser.newContext();
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await Promise.all([
      registerAndJoin(first, `one-${suffix}@example.test`, "One"),
      registerAndJoin(second, `two-${suffix}@example.test`, "Two"),
    ]);
    await expect(first.getByText("2 online", { exact: true })).toBeVisible();
    await expect(second.getByText("2 online", { exact: true })).toBeVisible();

    const chat = first.getByLabel("Message the room");
    const stableBefore = await first.locator("canvas").screenshot();
    await chat.click();
    await first.keyboard.type("dddd");
    await first.waitForTimeout(450);
    expect(
      stableBefore.equals(await first.locator("canvas").screenshot()),
    ).toBe(true);
    await chat.fill("hello from one");
    await first.getByRole("button", { name: "Send" }).click();
    await expect(
      second.getByText("hello from one", { exact: true }),
    ).toBeVisible();

    const remoteBefore = await second.locator("canvas").screenshot();
    await first.locator("canvas").click({ position: { x: 600, y: 350 } });
    await first.waitForTimeout(700);
    expect(
      remoteBefore.equals(await second.locator("canvas").screenshot()),
    ).toBe(false);

    const late = await lateContext.newPage();
    await registerAndJoin(late, `late-${suffix}@example.test`, "Late");
    await expect(late.getByText("hello from one", { exact: true })).toHaveCount(
      0,
    );
    await second.getByLabel("Message the room").fill("welcome late");
    await second.getByRole("button", { name: "Send" }).click();
    await expect(late.getByText("welcome late", { exact: true })).toBeVisible();
  } finally {
    await Promise.all([
      firstContext.close(),
      secondContext.close(),
      lateContext.close(),
    ]);
    await request.patch("/identity/admin/registration", {
      headers: adminHeaders,
      data: { betaGateEnabled: true },
    });
  }
});
