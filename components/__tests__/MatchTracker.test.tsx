import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act, renderWithProviders } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import MatchTracker from '../MatchTracker';
import { MatchState } from '../../types';

// i18next mock is handled globally in test/setup.ts

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

window.alert = vi.fn();
window.open = vi.fn();

// Mock fetch
global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/companion/setup-info')) {
        return Promise.resolve({
            json: () => Promise.resolve({ localIp: '192.168.1.10' })
        });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
});

// Mock hooks
vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { soundEnabled: true, vibration: true, soundEffects: true, autoShotClock: true },
    updateSettings: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue(true)
  }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('../../hooks/useGameAudio', () => ({
  useGameAudio: () => ({ 
    playSound: vi.fn(),
    playShotClockBuzzer: vi.fn(),
    playGameEndHorm: vi.fn()
  })
}));

vi.mock('../../hooks/useVoiceCommands', () => ({
  useVoiceCommands: () => ({ 
    isListening: false, 
    toggleListening: vi.fn(), 
    start: vi.fn(), 
    stop: vi.fn(),
    isSupported: true 
  })
}));

// Mock KorfballField
vi.mock('../KorfballField', () => ({
  default: ({ onFieldClick }: any) => (
    <div data-testid="mock-field" onClick={(e) => {
        const x = e.clientX === 90 ? 90 : 10;
        onFieldClick(x, 50);
    }}>
      Korfball Field
    </div>
  ),
  getShotDistanceType: (x: number, y: number) => x < 50 ? 'RUNNING_IN' : 'DISTANCE'
}));

const mockMatchState: MatchState = {
  id: 'test-match',
  isConfigured: true,
  currentHalf: 1,
  halfDurationSeconds: 1500,
  homeTeam: { 
      id: 'HOME', 
      name: 'PHome', 
      players: [
          { id: 'P1', name: 'P1', number: 1, gender: 'M', onField: true, initialPosition: 'ATTACK', isStarter: true },
          { id: 'P2', name: 'P2', number: 2, gender: 'F', onField: true, initialPosition: 'ATTACK', isStarter: true },
          { id: 'P3', name: 'P3', number: 3, gender: 'M', onField: true, initialPosition: 'DEFENSE', isStarter: true },
          { id: 'P4', name: 'P4', number: 4, gender: 'F', onField: true, initialPosition: 'DEFENSE', isStarter: true },
          { id: 'P5', name: 'P5', number: 5, gender: 'M', onField: false, initialPosition: 'ATTACK', isStarter: false }
      ], 
      color: '#ff0000', 
      substitutionCount: 8 
  },
  awayTeam: { 
      id: 'AWAY', 
      name: 'PAway', 
      players: [
          { id: 'P6', name: 'P6', number: 6, gender: 'M', onField: true, initialPosition: 'ATTACK', isStarter: true },
          { id: 'P7', name: 'P7', number: 7, gender: 'F', onField: true, initialPosition: 'ATTACK', isStarter: true },
          { id: 'P8', name: 'P8', number: 8, gender: 'M', onField: true, initialPosition: 'DEFENSE', isStarter: true },
          { id: 'P9', name: 'P9', number: 9, gender: 'F', onField: true, initialPosition: 'DEFENSE', isStarter: true },
          { id: 'P10', name: 'P10', number: 10, gender: 'M', onField: false, initialPosition: 'ATTACK', isStarter: false }
      ], 
      color: '#0000ff', 
      substitutionCount: 0 
  },
  events: [],
  possession: 'HOME',
  timer: { elapsedSeconds: 0, isRunning: false },
  shotClock: { seconds: 25, isRunning: false },
  timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
};

