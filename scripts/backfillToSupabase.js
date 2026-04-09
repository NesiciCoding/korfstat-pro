/**
 * KorfStat Pro — SQLite → Supabase Backfill
 *
 * Reads all match_states from the local SQLite database and upserts them
 * into the Supabase `matches` table. Uses service_role key to bypass RLS.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   USER_ID=your-supabase-user-uuid \
 *   CLUB_ID=your-club-uuid \        ← optional, leave out to leave club_id NULL
 *   node scripts/backfillToSupabase.js
 *
 * Where to find these values:
 *   SUPABASE_URL       → Supabase dashboard → Project Settings → API → Project URL
 *   SUPABASE_SERVICE_KEY → Supabase dashboard → Project Settings → API → service_role secret
 *   USER_ID            → Supabase dashboard → Authentication → Users → your user's UID
 *   CLUB_ID            → Supabase dashboard → Table Editor → clubs → your club's id
 *                        (or run: SELECT id FROM clubs LIMIT 1; in SQL editor)
 */

import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Config from env ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.USER_ID;
const CLUB_ID = process.env.CLUB_ID || null;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !USER_ID) {
  console.error('\nMissing required environment variables.');
  console.error('  Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, USER_ID');
  console.error('  Optional: CLUB_ID, DRY_RUN=1\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const dbPath = path.join(__dirname, '..', 'data', 'korfstat.db');
let db;
try {
  db = new Database(dbPath, { readonly: true });
} catch (err) {
  console.error(`\nCould not open SQLite database at: ${dbPath}`);
  console.error(err.message);
  process.exit(1);
}

async function backfill() {
  const rows = db.prepare('SELECT data_json, updatedAt FROM match_states ORDER BY updatedAt ASC').all();

  if (rows.length === 0) {
    console.log('No matches found in local database. Nothing to do.');
    return;
  }

  console.log(`\nFound ${rows.length} match(es) in SQLite`);
  if (CLUB_ID) console.log(`Assigning to club: ${CLUB_ID}`);
  if (DRY_RUN) console.log('DRY RUN — no data will be written to Supabase\n');
  console.log('─'.repeat(60));

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    let match;
    try {
      match = JSON.parse(row.data_json);
    } catch {
      console.warn(`  SKIP  Invalid JSON in row, skipping`);
      skipped++;
      continue;
    }

    if (!match?.id) {
      console.warn(`  SKIP  Match missing id, skipping`);
      skipped++;
      continue;
    }

    const label = `${match.homeTeam?.name || 'Home'} vs ${match.awayTeam?.name || 'Away'}`;
    const status = match.isConfigured ? (match.timer?.isRunning ? 'ACTIVE' : 'FINISHED') : 'SETUP';

    if (DRY_RUN) {
      console.log(`  DRY   [${status}] ${match.id.slice(0, 8)}… — ${label}`);
      success++;
      continue;
    }

    const { error } = await supabase.from('matches').upsert(
      {
        id: match.id,
        user_id: USER_ID,
        club_id: CLUB_ID,
        home_team_name: match.homeTeam?.name || 'Home',
        away_team_name: match.awayTeam?.name || 'Away',
        status,
        data_json: match,
        updated_at: row.updatedAt
          ? new Date(row.updatedAt).toISOString()
          : new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error(`  FAIL  [${status}] ${match.id.slice(0, 8)}… — ${label}`);
      console.error(`        ${error.message}`);
      failed++;
    } else {
      console.log(`  OK    [${status}] ${match.id.slice(0, 8)}… — ${label}`);
      success++;
    }
  }

  console.log('─'.repeat(60));
  if (DRY_RUN) {
    console.log(`\nDry run complete: ${success} would be uploaded, ${skipped} skipped\n`);
  } else {
    console.log(`\nDone: ${success} uploaded, ${skipped} skipped, ${failed} failed\n`);
    if (failed > 0) {
      console.log('Some matches failed. Check errors above and re-run — upsert is safe to repeat.\n');
      process.exit(1);
    }
  }
}

backfill().catch(err => {
  console.error('\nUnexpected error:', err.message);
  process.exit(1);
});
