import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'korfstat.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

function generateUUID() {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (parseInt(c) ^ randomBytes(1)[0] & 15 >> parseInt(c) / 4).toString(16)
    );
}

// Top 5 real clubs data with refined 8-player rosters (4M, 4F)
const topClubs = [
    {
        name: 'Fortuna/Ruitenheer',
        shortName: 'Fortuna',
        color: '#ff0000',
        players: [
            { name: 'Chelsea Mooi', num: 1, g: 'F' },
            { name: 'Roos van Groen', num: 2, g: 'F' },
            { name: 'Renée van Ginkel', num: 6, g: 'F' },
            { name: 'Fleur Hoek', num: 12, g: 'F' },
            { name: 'Daan Preuninger', num: 7, g: 'M' },
            { name: 'Tim van Oosten', num: 9, g: 'M' },
            { name: 'Kay van Vliet', num: 10, g: 'M' },
            { name: 'Jimmy Swikker', num: 11, g: 'M' }
        ]
    },
    {
        name: 'DVO/Transus',
        shortName: 'DVO',
        color: '#008000',
        players: [
            { name: 'Deborah Vos', num: 1, g: 'F' },
            { name: 'Lara van Golberdinge', num: 2, g: 'F' },
            { name: 'Daniëlle Boadi', num: 13, g: 'F' },
            { name: 'Linda van der Klis', num: 4, g: 'F' },
            { name: 'Noah Koers', num: 7, g: 'M' },
            { name: 'Robbe de Wit', num: 8, g: 'M' },
            { name: 'Jeffrey van Huenen', num: 9, g: 'M' },
            { name: 'Joris Buitenhuis', num: 12, g: 'M' }
        ]
    },
    {
        name: 'PKC/Vertom',
        shortName: 'PKC',
        color: '#006400',
        players: [
            { name: 'Nienke Hintzbergen', num: 4, g: 'F' },
            { name: 'Jana Driesprong', num: 12, g: 'F' },
            { name: 'Jenske Simons', num: 13, g: 'F' },
            { name: 'Zita Schröder', num: 5, g: 'F' },
            { name: 'Randy Oosting', num: 6, g: 'M' },
            { name: 'Shayn Tims', num: 10, g: 'M' },
            { name: 'Olav van Wijngaarden', num: 11, g: 'M' },
            { name: 'Jelmer Jonker', num: 14, g: 'M' }
        ]
    },
    {
        name: 'LDODK/Rinsma Modeplein',
        shortName: 'LDODK',
        color: '#32cd32',
        players: [
            { name: 'Marije Visser', num: 1, g: 'F' },
            { name: 'Esmee van Veen', num: 2, g: 'F' },
            { name: 'Marlou Kuiper', num: 4, g: 'F' },
            { name: 'Rixt Bouma', num: 9, g: 'F' },
            { name: 'Tieme Eppinga', num: 12, g: 'M' },
            { name: 'Ran Faber', num: 13, g: 'M' },
            { name: 'Terpstra de Groot', num: 15, g: 'M' },
            { name: 'Jan de Vries', num: 16, g: 'M' }
        ]
    },
    {
        name: 'KZ/Keukensale.com',
        shortName: 'KZ',
        color: '#ffd700',
        players: [
            { name: 'Nikki Boerhout', num: 1, g: 'F' },
            { name: 'Esther Cordus', num: 4, g: 'F' },
            { name: 'Anouk Haars', num: 5, g: 'F' },
            { name: 'Tessa van Rhijn', num: 3, g: 'F' },
            { name: 'Jari Leemhuis', num: 10, g: 'M' },
            { name: 'Olivier Woudt', num: 11, g: 'M' },
            { name: 'Kevin Dik', num: 16, g: 'M' },
            { name: 'Carlo de Vries', num: 14, g: 'M' }
        ]
    }
];

