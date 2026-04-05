import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  
  // Seed localStorage with settings, matches, and training sessions
  await page.evaluate(() => {
    // 1. Settings / Players
    const p1 = { id: 'p1', name: 'Mick Snel', number: 1, gender: 'M', active: true, positions: ['ATTACK'] };
    localStorage.setItem('korfstat_settings', JSON.stringify({ defaultHomePlayers: [p1] }));

    // 2. Mock Training Session (Averaging 50% for p1)
    localStorage.setItem('korfstat_training_sessions', JSON.stringify([{
      id: 'session1', date: Date.now() - 100000, attendees: ['p1'], location: 'Hall', drills: [{ id: 'd1', name: 'Shooting' }],
      results: [{ playerId: 'p1', drillId: 'd1', value: 50 }]
    }]));

    // 3. Mock Match History (10 Goals on 10 Shots = 100% for p1)
    localStorage.setItem('korfstat_matches', JSON.stringify([{
      id: 'match1', date: Date.now(), isConfigured: true, 
      homeTeam: { id: 'HOME', players: [p1] }, awayTeam: { id: 'AWAY', players: [] },
      events: [
        { id: '1', type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL' },
        { id: '2', type: 'SHOT', playerId: 'p1', teamId: 'HOME', result: 'GOAL' }
      ],
      timer: { isRunning: false }, shotClock: { isRunning: false }, timeout: { isActive: false }
    }]));
  });

  await page.getByRole('button', { name: /Open App Free/i }).click();
  await page.getByText(/Continue in Offline/i).click();
});

test('Carry-Over Analytics renders Performance Delta', async ({ page }) => {
  // Navigate to Overall Statistics
  await page.getByText('Overall Statistics').click();
  
  // Looking for "Performance Insights"
  await expect(page.getByText('Performance Insights')).toBeVisible();

  // Select Mick Snel from the dropdown
  await page.getByRole('combobox').selectOption('p1');

  // Verify numerical delta text appears
  // 100% Match vs 50% Training = +50%
  // The UI renders "+50%" or similar
  await expect(page.getByText(/\+50(\s)?%/)).toBeVisible();

  // Expect "Big Game Player" or similar text due to positive delta
  await expect(page.getByText(/Big Game Player/i)).toBeVisible();
});
