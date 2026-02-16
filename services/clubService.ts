import { Club, ClubPlayer } from '../types/club';
import { SavedTeam } from '../types';

const STORAGE_KEY = 'korfstat_clubs';

export const ClubService = {
    // --- Core CRUD ---

    getAllClubs: (): Club[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load clubs:', error);
            return [];
        }
    },

    getClubById: (id: string): Club | undefined => {
        const clubs = ClubService.getAllClubs();
        return clubs.find(c => c.id === id);
    },

    saveClub: (club: Club): void => {
        const clubs = ClubService.getAllClubs();
        const existingIndex = clubs.findIndex(c => c.id === club.id);

        const clubToSave = { ...club, updatedAt: Date.now() };

        if (existingIndex >= 0) {
            clubs[existingIndex] = clubToSave;
        } else {
            clubToSave.createdAt = Date.now();
            clubs.push(clubToSave);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs));
    },

    deleteClub: (id: string): void => {
        const clubs = ClubService.getAllClubs().filter(c => c.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs));
    },

    // --- Player Management ---

    addPlayerToClub: (clubId: string, player: Omit<ClubPlayer, 'id' | 'active'>): ClubPlayer => {
        const clubs = ClubService.getAllClubs();
        const clubIndex = clubs.findIndex(c => c.id === clubId);
        if (clubIndex === -1) throw new Error('Club not found');

        const newPlayer: ClubPlayer = {
            ...player,
            id: crypto.randomUUID(),
            active: true
        };

        clubs[clubIndex].players.push(newPlayer);
        clubs[clubIndex].updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs));

        return newPlayer;
    },

    updatePlayer: (clubId: string, player: ClubPlayer): void => {
        const clubs = ClubService.getAllClubs();
        const clubIndex = clubs.findIndex(c => c.id === clubId);
        if (clubIndex === -1) throw new Error('Club not found');

        const playerIndex = clubs[clubIndex].players.findIndex(p => p.id === player.id);
        if (playerIndex === -1) throw new Error('Player not found');

        clubs[clubIndex].players[playerIndex] = player;
        clubs[clubIndex].updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs));
    },

    removePlayer: (clubId: string, playerId: string): void => {
        const clubs = ClubService.getAllClubs();
        const clubIndex = clubs.findIndex(c => c.id === clubId);
        if (clubIndex === -1) throw new Error('Club not found');

        clubs[clubIndex].players = clubs[clubIndex].players.filter(p => p.id !== playerId);
        clubs[clubIndex].updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs));
    },

    // --- Migration Helper ---

    migrateLegacyTeams: (): number => {
        try {
            const savedTeamsRaw = localStorage.getItem('korfstat_saved_teams');
            if (!savedTeamsRaw) return 0;

            const savedTeams: SavedTeam[] = JSON.parse(savedTeamsRaw);
            const clubs = ClubService.getAllClubs();
            let count = 0;

            savedTeams.forEach(team => {
                // Check if already migrated (by name)
                if (clubs.some(c => c.name === team.name)) return;

                const newClub: Club = {
                    id: crypto.randomUUID(),
                    name: team.name,
                    shortName: team.name.substring(0, 3).toUpperCase(),
                    primaryColor: team.color,
                    players: team.players.map(p => ({
                        id: crypto.randomUUID(), // Generate persistent ID
                        firstName: p.name.split(' ')[0] || 'Unknown',
                        lastName: p.name.split(' ').slice(1).join(' ') || '',
                        gender: p.gender,
                        active: true,
                        shirtNumber: p.number,
                        positions: [p.initialPosition]
                    })),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                clubs.push(newClub);
                count++;
            });

            if (count > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs));
            }
            return count;
        } catch (e) {
            console.error("Migration failed", e);
            return 0;
        }
    }
};
