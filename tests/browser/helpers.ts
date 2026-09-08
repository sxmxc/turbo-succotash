import { expect, type Page } from "@playwright/test";
import { browserAccount } from "./global-setup.js";

export async function loginAndJoin(
  page: Page,
  shirt: "Warm sand" | "Garden mint" | "Soft lilac" = "Warm sand",
  expectReady = true,
) {
  await page.goto("/");
  await page.getByLabel("Email").fill(browserAccount.email);
  await page.getByLabel("Password").fill(browserAccount.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: `Hello, ${browserAccount.name}.` }),
  ).toBeVisible();
  await page.getByLabel("Shirt color").selectOption({ label: shirt });
  await page.getByRole("button", { name: "Enter the Lobby" }).click();
  await expect(page.locator(".milestone")).toContainText("connected");
  if (expectReady)
    await expect(page.getByText("Scene ready", { exact: true })).toBeVisible();
}
