import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  
  // Seed localStorage with mock clubs
  await page.evaluate(() => {
    localStorage.setItem('korfstat_clubs', JSON.stringify([
      {
        id: 'club-1',
        name: 'Fortuna/Ruitenheer',
        shortName: 'FOR',
        primaryColor: '#2563eb',
        players: [
          { id: 'p1', firstName: 'Mick', lastName: 'Snel', gender: 'M', active: true, shirtNumber: 1, positions: ['ATTACK'] },
          { id: 'p2', firstName: 'Fleur', lastName: 'Hoek', gender: 'F', active: true, shirtNumber: 2, positions: ['DEFENSE'] },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'club-2',
        name: 'DVO/Transus',
        shortName: 'DVO',
        primaryColor: '#dc2626',
        players: [
          { id: 'a1', firstName: 'Gertjan', lastName: 'Meerkerk', gender: 'M', active: true, shirtNumber: 10, positions: ['ATTACK'] },
          { id: 'a2', firstName: 'Annelie', lastName: 'de Korte', gender: 'F', active: true, shirtNumber: 11, positions: ['DEFENSE'] },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]));
  });

  await page.getByRole('button', { name: /Open App Free/i }).click();
  await page.getByText(/Continue in Offline/i).click();
});

test('ref-watch flow: log officiating event and verify in stats', async ({ page }) => {
  // 1. Start New Match Setup
  await page.getByText('Start New Match').click();
  
  // 2. Select Teams
  await page.getByTestId('home-load-club').click();
  await page.getByTestId('club-selection-item-club-1').click();
  await page.getByTestId('away-load-club').click();
  await page.getByTestId('club-selection-item-club-2').click();
  
  // 3. Start Match
  await page.getByTestId('start-match-btn').click();
  
  // 4. Toggle Ref-Watch Mode
  const refWatchToggle = page.getByTestId('ref-watch-toggle');
  await expect(refWatchToggle).toBeVisible();
  await refWatchToggle.click();
  
  // 5. Log an Officiating Event
  await page.waitForTimeout(1000);
  // Use specific data-testid to avoid ambiguity
  const quickRefBtn = page.getByTestId('quick-ref-watch-btn');
  await expect(quickRefBtn).toBeVisible();
  await quickRefBtn.click();
  
  // Wait for menu
  await page.waitForTimeout(1000);
  
  // Select Foul Type (Step 1)
  await page.getByTestId('ref-type-btn-0').click();
  
  // Select Decision (Step 2)
  await page.getByTestId('ref-decision-btn-correct').click();
  
  // 6. Verify Event in Match Log
  await expect(page.getByText('OFFICIATING')).toBeVisible();
  
  // 7. Finish Match
  await page.getByTestId('end-period-btn').click();
  await page.getByTestId('finish-match-btn').click();
  
  // 8. Now on Stats, return to Dashboard then History
  await page.getByTestId('home-nav-btn').click();
  await page.getByText('Match History').click();
  await page.getByText('View Stats').first().click();
  
  // 9. Toggle Ref-Watch in Stats View
  const statsRefWatchBtn = page.getByText('Ref-Watch');
  await expect(statsRefWatchBtn).toBeVisible();
  await statsRefWatchBtn.click();
  
  // Verify the officiating event label on the field
  await expect(page.getByText('Running / Push')).toBeVisible();
  
  await page.screenshot({ path: 'test-results/ref-watch-verified.png' });
});
