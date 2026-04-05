import { test, expect } from '@playwright/test';

test('navigates from landing to dashboard', async ({ page }) => {
  await page.goto('/');

  // 1. Initial Landing Page
  await expect(page).toHaveTitle(/KorfStat/);
  
  // 2. Click "Open App Free"
  const openAppBtn = page.getByRole('button', { name: /Open App Free/i });
  await openAppBtn.click();

  // 3. Selection Screen - Choose Offline/Guest Mode
  // Based on the app's behavior, we might need to find the specific button
  await page.getByText(/Continue in Offline/i).click();

  // 4. Verify Dashboard Widgets
  await expect(page.getByText('Club Manager')).toBeVisible();
  await expect(page.getByText('Season Manager')).toBeVisible();
  await expect(page.getByText('Match History')).toBeVisible();
});
