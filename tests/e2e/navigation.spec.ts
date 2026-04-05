import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Open App Free/i }).click();
  await page.getByText(/Continue in Offline/i).click();
});

test('can navigate to Club Manager and back', async ({ page }) => {
  await page.getByText('Club Manager').click();
  await expect(page.getByRole('heading', { name: /Club Manager/i })).toBeVisible();
  
  // Click back button (ArrowLeft icon)
  await page.locator('button:has(.lucide-arrow-left)').click();
  await expect(page.getByText('Command Center')).toBeVisible();
});

test('can navigate to Season Manager and back', async ({ page }) => {
  await page.getByText('Season Manager').click();
  await expect(page.getByRole('heading', { name: /Season Manager/i })).toBeVisible();
  
  await page.locator('button:has(.lucide-arrow-left)').click();
  await expect(page.getByText('Command Center')).toBeVisible();
});

test('can navigate to Match History and back', async ({ page }) => {
  await page.getByText('Match History').click();
  await expect(page.getByRole('heading', { name: /Match History/i })).toBeVisible();
  
  await page.locator('button:has(.lucide-arrow-left)').click();
  await expect(page.getByText('Command Center')).toBeVisible();
});
