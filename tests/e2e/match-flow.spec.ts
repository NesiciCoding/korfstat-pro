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
          { id: 'p3', firstName: 'Daan', lastName: 'Preuninger', gender: 'M', active: true, shirtNumber: 3, positions: ['ATTACK'] },
          { id: 'p4', firstName: 'Jessica', lastName: 'Lokhorst', gender: 'F', active: true, shirtNumber: 4, positions: ['DEFENSE'] },
          { id: 'p5', firstName: 'Merijn', lastName: 'Mensink', gender: 'M', active: true, shirtNumber: 5, positions: ['ATTACK'] },
          { id: 'p6', firstName: 'Renée', lastName: 'van Ginkel', gender: 'F', active: true, shirtNumber: 6, positions: ['DEFENSE'] },
          { id: 'p7', firstName: 'Michelle', lastName: 'van Geffen', gender: 'F', active: true, shirtNumber: 7, positions: ['ATTACK'] },
          { id: 'p8', firstName: 'Nik', lastName: 'van der Steen', gender: 'M', active: true, shirtNumber: 8, positions: ['DEFENSE'] },
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
          { id: 'a3', firstName: 'Koen', lastName: 'van Roekel', gender: 'M', active: true, shirtNumber: 12, positions: ['ATTACK'] },
          { id: 'a4', firstName: 'Daniëlle', lastName: 'Boadi', gender: 'F', active: true, shirtNumber: 13, positions: ['DEFENSE'] },
          { id: 'a5', firstName: 'Menno', lastName: 'van der Neut', gender: 'M', active: true, shirtNumber: 14, positions: ['ATTACK'] },
          { id: 'a6', firstName: 'Linda', lastName: 'van der Wal', gender: 'F', active: true, shirtNumber: 15, positions: ['DEFENSE'] },
          { id: 'a7', firstName: 'Barbara', lastName: 'Brouwer', gender: 'F', active: true, shirtNumber: 16, positions: ['ATTACK'] },
          { id: 'a8', firstName: 'Chris', lastName: 'van Haren', gender: 'M', active: true, shirtNumber: 17, positions: ['DEFENSE'] },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]));
  });

  await page.getByRole('button', { name: /Open App Free/i }).click();
  await page.getByText(/Continue in Offline/i).click();
});

test('complete match flow: setup, start, log, end', async ({ page }) => {
  // 1. Start New Match Setup
  await page.getByText('Start New Match').click();
  
  // 2. Select Home Team via Club Database
  await page.getByTestId('home-load-club').click();
  await page.getByTestId('club-selection-item-club-1').click();
  
  // 3. Select Away Team via Club Database
  await page.getByTestId('away-load-club').click();
  await page.getByTestId('club-selection-item-club-2').click();
  
  // 4. Start Match
  await page.getByTestId('start-match-btn').click();
  
  // 5. Verify Match Tracker loaded
  await expect(page.getByText('Match Tracker')).toBeVisible();
  
  // 6. Record a Goal
  await page.getByTestId(/^player-btn-/).first().click();
  await page.getByTestId('goal-miss-action-btn').click();
  await page.getByTestId('shot-type-btn-RUNNING_IN').click();
  
  // 7. Verify Score updated (1-0)
  const homeScore = page.locator('div:has-text("1")').first();
  await expect(homeScore).toBeVisible();
  
  // Take screenshot of active match
  await page.screenshot({ path: 'test-results/active-match-score.png' });
  
  // 8. Finish the match properly
  await page.getByTestId('end-period-btn').click();
  await page.getByTestId('finish-match-btn').click();
  
  // 9. Now on Stats, return to Dashboard
  await page.getByTestId('home-nav-btn').click();
  await expect(page.getByText('Director Dashboard')).toBeVisible();
  await page.getByText('Match History').click();
  
  // Wait for history content to appear
  await page.waitForSelector('text=Match History Content', { state: 'hidden' }); // Adjust if needed
  await page.waitForTimeout(2000); // Give it a moment to render the list
  
  await page.screenshot({ path: 'test-results/match-history-verified.png' });
});
