import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display signup page', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should navigate between signup and login', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/.*\/auth\/signup/);
  });
});

