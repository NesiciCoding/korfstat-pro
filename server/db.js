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

        CREATE TABLE IF NOT EXISTS match_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            data_json TEXT NOT NULL,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

initDb();

export const saveMatchTemplate = (template) => {
    if (!template || !template.id) return;
    try {
        const stmt = db.prepare(`
            INSERT INTO match_templates (id, name, data_json, updatedAt) 
            VALUES (@id, @name, @data, CURRENT_TIMESTAMP) 
            ON CONFLICT(id) DO UPDATE SET 
            name = excluded.name,
            data_json = excluded.data_json, 
            updatedAt = CURRENT_TIMESTAMP
        `);
        stmt.run({ id: template.id, name: template.name, data: JSON.stringify(template) });
    } catch (err) {
        console.error('Error saving template to DB:', err);
    }
};

export const getAllTemplates = () => {
    try {
        const rows = db.prepare('SELECT data_json FROM match_templates ORDER BY updatedAt DESC').all();
        return rows.map(r => JSON.parse(r.data_json));
    } catch (err) {
        console.error('Error loading templates from DB:', err);
        return [];
    }
};

export const deleteTemplate = (id) => {
    try {
        db.prepare('DELETE FROM match_templates WHERE id = ?').run(id);
    } catch (err) {
        console.error('Error deleting template from DB:', err);
    }
};

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

export const getMatchState = (id) => {
    if (!id) return null;
    try {
        const row = db.prepare('SELECT data_json FROM match_states WHERE id = ?').get(id);
        if (row) {
            return JSON.parse(row.data_json);
        }
    } catch (err) {
        console.error(`Error loading match state ${id} from DB:`, err);
    }
    return null;
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

export const getAllMatches = () => {
    try {
        const rows = db.prepare('SELECT data_json FROM match_states ORDER BY updatedAt DESC').all();
        return rows.map(r => JSON.parse(r.data_json));
    } catch (err) {
        console.error('Error loading all matches from DB:', err);
        return [];
    }
};

export default db;
