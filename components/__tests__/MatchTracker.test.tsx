import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import MatchTracker from '../MatchTracker';
import { MatchState } from '../../types';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

window.alert = vi.fn();
window.open = vi.fn();

// Mock hooks
vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { soundEnabled: true, vibration: true, soundEffects: true, autoShotClock: true },
    updateSettings: vi.fn()
  })
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
        render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
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
        render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
        // Card flow via shortcut
        fireEvent.keyDown(window, { key: 'c' });
        const playerModal = await screen.findByTestId('select-player-modal');
        fireEvent.click(within(playerModal).getByTestId('player-btn-P1'));
        const cardModal = await screen.findByTestId('select-card-type-modal');
        fireEvent.click(within(cardModal).getByTestId('yellow-card-btn'));
        
        fireEvent.keyDown(window, { key: 'c' });
        const playerModal2 = await screen.findByTestId('select-player-modal');
        fireEvent.click(within(playerModal2).getByTestId('player-btn-P1'));
        const cardModal2 = await screen.findByTestId('select-card-type-modal');
        fireEvent.click(within(cardModal2).getByTestId('red-card-btn'));

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
        render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
        
        fireEvent.click(screen.getByTestId('mute-btn'));
        fireEvent.click(screen.getByTestId('undo-btn'));
        fireEvent.click(screen.getByTestId('shot-clock-toggle'));
        fireEvent.click(screen.getByTestId('switch-possession-btn'));
        fireEvent.click(screen.getByTestId('timeout-btn'));
        fireEvent.click(screen.getByTestId('vote-btn'));
        
        const keys = ['h', 'a', 'g', 'm', 'k', 't', 's', 'o', 'f', 'r', 'Escape', '1', 'Enter'];
        keys.forEach(key => fireEvent.keyDown(window, { key }));

        expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Phase Transitions and Overtime', async () => {
        const state = { ...mockMatchState, timer: { ...mockMatchState.timer, elapsedSeconds: 1501 } };
        render(<MatchTracker matchState={state as any} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
        
        fireEvent.click(screen.getAllByTestId('end-period-btn')[0]);
        await screen.findByTestId('half-end-modal');
        fireEvent.click(screen.getByTestId('start-break-btn-main'));

        const endState = { ...mockMatchState, currentHalf: 2, timer: { ...mockMatchState.timer, elapsedSeconds: 1501 } };
        render(<MatchTracker matchState={endState as any} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
        fireEvent.click(screen.getAllByTestId('end-period-btn')[0]);
        await screen.findByTestId('match-end-modal');
        fireEvent.click(screen.getByTestId('overtime-btn'));
        
        fireEvent.click(screen.getAllByTestId('end-period-btn')[0]);
        await screen.findByTestId('match-end-modal');
        fireEvent.click(screen.getAllByTestId('finish-match-btn')[0]);
    });

    it('covers Penalty and Free Throw UI sequences', async () => {
        render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
        
        // Penalty Flow 
        fireEvent.click(screen.getByTestId('mock-field'), { clientX: 90, clientY: 50 });
        const teamModal = await screen.findByTestId('select-team-modal');
        fireEvent.click(within(teamModal).getByTestId('select-home-team-btn'));
        const playerModal = await screen.findByTestId('select-player-modal');
        fireEvent.click(within(playerModal).getByTestId('player-btn-P1'));
        const actionModal = await screen.findByTestId('select-action-modal');
        fireEvent.click(within(actionModal).getByTestId('goal-miss-action-btn'));
        const shotTypeModal = await screen.findByTestId('select-shot-type-modal');
        fireEvent.click(within(shotTypeModal).getByTestId('shot-type-btn-PENALTY'));
        const resultModal = await screen.findByTestId('select-result-modal');
        fireEvent.click(within(resultModal).getByTestId('result-goal-btn'));

        // Free Throw Flow
        fireEvent.click(screen.getByTestId('mock-field'));
        const teamModalFT = await screen.findByTestId('select-team-modal');
        fireEvent.click(within(teamModalFT).getByTestId('select-home-team-btn'));
        const playerModalFT = await screen.findByTestId('select-player-modal');
        fireEvent.click(within(playerModalFT).getByTestId('player-btn-P2'));
        const actionModalFT = await screen.findByTestId('select-action-modal');
        fireEvent.click(within(actionModalFT).getByTestId('goal-miss-action-btn'));
        const shotTypeModalFT = await screen.findByTestId('select-shot-type-modal');
        fireEvent.click(within(shotTypeModalFT).getByTestId('shot-type-btn-FREE_THROW'));
        const resultModal2 = await screen.findByTestId('select-result-modal');
        fireEvent.click(within(resultModal2).getByTestId('result-miss-btn'));

        expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers more advanced interactions', async () => {
         render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} socket={null} onSpotterAction={() => {}} />);
         
         // Turnover
         fireEvent.click(screen.getByTestId('mock-field'));
         const teamModalTO = await screen.findByTestId('select-team-modal');
         fireEvent.click(within(teamModalTO).getByTestId('select-home-team-btn'));
         const playerModalTO = await screen.findByTestId('select-player-modal');
         fireEvent.click(within(playerModalTO).getByTestId('player-btn-P1'));
         const actionModalTO = await screen.findByTestId('select-action-modal');
         fireEvent.click(within(actionModalTO).getByTestId('turnover-action-btn'));

         // Foul
         fireEvent.click(screen.getByTestId('mock-field'));
         const teamModalF = await screen.findByTestId('select-team-modal');
         fireEvent.click(within(teamModalF).getByTestId('select-home-team-btn'));
         const playerModalF = await screen.findByTestId('select-player-modal');
         fireEvent.click(within(playerModalF).getByTestId('player-btn-P1'));
         const actionModalF = await screen.findByTestId('select-action-modal');
         fireEvent.click(within(actionModalF).getByTestId('foul-action-btn'));

         // Rebound
         fireEvent.click(screen.getByTestId('mock-field'));
         const teamModalR = await screen.findByTestId('select-team-modal');
         fireEvent.click(within(teamModalR).getByTestId('select-home-team-btn'));
         const playerModalR = await screen.findByTestId('select-player-modal');
         fireEvent.click(within(playerModalR).getByTestId('player-btn-P1'));
         const actionModalR = await screen.findByTestId('select-action-modal');
         fireEvent.click(within(actionModalR).getByTestId('rebound-action-btn'));

         expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Goal via Shortcut sequence: G -> 1', async () => {
         render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
         fireEvent.keyDown(window, { key: 'g' });
         const playerModal = await screen.findByTestId('select-player-modal');
         fireEvent.keyDown(window, { key: '1' }); 
         expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Card via Shortcut sequence: C -> 1 -> Yellow', async () => {
         render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
         fireEvent.keyDown(window, { key: 'c' });
         const playerModalC = await screen.findByTestId('select-player-modal');
         fireEvent.keyDown(window, { key: '1' });
         const cardModal = await screen.findByTestId('select-card-type-modal');
         fireEvent.click(within(cardModal).getByTestId('yellow-card-btn'));
         expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Substitution Shortcut: S -> 1 -> 1 -> 1', async () => {
         const matchStateWithNoSubs = {
           ...mockMatchState,
           homeTeam: { ...mockMatchState.homeTeam, substitutionCount: 0 }
         };
         render(<MatchTracker matchState={matchStateWithNoSubs} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
         fireEvent.keyDown(window, { key: 's' });
         const teamModal = await screen.findByTestId('select-team-for-sub-modal');
         fireEvent.keyDown(window, { key: '1' }); 
         const subOutModal = await screen.findByTestId('select-sub-out-modal');
         fireEvent.keyDown(window, { key: '1' });
         const subInModal = await screen.findByTestId('select-sub-in-modal');
         fireEvent.keyDown(window, { key: '1' });
         await waitFor(() => expect(onUpdateMatch).toHaveBeenCalled());
    });

    it('covers Undo and Timeout interactions', async () => {
         const { rerender } = render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
         
         // Timeout
         fireEvent.click(screen.getByTestId('timeout-btn'));
         expect(onUpdateMatch).toHaveBeenCalledWith(expect.objectContaining({
             timer: expect.objectContaining({ isRunning: false })
         }));

         // Undo (with an event)
         const stateWithEvent = {
             ...mockMatchState,
             events: [{ id: 'e1', teamId: 'HOME', type: 'SHOT', result: 'GOAL', timestamp: 10, realTime: Date.now(), half: 1 }]
         };
         rerender(<MatchTracker matchState={stateWithEvent} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
         
         fireEvent.click(screen.getByTestId('undo-btn'));
         expect(onUpdateMatch).toHaveBeenCalled();
    });

    it('covers Penalty Shortcut: P -> 1 -> Enter', async () => {
         render(<MatchTracker matchState={mockMatchState} onUpdateMatch={onUpdateMatch} onFinishMatch={onFinishMatch} onViewChange={onViewChange} />);
         fireEvent.keyDown(window, { key: 'p' });
         const playerModalP = await screen.findByTestId('select-player-modal');
         fireEvent.keyDown(window, { key: '1' });
         const resultModal = await screen.findByTestId('select-result-modal');
         fireEvent.keyDown(window, { key: 'Enter' });
         expect(onUpdateMatch).toHaveBeenCalled();
    });
});
