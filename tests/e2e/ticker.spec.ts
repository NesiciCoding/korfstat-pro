import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Open App Free/i }).click();
  await page.getByText(/Continue in Offline/i).click();
});

test('Broadcast Ticker Customizer sets URL arguments correctly', async ({ page }) => {
  // Navigate to Broadcast Ticker via the Dashboard Gallery item
  await page.getByText('Broadcast Ticker').click();
  
  // Verify Customizer UI loaded
  await expect(page.locator('h1').filter({ hasText: /Ticker/i })).toBeVisible();

  // The read-only URL input should contain the default "?theme=modern&sc=true"
  const urlInput = page.getByRole('textbox', { name: /Browser Source URL/i }).or(page.locator('input[readonly]'));
  
  // Checking default state
  await expect(urlInput).toHaveValue(/theme=modern/);
  await expect(urlInput).toHaveValue(/sc=true/);

  // Toggle "Minimal" Theme
  await page.getByText('minimal', { exact: true }).click();
  await expect(urlInput).toHaveValue(/theme=minimal/);

  // Toggle Shot Clock
  // The toggle button has data-testid="shot-clock-toggle"
  await page.getByTestId('shot-clock-toggle').click();
  await expect(urlInput).toHaveValue(/sc=false/);
});
