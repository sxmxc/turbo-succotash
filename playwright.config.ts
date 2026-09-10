import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  globalSetup: "./tests/browser/global-setup.ts",
  workers: 1,
  use: {
    actionTimeout: 10_000,
    baseURL:
      process.env.SMOKE_URL ||
      process.env.PUBLIC_ORIGIN ||
      "http://localhost:8080",
  },
  reporter: "list",
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
