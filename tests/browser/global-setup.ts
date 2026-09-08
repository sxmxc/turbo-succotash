import { request, type FullConfig } from "@playwright/test";

export const browserAccount = {
  email: "browser-regression@example.test",
  password: "browser regression password",
  name: "Browser Regression",
};

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use.baseURL ??
    process.env.SMOKE_URL ??
    "http://localhost:8080";
  const context = await request.newContext({ baseURL });
  const headers = { "x-admin-token": process.env.ADMIN_API_TOKEN ?? "" };
  let cleanupError: Error | undefined;
  try {
    const opened = await context.patch("/identity/admin/registration", {
      headers,
      data: { betaGateEnabled: false },
    });
    if (!opened.ok())
      throw new Error(`Could not open registration: ${opened.status()}`);
    const signup = await context.post("/identity/auth/sign-up/email", {
      data: browserAccount,
    });
    if (![200, 409].includes(signup.status()))
      throw new Error(`Could not prepare browser account: ${signup.status()}`);
  } finally {
    const closed = await context.patch("/identity/admin/registration", {
      headers,
      data: { betaGateEnabled: true },
    });
    await context.dispose();
    if (!closed.ok())
      cleanupError = new Error(
        `Could not restore registration gate: ${closed.status()}`,
      );
  }
  if (cleanupError) throw cleanupError;
}
