import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'Test User';

const randomEmail = () => `test_${Date.now()}@example.com`;

async function registerAndLogin(page: Page) {
  const email = randomEmail();
  await page.goto('/register');
  await page.locator('input[id="name"]').fill(TEST_NAME);
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(TEST_PASSWORD);
  await page.locator('input[id="confirmPassword"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Register")').click();
  await page.waitForURL(/.*\/login/, { timeout: 30000 });
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Log In")').click();
  await page.waitForURL(/.*\/($|\/dashboard)/, { timeout: 30000 });
}

test.describe('Study Timer', () => {
  test('start, pause, finish timer', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    await registerAndLogin(page);

    // Create a room first
    page.on('dialog', d => d.accept());
    await page.goto('/rooms/create');
    await page.locator('input[placeholder="VD: Phòng Học Toán"]').fill(`Phòng Timer ${Date.now()}`);
    await page.locator('button:has-text("Tạo Phòng")').click();
    await expect(page).toHaveURL(/.*\/rooms\//, { timeout: 20000 });

    // Wait for StudyTimer to load
    await page.locator('input[placeholder="Study goal (e.g. Learn React)"]').waitFor({ state: 'visible', timeout: 30000 });

    // Initial state: goal input + Start button visible
    await expect(page.locator('button:has-text("Start")')).toBeVisible();

    // Fill goal and click Start
    await page.locator('input[placeholder="Study goal (e.g. Learn React)"]').fill('Học Playwright');
    await page.locator('button:has-text("Start")').click();

    // After start: Pause and Finish buttons visible, timer displaying
    await expect(page.locator('button:has-text("Pause")')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('button:has-text("Finish")')).toBeVisible();

    // Capture timer text before pause
    const timerDisplay = page.locator('.text-2xl.font-mono.font-bold');

    // Wait 2 seconds
    await page.waitForTimeout(2000);

    // Click Pause
    await page.locator('button:has-text("Pause")').click();

    // After pause: Resume button replaces Pause
    await expect(page.locator('button:has-text("Resume")')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('button:has-text("Pause")')).not.toBeVisible();

    // Click Finish
    await page.locator('button:has-text("Finish")').click();

    // After finish: UI resets to initial state (goal input + Start button)
    await expect(page.locator('input[placeholder="Study goal (e.g. Learn React)"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('button:has-text("Start")')).toBeVisible();
    await expect(page.locator('button:has-text("Pause")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Resume")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Finish")')).not.toBeVisible();
  });
});
