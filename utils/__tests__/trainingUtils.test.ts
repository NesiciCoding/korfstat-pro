import { describe, it, expect } from 'vitest';
import { aggregateTrainingStats, calculatePlayerMatchStats, correlatePerformance } from '../trainingUtils';
import { TrainingSession } from '../../types/training';
import { Player, MatchState } from '../../types';

describe('trainingUtils', () => {
  const mockPlayers: Player[] = [
    { id: 'p1', name: 'Alice', number: 1, gender: 'F', initialPosition: 'ATTACK', isStarter: true },
    { id: 'p2', name: 'Bob', number: 2, gender: 'M', initialPosition: 'DEFENSE', isStarter: true }
  ];

  const mockSessions: TrainingSession[] = [
    {
      id: 's1',
      date: Date.now(),
      teamId: 'HOME',
      attendees: ['p1', 'p2'],
      drillResults: [
        { playerId: 'p1', drillId: 'drill1', value: 80, timestamp: Date.now() },
        { playerId: 'p2', drillId: 'drill1', value: 60, timestamp: Date.now() }
      ]
    },
    {
      id: 's2',
      date: Date.now(),
      teamId: 'HOME',
      attendees: ['p1'],
      drillResults: [
        { playerId: 'p1', drillId: 'drill1', value: 90, timestamp: Date.now() }
      ]
    }
  ];

  describe('aggregateTrainingStats', () => {
    it('should calculate attendance correctly', () => {
      const stats = aggregateTrainingStats(mockSessions, mockPlayers);
      
      const alice = stats.find(s => s.playerId === 'p1');
      const bob = stats.find(s => s.playerId === 'p2');
      
      expect(alice?.attendance).toBe(2);
      expect(bob?.attendance).toBe(1);
    });

    it('should calculate average drill performance correctly', () => {
      const stats = aggregateTrainingStats(mockSessions, mockPlayers);
      
      const alice = stats.find(s => s.playerId === 'p1');
      // Alice: (80 + 90) / 2 = 85
      expect(alice?.averageValue).toBe(85);
      expect(alice?.drillCount).toBe(2);
      
      const bob = stats.find(s => s.playerId === 'p2');
      expect(bob?.averageValue).toBe(60);
      expect(bob?.drillCount).toBe(1);
    });

    it('should resolve names correctly from allPlayers list', () => {
      const stats = aggregateTrainingStats(mockSessions, mockPlayers);
      expect(stats.find(s => s.playerId === 'p1')?.name).toBe('Alice');
    });

    it('should return empty list for no sessions', () => {
      const stats = aggregateTrainingStats([], mockPlayers);
      expect(stats).toEqual([]);
    });
  });

  describe('calculatePlayerMatchStats', () => {
    const mockMatch: MatchState = {
      events: [
        { id: 'e1', type: 'SHOT', result: 'GOAL', playerId: 'p1', teamId: 'HOME', timestamp: 0, realTime: 0, half: 1 },
        { id: 'e2', type: 'SHOT', result: 'MISS', playerId: 'p1', teamId: 'HOME', timestamp: 0, realTime: 0, half: 1 },
        { id: 'e3', type: 'SHOT', result: 'GOAL', playerId: 'p2', teamId: 'HOME', timestamp: 0, realTime: 0, half: 1 }
      ]
    } as any;

    it('should calculate player percentages from match events', () => {
      const stats = calculatePlayerMatchStats('p1', [mockMatch]);
      expect(stats.goals).toBe(1);
      expect(stats.shots).toBe(2);
      expect(stats.percentage).toBe(50);
    });
  });

  describe('correlatePerformance', () => {
    it('should calculate the delta between match and training', () => {
      const stats = [
        { playerId: 'p1', name: 'Alice', attendance: 1, drillCount: 1, averageValue: 80 }
      ];
      const matches: MatchState[] = [{
        events: [
          { id: 'e1', type: 'SHOT', result: 'GOAL', playerId: 'p1', teamId: 'HOME', timestamp: 0, realTime: 0, half: 1 }
        ]
      }] as any;

      const insight = correlatePerformance('p1', stats, matches);
      // Match 100%, Training 80% -> Delta +20
      expect(insight?.delta).toBe(20);
      expect(insight?.matchAvg).toBe(100);
    });

    it('should return null if player has no match shots', () => {
      const stats = [{ playerId: 'p1', name: 'Alice', attendance: 1, drillCount: 1, averageValue: 80 }];
      const matches: MatchState[] = [{ events: [] }] as any;
      const insight = correlatePerformance('p1', stats, matches);
      expect(insight).toBeNull();
    });

    it('should return null if player has no training data', () => {
      const stats: any[] = [];
      const matches: MatchState[] = [{
        events: [{ id: 'e1', type: 'SHOT', result: 'GOAL', playerId: 'p1', teamId: 'HOME', timestamp: 0, realTime: 0, half: 1 }]
      }] as any;
      const insight = correlatePerformance('p1', stats, matches);
      expect(insight).toBeNull();
    });
  });
});
