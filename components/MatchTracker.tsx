import React, { useState } from 'react';
import { MatchState, TeamId, MatchEvent, SHOT_TYPES, ActionType, CardType, ShotType } from '../types';
import KorfballField, { getShotDistanceType } from './KorfballField';
import { PieChart, Clock, Target, Shield, AlertTriangle, ArrowRightLeft, Timer, Repeat, Shirt, AlertOctagon, Monitor, Gavel, Undo2, Volume2, VolumeX } from 'lucide-react';

import { useSettings } from '../contexts/SettingsContext';
import { useGameAudio } from '../hooks/useGameAudio';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface MatchTrackerProps {
  matchState: MatchState;
  onUpdateMatch: (newState: MatchState) => void;
  onFinishMatch: () => void;
  onViewChange?: (view: 'STATS' | 'JURY' | 'LIVE' | 'LIVESTREAM_STATS' | 'STREAM_OVERLAY') => void;
}

const MatchTracker: React.FC<MatchTrackerProps> = ({ matchState, onUpdateMatch, onFinishMatch, onViewChange }) => {
  const { settings, updateSettings } = useSettings();
  const soundEnabled = settings.soundEnabled;
  const { playShotClockBuzzer, playGameEndHorn } = useGameAudio(!soundEnabled);

  // --- State Definitions (Moved up to fix scoping) ---
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    step: 'SELECT_TEAM' | 'SELECT_PLAYER' | 'SELECT_ACTION' | 'SELECT_SHOT_TYPE' | 'SELECT_SUB_OUT' | 'SELECT_SUB_IN' | 'CONFIRM_SUB_EXCEPTION' | 'SELECT_CARD_PLAYER';
    selectedTeam?: TeamId;
    selectedPlayerId?: string;
    subOutId?: string;
    subInId?: string;
    cardType?: CardType;
    calculatedShotType?: ShotType;
  } | null>(null);

  const [activeModal, setActiveModal] = useState<'END_HALF' | 'END_MATCH' | 'BREAK_SETUP' | 'OT_SETUP'>('END_HALF');
  const [showModal, setShowModal] = useState(false);
  const [customDuration, setCustomDuration] = useState(10); // Minutes
  const [pendingShortcutAction, setPendingShortcutAction] = useState<'GOAL' | 'MISS' | 'FREE_THROW' | 'PENALTY' | 'CARD' | 'TURNOVER' | 'FOUL' | 'REBOUND' | null>(null);

  // Track previous clock values to detect transition to 0
  const prevShotClockRef = React.useRef(matchState.shotClock.seconds);
  const prevGameTimeRef = React.useRef(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds));

  React.useEffect(() => {
    // Shot Clock Check
    const currentShotClock = matchState.shotClock.seconds;
    if (prevShotClockRef.current > 0 && currentShotClock <= 0 && matchState.shotClock.lastStartTime) {
      // Only play if it was running down naturally? Or just anytime it hits 0?
      // Ideally when it *transitions* provided it's "live".
      // We check lastStartTime to ensure it wasn't just *set* to 0 manually while paused (though that might be fine too).
      playShotClockBuzzer();
    }
    prevShotClockRef.current = currentShotClock;

    // Game Clock Check
    const currentGameTime = Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds);
    if (prevGameTimeRef.current > 0 && currentGameTime <= 0) {
      playGameEndHorn();
    }
    prevGameTimeRef.current = currentGameTime;
  }, [matchState.shotClock.seconds, matchState.timer.elapsedSeconds, matchState.halfDurationSeconds, matchState.shotClock.lastStartTime, playShotClockBuzzer, playGameEndHorn]);

  // --- Keyboard Shortcuts Logic ---

  // Helper: check if we are in a specific context step
  const isMenuOpen = contextMenu?.visible;
  const currentStep = contextMenu?.step;

  const handleShortcutAction = (action: 'GOAL' | 'MISS' | 'FREE_THROW' | 'PENALTY' | 'TIMEOUT' | 'SUB' | 'CARD' | 'TURNOVER' | 'FOUL' | 'REBOUND') => {
    // 1. If we are in "SELECT_ACTION" mode (player selected), allow action shortcuts to EXECUTE immediately
    if (isMenuOpen && currentStep === 'SELECT_ACTION' && contextMenu.selectedPlayerId) {
      const teamId = contextMenu.selectedTeam || matchState.possession || 'HOME';
      const playerId = contextMenu.selectedPlayerId;
      const location = { x: 50, y: 50 }; // Default center

      if (action === 'GOAL') addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
      else if (action === 'MISS') addEvent({ teamId, playerId, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
      else if (action === 'FREE_THROW') addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'FREE_THROW', location }); // K
      else if (action === 'PENALTY') addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'PENALTY', location });
      else if (action === 'TURNOVER') addEvent({ teamId, playerId, type: 'TURNOVER', location }); // O
      else if (action === 'FOUL') addEvent({ teamId, playerId, type: 'FOUL', location }); // F
      else if (action === 'REBOUND') addEvent({ teamId, playerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location }); // R
      else if (action === 'CARD') {
        // Card requires color selection, stay in menu or open card specific?
        // Since we have specific card logic in menu, let's just ignore for now or show alert?
        // For now, do nothing or let manual selection happen.
      }

      if (action !== 'CARD' && action !== 'SUB' && action !== 'TIMEOUT') {
        setPendingShortcutAction(null);
      }
      return;
    }

    // 2. If we are in ANY other specific context (e.g. Sub In/Out, Substitution Exception), 
    // we should IGNORE action shortcuts to prevent "Overwriting" the menu.
    if (isMenuOpen && ['SELECT_SUB_OUT', 'SELECT_SUB_IN', 'CONFIRM_SUB_EXCEPTION', 'SELECT_SHOT_TYPE'].includes(currentStep || '')) {
      // Do not interrupt these flows with a new action start
      return;
    }

    // 3. Default Flow: Start a new action (opens Select Player)
    // Only if menu is CLOSED or we are in 'SELECT_PLAYER' (switching intent?)
    // If we are in 'SELECT_PLAYER' with a pending action, we can switch the pending action.

    const teamId = contextMenu?.selectedTeam || matchState.possession || 'HOME';

    if (['GOAL', 'MISS', 'FREE_THROW', 'PENALTY', 'CARD', 'TURNOVER', 'FOUL', 'REBOUND'].includes(action)) {
      setContextMenu({
        visible: true,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        step: 'SELECT_PLAYER',
        selectedTeam: teamId,
      } as any);
      setPendingShortcutAction(action as any);
    }
    else if (action === 'TIMEOUT') {
      startTimeout();
    }
    else if (action === 'SUB') {
      // Only start substitution if not already deep in a menu
      if (!isMenuOpen || currentStep === 'SELECT_PLAYER') {
        setContextMenu({
          visible: true,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          step: 'SELECT_TEAM_FOR_SUB',
        } as any);
        setPendingShortcutAction(null);
      }
    }
  };



  const handlePlayerNumberSelection = (numberIndex: number) => {
    // numberIndex is 0-7 (for keys 1-8)
    // numberIndex is 0-7 (for keys 1-8)
    if (!isMenuOpen) return;

    const team = contextMenu.selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;

    // LOGIC DEPENDS ON STEP
    if (currentStep === 'SELECT_PLAYER' || currentStep === 'SELECT_SUB_OUT') {
      // Select from ON FIELD players
      const onFieldPlayers = team.players.filter(p => p.onField);
      const player = onFieldPlayers[numberIndex];
      if (player) {
        if (currentStep === 'SELECT_PLAYER') {
          // Proceed to Action or Execute Pending
          if (pendingShortcutAction) {
            const location = { x: 50, y: 50 };
            if (pendingShortcutAction === 'GOAL') addEvent({ teamId: team.id, playerId: player.id, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
            else if (pendingShortcutAction === 'MISS') addEvent({ teamId: team.id, playerId: player.id, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
            else if (pendingShortcutAction === 'FREE_THROW') addEvent({ teamId: team.id, playerId: player.id, type: 'SHOT', result: 'GOAL', shotType: 'FREE_THROW', location });
            else if (pendingShortcutAction === 'PENALTY') addEvent({ teamId: team.id, playerId: player.id, type: 'SHOT', result: 'GOAL', shotType: 'PENALTY', location });
            else if (pendingShortcutAction === 'TURNOVER') addEvent({ teamId: team.id, playerId: player.id, type: 'TURNOVER', location });
            else if (pendingShortcutAction === 'FOUL') addEvent({ teamId: team.id, playerId: player.id, type: 'FOUL', location });
            else if (pendingShortcutAction === 'REBOUND') addEvent({ teamId: team.id, playerId: player.id, type: 'REBOUND', reboundType: 'OFFENSIVE', location });
            else if (pendingShortcutAction === 'CARD') {
              setContextMenu({ ...contextMenu, selectedPlayerId: player.id, step: 'SELECT_ACTION' });
              setPendingShortcutAction(null);
              return;
            }
            setPendingShortcutAction(null);
            setContextMenu(null);
          } else {
            // Just select player
            setContextMenu({ ...contextMenu, selectedPlayerId: player.id, step: 'SELECT_ACTION' });
          }
        } else if (currentStep === 'SELECT_SUB_OUT') {
          setContextMenu({ ...contextMenu, subOutId: player.id, step: 'SELECT_SUB_IN' });
        }
      }
    } else if (currentStep === 'SELECT_SUB_IN') {
      // Select from BENCH players
      const benchPlayers = team.players.filter(p => !p.onField);
      const player = benchPlayers[numberIndex];
      if (player) {
        if (team.substitutionCount >= 8) {
          setContextMenu({ ...contextMenu, subInId: player.id, step: 'CONFIRM_SUB_EXCEPTION' });
        } else {
          const evt = { ...contextMenu, subInId: player.id };
          setContextMenu(evt);
          setTimeout(() => handleSubstitution('REGULAR'), 0);
        }
      }
    } else if (currentStep === 'SELECT_ACTION') {
      // Handle 1-4 for Action Selection
      if (numberIndex === 0) { // 1 -> Goal
        setContextMenu({ ...contextMenu, step: 'SELECT_SHOT_TYPE' });
      } else if (numberIndex === 1) { // 2 -> Turnover
        addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'TURNOVER', location: { x: contextMenu.x, y: contextMenu.y } });
      } else if (numberIndex === 2) { // 3 -> Foul
        addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'FOUL', location: { x: contextMenu.x, y: contextMenu.y } });
      } else if (numberIndex === 3) { // 4 -> Rebound
        addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location: { x: contextMenu.x, y: contextMenu.y } });
      }
    } else if (currentStep === 'SELECT_SHOT_TYPE') {
      const location = { x: contextMenu.x, y: contextMenu.y };
      if (numberIndex === 0) { // 1 -> Running In
        addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'RUNNING_IN', result: 'GOAL', location });
      } else if (numberIndex === 1) { // 2 -> Penalty
        addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'PENALTY', result: 'GOAL', location });
      } else if (numberIndex === 2) { // 3 -> Free Throw
        addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'FREE_THROW', result: 'GOAL', location });
      } else if (numberIndex === 3) { // 4 -> Miss
        addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'MISS', location });
      }
    }
  };

  useKeyboardShortcuts([
    { key: 'h', action: () => setContextMenu({ visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_PLAYER', selectedTeam: 'HOME' } as any) },
    { key: 'a', action: () => setContextMenu({ visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_PLAYER', selectedTeam: 'AWAY' } as any) },

    { key: 'g', action: () => handleShortcutAction('GOAL') },
    { key: 'm', action: () => handleShortcutAction('MISS') },
    { key: 'k', action: () => handleShortcutAction('FREE_THROW') }, // K for Free Kick/Throw
    { key: 'p', action: () => handleShortcutAction('PENALTY') },
    { key: 't', action: () => handleShortcutAction('TIMEOUT') },
    { key: 's', action: () => handleShortcutAction('SUB') },
    { key: 'c', action: () => handleShortcutAction('CARD') },

    // New Actions
    { key: 'o', action: () => handleShortcutAction('TURNOVER') },
    { key: 'f', action: () => handleShortcutAction('FOUL') },
    { key: 'r', action: () => handleShortcutAction('REBOUND') },

    // Player Numbers
    { key: '1', action: () => handlePlayerNumberSelection(0) },
    { key: '2', action: () => handlePlayerNumberSelection(1) },
    { key: '3', action: () => handlePlayerNumberSelection(2) },
    { key: '4', action: () => handlePlayerNumberSelection(3) },
    { key: '5', action: () => handlePlayerNumberSelection(4) },
    { key: '6', action: () => handlePlayerNumberSelection(5) },
    { key: '7', action: () => handlePlayerNumberSelection(6) },
    { key: '8', action: () => handlePlayerNumberSelection(7) },

    {
      key: 'Enter', action: () => {
        if (isMenuOpen && currentStep === 'SELECT_SHOT_TYPE') {
          addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } });
        }
      }
    },

    { key: 'Escape', action: () => { setContextMenu(null); setShowModal(false); setPendingShortcutAction(null); } }
  ]);



  const handlePhaseEnd = () => {
    if (matchState.currentHalf === 1) {
      setActiveModal('END_HALF');
      setShowModal(true);
    } else {
      setActiveModal('END_MATCH');
      setShowModal(true);
    }
  };

  const startBreak = (durationMinutes: number) => {
    onUpdateMatch({
      ...matchState,
      timer: { ...matchState.timer, isRunning: false, lastStartTime: undefined },
      shotClock: { ...matchState.shotClock, isRunning: false, lastStartTime: undefined },
      break: {
        isActive: true,
        startTime: Date.now(),
        durationSeconds: durationMinutes * 60
      }
    });
    setShowModal(false);
  };

  const endBreak = () => {
    startNextPeriod(25); // Default 2nd half duration
  };

  const startNextPeriod = (durationMinutes: number) => {
    onUpdateMatch({
      ...matchState,
      currentHalf: matchState.currentHalf + 1,
      halfDurationSeconds: durationMinutes * 60,
      timer: { elapsedSeconds: 0, isRunning: false },
      shotClock: { seconds: 25, isRunning: false },
      break: { isActive: false, startTime: 0, durationSeconds: 0 },
      possession: matchState.possession === 'HOME' ? 'AWAY' : 'HOME'
    });
    setShowModal(false);
  };

  const startTimeout = () => {
    onUpdateMatch({
      ...matchState,
      timeout: {
        isActive: true,
        startTime: Date.now(),
        remainingSeconds: 60,
        teamId: matchState.possession || 'HOME'
      },
      events: [...matchState.events, {
        id: crypto.randomUUID(),
        timestamp: Math.floor(matchState.timer.elapsedSeconds),
        realTime: Date.now(),
        half: matchState.currentHalf,
        teamId: matchState.possession || 'HOME',
        type: 'TIMEOUT'
      }]
    });
  };

  const cancelTimeout = () => {
    onUpdateMatch({
      ...matchState,
      timeout: { ...matchState.timeout, isActive: false }
    });
  };

  const togglePossession = () => {
    onUpdateMatch({
      ...matchState,
      possession: matchState.possession === 'HOME' ? 'AWAY' : 'HOME'
    });
  };

  const handleFieldClick = (x: number, y: number) => {
    const teamId: TeamId = x < 50 ? 'HOME' : 'AWAY';
    const autoShotType = getShotDistanceType(x, y);

    setContextMenu({
      visible: true,
      x,
      y,
      step: 'SELECT_PLAYER',
      selectedTeam: teamId,
      calculatedShotType: autoShotType
    });
  };

  const handleSubstitution = (reason: 'REGULAR' | 'INJURY' | 'RED_CARD') => {
    if (!contextMenu?.selectedTeam || !contextMenu.subOutId || !contextMenu.subInId) return;

    const team = contextMenu.selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;

    const updatedPlayers = team.players.map(p => {
      if (p.id === contextMenu.subOutId) return { ...p, onField: false };
      if (p.id === contextMenu.subInId) return { ...p, onField: true };
      return p;
    });

    const updatedTeam = {
      ...team,
      players: updatedPlayers,
      substitutionCount: reason === 'REGULAR' ? team.substitutionCount + 1 : team.substitutionCount
    };

    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      timestamp: Math.floor(matchState.timer.elapsedSeconds),
      realTime: Date.now(),
      half: matchState.currentHalf,
      teamId: contextMenu.selectedTeam,
      type: 'SUBSTITUTION',
      subOutId: contextMenu.subOutId,
      subInId: contextMenu.subInId,
      subReason: reason,
      previousPossession: matchState.possession
    };

    onUpdateMatch({
      ...matchState,
      homeTeam: contextMenu.selectedTeam === 'HOME' ? updatedTeam : matchState.homeTeam,
      awayTeam: contextMenu.selectedTeam === 'AWAY' ? updatedTeam : matchState.awayTeam,
      events: [...matchState.events, newEvent]
    });
    setContextMenu(null);
  };

  const addEvent = (eventData: Partial<MatchEvent>) => {
    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      timestamp: Math.floor(matchState.timer.elapsedSeconds),
      realTime: Date.now(),
      half: matchState.currentHalf,
      teamId: eventData.teamId!,
      playerId: eventData.playerId!,
      type: eventData.type!,
      previousPossession: matchState.possession,
      ...eventData,
    };

    let newPossession = matchState.possession;
    if (eventData.result === 'GOAL' || eventData.type === 'TURNOVER') {
      newPossession = eventData.teamId === 'HOME' ? 'AWAY' : 'HOME';
    } else if (eventData.type === 'REBOUND' && eventData.reboundType === 'DEFENSIVE') {
      newPossession = eventData.teamId;
    }

    onUpdateMatch({
      ...matchState,
      events: [...matchState.events, newEvent],
      possession: newPossession,
      shotClock: { ...matchState.shotClock, seconds: 25 }
    });
    setContextMenu(null);
  };

  const handleUndo = () => {
    if (matchState.events.length === 0) return;
    const lastEvent = matchState.events[matchState.events.length - 1];
    const remainingEvents = matchState.events.slice(0, -1);

    let updates: Partial<MatchState> = { events: remainingEvents };

    // Revert Possession if stored
    if (lastEvent.previousPossession) {
      updates.possession = lastEvent.previousPossession;
    }

    // Revert Substitution
    if (lastEvent.type === 'SUBSTITUTION' && lastEvent.subInId && lastEvent.subOutId) {
      const team = lastEvent.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
      const updatedPlayers = team.players.map(p => {
        if (p.id === lastEvent.subInId) return { ...p, onField: false };
        if (p.id === lastEvent.subOutId) return { ...p, onField: true };
        return p;
      });
      const updatedTeam = {
        ...team,
        players: updatedPlayers,
        substitutionCount: Math.max(0, team.substitutionCount - (lastEvent.subReason === 'REGULAR' ? 1 : 0))
      };
      if (lastEvent.teamId === 'HOME') updates.homeTeam = updatedTeam;
      else updates.awayTeam = updatedTeam;
    }

    onUpdateMatch({ ...matchState, ...updates });
  };

  const getScore = (teamId: TeamId) => matchState.events.filter(e => e.teamId === teamId && e.result === 'GOAL').length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const openExternalView = (view: 'JURY' | 'LIVE' | 'LIVESTREAM_STATS' | 'STREAM_OVERLAY') => {
    const url = `${window.location.origin}${window.location.pathname}?view=${view}`;
    window.open(url, view, 'popup=yes,width=1280,height=720');
  };

  const renderPhaseModals = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
        <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md" onClick={e => e.stopPropagation()}>

          {activeModal === 'END_HALF' && (
            <>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">End of 1st Half</h3>
              <p className="text-gray-500 mb-6">What would you like to do next?</p>
              <div className="space-y-3">
                <button onClick={() => startBreak(10)} className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center justify-between">
                  <span>Start 10m Break</span>
                  <Clock size={20} />
                </button>
                <button onClick={() => { setCustomDuration(10); setActiveModal('BREAK_SETUP'); }} className="w-full p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-left">
                  Custom Break Duration...
                </button>
                <div className="border-t my-2"></div>
                <button onClick={() => startNextPeriod(25)} className="w-full p-4 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg text-left">
                  Skip to 2nd Half (25m)
                </button>
              </div>
            </>
          )}

          {activeModal === 'BREAK_SETUP' && (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Break Duration</h3>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setCustomDuration(Math.max(1, customDuration - 1))} className="p-3 bg-gray-100 rounded-lg font-bold">-</button>
                <div className="text-3xl font-mono font-bold w-20 text-center">{customDuration}m</div>
                <button onClick={() => setCustomDuration(customDuration + 1)} className="p-3 bg-gray-100 rounded-lg font-bold">+</button>
              </div>
              <button onClick={() => startBreak(customDuration)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg">
                Start Break
              </button>
            </>
          )}

          {activeModal === 'END_MATCH' && (
            <>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">End of Period</h3>
              <p className="text-gray-500 mb-6">The time is up. Finish match or play overtime?</p>
              <div className="space-y-3">
                <button onClick={onFinishMatch} className="w-full p-4 bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-lg flex items-center justify-between shadow-lg">
                  <span>Finish Match & View Report</span>
                  <PieChart size={20} />
                </button>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-sm font-bold">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                <button onClick={() => { setCustomDuration(5); setActiveModal('OT_SETUP'); }} className="w-full p-4 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg flex items-center justify-between">
                  <span>Start Overtime...</span>
                  <Timer size={20} />
                </button>
              </div>
            </>
          )}

          {activeModal === 'OT_SETUP' && (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Overtime Duration</h3>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setCustomDuration(Math.max(1, customDuration - 1))} className="p-3 bg-gray-100 rounded-lg font-bold">-</button>
                <div className="text-3xl font-mono font-bold w-20 text-center">{customDuration}m</div>
                <button onClick={() => setCustomDuration(customDuration + 1)} className="p-3 bg-gray-100 rounded-lg font-bold">+</button>
              </div>
              <button onClick={() => startNextPeriod(customDuration)} className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg">
                Start Overtime
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu?.visible) return null;

    const activeTeam = contextMenu.selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
    const onFieldPlayers = activeTeam?.players.filter(p => p.onField) || [];
    const benchPlayers = activeTeam?.players.filter(p => !p.onField) || [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setContextMenu(null)}>
        <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              {contextMenu.step === 'SELECT_PLAYER' && "Select Player"}
              {contextMenu.step === 'SELECT_ACTION' && "Action"}
              {contextMenu.step === 'SELECT_SHOT_TYPE' && "Shot Details"}
              {contextMenu.step === 'SELECT_SUB_OUT' && `Substitution (Out)`}
              {contextMenu.step === 'SELECT_SUB_IN' && "Substitution (In)"}
              {contextMenu.step === 'CONFIRM_SUB_EXCEPTION' && "Substitution Limit Reached"}
            </h3>
            <div className="flex items-center gap-2">
              {contextMenu.step === 'SELECT_PLAYER' && pendingShortcutAction && (
                <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded animate-pulse">
                  Select Player for {pendingShortcutAction}
                </span>
              )}
              <button onClick={() => setContextMenu(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
          </div>

          <div className="space-y-4">
            {contextMenu.step === 'SELECT_PLAYER' && (
              <>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {onFieldPlayers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setContextMenu({ ...contextMenu, selectedPlayerId: p.id, step: 'SELECT_ACTION' })}
                      className="aspect-square rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-transparent hover:border-indigo-500 flex flex-col items-center justify-center font-bold text-gray-700 transition-all shadow-sm"
                    >
                      <span className="text-lg">{p.number}</span>
                      <span className="text-[10px] text-gray-500">{p.gender}</span>
                      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 bg-black/10 rounded-full transition-opacity">
                        <kbd className="bg-white/80 text-black text-xs px-1 rounded font-mono">{onFieldPlayers.indexOf(p) + 1}</kbd>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <button
                    onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_SUB_OUT' })}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-bold border border-gray-200"
                  >
                    <Repeat size={18} /> Substitution ({activeTeam.substitutionCount}/8)
                  </button>
                </div>
              </>
            )}

            {contextMenu.step === 'SELECT_SUB_OUT' && (
              <div className="grid grid-cols-4 gap-3">
                {onFieldPlayers.map(p => (
                  <button key={p.id} onClick={() => setContextMenu({ ...contextMenu, subOutId: p.id, step: 'SELECT_SUB_IN' })} className="aspect-square rounded-full bg-red-50 hover:bg-red-100 border-red-200 border flex items-center justify-center font-bold">{p.number}</button>
                ))}
              </div>
            )}
            {contextMenu.step === 'SELECT_SUB_IN' && (
              <div className="grid grid-cols-4 gap-3">
                {benchPlayers.map(p => (
                  <button key={p.id} onClick={() => {
                    if (activeTeam.substitutionCount >= 8) {
                      setContextMenu({ ...contextMenu, subInId: p.id, step: 'CONFIRM_SUB_EXCEPTION' });
                    } else {
                      const evt = { ...contextMenu, subInId: p.id };
                      setContextMenu(evt);
                      setTimeout(() => handleSubstitution('REGULAR'), 0);
                    }
                  }} className="aspect-square rounded-full bg-green-50 hover:bg-green-100 border-green-200 border flex items-center justify-center font-bold">{p.number}</button>
                ))}
              </div>
            )}

            {contextMenu.step === 'CONFIRM_SUB_EXCEPTION' && (
              <div className="flex gap-4 justify-center">
                <button onClick={() => handleSubstitution('INJURY')} className="px-4 py-2 bg-orange-100 font-bold rounded">Injury</button>
                <button onClick={() => handleSubstitution('RED_CARD')} className="px-4 py-2 bg-red-100 font-bold rounded text-red-700">Red Card</button>
              </div>
            )}

            {contextMenu.step === 'SELECT_ACTION' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_SHOT_TYPE' })}
                  className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex flex-col items-center gap-2"
                >
                  <Target size={24} /> Shot / Goal <kbd className="text-[10px] bg-white/50 px-1 rounded">1</kbd>
                </button>
                <button
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'TURNOVER', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="p-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 flex flex-col items-center gap-2"
                >
                  <ArrowRightLeft size={24} /> Turnover / Attack <kbd className="text-[10px] bg-black/10 px-1 rounded">2</kbd>
                </button>
                <button
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'FOUL', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="p-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 flex flex-col items-center gap-2"
                >
                  <AlertTriangle size={24} /> Foul <kbd className="text-[10px] bg-white/50 px-1 rounded">3</kbd>
                </button>
                <button
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex flex-col items-center gap-2"
                >
                  <Shield size={24} /> Rebound <kbd className="text-[10px] bg-white/50 px-1 rounded">4</kbd>
                </button>
              </div>
            )}

            {contextMenu.step === 'SELECT_SHOT_TYPE' && (
              <div className="space-y-4">
                <button
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="w-full px-3 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow font-bold text-lg mb-4 flex items-center justify-center gap-2"
                >
                  Goal ({contextMenu.calculatedShotType}) <kbd className="text-xs bg-white/20 px-1 rounded text-white">Enter</kbd>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'RUNNING_IN', result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } })} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">Running In <kbd className="text-[10px] bg-black/10 px-1 rounded">1</kbd></button>
                  <button onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'PENALTY', result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } })} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">Penalty <kbd className="text-[10px] bg-black/10 px-1 rounded">2</kbd></button>
                  <button onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'FREE_THROW', result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } })} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">Free Pass <kbd className="text-[10px] bg-black/10 px-1 rounded">3</kbd></button>
                  <button onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'MISS', location: { x: contextMenu.x, y: contextMenu.y } })} className="px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 font-bold flex flex-col items-center">Miss <kbd className="text-[10px] bg-black/10 px-1 rounded">4</kbd></button>
                </div>
              </div>
            )}

            {(contextMenu.step as any) === 'SELECT_TEAM_FOR_SUB' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-center mb-4">Select Team for Substitution</h3>
                <button
                  onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'HOME', step: 'SELECT_SUB_OUT' })}
                  className="w-full p-4 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors"
                  style={{ borderColor: matchState.homeTeam.color }}
                >
                  <div className="flex items-center gap-3">
                    <Shirt size={24} fill={matchState.homeTeam.color} stroke={matchState.homeTeam.color} />
                    <span className="font-bold text-lg">{matchState.homeTeam.name}</span>
                  </div>
                  <div className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-500 font-bold">
                    {matchState.homeTeam.substitutionCount}/8 Subs
                  </div>
                </button>
                <button
                  onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'AWAY', step: 'SELECT_SUB_OUT' })}
                  className="w-full p-4 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors"
                  style={{ borderColor: matchState.awayTeam.color }}
                >
                  <div className="flex items-center gap-3">
                    <Shirt size={24} fill={matchState.awayTeam.color} stroke={matchState.awayTeam.color} />
                    <span className="font-bold text-lg">{matchState.awayTeam.name}</span>
                  </div>
                  <div className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-500 font-bold">
                    {matchState.awayTeam.substitutionCount}/8 Subs
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <div className="bg-gray-900 text-white shadow-lg p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-8 flex-1">
            <div className={`flex flex-col items-center p-3 rounded-lg transition-colors ${matchState.possession === 'HOME' ? 'bg-gray-800 ring-2 ring-yellow-500' : ''}`}>
              <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: matchState.homeTeam.color }}></div>
              <h2 className="font-bold text-gray-400 text-xs md:text-sm uppercase">{matchState.homeTeam.name}</h2>
              <div className="text-5xl font-black font-mono text-white leading-none">{getScore('HOME')}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-black/50 px-6 py-2 rounded-t-lg border-b border-gray-700 w-48 text-center relative">
                <div className={`text-4xl font-mono font-bold tracking-widest ${matchState.timer.isRunning ? 'text-green-400' : 'text-red-400'}`}>
                  {formatTime(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds))}
                </div>
                <div className="text-[10px] text-gray-500 font-bold tracking-widest">
                  {matchState.currentHalf <= 2 ? `HALF ${matchState.currentHalf}` : `OT ${matchState.currentHalf - 2}`}
                </div>
              </div>
              <div className="mt-2 flex flex-col items-center">
                <div className={`text-3xl font-mono font-bold ${matchState.shotClock.seconds <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                  {Math.ceil(matchState.shotClock.seconds)}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">SHOT CLOCK</div>
              </div>
              <button onClick={togglePossession} className="mt-2 w-32 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1 px-2 rounded-lg text-xs flex items-center justify-center gap-1">
                <ArrowRightLeft size={12} /> Switch Poss <kbd className="hidden lg:inline ml-1 text-[9px] opacity-70 bg-black/30 px-1 rounded">A/H</kbd>
              </button>
            </div>
            <div className={`flex flex-col items-center p-3 rounded-lg transition-colors ${matchState.possession === 'AWAY' ? 'bg-gray-800 ring-2 ring-yellow-500' : ''}`}>
              <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: matchState.awayTeam.color }}></div>
              <h2 className="font-bold text-gray-400 text-xs md:text-sm uppercase">{matchState.awayTeam.name}</h2>
              <div className="text-5xl font-black font-mono text-white leading-none">{getScore('AWAY')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
              className={`p-2 rounded text-xs font-bold ${!soundEnabled ? 'bg-red-900/50 text-red-400 hover:bg-red-900' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              title={!soundEnabled ? "Unmute Audio" : "Mute Audio"}
            >
              {!soundEnabled ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="w-px h-8 bg-gray-700 mx-1"></div>
            <button
              onClick={handleUndo}
              className="p-2 bg-gray-700 hover:bg-red-600 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo Last Action"
              disabled={matchState.events.length === 0}
            >
              <Undo2 size={20} /> <span className="hidden lg:inline ml-1 text-[10px] opacity-70">DEL</span>
            </button>
            <div className="w-px h-8 bg-gray-700 mx-1"></div>
            <button onClick={startTimeout} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white shadow flex items-center gap-1" title="Time-out"><Clock size={20} /><span className="hidden lg:inline font-mono text-[10px]">T</span></button>
            <div className="w-px h-8 bg-gray-700 mx-2"></div>
            <button
              onClick={() => setContextMenu({
                visible: true,
                x: window.innerWidth / 2, // Centerish
                y: window.innerHeight / 2,
                step: 'SELECT_TEAM_FOR_SUB', // New step needed or reuse logic?
                // Reuse SELECT_PLAYER logic but force a team?
                // No, UI needs to ask "Which Team?".
                // Let's modify step: 'SELECT_TEAM' first.
              } as any)}
              className="p-2 bg-gray-700 hover:bg-orange-600 rounded text-xs font-bold"
              title="Substitution"
            >
              <Repeat size={16} /> <span className="hidden lg:inline ml-1 font-mono text-[10px]">S</span>
            </button>
            <button onClick={() => openExternalView('JURY')} className="p-2 bg-gray-700 hover:bg-blue-600 rounded text-xs font-bold" title="Jury View (New Window)"><Gavel size={16} /></button>
            <button onClick={() => openExternalView('LIVE')} className="p-2 bg-gray-700 hover:bg-green-600 rounded text-xs font-bold" title="Live Screen (New Window)"><Monitor size={16} /></button>
            <button onClick={() => openExternalView('LIVESTREAM_STATS')} className="p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold" title="Stream Stats (New Window)"><Target size={16} /></button>
            <button onClick={() => openExternalView('STREAM_OVERLAY')} className="p-2 bg-gray-700 hover:bg-teal-600 rounded text-xs font-bold" title="Stream Overlay (For OBS)"><Monitor size={16} className="text-teal-400" /></button>
            <button onClick={handlePhaseEnd} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg ml-2 font-bold text-xs"><PieChart size={16} /> End Period</button>
          </div>
        </div>
      </div>
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col lg:flex-row gap-6">
        <div className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-160px)] transition-colors">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><Clock size={16} /> Match Log</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {[...matchState.events].reverse().map(event => {
              const team = event.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
              const player = team.players.find(p => p.id === event.playerId);
              return (
                <div key={event.id} className="text-xs p-2 rounded border-l-4 bg-gray-50 dark:bg-gray-700/50" style={{ borderLeftColor: team.color }}>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                    <span>{formatTime(event.timestamp)}</span>
                    <span className="font-bold">{event.type}</span>
                  </div>
                  {player && <div className="dark:text-gray-200">{player.name}</div>}
                  {event.type === 'CARD' && <div className={`font-bold ${event.cardType === 'RED' ? 'text-red-600' : 'text-yellow-600'}`}>{event.cardType} CARD</div>}
                  {event.type === 'TIMEOUT' && <div className="font-bold text-purple-600 dark:text-purple-400">TIMEOUT</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-4 relative transition-colors">
            <KorfballField mode="input" onFieldClick={handleFieldClick} homeColor={matchState.homeTeam.color} awayColor={matchState.awayTeam.color} />
            <div className="flex justify-between px-2 mt-2 text-xs font-bold text-gray-400">
              <span style={{ color: matchState.homeTeam.color }}>HOME ZONE</span>
              <span style={{ color: matchState.awayTeam.color }}>AWAY ZONE</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto transition-colors">
            <div className="grid grid-cols-2 gap-6 h-full">
              {['HOME', 'AWAY'].map(tId => {
                const t = tId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
                return (
                  <div key={tId} className="border-r last:border-0 border-gray-100 dark:border-gray-700 pr-2">
                    <div className="flex items-center gap-2 mb-3 pb-1 border-b dark:border-gray-700" style={{ color: t.color }}>
                      <Shirt size={16} fill={t.color} />
                      <span className="text-sm font-bold uppercase">{t.name}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {t.players.filter(p => p.onField).map(p => (
                        <button
                          key={p.id}
                          onClick={() => setContextMenu({ visible: true, x: 0, y: 0, step: 'SELECT_ACTION', selectedTeam: t.id as TeamId, selectedPlayerId: p.id })}
                          className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 text-xs py-2 rounded-lg flex flex-col items-center transition-colors"
                        >
                          <span className="font-black text-sm">{p.number}</span>
                          <span className="text-[10px] text-gray-400">{p.gender}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {matchState.timeout.isActive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center text-white">
            <h2 className="text-6xl font-black font-mono mb-4">{Math.ceil(matchState.timeout.remainingSeconds)}</h2>
            <div className="text-2xl font-bold uppercase tracking-widest mb-8">Time Out</div>
            <div className="text-xl font-bold mb-4" style={{ color: matchState.timeout.teamId === 'HOME' ? matchState.homeTeam.color : matchState.awayTeam.color }}>
              {matchState.timeout.teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name}
            </div>
            {matchState.timeout.remainingSeconds <= 15 && <div className="text-red-500 font-bold animate-pulse text-xl">ENDING SOON</div>}
            <button onClick={cancelTimeout} className="mt-8 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full font-bold">Resume Match</button>
          </div>
        </div>
      )}
      {matchState.break?.isActive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-indigo-900/90 backdrop-blur-md">
          <div className="text-center text-white">
            <h2 className="text-8xl font-black font-mono mb-4">{formatTime(Math.ceil(matchState.break.durationSeconds))}</h2>
            <div className="text-2xl font-bold uppercase tracking-widest mb-8">HALFTIME BREAK</div>

            <button onClick={endBreak} className="mt-8 px-8 py-4 bg-white text-indigo-900 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl">
              Start 2nd Half
            </button>
          </div>
        </div>
      )}
      {renderPhaseModals()}
      {renderContextMenu()}
    </div>
  );
};

export default MatchTracker;