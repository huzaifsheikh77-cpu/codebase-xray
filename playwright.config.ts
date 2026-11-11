import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * B2 browser harness. It starts the real Next.js dev server on the project's
 * configured port and never talks to production. The optional executable
 * path supports this Windows host, where Playwright's full Chromium build is
 * installed but the separate headless-shell artifact is not.
 */
const localChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  (process.env.LOCALAPPDATA
    ? path.join(
        process.env.LOCALAPPDATA,
        "ms-playwright",
        "chromium-1254",
        "chrome-win64",
        "chrome.exe",
      )
    : "");

const executablePath = localChromium && existsSync(localChromium) ? localChromium : undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:3210',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3210',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});