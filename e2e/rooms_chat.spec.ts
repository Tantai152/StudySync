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
  await page.waitForURL(/.*\/login/, { timeout: 20000 });
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(TEST_PASSWORD);
  await page.locator('button:has-text("Log In")').click();
  await page.waitForURL(/.*\/($|\/dashboard)/, { timeout: 30000 });
}

test.describe('Rooms and Chat', () => {
  test('create room, send message, copy invite link', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);
    // Grant clipboard permission so navigator.clipboard.writeText works in headless Chromium
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await registerAndLogin(page);

    // Go to create room page
    await page.goto('/rooms/create');
    await expect(page).toHaveURL(/.*\/rooms\/create/);

    // Fill room name (random)
    const roomName = `Phòng Test ${Date.now()}`;
    await page.locator('input[placeholder="VD: Phòng Học Toán"]').fill(roomName);

    // Set up dialog auto-accept for CreateRoomPage success alert
    page.on('dialog', d => d.accept());

    // Click "Tạo Phòng"
    await page.locator('button:has-text("Tạo Phòng")').click();

    // Verify redirect to room page
    await expect(page).toHaveURL(/.*\/rooms\//, { timeout: 20000 });

    // Wait for room page to render (header + chat input)
    await expect(page.locator('h1:has-text("Phòng Chat")')).toBeVisible({ timeout: 30000 });
    await page.locator('input[placeholder="Nhập tin nhắn..."]').waitFor({ state: 'visible', timeout: 20000 });

    // Type message and send
    const messageContent = `Tin nhắn test ${Date.now()}`;
    await page.locator('input[placeholder="Nhập tin nhắn..."]').fill(messageContent);
    await page.locator('button:has-text("Gửi")').click();

    // Assert message appears on screen
    await expect(page.locator(`text=${messageContent}`)).toBeVisible({ timeout: 10000 });

    // Click "Mời bạn bè" and wait for the invite API to succeed
    const inviteRespPromise = page.waitForResponse(
      (r) => r.url().includes('/invites') && r.request().method() === 'POST'
    );
    await page.locator('button:has-text("Mời bạn bè")').click();
    const inviteResp = await inviteRespPromise;
    expect(inviteResp.status()).toBeLessThan(300);

    // Assert success toast (clipboard write now permitted)
    await expect(page.locator('text=Đã copy link mời!')).toBeVisible({ timeout: 10000 });
  });
});
