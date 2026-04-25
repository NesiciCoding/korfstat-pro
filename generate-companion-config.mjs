/**
 * Standalone script to generate the KorfStat Pro Bitfocus Companion config.
 * Usage: node generate-companion-config.mjs [localIp] [token]
 * Output: korfstat-pro.companionconfig (gzipped JSON, importable in Companion)
 */
import zlib from 'zlib';
import fs from 'fs';

const localIp = process.argv[2] || '192.168.1.22';
const PORT = 3002;
const COMPANION_TOKEN = process.argv[3] || 'korfstat';
const home = 'HOME';
const away = 'AWAY';
const connectionId = 'ks-connection';

const hexToDec = (hex) => parseInt(String(hex).replace('#', ''), 16);

const profile = {
    version: 9,
    type: 'full',
    companionBuild: '4.2.6+8823-stable-4ecdfe70ba',
    custom_variables: {},
    customVariables: {},
    customVariablesCollections: [{ id: 'ks-vars', label: 'KorfStat Pro', sortOrder: 0, children: [], metaData: { enabled: true } }],
    custom_variable_collections: [{ id: 'ks-vars', label: 'KorfStat Pro', sortOrder: 0, children: [], metaData: { enabled: true } }],
    trigger_collections: [
        { id: 'match-data', label: 'Match Data', sortOrder: 0, children: [], metaData: { enabled: true } },
        { id: 'team-names', label: 'Team Names', sortOrder: 1, children: [], metaData: { enabled: true } },
        { id: 'player-rosters', label: 'Player Rosters', sortOrder: 2, children: [], metaData: { enabled: true } },
        { id: 'match-state', label: 'Match State', sortOrder: 3, children: [], metaData: { enabled: true } }
    ],
    triggerCollections: [
        { id: 'match-data', label: 'Match Data', sortOrder: 0, children: [], metaData: { enabled: true } },
        { id: 'team-names', label: 'Team Names', sortOrder: 1, children: [], metaData: { enabled: true } },
        { id: 'player-rosters', label: 'Player Rosters', sortOrder: 2, children: [], metaData: { enabled: true } },
        { id: 'match-state', label: 'Match State', sortOrder: 3, children: [], metaData: { enabled: true } }
    ],
    pages: {
        '1': { id: 'p1', name: 'Main Control', controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
        '2': { id: 'p2', name: 'Monitoring', controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
        '3': { id: 'p3', name: 'Corrections', controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
        '4': { id: 'p4', name: `Goal: ${home}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
        '5': { id: 'p5', name: `Foul: ${home}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
        '6': { id: 'p6', name: `Goal: ${away}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } },
        '7': { id: 'p7', name: `Foul: ${away}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } }
    },
    triggers: {},
    pageCollections: [],
    expressionVariables: {},
    instances: {
        [connectionId]: {
            moduleInstanceType: 'connection',
            instance_type: 'generic-http',
            label: 'KorfStat-Pro',
            enabled: true,
            config: { prefix: `http://${localIp}:${PORT}`, rejectUnauthorized: false }
        }
    },
    surfaces: {},
    surfaceInstances: {},
    surfaceGroups: {},
    connectionCollections: []
};

const varConfigs = [
    { name: 'ks_home', label: 'Home Score', path: '/api/companion/state/score/home/raw', collectionId: 'match-data' },
    { name: 'ks_away', label: 'Away Score', path: '/api/companion/state/score/away/raw', collectionId: 'match-data' },
    { name: 'ks_score', label: 'Score Display', path: '/api/companion/state/score/display/raw', collectionId: 'match-data' },
    { name: 'ks_timer', label: 'Match Clock', path: '/api/companion/state/time/match/raw', collectionId: 'match-data' },
    { name: 'ks_elapsed', label: 'Elapsed Seconds', path: '/api/companion/state/time/elapsed/raw', collectionId: 'match-data' },
    { name: 'ks_shotclock', label: 'Shot Clock', path: '/api/companion/state/time/shotclock/raw', collectionId: 'match-data' },
    { name: 'ks_period', label: 'Period', path: '/api/companion/state/period/raw', collectionId: 'match-data' },
    { name: 'ks_timeouts_home', label: 'Home Timeouts', path: '/api/companion/state/timeouts/home/raw', collectionId: 'match-data' },
    { name: 'ks_timeouts_away', label: 'Away Timeouts', path: '/api/companion/state/timeouts/away/raw', collectionId: 'match-data' },
    { name: 'ks_fouls_home', label: 'Home Fouls', path: '/api/companion/state/fouls/home/raw', collectionId: 'match-data' },
    { name: 'ks_fouls_away', label: 'Away Fouls', path: '/api/companion/state/fouls/away/raw', collectionId: 'match-data' },
    { name: 'ks_fouls_home_period', label: 'Home Fouls This Period', path: '/api/companion/state/fouls/home/period/raw', collectionId: 'match-data' },
    { name: 'ks_fouls_away_period', label: 'Away Fouls This Period', path: '/api/companion/state/fouls/away/period/raw', collectionId: 'match-data' },
    { name: 'ks_name_home', label: 'Home Name', path: '/api/companion/state/names/home/raw', interval: 60000, collectionId: 'team-names' },
    { name: 'ks_name_away', label: 'Away Name', path: '/api/companion/state/names/away/raw', interval: 60000, collectionId: 'team-names' },
    { name: 'ks_running', label: 'Clock Running', path: '/api/companion/state/running/raw', collectionId: 'match-state' },
    { name: 'ks_shotclock_running', label: 'Shot Clock Running', path: '/api/companion/state/shotclock-running/raw', collectionId: 'match-state' },
    { name: 'ks_status', label: 'Match Status', path: '/api/companion/state/status/raw', collectionId: 'match-state' },
    { name: 'ks_last_event', label: 'Last Event', path: '/api/companion/state/last-event/raw', collectionId: 'match-state' }
];

['home', 'away'].forEach(team => {
    for (let i = 1; i <= 16; i++) {
        varConfigs.push({ name: `ks_p${i}_name_${team}`, label: `${team.charAt(0).toUpperCase() + team.slice(1)} P${i} Name`, path: `/api/companion/state/players/${team}/${i}/name/raw`, interval: 30000, collectionId: 'player-rosters' });
        varConfigs.push({ name: `ks_p${i}_id_${team}`, label: `${team.charAt(0).toUpperCase() + team.slice(1)} P${i} ID`, path: `/api/companion/state/players/${team}/${i}/id/raw`, interval: 30000, collectionId: 'player-rosters' });
    }
});

const authHeader = JSON.stringify({ 'X-Companion-Token': COMPANION_TOKEN });

varConfigs.forEach((v, idx) => {
    const varDef = {
        description: v.label,
        defaultValue: v.name.includes('name') ? (v.name.includes('home') ? 'HOME' : 'AWAY') : (v.name.includes('id') ? '-' : '0'),
        persistCurrentValue: false, sortOrder: idx, collectionId: 'ks-vars'
    };
    profile.custom_variables[v.name] = varDef;
    profile.customVariables[v.name] = varDef;
    const interval = v.interval || 1000;
    profile.triggers[`trigger-${v.name}`] = {
        id: `trigger-${v.name}`,
        type: 'trigger',
        collectionId: v.collectionId || 'match-data',
        options: {
            name: `Sync ${v.label}`,
            interval: interval / 1000,
            reset_on_start: false,
            enabled: true,
            sortOrder: idx
        },
        actions: [{
            id: `act-sync-${v.name}`,
            definitionId: 'get',
            connectionId: connectionId,
            enabled: true,
            options: {
                Url: v.path,
                Header: authHeader,
                JsonResponseVariable: v.name,
                JsonStringify: false,
                StatusCodeVariable: ''
            },
            type: 'action',
            upgradeIndex: -1
        }],
        condition: [],
        events: [{
            id: `event-${v.name}`,
            type: 'interval',
            enabled: true,
            options: { interval: interval / 1000 }
        }],
        localVariables: []
    };
});

const addButton = (pageId, r, c, opts) => {
    const row = String(r);
    const col = String(c);
    const page = String(pageId);
    if (!profile.pages[page]) {
        profile.pages[page] = { id: `p${page}`, name: `Page ${page}`, controls: {}, gridSize: { minColumn: 0, maxColumn: 7, minRow: 0, maxRow: 3 } };
    }
    if (!profile.pages[page].controls[row]) profile.pages[page].controls[row] = {};
    const btn = {
        type: 'button',
        style: {
            text: opts.text,
            textExpression: opts.isExpression || opts.text.includes('$('),
            size: 'auto',
            png64: null, alignment: 'center:center', pngalignment: 'center:center',
            color: opts.textColor !== undefined ? opts.textColor : 16777215,
            bgcolor: hexToDec(opts.color || '#2D2D2D'), show_topbar: 'default'
        },
        options: { stepProgression: 'auto', stepExpression: '', rotaryActions: false },
        feedbacks: [],
        steps: { '0': { action_sets: { down: [], up: [] }, options: { runWhileHeld: false } } },
        localVariables: []
    };
    if (opts.path) {
        btn.steps['0'].action_sets.down.push({
            id: `act-${page}-${r}-${c}`, definitionId: 'post', connectionId,
            enabled: true,
            options: {
                Url: opts.path,
                Header: authHeader,
                Body: '{}',
                ContentType: 'application/json',
                JsonResponseVariable: '',
                StatusCodeVariable: ''
            },
            type: 'action',
            upgradeIndex: -1
        });
    }
    if (opts.jump) {
        btn.steps['0'].action_sets.down.push({
            id: `jump-${page}-${r}-${c}`, definitionId: 'set_page', connectionId: 'internal',
            enabled: true,
            options: { page: opts.jump },
            type: 'action',
            upgradeIndex: -1
        });
    }
    profile.pages[page].controls[row][col] = btn;
};

// PAGE 1: MAIN
addButton('1', 0, 0, { text: 'MONITOR', color: '#10b981', jump: 2 });
addButton('1', 0, 1, { text: 'Start | Pause', color: '#22c55e', path: '/api/companion/clock/toggle' });
addButton('1', 0, 2, { text: 'Goal $(custom:ks_name_home)', color: '#ef4444', jump: 4 });
addButton('1', 0, 3, { text: 'Goal $(custom:ks_name_away)', color: '#3b82f6', jump: 6 });
addButton('1', 0, 5, { text: '$(custom:ks_shotclock)', color: '#000000' });
addButton('1', 0, 6, { text: '$(custom:ks_timer)', color: '#000000' });
addButton('1', 0, 7, { text: 'CORRECT', color: '#f59e0b', jump: 3 });
addButton('1', 1, 1, { text: 'Next Per.', color: '#0ea5e9', path: '/api/companion/period/next' });
addButton('1', 1, 2, { text: 'Foul $(custom:ks_name_home)', color: '#b91c1c', jump: 5 });
addButton('1', 1, 3, { text: 'Foul $(custom:ks_name_away)', color: '#1d4ed8', jump: 7 });
addButton('1', 1, 5, { text: '$(custom:ks_home)', color: '#000000' });
addButton('1', 1, 6, { text: '$(custom:ks_away)', color: '#000000' });
addButton('1', 2, 2, { text: 'Y. CARD H', color: '#eab308', textColor: 0, path: '/api/companion/card/home/YELLOW' });
addButton('1', 2, 3, { text: 'Y. CARD A', color: '#eab308', textColor: 0, path: '/api/companion/card/away/YELLOW' });
addButton('1', 2, 7, { text: 'Dismiss GFX', color: '#4b5563', path: '/api/companion/graphics/dismiss' });
addButton('1', 3, 2, { text: 'R. CARD H', color: '#7f1d1d', path: '/api/companion/card/home/RED' });
addButton('1', 3, 3, { text: 'R. CARD A', color: '#7f1d1d', path: '/api/companion/card/away/RED' });
addButton('1', 3, 7, { text: '$(custom:ks_last_event)', color: '#1f2937' });

// PAGE 2: MONITORING
addButton('2', 0, 0, { text: 'BACK', color: '#4b5563', jump: 1 });
addButton('2', 0, 2, { text: 'HOME: $(custom:ks_name_home)', color: '#ef4444' });
addButton('2', 0, 3, { text: 'AWAY: $(custom:ks_name_away)', color: '#3b82f6' });
addButton('2', 0, 5, { text: '$(custom:ks_score)', color: '#1f2937' });
addButton('2', 0, 6, { text: 'STATUS: $(custom:ks_status)', color: '#374151' });
addButton('2', 1, 1, { text: 'RUNNING: $(custom:ks_running)', color: '#374151' });
addButton('2', 1, 2, { text: 'FOULS H: $(custom:ks_fouls_home)', color: '#ef4444' });
addButton('2', 1, 3, { text: 'FOULS A: $(custom:ks_fouls_away)', color: '#3b82f6' });
addButton('2', 1, 4, { text: 'FOULS H P: $(custom:ks_fouls_home_period)', color: '#b91c1c' });
addButton('2', 1, 5, { text: 'FOULS A P: $(custom:ks_fouls_away_period)', color: '#1d4ed8' });
addButton('2', 1, 6, { text: 'PERIOD: $(custom:ks_period)', color: '#374151' });
addButton('2', 2, 2, { text: 'T/O H: $(custom:ks_timeouts_home)', color: '#ef4444' });
addButton('2', 2, 3, { text: 'T/O A: $(custom:ks_timeouts_away)', color: '#3b82f6' });
addButton('2', 3, 7, { text: '$(custom:ks_last_event)', color: '#1f2937' });

// PAGE 3: CORRECTIONS
addButton('3', 0, 0, { text: 'BACK', color: '#4b5563', jump: 1 });
addButton('3', 0, 1, { text: 'CLOCK +1m', color: '#22c55e', path: '/api/companion/clock/adjust?delta=60' });
addButton('3', 0, 2, { text: 'CLOCK -1m', color: '#ef4444', path: '/api/companion/clock/adjust?delta=-60' });
addButton('3', 0, 4, { text: 'SC 25s', color: '#6366f1', path: '/api/companion/shotclock/override?seconds=25' });
addButton('3', 0, 5, { text: 'SC 14s', color: '#8b5cf6', path: '/api/companion/shotclock/override?seconds=14' });
addButton('3', 1, 1, { text: 'CLOCK +1s', color: '#22c55e', path: '/api/companion/clock/adjust?delta=1' });
addButton('3', 1, 2, { text: 'CLOCK -1s', color: '#ef4444', path: '/api/companion/clock/adjust?delta=-1' });
addButton('3', 1, 4, { text: 'Reset Clock', color: '#4b5563', path: '/api/companion/clock/reset' });
addButton('3', 1, 5, { text: 'Reset Shot', color: '#4b5563', path: '/api/companion/shotclock/reset' });
addButton('3', 2, 1, { text: 'Undo Goal H', color: '#78716c', path: '/api/companion/goal/HOME/undo' });
addButton('3', 2, 2, { text: 'Undo Goal A', color: '#78716c', path: '/api/companion/goal/AWAY/undo' });
addButton('3', 2, 4, { text: 'Undo Foul H', color: '#57534e', path: '/api/companion/foul/HOME/undo' });
addButton('3', 2, 5, { text: 'Undo Foul A', color: '#57534e', path: '/api/companion/foul/AWAY/undo' });
addButton('3', 3, 7, { text: 'DANGER: RESET', color: '#7f1d1d', path: '/api/companion/match/reset' });

// PAGES 4-7: PLAYER BUTTONS
const addPlayerButtons = (pageId, teamId, type) => {
    const teamLower = teamId.toLowerCase();
    addButton(pageId, 3, 0, { text: 'CANCEL', color: '#4b5563', jump: 1 });
    for (let idx = 0; idx < 16; idx++) {
        const r = Math.floor(idx / 4);
        const c = (idx % 4) + 1;
        const slot = idx + 1;
        addButton(pageId, r, c, {
            text: `$(custom:ks_p${slot}_name_${teamLower})`,
            color: teamId === 'HOME' ? '#ef4444' : '#3b82f6',
            path: `/api/companion/${type}/${teamId}/$(custom:ks_p${slot}_id_${teamLower})`,
            jump: 1
        });
    }
};
addPlayerButtons('4', 'HOME', 'goal');
addPlayerButtons('5', 'HOME', 'foul');
addPlayerButtons('6', 'AWAY', 'goal');
addPlayerButtons('7', 'AWAY', 'foul');

const json = JSON.stringify(profile);
const gzipped = zlib.gzipSync(json);
const outFile = 'korfstat-pro.companionconfig';
fs.writeFileSync(outFile, gzipped);
console.log(`Written: ${outFile}  (${gzipped.length} bytes)`);
console.log(`Server: http://${localIp}:${PORT}   Token: ${COMPANION_TOKEN}`);
