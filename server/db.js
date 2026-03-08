import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(path.join(dataDir, 'korfstat.db'), { verbose: null }); // Disable verbose to prevent spam
db.pragma('journal_mode = WAL');

// Define Schema
function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS match_states (
            id TEXT PRIMARY KEY,
            data_json TEXT NOT NULL,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);
}

initDb();

export const saveMatchState = (state) => {
    if (!state || !state.id) return;
    try {
        const stmt = db.prepare(`
            INSERT INTO match_states (id, data_json, updatedAt) 
            VALUES (@id, @data, CURRENT_TIMESTAMP) 
            ON CONFLICT(id) DO UPDATE SET 
            data_json = excluded.data_json, 
            updatedAt = CURRENT_TIMESTAMP
        `);
        stmt.run({ id: state.id, data: JSON.stringify(state) });
    } catch (err) {
        console.error('Error saving match state to DB:', err);
    }
};

export const getLatestMatchState = () => {
    try {
        const row = db.prepare('SELECT data_json FROM match_states ORDER BY updatedAt DESC LIMIT 1').get();
        if (row) {
            return JSON.parse(row.data_json);
        }
    } catch (err) {
        console.error('Error loading match state from DB:', err);
    }
    return null;
};

export default db;
