import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClubService } from '../services/clubService';
import { Club } from '../types/club';

describe('ClubService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should save and retrieve a club', () => {
        const club: Club = {
            id: '1',
            name: 'Test Club',
            shortName: 'TST',
            primaryColor: '#ffffff',
            players: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        ClubService.saveClub(club);
        const clubs = ClubService.getAllClubs();
        expect(clubs).toHaveLength(1);
        expect(clubs[0].name).toBe('Test Club');
    });

    it('should update an existing club', () => {
        const club: Club = {
            id: '1',
            name: 'Test Club',
            shortName: 'TST',
            primaryColor: '#ffffff',
            players: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        ClubService.saveClub(club);

        const updatedClub = { ...club, name: 'Updated Club' };
        ClubService.saveClub(updatedClub);

        const clubs = ClubService.getAllClubs();
        expect(clubs).toHaveLength(1);
        expect(clubs[0].name).toBe('Updated Club');
    });

    it('should delete a club', () => {
        const club: Club = {
            id: '1',
            name: 'Test Club',
            shortName: 'TST',
            primaryColor: '#ffffff',
            players: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        ClubService.saveClub(club);
        ClubService.deleteClub('1');

        const clubs = ClubService.getAllClubs();
        expect(clubs).toHaveLength(0);
    });

    it('should add a player to a club', () => {
        const club: Club = {
            id: '1',
            name: 'Test Club',
            shortName: 'TST',
            primaryColor: '#ffffff',
            players: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        ClubService.saveClub(club);

        const newPlayer = ClubService.addPlayerToClub('1', {
            firstName: 'John',
            lastName: 'Doe',
            gender: 'M',
            shirtNumber: 10,
            positions: ['ATTACK']
        });

        const retrievedClub = ClubService.getClubById('1');
        expect(retrievedClub?.players).toHaveLength(1);
        expect(retrievedClub?.players[0].firstName).toBe('John');
        expect(retrievedClub?.players[0].id).toBeDefined();
    });

    it('should remove a player from a club', () => {
        const club: Club = {
            id: '1',
            name: 'Test Club',
            shortName: 'TST',
            primaryColor: '#ffffff',
            players: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        ClubService.saveClub(club);

        const newPlayer = ClubService.addPlayerToClub('1', {
            firstName: 'John',
            lastName: 'Doe',
            gender: 'M'
        });

        ClubService.removePlayer('1', newPlayer.id);

        const retrievedClub = ClubService.getClubById('1');
        expect(retrievedClub?.players).toHaveLength(0);
    });

    it('should migrate legacy teams', () => {
        const legacyTeams = [
            {
                id: 'legacy1',
                name: 'Legacy Team 1',
                color: '#ff0000',
                players: [
                    { name: 'Legacy Player 1', gender: 'M', number: 10, initialPosition: 'ATTACK' }
                ]
            }
        ];
        localStorage.setItem('korfstat_saved_teams', JSON.stringify(legacyTeams));

        const count = ClubService.migrateLegacyTeams();
        expect(count).toBe(1);

        const clubs = ClubService.getAllClubs();
        expect(clubs).toHaveLength(1);
        expect(clubs[0].name).toBe('Legacy Team 1');
        expect(clubs[0].players).toHaveLength(1);
        expect(clubs[0].players[0].firstName).toBe('Legacy');
        expect(clubs[0].players[0].lastName).toBe('Player 1');
    });
});
