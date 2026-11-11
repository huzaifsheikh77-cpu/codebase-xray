import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const DEMO = "nebula-labs/orbit-forge";
const LIVE_URL = "https://github.com/octocat/Hello-World";

async function runDemo(page: Page) {
  await page.getByRole('button', { name: new RegExp(DEMO) }).click();
  await page.getByRole('button', { name: 'Analyze repository' }).click();
  await expect(page.getByText(/SIMULATED ANALYSIS — THIS IS A FICTIONAL DEMO REPOSITORY/)).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('landing and input safety', () => {
  test('landing page is understandable and exposes the real controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('CODEBASE');
    await expect(page.getByRole('complementary', { name: 'Public beta notice' })).toBeVisible();
    await expect(page.getByLabel('REPOSITORY URL')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyze repository' })).toBeVisible();
    await expect(page.getByText(/ENGINE v3\.0\.0/i).first()).toBeVisible();
    await expect(page.getByText('NO ANALYSIS LOADED')).toBeVisible();
    await expect(page.getByText(/not a security audit/i).first()).toBeVisible();
  });

  test('empty and malformed input fail with accessible inline errors', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Analyze repository' }).click();
    await expect(page.locator('#repo-url-error')).toContainText('REPOSITORY URL REQUIRED');

    await page.getByLabel('REPOSITORY URL').fill('https://gitlab.com/owner/repo');
    await page.getByRole('button', { name: 'Analyze repository' }).click();
    await expect(page.locator('#repo-url-error')).toContainText('EXPECTED github.com/owner/repository');
    await expect(page.locator('body')).not.toContainText('ANALYSIS COMPLETE');
  });
});

test.describe('demo report journey', () => {
  test('renders a complete labelled demo report and honest AI-disabled state', async ({ page }) => {
    await page.goto('/');
    await runDemo(page);

    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible();
    await expect(page.getByText('OVERALL ENGINEERING SCORE')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top Issues' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Codebase Visualization' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Coverage & Limitations' })).toBeVisible();
    await expect(page.getByText('ASSISTANT OFFLINE')).toBeVisible();
    await expect(page.getByText('SIMULATED ANALYSIS — THIS IS A FICTIONAL DEMO REPOSITORY')).toBeVisible();
    await expect(page.getByText('DEMO DATA').first()).toBeVisible();
    await expect(page.getByText(/SCORES ARE HEURISTIC/i).first()).toBeVisible();
    await expect(page.getByText(/SIMULATED ANALYSIS|DEMO DATA/).first()).toBeVisible();

    await page.getByText('OVERALL ENGINEERING SCORE').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/b2-demo-desktop.png', fullPage: false });
  });

  test('completed demo report has no serious or critical axe violations', async ({ page }, testInfo) => {
    await page.goto('/');
    await runDemo(page);
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });
    const results = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: () => Promise<unknown> } }).axe;
      return axe.run();
    });
    await testInfo.attach('axe-demo-results.json', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    });
    const violations = (results as { violations: { impact: string | null; id: string; help: string }[] }).violations;
    const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('AI endpoint reports unavailable rather than inventing an answer', async ({ page }) => {
    const response = await page.request.post('/api/ai', {
      data: {},
      headers: { 'content-type': 'application/json' },
    });
    expect(response.status()).toBe(503);
    const body = (await response.json()) as { ok: boolean; code: string; message: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe('AI_UNAVAILABLE');
    expect(body.message).not.toMatch(/bearer\s+\S+|sk-[A-Za-z0-9]|[A-Za-z0-9]{24,}/);
  });

  test('demo report remains usable on a 390x844 phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await runDemo(page);
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible();
    await expect(page.getByText('OVERALL ENGINEERING SCORE')).toBeVisible();
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
    await page.getByText('OVERALL ENGINEERING SCORE').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/b2-demo-mobile.png', fullPage: false });
  });
});

test.describe('failure and cancellation states', () => {
  test('cancellation aborts the request and never applies a stale result', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8_000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, analysis: { late: true } }),
      }).catch(() => undefined);
    });

    await page.goto('/');
    await page.getByLabel('REPOSITORY URL').fill(LIVE_URL);
    await page.getByRole('button', { name: 'Analyze repository' }).click();
    await expect(page.getByRole('button', { name: 'CANCEL SCAN' })).toBeVisible();
    await page.getByRole('button', { name: 'CANCEL SCAN' }).click();
    await expect(page.getByText(/SCAN FAILED — CANCELLED/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toHaveCount(0);
    await expect(page.getByText(/No result was applied/)).toBeVisible();
  });

  test('upstream failure renders a structured retryable error', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'retry-after': '60' },
        body: JSON.stringify({
          ok: false,
          error: { code: 'RATE_LIMITED', message: 'GitHub API rate limit reached. Try again after the reset time.' },
        }),
      });
    });

    await page.goto('/');
    await page.getByLabel('REPOSITORY URL').fill(LIVE_URL);
    await page.getByRole('button', { name: 'Analyze repository' }).click();
    await expect(page.getByText(/SCAN FAILED — RATE LIMITED/)).toBeVisible();
    await expect(page.getByText(/GitHub API rate limit reached/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'RETRY SCAN' })).toBeVisible();
  });
});

test.describe('responsive and keyboard checks', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 360, height: 800 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
      await expect(page.getByLabel('REPOSITORY URL')).toBeVisible();
    });
  }

  test('keyboard reaches the repository input and submit button', async ({ page }) => {
    await page.goto('/');
    let reachedInput = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focusedId = await page.evaluate(() => document.activeElement?.id ?? '');
      if (focusedId === 'repo-url') {
        reachedInput = true;
        break;
      }
    }
    expect(reachedInput).toBe(true);
    await expect(page.locator('#repo-url')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Analyze repository' })).toBeFocused();
  });

  test('automated accessibility scan reports no serious or critical violations', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.addScriptTag({ path: path.resolve('node_modules/axe-core/axe.min.js') });
    const results = await page.evaluate(async () => {
      // axe is injected above; this is a browser-side audit, not product data.
      const axe = (window as unknown as { axe: { run: () => Promise<unknown> } }).axe;
      return axe.run();
    });
    await testInfo.attach('axe-results.json', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    });
    const violations = (results as { violations: { impact: string | null; id: string; help: string }[] }).violations;
    const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});

test('live GitHub scan completes for a controlled public repository', async ({ page }) => {
  test.skip(process.env.RUN_LIVE_GITHUB_E2E !== '1', 'Set RUN_LIVE_GITHUB_E2E=1 to spend a small public GitHub quota.');
  await page.goto('/');
  await page.getByLabel('REPOSITORY URL').fill(LIVE_URL);
  await page.getByRole('button', { name: 'Analyze repository' }).click();
  await expect(page.getByText(/LIVE ANALYSIS — GITHUB/).first()).toBeVisible({ timeout: 75_000 });
  await expect(page.getByText(/SCAN FAILED/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Analysis Summary' })).toBeVisible();
  await expect(page.getByText(/LIVE DATA/).first()).toBeVisible();
  await page.getByRole('heading', { name: 'Analysis Summary' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/b2-live-desktop.png', fullPage: false });
});