// Add 5 more clubs with full 8-player rosters (4M, 4F)
const moreClubs = [
    {
        name: 'Blauw-Wit (A)',
        shortName: 'BW',
        color: '#0000ff',
        players: [
            { name: 'Mandy Koelman', num: 1, g: 'F' },
            { name: 'Lotte van Montfort', num: 2, g: 'F' },
            { name: 'Nathalie de Rooij', num: 3, g: 'F' },
            { name: 'Roos Verheul', num: 4, g: 'F' },
            { name: 'Marc Verhaegen', num: 5, g: 'M' },
            { name: 'Momo Stavenuiter', num: 10, g: 'M' },
            { name: 'Niels van der Wallen', num: 11, g: 'M' },
            { name: 'Jochem de Bruin', num: 12, g: 'M' }
        ]
    },
    {
        name: "DOS '46/VDK Groep",
        shortName: 'DOS',
        color: '#ff4500',
        players: [
            { name: 'Eline van Veldhuisen', num: 5, g: 'F' },
            { name: 'Tessa Lap', num: 2, g: 'F' },
            { name: 'Sanne van Tol', num: 3, g: 'F' },
            { name: 'Kimberly van der Horst', num: 4, g: 'F' },
            { name: 'Fons van Ginkel', num: 6, g: 'M' },
            { name: 'Jesse de Jong', num: 7, g: 'M' },
            { name: 'Leander Zwolle', num: 8, g: 'M' },
            { name: 'Sander Dekker', num: 9, g: 'M' }
        ]
    },
    {
        name: 'KCC/CK Kozijnen',
        shortName: 'KCC',
        color: '#000000',
        players: [
            { name: 'Sanne Alsem', num: 3, g: 'F' },
            { name: 'Demi van Oosten', num: 4, g: 'F' },
            { name: 'Laura van Tol', num: 5, g: 'F' },
            { name: 'Michelle van Duijl', num: 2, g: 'F' },
            { name: 'Bo Oppe', num: 12, g: 'M' },
            { name: 'Koen van Ginkel', num: 7, g: 'M' },
            { name: 'Julian Middelkoop', num: 8, g: 'M' },
            { name: 'Randy van den Brink', num: 9, g: 'M' }
        ]
    },
    {
        name: 'HKC/Unique',
        shortName: 'HKC',
        color: '#000000',
        players: [
            { name: 'Fenodine van Vugt', num: 2, g: 'F' },
            { name: 'Lieneke Pipping', num: 3, g: 'F' },
            { name: 'Mabel Havelaar', num: 4, g: 'F' },
            { name: 'Annelies Koomen', num: 5, g: 'F' },
            { name: 'Danny den Dunnen', num: 7, g: 'M' },
            { name: 'Mark Klop', num: 8, g: 'M' },
            { name: 'Jitse de Jong', num: 9, g: 'M' },
            { name: 'Corné Troost', num: 10, g: 'M' }
        ]
    },
    {
        name: 'GG/IJskoud de Beste',
        shortName: 'GG',
        color: '#000000',
        players: [
            { name: 'Elise Heijkoop', num: 1, g: 'F' },
            { name: 'Sanne van der Werff', num: 2, g: 'F' },
            { name: 'Lotte van Veen', num: 3, g: 'F' },
            { name: 'Noordje van Vugt', num: 4, g: 'F' },
            { name: 'Terrence van Grieken', num: 7, g: 'M' },
            { name: 'Thijs van der Werff', num: 8, g: 'M' },
            { name: 'Stijn van der Werff', num: 9, g: 'M' },
            { name: 'Kevin Dik (Proxy)', num: 10, g: 'M' }
        ]
    }
];

const allClubs = [...topClubs, ...moreClubs];

// Prepare clubs for localStorage migration
const legacyTeams = allClubs.map(c => ({
    name: c.name,
    color: c.color,
    players: c.players.map(p => ({
        id: p.name.replace(/\s/g, '').toLowerCase() + c.shortName,
        name: p.name,
        number: p.num,
        gender: p.g,
        initialPosition: 'ATTACK'
    }))
}));

fs.writeFileSync(path.join(__dirname, 'mock_legacy_teams.json'), JSON.stringify(legacyTeams, null, 2));

// Generate Matches
console.log('Generating Enhanced Mock Matches...');