describe('MatchTracker High Intensity Coverage', () => {
    const onUpdateMatch = vi.fn();
    const onFinishMatch = vi.fn();
    const onViewChange = vi.fn();
  
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('covers basic action and results', async () => {
        renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
        fireEvent.click(screen.getByTestId('mock-field'));
        
        const teamModal = await screen.findByTestId('select-team-modal');
        fireEvent.click(within(teamModal).getByTestId('select-home-team-btn'));
        
        const playerModal = await screen.findByTestId('select-player-modal');
        fireEvent.click(within(playerModal).getByTestId('player-btn-P1'));
        
        const actionModal = await screen.findByTestId('select-action-modal');
        fireEvent.click(within(actionModal).getByTestId('goal-miss-action-btn'));
        
        const shotTypeModal = await screen.findByTestId('select-shot-type-modal');
        fireEvent.click(within(shotTypeModal).getByTestId('shot-type-btn-RUNNING_IN'));
        
        expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Card and Substitution Exception flows', async () => {
        renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
        // Card flow via UI
        fireEvent.click(await screen.findByTestId('mock-field'));
        fireEvent.click(await screen.findByTestId('select-home-team-btn'));
        fireEvent.click(within(await screen.findByTestId('select-player-modal')).getByTestId('player-btn-P1'));
        
        await screen.findByTestId('select-action-modal');
        fireEvent.click(screen.getByTestId('context-menu-overlay')); // Close previous
        
        fireEvent.keyDown(window, { key: 'c', bubbles: true });
        await screen.findByTestId('select-player-modal');

        // Substitution Exception via Field Click
        fireEvent.click(screen.getByTestId('mock-field'), { clientX: 10, clientY: 50 });
        const teamModalSub = await screen.findByTestId('select-team-modal');
        fireEvent.click(within(teamModalSub).getByTestId('select-home-team-btn'));
        
        const playerModal3 = await screen.findByTestId('select-player-modal');
        fireEvent.click(within(playerModal3).getByTestId('substitution-menu-btn'));
        const subOutModal = await screen.findByTestId('select-sub-out-modal');
        fireEvent.click(within(subOutModal).getByTestId('sub-out-player-btn-P1'));
        const subInModal = await screen.findByTestId('select-sub-in-modal');
        fireEvent.click(within(subInModal).getByTestId('sub-in-player-btn-P5'));
        const confirmSubModal = await screen.findByTestId('confirm-sub-exception-modal');
        fireEvent.click(within(confirmSubModal).getByTestId('sub-exception-injury-btn'));

        expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Toolbar and General Interactions', async () => {
        renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
        fireEvent.click(await screen.findByTestId('mute-btn'));
        fireEvent.click(await screen.findByTestId('undo-btn'));
        fireEvent.click(await screen.findByTestId('shot-clock-toggle'));
        fireEvent.click(await screen.findByTestId('switch-possession-btn'));
        fireEvent.click(await screen.findByTestId('timeout-btn'));
        fireEvent.click(await screen.findByTestId('vote-btn'));
        
        expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Phase Transitions and Overtime', async () => {
        const state = { ...mockMatchState, timer: { ...mockMatchState.timer, elapsedSeconds: 1501 } };
        renderWithProviders(<MatchTracker matchState={state as any} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
        const endBtns = await screen.findAllByTestId('end-period-btn');
        fireEvent.click(endBtns[0]);
        await screen.findByTestId('half-end-modal');
        fireEvent.click(await screen.findByTestId('start-break-btn-main'));

        const endState = { ...mockMatchState, currentHalf: 2, timer: { ...mockMatchState.timer, elapsedSeconds: 1501 } };
        renderWithProviders(<MatchTracker matchState={endState as any} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
        const endBtns2 = await screen.findAllByTestId('end-period-btn');
        fireEvent.click(endBtns2[0]);
        await screen.findByTestId('match-end-modal');
        fireEvent.click(await screen.findByTestId('overtime-btn'));
        
        const endBtns3 = await screen.findAllByTestId('end-period-btn');
        fireEvent.click(endBtns3[0]);
        await screen.findByTestId('match-end-modal');
        const finishBtns = await screen.findAllByTestId('finish-match-btn');
        fireEvent.click(finishBtns[0]);
    });

    it('covers Penalty and Free Throw UI sequences', async () => {
        renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
        // Penalty Flow 
        fireEvent.click(await screen.findByTestId('mock-field'), { clientX: 90, clientY: 50 });
        fireEvent.click(await screen.findByTestId('select-home-team-btn'));
        fireEvent.click(within(await screen.findByTestId('select-player-modal')).getByTestId('player-btn-P1'));
        fireEvent.click(await screen.findByTestId('goal-miss-action-btn'));
        fireEvent.click(await screen.findByTestId('shot-type-btn-PENALTY'));
        fireEvent.click(await screen.findByTestId('result-goal-btn'));

        // Free Throw Flow
        fireEvent.click(await screen.findByTestId('mock-field'));
        fireEvent.click(await screen.findByTestId('select-home-team-btn'));
        fireEvent.click(within(await screen.findByTestId('select-player-modal')).getByTestId('player-btn-P2'));
        fireEvent.click(await screen.findByTestId('goal-miss-action-btn'));
        fireEvent.click(await screen.findByTestId('shot-type-btn-FREE_THROW'));
        fireEvent.click(await screen.findByTestId('result-miss-btn'));

        expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers more advanced interactions', async () => {
         renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
         
         // Turnover
         fireEvent.click(await screen.findByTestId('mock-field'));
         fireEvent.click(await screen.findByTestId('select-home-team-btn'));
         fireEvent.click(within(await screen.findByTestId('select-player-modal')).getByTestId('player-btn-P1'));
         fireEvent.click(await screen.findByTestId('turnover-action-btn'));

         // Foul
         fireEvent.click(await screen.findByTestId('mock-field'));
         fireEvent.click(await screen.findByTestId('select-home-team-btn'));
         fireEvent.click(within(await screen.findByTestId('select-player-modal')).getByTestId('player-btn-P1'));
         fireEvent.click(await screen.findByTestId('foul-action-btn'));

         // Rebound
         fireEvent.click(await screen.findByTestId('mock-field'));
         fireEvent.click(await screen.findByTestId('select-home-team-btn'));
         fireEvent.click(within(await screen.findByTestId('select-player-modal')).getByTestId('player-btn-P1'));
         fireEvent.click(await screen.findByTestId('rebound-action-btn'));

         expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Goal via UI flow', async () => {
         renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
         
         fireEvent.click(await screen.findByTestId('mock-field'), { clientX: 10, clientY: 50 });
         fireEvent.click(await screen.findByTestId('select-home-team-btn'));
         fireEvent.click(within(await screen.findByTestId('select-player-modal')).getByTestId('player-btn-P1'));
         fireEvent.click(await screen.findByTestId('goal-miss-action-btn'));
         fireEvent.click(await screen.findByTestId('shot-type-btn-RUNNING_IN'));
         
         await waitFor(() => expect(onUpdateMatch).toHaveBeenCalled());
    });

    it('covers Card via Shortcut sequence: C -> 1 -> Yellow', async () => {
         renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
         
         fireEvent.keyDown(window, { key: 'c', bubbles: true });
         await screen.findByTestId('select-player-modal');
         
         fireEvent.keyDown(window, { key: '1', bubbles: true });
         const cardModal = await screen.findByTestId('select-card-type-modal');
         fireEvent.click(within(cardModal).getByTestId('yellow-card-btn'));
         expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Substitution sequence via shortcut', async () => {
         const matchStateWithNoSubs = {
           ...mockMatchState,
           homeTeam: { ...mockMatchState.homeTeam, substitutionCount: 0 }
         };
         renderWithProviders(<MatchTracker matchState={matchStateWithNoSubs} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
         
         fireEvent.keyDown(window, { key: 's', bubbles: true });
         await screen.findByTestId('select-team-for-sub-modal');
         
         fireEvent.keyDown(window, { key: '1', bubbles: true });
         await screen.findByTestId('select-sub-out-modal');
         
         fireEvent.keyDown(window, { key: '1', bubbles: true });
         await screen.findByTestId('select-sub-in-modal');
         
         fireEvent.keyDown(window, { key: '1', bubbles: true });
         await waitFor(() => expect(onUpdateMatch).toHaveBeenCalled());
    });

    it('covers Undo and Timeout interactions', async () => {
         const { rerender } = renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
         
         fireEvent.click(await screen.findByTestId('timeout-btn'));
         expect(onUpdateMatch).toHaveBeenCalledWith(expect.objectContaining({
             timer: expect.objectContaining({ isRunning: false })
         }));

         const stateWithEvent = {
             ...mockMatchState,
             events: [{ id: 'e1', teamId: 'HOME', type: 'SHOT', result: 'GOAL', timestamp: 10, realTime: Date.now(), half: 1 }]
         };
         rerender(<MatchTracker matchState={stateWithEvent as any} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
         
         fireEvent.click(await screen.findByTestId('undo-btn'));
         expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Penalty sequence via UI', async () => {
         renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
         
         fireEvent.click(await screen.findByTestId('mock-field'), { clientX: 90, clientY: 50 });
         fireEvent.click(await screen.findByTestId('select-home-team-btn'));
         
         const playerModal = await screen.findByTestId('select-player-modal');
         fireEvent.click(within(playerModal).getByTestId('player-btn-P1'));
         
         fireEvent.click(await screen.findByTestId('goal-miss-action-btn'));
         fireEvent.click(await screen.findByTestId('shot-type-btn-PENALTY'));
         fireEvent.click(await screen.findByTestId('result-goal-btn'));
         
         await waitFor(() => expect(onUpdateMatch).toHaveBeenCalled());
    });

    describe('Undo/Redo & History Depth', () => {
        it('handles multiple undo/redo steps', async () => {
            const stateWithEvents = { 
                ...mockMatchState, 
                events: [
                    { id: 'e1', teamId: 'HOME', type: 'SHOT', result: 'GOAL', timestamp: 10, realTime: Date.now(), half: 1 },
                    { id: 'e2', teamId: 'HOME', type: 'SHOT', result: 'MISS', timestamp: 20, realTime: Date.now(), half: 1 }
                ]
            };
            renderWithProviders(<MatchTracker matchState={stateWithEvents as any} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
            
            // Undo once
            fireEvent.click(screen.getByTestId('undo-btn'));
            expect(onUpdateMatch).toHaveBeenCalled();
            
            // Check that it was called with one less event
            const lastCall = onUpdateMatch.mock.calls[onUpdateMatch.mock.calls.length - 1][0];
            expect(lastCall.events.length).toBe(1);
            expect(lastCall.events[0].id).toBe('e1');
            
            // Should be able to undo again (if state was updated, but here we just mock the calls)
        });
    });

    describe('Penalty and Free Throw Success/Fail', () => {
        it('tracks penalty success vs failure correctly', async () => {
            renderWithProviders(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
            
            // Click field for Penalty
            fireEvent.click(screen.getByTestId('mock-field'));
            fireEvent.click(await screen.findByTestId('select-home-team-btn'));
            fireEvent.click(within(await screen.findByTestId('select-player-modal')).getByTestId('player-btn-P1'));
            fireEvent.click(await screen.findByTestId('goal-miss-action-btn'));
            fireEvent.click(await screen.findByTestId('shot-type-btn-PENALTY'));
            
            // Result: MISS
            fireEvent.click(await screen.findByTestId('result-miss-btn'));
            
            expect(onUpdateMatch).toHaveBeenLastCalledWith(expect.objectContaining({
                events: expect.arrayContaining([
                    expect.objectContaining({ type: 'SHOT', result: 'MISS', shotType: 'PENALTY' })
                ])
            }));
        });
    });
});
