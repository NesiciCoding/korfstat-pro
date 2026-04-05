import { test, expect } from '@playwright/test';
import { Player } from '../../types';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  
  // Seed localStorage with settings that have a defaultHomeTeam players to use in Training Tracker
  await page.evaluate(() => {
    localStorage.setItem('korfstat_settings', JSON.stringify({
      defaultHomePlayers: [
        { id: 'p1', name: 'Mick Snel', number: 1, gender: 'M', active: true, positions: ['ATTACK'] },
        { id: 'p2', name: 'Fleur Hoek', number: 2, gender: 'F', active: true, positions: ['DEFENSE'] }
      ]
    }));
  });

  await page.getByRole('button', { name: /Open App Free/i }).click();
  await page.getByText(/Continue in Offline/i).click();
});

test('Training Tracker flow: create session, log attendance, and drills', async ({ page }) => {
  // Navigate to Training Tracker
  await page.getByText('Training Tracker').click();
  
  // Create New Session
  await page.getByText('Log Session', { exact: false }).click();
  
  // Fill details
  await page.getByLabel(/Location/i).fill('Main Hall A');
  await page.getByLabel(/Duration/i).fill('120');
  await page.getByRole('button', { name: /Continue to Attendance/i }).click();
  
  // Attendance Step
  await expect(page.getByText('Mick Snel')).toBeVisible();
  await expect(page.getByText('Fleur Hoek')).toBeVisible();
  
  // Mark Mick as present
  await page.getByText('Mick Snel').click();
  
  // Proceed to Drills
  await page.getByRole('button', { name: /Select Drills/i }).click();
  
  // Select a Drill (e.g. Set-Shot Elimination)
  const drillCard = page.getByText('Set-Shot Elimination'); // Depending on your DrillLibrary.ts
  if (await drillCard.isVisible()) {
      await drillCard.click();
  } else {
      // Fallback click any drill
      await page.locator('.grid > button').first().click();
  }
  
  // Review step
  await page.getByRole('button', { name: /Finish & Review/i }).click();
  
  // Save session
  await page.getByRole('button', { name: /Save/i }).first().click(); // Usually Save or "Save Session"
  
  // Verify it appears in the list view
  await expect(page.getByText('Main Hall A')).toBeVisible();
  
  // Open the session from history
  await page.getByText('Main Hall A').click();
  // Expect to see Mick Snel in attendees list
  await expect(page.getByText('Mick Snel').first()).toBeVisible();
});