function generateMatch(homeClub, awayClub, dateOffset) {
    const matchId = generateUUID();
    const date = Date.now() - (dateOffset * 24 * 60 * 60 * 1000);
    
    const events = [];
    let homeScore = 0;
    let awayScore = 0;

    const shotCount = 60 + Math.floor(Math.random() * 30);
    
    for (let i = 0; i < shotCount; i++) {
        const isHome = Math.random() > 0.45;
        const team = isHome ? homeClub : awayClub;
        const player = team.players[Math.floor(Math.random() * team.players.length)];
        const isGoal = Math.random() > 0.65;
        
        if (isGoal) {
            if (isHome) homeScore++; else awayScore++;
        }

        events.push({
            id: generateUUID(),
            timestamp: i * 25,
            realTime: date + (i * 25000),
            half: i < shotCount / 2 ? 1 : 2,
            teamId: isHome ? 'HOME' : 'AWAY',
            playerId: player.name.replace(/\s/g, '').toLowerCase() + team.shortName,
            type: 'SHOT',
            result: isGoal ? 'GOAL' : 'MISS',
            shotType: ['NEAR', 'MEDIUM', 'FAR', 'PENALTY'][Math.floor(Math.random() * 4)],
            location: { x: Math.random() * 100, y: Math.random() * 100 }
        });
    }

    // Add fouls and rebounds
    for (let i = 0; i < 30; i++) {
        const isHome = Math.random() > 0.5;
        const team = isHome ? homeClub : awayClub;
        const player = team.players[Math.floor(Math.random() * team.players.length)];
        events.push({
            id: generateUUID(),
            timestamp: Math.floor(Math.random() * 1500),
            teamId: isHome ? 'HOME' : 'AWAY',
            playerId: player.name.replace(/\s/g, '').toLowerCase() + team.shortName,
            type: Math.random() > 0.4 ? 'REBOUND' : 'FOUL',
            location: { x: Math.random() * 100, y: Math.random() * 100 }
        });
    }

    const state = {
        id: matchId,
        date: date,
        isConfigured: true,
        halfDurationSeconds: 1500,
        homeTeam: {
            id: 'HOME',
            name: homeClub.name,
            color: homeClub.color,
            players: homeClub.players.map(p => ({
                id: p.name.replace(/\s/g, '').toLowerCase() + homeClub.shortName,
                name: p.name,
                number: p.num,
                gender: p.g,
                onField: true
            }))
        },
        awayTeam: {
            id: 'AWAY',
            name: awayClub.name,
            color: awayClub.color,
            players: awayClub.players.map(p => ({
                id: p.name.replace(/\s/g, '').toLowerCase() + awayClub.shortName,
                name: p.name,
                number: p.num,
                gender: p.g,
                onField: true
            }))
        },
        events: events.sort((a, b) => a.timestamp - b.timestamp),
        currentHalf: 2,
        timer: { elapsedSeconds: 3000, isRunning: false },
        shotClock: { seconds: 25, isRunning: false },
        timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
    };

    return { id: matchId, data: JSON.stringify(state) };
}

// Ensure table exists
db.exec(`
    CREATE TABLE IF NOT EXISTS match_states (
        id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

const insertMatch = db.prepare('INSERT OR REPLACE INTO match_states (id, data_json, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP)');

// Clean up old matches to avoid stale data
db.exec('DELETE FROM match_states');

// Generate 80 matches (more round robin)
console.log('Generating 100 matches...');
for (let i = 0; i < 100; i++) {
    const homeIdx = i % allClubs.length;
    const awayIdx = (i + Math.floor(i / allClubs.length) + 1) % allClubs.length;
    if (homeIdx === awayIdx) continue;
    const match = generateMatch(allClubs[homeIdx], allClubs[awayIdx], i); // Daily
    insertMatch.run(match.id, match.data);
}

// Generate high-scoring history for various superstars to test different milestones
allClubs.slice(0, 3).forEach((club, clubIdx) => {
    const superstarId = club.players[Math.floor(Math.random() * 4) + 4].name.replace(/\s/g, '').toLowerCase() + club.shortName; // Pick a male superstar
    console.log(`Generating high-scoring history for superstar: ${club.players.find(p => p.name.replace(/\s/g, '').toLowerCase() + club.shortName === superstarId).name}`);

    for (let i = 0; i < 15; i++) {
        const matchId = generateUUID();
        const date = Date.now() - (120 + i) * 24 * 60 * 60 * 1000;
        
        const events = [];
        for (let g = 0; g < 40; g++) {
            events.push({
                id: generateUUID(),
                timestamp: g * 35,
                teamId: 'HOME',
                playerId: superstarId,
                type: 'SHOT',
                result: 'GOAL',
                shotType: 'FAR',
                location: { x: 50, y: 50 }
            });
        }

        const state = {
            id: matchId,
            date: date,
            isConfigured: true,
            homeTeam: {
                id: 'HOME',
                name: club.name,
                players: club.players.map(p => ({
                    id: p.name.replace(/\s/g, '').toLowerCase() + club.shortName,
                    name: p.name,
                    number: p.num,
                    gender: p.g,
                    onField: true
                }))
            },
            awayTeam: {
                id: 'AWAY',
                name: allClubs[(clubIdx + 1) % allClubs.length].name,
                players: allClubs[(clubIdx + 1) % allClubs.length].players.map(p => ({
                    id: p.name.replace(/\s/g, '').toLowerCase() + allClubs[(clubIdx + 1) % allClubs.length].shortName,
                    name: p.name,
                    number: p.num,
                    gender: p.g,
                    onField: true
                }))
            },
            events: events,
            currentHalf: 2,
            timer: { elapsedSeconds: 3000, isRunning: false },
            shotClock: { seconds: 25, isRunning: false }
        };
        insertMatch.run(matchId, JSON.stringify(state));
    }
});

console.log('Successfully seeded 145 matches into korfstat.db');
console.log('Seeding complete.');
