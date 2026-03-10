import { describe, it, expect } from 'vitest';
import { generateEmptyBracket, generateGroups, updateBracketProgression, calculateRounds } from '../tournamentLogic';
import { MatchState, Team } from '../../types';

describe('tournamentLogic', () => {
    describe('calculateRounds', () => {
        it('calculates rounds correctly for power of 2 teams', () => {
            expect(calculateRounds(4)).toBe(2);
            expect(calculateRounds(8)).toBe(3);
            expect(calculateRounds(16)).toBe(4);
        });
    });

    describe('generateEmptyBracket', () => {
        it('generates a 4-team bracket correctly', () => {
            const nodes = generateEmptyBracket({ teamCount: 4, thirdPlaceMatch: false });
            // Total nodes should be: 2 Semi-Finals + 1 Final = 3
            expect(nodes.length).toBe(3);

            // Check Final
            const final = nodes.find(n => n.id === 'FINAL');
            expect(final?.home.type).toBe('WINNER_OF');
            expect(final?.home.sourceNodeId).toBe('SF_1');
            expect(final?.away.sourceNodeId).toBe('SF_2');

            // Check Semis
            const sf1 = nodes.find(n => n.id === 'SF_1');
            expect(sf1?.home.type).toBe('TBD');
            expect(sf1?.away.type).toBe('TBD');
        });

        it('generates third place match when configured', () => {
            const nodes = generateEmptyBracket({ teamCount: 4, thirdPlaceMatch: true });
            expect(nodes.length).toBe(4); // 3 + 1
            const third = nodes.find(n => n.id === 'THIRD_PLACE');
            expect(third?.home.type).toBe('LOSER_OF');
            expect(third?.home.sourceNodeId).toBe('SF_1');
            expect(third?.away.sourceNodeId).toBe('SF_2');
        });

        it('generates an 8-team bracket correctly', () => {
            const nodes = generateEmptyBracket({ teamCount: 8, thirdPlaceMatch: false });
            // 4 QF + 2 SF + 1 F = 7
            expect(nodes.length).toBe(7);

            const sf1 = nodes.find(n => n.id === 'SF_1');
            expect(sf1?.home.sourceNodeId).toBe('QF_1');
            expect(sf1?.away.sourceNodeId).toBe('QF_2');
        });
    });

    describe('generateGroups', () => {
        it('distributes teams into groups evenly', () => {
            const teams = [
                { id: 't1', name: 'Team 1' } as unknown as Team,
                { id: 't2', name: 'Team 2' } as unknown as Team,
                { id: 't3', name: 'Team 3' } as unknown as Team,
                { id: 't4', name: 'Team 4' } as unknown as Team,
            ];

            // 2 groups
            const groups = generateGroups({ groupCount: 2, teamsPerGroup: 2, advancingPerGroup: 1 }, teams);
            expect(groups.length).toBe(2);
            expect(groups[0].teamIds.length).toBe(2);
            expect(groups[1].teamIds.length).toBe(2);
            // Snake draft checking
            expect(groups[0].teamIds).toContain('t1');
            expect(groups[1].teamIds).toContain('t2');
            expect(groups[1].teamIds).toContain('t3'); // Snake logic puts 3rd team in 2nd group
            expect(groups[0].teamIds).toContain('t4'); 
        });
    });

    describe('updateBracketProgression', () => {
        it('propagates winners and losers to the next nodes', () => {
            const initialNodes = generateEmptyBracket({ teamCount: 4, thirdPlaceMatch: true });
            const mockMatches = [
                {
                    id: 'match_sf1',
                    homeTeam: { id: 'teamA' } as unknown as Team,
                    awayTeam: { id: 'teamB' } as unknown as Team,
                    events: [
                        { type: 'SHOT', result: 'GOAL', teamId: 'HOME' },
                    ]
                } as unknown as MatchState,
                {
                    id: 'match_sf2',
                    homeTeam: { id: 'teamC' } as unknown as Team,
                    awayTeam: { id: 'teamD' } as unknown as Team,
                    events: [
                        { type: 'SHOT', result: 'GOAL', teamId: 'AWAY' },
                    ]
                } as unknown as MatchState
            ] as MatchState[];

            const bracketMap = {
                'SF_1': 'match_sf1',
                'SF_2': 'match_sf2'
            };

            const updated = updateBracketProgression(initialNodes, bracketMap, mockMatches);
            
            const final = updated.find(n => n.id === 'FINAL');
            expect(final?.home.teamId).toBe('teamA'); // Winner of SF1
            expect(final?.away.teamId).toBe('teamD'); // Winner of SF2

            const third = updated.find(n => n.id === 'THIRD_PLACE');
            expect(third?.home.teamId).toBe('teamB'); // Loser of SF1
            expect(third?.away.teamId).toBe('teamC'); // Loser of SF2
        });
    });
});
