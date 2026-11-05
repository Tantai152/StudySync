import { test, expect, type Page } from '@playwright/test';

const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME_A = 'User A';
const TEST_NAME_B = 'User B';

const randomEmail = () => `test_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;

async function registerAndLogin(page: Page, name: string) {
  const email = randomEmail();
  await page.goto('/register');
  await page.locator('input[id="name"]').fill(name);
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(TEST_PASSWORD);
  await page.locator('input[id="confirmPassword"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Register")').click();
  await page.waitForURL(/.*\/login/, { timeout: 20000 });
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Log In")').click();
  await page.waitForURL(/.*\/($|\/dashboard)/, { timeout: 20000 });
  return email;
}

test.describe('Friends (two users)', () => {
  test('send and accept friend request across two contexts', async ({ browser }, testInfo) => {
    testInfo.setTimeout(150000);

    // Context A: User A
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const emailA = await registerAndLogin(pageA, TEST_NAME_A);

    // Context B: User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const emailB = await registerAndLogin(pageB, TEST_NAME_B);

    try {
      // User A goes to /friends page
      await pageA.goto('/friends');
      await expect(pageA).toHaveURL(/.*\/friends/);

      // User B goes to /search page and searches for User A by email
      await pageB.goto('/search');
      await expect(pageB).toHaveURL(/.*\/search/);
      await pageB.locator('input[placeholder="Nhập tên hoặc email..."]').fill(emailA);
      await pageB.waitForTimeout(600); // debounce

      // Handle the success alert from SearchUsersPage, then wait for the API 201
      const dialogPromise = pageB.waitForEvent('dialog').then((d) => {
        expect(d.message()).toContain('Gửi lời mời kết bạn thành công');
        return d.accept();
      });
      const sendRespPromise = pageB.waitForResponse(
        (r) => r.url().includes('/friend-requests') && r.request().method() === 'POST'
      );
      await pageB.locator('button:has-text("Kết bạn")').first().click();
      await dialogPromise;
      const sendResp = await sendRespPromise;
      expect(sendResp.status()).toBe(201);

      // User A loads /friends and sees the pending request from User B
      await pageA.goto('/friends');
      await expect(pageA).toHaveURL(/.*\/friends/);
      await expect(pageA.locator(`text=${TEST_NAME_B}`)).toBeVisible({ timeout: 20000 });
      await expect(pageA.locator(`text=${emailB}`)).toBeVisible({ timeout: 20000 });

      // User A accepts; wait for the PATCH to succeed before checking results
      const acceptRespPromise = pageA.waitForResponse(
        (r) => r.url().includes('/friend-requests/') && r.request().method() === 'PATCH'
      );
      await pageA.locator('button:has-text("Chấp nhận")').first().click();
      const acceptResp = await acceptRespPromise;
      const acceptBody = await acceptResp.text();
      expect(acceptResp.status(), acceptBody).toBe(200);

      // Accept processed -> no pending requests left
      await expect(pageA.locator('text=Không có lời mời nào.')).toBeVisible({ timeout: 20000 });
      // User A: User B now appears in friends list
      await expect(pageA.locator(`text=${TEST_NAME_B}`)).toBeVisible({ timeout: 20000 });
      await expect(pageA.locator(`text=${emailB}`)).toBeVisible({ timeout: 20000 });

      // User B loads /friends and should see User A in the friends list
      await pageB.goto('/friends');
      await expect(pageB).toHaveURL(/.*\/friends/);
      await expect(pageB.locator(`text=${TEST_NAME_A}`)).toBeVisible({ timeout: 20000 });
      await expect(pageB.locator(`text=${emailA}`)).toBeVisible({ timeout: 20000 });
    } finally {
      try { await contextA.close(); } catch {}
      try { await contextB.close(); } catch {}
    }
  });
});
