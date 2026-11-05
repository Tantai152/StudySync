import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'Test User';

const randomEmail = () => `test_${Date.now()}@example.com`;

test.describe('Auth flow', () => {
  let email: string;

  test.beforeEach(() => {
    email = randomEmail();
  });

  test('register, logout, login again, access dashboard', async ({ page }) => {
    // 1. Go to register page
    await page.goto('/register');
    await expect(page).toHaveURL(/.*\/register/);

    // 2. Fill registration form
    await page.locator('input[id="name"]').fill(TEST_NAME);
    await page.locator('input[id="email"]').fill(email);
    await page.locator('input[id="password"]').fill(TEST_PASSWORD);
    await page.locator('input[id="confirmPassword"]').fill(TEST_PASSWORD);

    // 3. Submit registration
    await page.locator('button:has-text("Register")').click();

    // 4. Wait for success message (registration succeeded)
    await expect(page.locator('text=Registration successful! Redirecting...')).toBeVisible({ timeout: 15000 });

    // 5. Verify redirect to /login (RegisterForm redirects after 1.5s)
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });

    // 6. Fill login form
    await page.locator('input[id="email"]').fill(email);
    await page.locator('input[id="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Log In")').click();

    // 7. Verify redirect to home after login
    await expect(page).toHaveURL(/.*\/($|\/dashboard)/, { timeout: 10000 });

    // 8. Logout via Navbar
    await page.locator('button:has-text("Đăng xuất")').click();

    // 9. Verify redirect to /login after logout
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });

    // 10. Login again with same credentials
    await page.locator('input[id="email"]').fill(email);
    await page.locator('input[id="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Log In")').click();

    // 11. Verify dashboard access again
    await expect(page).toHaveURL(/.*\/($|\/dashboard)/, { timeout: 10000 });
  });
});
