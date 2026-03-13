import React, { useState } from 'react';
import { MatchState, TeamId, MatchEvent, SHOT_TYPES, ActionType, CardType, ShotType } from '../types';
import { useTranslation } from 'react-i18next';

import KorfballField, { getShotDistanceType } from './KorfballField';
import { 
  PieChart, Clock, Target, Shield, AlertTriangle, ArrowRightLeft, Timer, Repeat, 
  Shirt, AlertOctagon, Monitor, Gavel, Undo2, Volume2, VolumeX, CheckCircle, 
  XCircle, Share2, Mic, MicOff, Trophy, PlusCircle, ExternalLink 
} from 'lucide-react';

import { useSettings } from '../contexts/SettingsContext';
import { useGameAudio } from '../hooks/useGameAudio';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

import { getScore, formatTime } from '../utils/matchUtils';
import SocialShareModal from './SocialShareModal';
import { useVoiceCommands, VoiceCommandAction } from '../hooks/useVoiceCommands';

interface MatchTrackerProps {
  matchState: MatchState;
  onUpdateMatch: (newState: MatchState) => void;
  onFinishMatch: () => void;
  onViewChange?: (view: 'STATS' | 'JURY' | 'LIVE' | 'LIVESTREAM_STATS' | 'STREAM_OVERLAY') => void;
  socket: any;
  onSpotterAction: (action: any) => void;
}

const MatchTracker: React.FC<MatchTrackerProps> = ({ matchState, onUpdateMatch, onFinishMatch, onViewChange, socket, onSpotterAction }) => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const soundEnabled = settings.soundEnabled;
  const { playShotClockBuzzer, playGameEndHorn } = useGameAudio(!soundEnabled);

  // --- State Definitions (Moved up to fix scoping) ---
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    step: 'SELECT_TEAM' | 'SELECT_PLAYER' | 'SELECT_ACTION' | 'SELECT_SHOT_TYPE' | 'SELECT_SUB_OUT' | 'SELECT_SUB_IN' | 'CONFIRM_SUB_EXCEPTION' | 'SELECT_CARD_PLAYER' | 'SELECT_RESULT' | 'SELECT_TEAM_FOR_SUB' | 'SELECT_CARD_TYPE';
    selectedTeam?: TeamId;
    selectedPlayerId?: string;
    subOutId?: string;
    subInId?: string;
    cardType?: CardType;
    calculatedShotType?: ShotType;
  } | null>(null);

  const [activeModal, setActiveModal] = useState<'END_HALF' | 'END_MATCH' | 'BREAK_SETUP' | 'OT_SETUP'>('END_HALF');
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVotingShare, setShowVotingShare] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [customDuration, setCustomDuration] = useState(10); // Minutes
  const [pendingShortcutAction, setPendingShortcutAction] = useState<'GOAL' | 'MISS' | 'FREE_THROW' | 'PENALTY' | 'CARD' | 'TURNOVER' | 'FOUL' | 'REBOUND' | null>(null);

  // Track previous clock values to detect transition to 0
  const prevShotClockRef = React.useRef(matchState.shotClock.seconds);
  const prevGameTimeRef = React.useRef(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds));

  React.useEffect(() => {
    // Shot Clock Check
    const currentShotClock = matchState.shotClock.seconds;
    if (prevShotClockRef.current > 0 && currentShotClock <= 0 && matchState.shotClock.lastStartTime) {
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

  React.useEffect(() => {
    if (!socket) return;

    socket.on('watch-action', (payload: any) => {
      onSpotterAction(payload);
    });

    socket.on('vote-update', (v: Record<string, number>) => {
      setVotes(v);
    });

    return () => {
      socket.off('watch-action');
      socket.off('vote-update');
    };
  }, [socket, onSpotterAction]);

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
      else if (action === 'FREE_THROW') {
        // Auto-position 2.5m in front of the korf.
        // Left Korf (Home) -> 22.9%, Right Korf (Away) -> 77.1%
        const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
        addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'FREE_THROW', location: autoLoc });
      }
      else if (action === 'PENALTY') {
        const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
        addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'PENALTY', location: autoLoc });
      }
      else if (action === 'TURNOVER') addEvent({ teamId, playerId, type: 'TURNOVER', location }); // O
      else if (action === 'FOUL') addEvent({ teamId, playerId, type: 'FOUL', location }); // F
      else if (action === 'REBOUND') addEvent({ teamId, playerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location }); // R
      else if (action === 'CARD') {
        // Card requires color selection
      }

      if (action !== 'CARD' && action !== 'SUB' && action !== 'TIMEOUT') {
        setPendingShortcutAction(null);
      }
      return;
    }

    // 2. Ignore action shortcuts when deep within specific context menus to prevent state overwriting
    if (isMenuOpen && ['SELECT_SUB_OUT', 'SELECT_SUB_IN', 'CONFIRM_SUB_EXCEPTION', 'SELECT_SHOT_TYPE'].includes(currentStep || '')) {
      // Do not interrupt these flows with a new action start
      return;
    }

    // 3. Default Flow: Start a new action (opens Select Player)

    const teamId = contextMenu?.selectedTeam || matchState.possession || 'HOME';

    if (['GOAL', 'MISS', 'FREE_THROW', 'PENALTY', 'CARD', 'TURNOVER', 'FOUL', 'REBOUND'].includes(action)) {
      setPendingShortcutAction(action as any);
      setContextMenu(prev => ({
        ...prev,
        visible: true,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        step: 'SELECT_PLAYER',
        selectedTeam: teamId,
      } as any));
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
    try {
      if (!isMenuOpen) return;
      
      const currentStep = contextMenu?.step;

      if (currentStep === 'SELECT_TEAM_FOR_SUB' || currentStep === 'SELECT_TEAM') {
        const teamId: TeamId = numberIndex === 0 ? 'HOME' : 'AWAY';
        setContextMenu(prev => prev ? { ...prev, selectedTeam: teamId, step: currentStep === 'SELECT_TEAM' ? 'SELECT_PLAYER' : 'SELECT_SUB_OUT' } : null);
        return;
      }

      const currentSelectedTeam = contextMenu?.selectedTeam || matchState.possession || 'HOME';
      const team = currentSelectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;

      if (currentStep === 'SELECT_PLAYER' || currentStep === 'SELECT_SUB_OUT') {
        const onFieldPlayers = team.players
          .filter(p => p.onField)
          .sort((a, b) => parseInt(a.number) - parseInt(b.number));
        
        const player = onFieldPlayers[numberIndex];
        
        if (player) {
          if (currentStep === 'SELECT_PLAYER') {
            if (pendingShortcutAction) {
              const location = { x: 50, y: 50 };
              if (pendingShortcutAction === 'GOAL') addEvent({ teamId: team.id, playerId: player.id, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
              else if (pendingShortcutAction === 'MISS') addEvent({ teamId: team.id, playerId: player.id, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
              else if (pendingShortcutAction === 'FREE_THROW') {
                setContextMenu(prev => prev ? { ...prev, selectedPlayerId: player.id, step: 'SELECT_RESULT', calculatedShotType: 'FREE_THROW' } : null);
                return;
              }
              else if (pendingShortcutAction === 'PENALTY') {
                setContextMenu(prev => prev ? { ...prev, selectedPlayerId: player.id, step: 'SELECT_RESULT', calculatedShotType: 'PENALTY' } : null);
                return;
              }
              else if (pendingShortcutAction === 'TURNOVER') addEvent({ teamId: team.id, playerId: player.id, type: 'TURNOVER', location });
              else if (pendingShortcutAction === 'FOUL') addEvent({ teamId: team.id, playerId: player.id, type: 'FOUL', location });
              else if (pendingShortcutAction === 'REBOUND') addEvent({ teamId: team.id, playerId: player.id, type: 'REBOUND', reboundType: 'OFFENSIVE', location });
              else if (pendingShortcutAction === 'CARD') {
                setContextMenu(prev => prev ? { ...prev, selectedPlayerId: player.id, step: 'SELECT_CARD_TYPE' as any } : null);
                setPendingShortcutAction(null);
                return;
              }
              setPendingShortcutAction(null);
              setContextMenu(null);
            } else {
              setContextMenu(prev => prev ? { ...prev, selectedPlayerId: player.id, step: 'SELECT_ACTION' } : null);
            }
          } else if (currentStep === 'SELECT_SUB_OUT') {
            setContextMenu(prev => prev ? { ...prev, subOutId: player.id, step: 'SELECT_SUB_IN' } : null);
          }
        }
      } else if (currentStep === 'SELECT_SUB_IN') {
        const benchPlayers = team.players.filter(p => !p.onField);
        const player = benchPlayers[numberIndex];
        if (player) {
          if (team.substitutionCount >= 8) {
            setContextMenu(prev => prev ? { ...prev, subInId: player.id, step: 'CONFIRM_SUB_EXCEPTION' } : null);
          } else {
            handleSubstitution('REGULAR', { ...contextMenu, subInId: player.id });
            setContextMenu(null);
          }
        }
      } else if (currentStep === 'SELECT_ACTION') {
        if (numberIndex === 0) setContextMenu({ ...contextMenu, step: 'SELECT_SHOT_TYPE' });
        else if (numberIndex === 1) addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'TURNOVER', location: { x: contextMenu.x, y: contextMenu.y } });
        else if (numberIndex === 2) addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'FOUL', location: { x: contextMenu.x, y: contextMenu.y } });
        else if (numberIndex === 3) addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location: { x: contextMenu.x, y: contextMenu.y } });
      } else if (currentStep === 'SELECT_SHOT_TYPE') {
        const location = { x: contextMenu.x, y: contextMenu.y };
        if (numberIndex === 0) addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'RUNNING_IN', result: 'GOAL', location });
        else if (numberIndex === 1) {
          const autoLoc = contextMenu.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
          addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'PENALTY', result: 'GOAL', location: autoLoc });
        } else if (numberIndex === 2) {
          const autoLoc = contextMenu.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
          addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'FREE_THROW', result: 'GOAL', location: autoLoc });
        } else if (numberIndex === 3) addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'MISS', location });
      }
    } catch (err: any) {
      console.error('CRITICAL ERROR in handlePlayerNumberSelection:', err.message, err.stack);
    }
  };

  useKeyboardShortcuts([
    { key: 'h', action: () => setContextMenu({ visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_PLAYER', selectedTeam: 'HOME' } as any) },
    { key: 'a', action: () => setContextMenu({ visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_PLAYER', selectedTeam: 'AWAY' } as any) },

    { key: 'g', action: () => handleShortcutAction('GOAL') }, //G for goal
    { key: 'm', action: () => handleShortcutAction('MISS') }, //M for miss
    { key: 'k', action: () => handleShortcutAction('FREE_THROW') }, // K for Free Throw
    { key: 'p', action: () => handleShortcutAction('PENALTY') }, //P for penalty
    { key: 't', action: () => handleShortcutAction('TIMEOUT') }, //T for time-out
    { key: 's', action: () => handleShortcutAction('SUB') }, //S for substitution
    { key: 'c', action: () => handleShortcutAction('CARD') }, //C for card
    { key: 'o', action: () => handleShortcutAction('TURNOVER') }, //O for turnover
    { key: 'f', action: () => handleShortcutAction('FOUL') }, //F for foul
    { key: 'r', action: () => handleShortcutAction('REBOUND') }, //R for Rebound

    // Player Numbers
    { key: '1', action: () => handlePlayerNumberSelection(0) }, //1 for first player in list
    { key: '2', action: () => handlePlayerNumberSelection(1) }, //2 for second player in list
    { key: '3', action: () => handlePlayerNumberSelection(2) }, //3 for third player in list
    { key: '4', action: () => handlePlayerNumberSelection(3) }, //4 for fourth player in list
    { key: '5', action: () => handlePlayerNumberSelection(4) }, //5 for fifth player in list
    { key: '6', action: () => handlePlayerNumberSelection(5) }, //6 for sixth player in list
    { key: '7', action: () => handlePlayerNumberSelection(6) }, //7 for seventh player in list
    { key: '8', action: () => handlePlayerNumberSelection(7) }, //8 for eighth player in list

    {
      key: 'Enter', action: () => {
        if (isMenuOpen) {
          if (currentStep === 'SELECT_SHOT_TYPE' || currentStep === 'SELECT_RESULT') {
             const teamId = contextMenu.selectedTeam;
             const playerId = contextMenu.selectedPlayerId;
             const shotType = contextMenu.calculatedShotType || 'DISTANCE';
             const location = currentStep === 'SELECT_RESULT' ? (teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }) : { x: contextMenu.x, y: contextMenu.y };
             addEvent({ teamId, playerId, type: 'SHOT', shotType, result: 'GOAL', location });
             setContextMenu(null);
             setPendingShortcutAction(null);
          }
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
    setContextMenu({
      visible: true,
      x,
      y,
      step: 'SELECT_TEAM',
      calculatedShotType: getShotDistanceType(x, y)
    });
  };

  const handleSubstitution = (reason: 'REGULAR' | 'INJURY' | 'RED_CARD', contextOverride?: any) => {
    try {
      const context = contextOverride || contextMenu;
      const selectedTeam = context?.selectedTeam;
      const subOutId = context?.subOutId;
      const subInId = context?.subInId;

      if (!selectedTeam || !subOutId || !subInId) return;

      const team = selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;

      const updatedPlayers = team.players.map(p => {
        if (p.id === subOutId) return { ...p, onField: false };
        if (p.id === subInId) return { ...p, onField: true };
        return p;
      });

      const updatedTeam = {
        ...team,
        players: updatedPlayers,
        substitutionCount: reason === 'REGULAR' ? team.substitutionCount + 1 : team.substitutionCount
      };

      const subEntry: MatchEvent = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'sub-' + Math.random().toString(36).substring(2, 9),
        timestamp: Math.floor(matchState.timer.elapsedSeconds),
        realTime: Date.now(),
        half: matchState.currentHalf,
        teamId: selectedTeam,
        type: 'SUBSTITUTION',
        subOutId,
        subInId,
        subReason: reason,
        previousPossession: matchState.possession
      };

      onUpdateMatch({
        ...matchState,
        homeTeam: selectedTeam === 'HOME' ? updatedTeam : matchState.homeTeam,
        awayTeam: selectedTeam === 'AWAY' ? updatedTeam : matchState.awayTeam,
        events: [...matchState.events, subEntry]
      });
    } catch (err: any) {
      console.error('CRITICAL ERROR in handleSubstitution:', err.message, err.stack);
    }
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

  // --- Voice Command Handler ---
  const handleVoiceCommand = (action: VoiceCommandAction) => {
    console.log("Voice Action:", action);

    if (action.type === 'UNDO') {
      handleUndo();
      return;
    }

    if (action.type === 'TIMEOUT') {
      startTimeout();
      return;
    }

    if (action.type === 'UNKNOWN') return;

    // Determine Team
    let teamId: TeamId = matchState.possession || 'HOME';
    if ('team' in action && action.team) teamId = action.team;

    const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;

    // Determine Player
    let playerId = team.players[0]?.id; // Default fallback
    if ('playerNumber' in action && action.playerNumber !== undefined) {
      const found = team.players.find(p => parseInt(p.number) === action.playerNumber);
      if (found) playerId = found.id;
    }

    const location = { x: 50, y: 50 }; // Default center

    if (action.type === 'GOAL') {
      addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
    } else if (action.type === 'MISS') {
      addEvent({ teamId, playerId, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
    } else if (action.type === 'TURNOVER') {
      addEvent({ teamId, playerId, type: 'TURNOVER', location });
    } else if (action.type === 'FOUL') {
      addEvent({ teamId, playerId, type: 'FOUL', location });
    } else if (action.type === 'FREE_THROW') {
      const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
      addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'FREE_THROW', location: autoLoc });
    } else if (action.type === 'PENALTY') {
      const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
      addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'PENALTY', location: autoLoc });
    }
    // Other types can be added as needed or wanted
  };

  const { isListening, toggleListening, transcript } = useVoiceCommands({
    onCommand: handleVoiceCommand,
    homeName: matchState.homeTeam.name,
    awayName: matchState.awayTeam.name
  });



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
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('matchTracker.endHalf')}</h3>
              <p className="text-gray-500 mb-6">{t('matchTracker.halfEndDesc')}</p>
              <div className="space-y-3">
                <button data-testid="start-break-btn-main" onClick={() => startBreak(10)} className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center justify-between">
                  <span>{t('matchTracker.startBreak')}</span>
                  <Clock size={20} />
                </button>
                <button onClick={() => { setCustomDuration(10); setActiveModal('BREAK_SETUP'); }} className="w-full p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-left">
                  {t('matchTracker.customBreak')}
                </button>
                <div className="border-t my-2"></div>
                <button onClick={() => startNextPeriod(25)} className="w-full p-4 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg text-left">
                  {t('matchTracker.skipTo2ndHalf')}
                </button>
              </div>
            </>
          )}

          {activeModal === 'BREAK_SETUP' && (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('matchTracker.breakDuration')}</h3>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setCustomDuration(Math.max(1, customDuration - 1))} className="p-3 bg-gray-100 rounded-lg font-bold">-</button>
                <div className="text-3xl font-mono font-bold w-20 text-center">{customDuration}m</div>
                <button onClick={() => setCustomDuration(customDuration + 1)} className="p-3 bg-gray-100 rounded-lg font-bold">+</button>
              </div>
              <button data-testid="start-break-btn-custom" onClick={() => startBreak(customDuration)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg">
                {t('matchTracker.startBreak')}
              </button>
            </>
          )}

          {activeModal === 'END_MATCH' && (
            <>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('matchTracker.endMatch')}</h3>
              <p className="text-gray-500 mb-6">{t('matchTracker.periodEndDesc')}</p>
              <div className="space-y-3">
                <button onClick={onFinishMatch} className="w-full p-4 bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-lg flex items-center justify-between shadow-lg">
                  <span>{t('matchTracker.finishMatch')}</span>
                  <PieChart size={20} />
                </button>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-sm font-bold">{t('common.or')}</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                <button data-testid="overtime-btn" onClick={() => { setCustomDuration(5); setActiveModal('OT_SETUP'); }} className="w-full p-4 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg flex items-center justify-between">
                  <span>{t('matchTracker.overtime')}</span>
                  <Timer size={20} />
                </button>
              </div>
            </>
          )}

          {activeModal === 'OT_SETUP' && (
            <div data-testid="select-overtime-duration-modal">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('matchTracker.overtimeDuration')}</h3>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setCustomDuration(Math.max(1, customDuration - 1))} className="p-3 bg-gray-100 rounded-lg font-bold">-</button>
                <div className="text-3xl font-mono font-bold w-20 text-center">{customDuration}m</div>
                <button onClick={() => setCustomDuration(customDuration + 1)} className="p-3 bg-gray-100 rounded-lg font-bold">+</button>
              </div>
              <button onClick={() => startNextPeriod(customDuration)} className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg">
                {t('matchTracker.startOvertime')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu?.visible) return null;

    const activeTeam = contextMenu.selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
    // Sort players by number to ensure keyboard shortcuts correspond to visual order logically (1, 2, 3...)
    // TO-DO Might want to change this to be based on the attack / defense
    const onFieldPlayers = (activeTeam?.players.filter(p => p.onField) || [])
      .sort((a, b) => parseInt(a.number) - parseInt(b.number));
    const benchPlayers = activeTeam?.players.filter(p => !p.onField) || [];

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" data-testid="context-menu-overlay" onClick={() => setContextMenu(null)}>
        <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              {contextMenu.step === 'SELECT_PLAYER' && t('matchTracker.selectPlayer')}
              {contextMenu.step === 'SELECT_ACTION' && t('matchTracker.action')}
              {contextMenu.step === 'SELECT_SHOT_TYPE' && t('matchTracker.shotDetails')}
              {contextMenu.step === 'SELECT_SUB_OUT' && t('matchTracker.subOut')}
              {contextMenu.step === 'SELECT_SUB_IN' && t('matchTracker.subIn')}
              {contextMenu.step === 'CONFIRM_SUB_EXCEPTION' && t('matchTracker.subLimitReached')}
            </h3>
            <div className="flex items-center gap-2">
              {contextMenu.step === 'SELECT_PLAYER' && pendingShortcutAction && (
                <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded animate-pulse">
                  {t('matchTracker.selectPlayerFor', { action: pendingShortcutAction })}
                </span>
              )}
              <button onClick={() => setContextMenu(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
          </div>

          <div className="space-y-4">
            {contextMenu.step === 'SELECT_TEAM' && (
              <div className="space-y-4" data-testid="select-team-modal">
                <h3 className="text-lg font-bold text-center mb-4">{t('matchTracker.selectTeam')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    data-testid="select-home-team-btn"
                    onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'HOME', step: 'SELECT_PLAYER' })}
                    className="p-4 rounded-xl border-2 flex flex-col items-center gap-3 hover:bg-gray-50 transition-all"
                    style={{ borderColor: matchState.homeTeam.color }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: matchState.homeTeam.color }}>
                      <Shirt size={24} color="white" />
                    </div>
                    <span className="font-bold text-gray-900">{matchState.homeTeam.name}</span>
                  </button>
                  <button
                    data-testid="select-away-team-btn"
                    onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'AWAY', step: 'SELECT_PLAYER' })}
                    className="p-4 rounded-xl border-2 flex flex-col items-center gap-3 hover:bg-gray-50 transition-all"
                    style={{ borderColor: matchState.awayTeam.color }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: matchState.awayTeam.color }}>
                      <Shirt size={24} color="white" />
                    </div>
                    <span className="font-bold text-gray-900">{matchState.awayTeam.name}</span>
                  </button>
                </div>
              </div>
            )}
            {contextMenu.step === 'SELECT_RESULT' && (
              <div className="space-y-4" data-testid="select-result-modal">
                <div className="text-center font-bold text-lg mb-4">
                  Result for {contextMenu.calculatedShotType === 'FREE_THROW' ? 'Free Pass' : 'Penalty'}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button data-testid="result-goal-btn" onClick={() => {
                    const autoLoc = contextMenu.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
                    addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', result: 'GOAL', shotType: contextMenu.calculatedShotType, location: autoLoc });
                    setPendingShortcutAction(null);
                  }} className="p-6 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg flex flex-col items-center gap-2 border-2 border-green-300">
                    <CheckCircle size={48} />
                    <span className="font-black text-2xl">GOAL</span>
                  </button>
                  <button data-testid="result-miss-btn" onClick={() => {
                    const autoLoc = contextMenu.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
                    addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', result: 'MISS', shotType: contextMenu.calculatedShotType, location: autoLoc });
                    setPendingShortcutAction(null);
                  }} className="p-6 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex flex-col items-center gap-2 border-2 border-red-300">
                    <XCircle size={48} />
                    <span className="font-black text-2xl">MISS</span>
                  </button>
                </div>
              </div>
            )}
            {contextMenu.step === 'SELECT_PLAYER' && (
              <div data-testid="select-player-modal">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {onFieldPlayers.length === 0 && (
                    <div className="col-span-4 text-center py-4 text-gray-500 italic">
                      {t('matchTracker.noPlayersOnField')}
                    </div>
                  )}
                  {onFieldPlayers.map(p => (
                    <button
                      key={p.id}
                      data-testid={`player-btn-${p.id}`}
                      onClick={() => {
                        if (pendingShortcutAction) {
                          // Execute Pending Action Immediately
                          const location = { x: 50, y: 50 }; // Default center if shortcut triggered menu
                          if (pendingShortcutAction === 'GOAL') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
                          else if (pendingShortcutAction === 'MISS') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
                          else if (pendingShortcutAction === 'FREE_THROW') {
                            setContextMenu(prev => prev ? { ...prev, selectedPlayerId: p.id, step: 'SELECT_RESULT', calculatedShotType: 'FREE_THROW' } : null);
                            return; // Wait
                          }
                          else if (pendingShortcutAction === 'PENALTY') {
                            setContextMenu(prev => prev ? { ...prev, selectedPlayerId: p.id, step: 'SELECT_RESULT', calculatedShotType: 'PENALTY' } : null);
                            return; // Wait
                          }
                          else if (pendingShortcutAction === 'TURNOVER') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'TURNOVER', location });
                          else if (pendingShortcutAction === 'FOUL') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'FOUL', location });
                          else if (pendingShortcutAction === 'REBOUND') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'REBOUND', reboundType: 'OFFENSIVE', location });
                          else if (pendingShortcutAction === 'CARD') {
                            setContextMenu(prev => prev ? { ...prev, selectedPlayerId: p.id, step: 'SELECT_CARD_TYPE' } : null);
                            return; // Wait for card type
                          }

                          setPendingShortcutAction(null);
                          setContextMenu(null);
                        } else {
                          setContextMenu({ ...contextMenu, selectedPlayerId: p.id, step: 'SELECT_ACTION' })
                        }
                      }}
                      className="aspect-square rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-transparent hover:border-indigo-500 flex flex-col items-center justify-center font-bold text-gray-700 transition-all shadow-sm relative"
                    >
                      <span className="text-lg">{p.number}</span>
                      <span className="text-[10px] text-gray-500">{p.gender}</span>
                      <div className="absolute top-1 left-1 flex items-center justify-center bg-black/20 rounded-md px-1.5 py-0.5">
                        <kbd className="text-[10px] font-black text-gray-600 font-mono">{onFieldPlayers.indexOf(p) + 1}</kbd>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <button
                    data-testid="substitution-menu-btn"
                    onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_SUB_OUT' })}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-bold border border-gray-200"
                  >
                    <Repeat size={18} /> {t('matchTracker.substitution')} ({activeTeam.substitutionCount}/8)
                  </button>
                  <button data-testid="open-jury-btn" onClick={() => openExternalView('JURY')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <Monitor className="text-indigo-500" size={18} />
                  <div className="text-left">
                    <div className="text-sm font-bold text-gray-900">{t('matchTracker.setupJuryTable')}</div>
                    <div className="text-[10px] text-gray-500 font-medium">{t('matchTracker.juryTableDesc')}</div>
                  </div>
                </div>
                <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </button>
                </div>
              </div>
            )}
            {contextMenu.step === 'SELECT_SUB_OUT' && (
              <div className="grid grid-cols-4 gap-3" data-testid="select-sub-out-modal">
                {onFieldPlayers.length === 0 && (
                  <div className="col-span-4 text-center py-4 text-gray-500 italic">{t('matchTracker.noPlayersToSubOut')}</div>
                )}
                {onFieldPlayers.map(p => (
                  <button key={p.id} data-testid={`sub-out-player-btn-${p.id}`} onClick={() => setContextMenu({ ...contextMenu, subOutId: p.id, step: 'SELECT_SUB_IN' })} className="aspect-square rounded-full bg-red-50 hover:bg-red-100 border-red-200 border flex items-center justify-center font-bold">{p.number}</button>
                ))}
              </div>
            )}
            {contextMenu.step === 'SELECT_SUB_IN' && (
              <div className="grid grid-cols-4 gap-3" data-testid="select-sub-in-modal">
                {benchPlayers.map(p => (
                  <button key={p.id} data-testid={`sub-in-player-btn-${p.id}`} onClick={() => {
                    if (activeTeam.substitutionCount >= 8) {
                      setContextMenu({ ...contextMenu, subInId: p.id, step: 'CONFIRM_SUB_EXCEPTION' });
                    } else {
                      const updatedMenu = { ...contextMenu, subInId: p.id };
                      setContextMenu(updatedMenu as any);
                      // Execute immediately with the new IDs to avoid stale state in handleSubstitution
                      handleSubstitution('REGULAR', updatedMenu);
                    }
                  }} className="aspect-square rounded-full bg-green-50 hover:bg-green-100 border-green-200 border flex items-center justify-center font-bold">{p.number}</button>
                ))}
              </div>
            )}
            {contextMenu.step === 'CONFIRM_SUB_EXCEPTION' && (
              <div className="flex gap-4 justify-center" data-testid="confirm-sub-exception-modal">
                <button data-testid="sub-exception-injury-btn" onClick={() => handleSubstitution('INJURY')} className="px-4 py-2 bg-orange-100 font-bold rounded">{t('matchTracker.injuryMedical')}</button>
                <button data-testid="sub-exception-card-btn" onClick={() => handleSubstitution('RED_CARD')} className="px-4 py-2 bg-red-100 font-bold rounded text-red-700">{t('matchTracker.redCard')}</button>
              </div>
            )}
            {contextMenu.step === 'SELECT_ACTION' && (
              <div className="grid grid-cols-2 gap-3" data-testid="select-action-modal">
                <button
                  data-testid="goal-miss-action-btn"
                  onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_SHOT_TYPE' })}
                  className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex flex-col items-center gap-2"
                >
                  <Target size={24} /> {t('matchTracker.goal')} / {t('matchTracker.miss')} <kbd className="text-xs bg-white/50 px-1 rounded">1</kbd>
                </button>
                <button
                  data-testid="turnover-action-btn"
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'TURNOVER', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="p-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 flex flex-col items-center gap-2"
                >
                  <ArrowRightLeft size={24} /> {t('matchTracker.turnover')} <kbd className="text-[10px] bg-black/10 px-1 rounded">2</kbd>
                </button>
                <button
                  data-testid="foul-action-btn"
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'FOUL', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="p-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 flex flex-col items-center gap-2"
                >
                  <AlertTriangle size={24} /> {t('matchTracker.foul')} <kbd className="text-[10px] bg-white/50 px-1 rounded">3</kbd>
                </button>
                <button
                  data-testid="rebound-action-btn"
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex flex-col items-center gap-2"
                >
                  <Shield size={24} /> {t('matchTracker.rebound')} <kbd className="text-[10px] bg-white/50 px-1 rounded">4</kbd>
                </button>
                <button
                  data-testid="card-action-btn"
                  onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_CARD_TYPE' as any })}
                  className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 flex flex-col items-center gap-2"
                >
                  <Gavel size={24} /> {t('matchTracker.card')} <kbd className="text-[10px] bg-white/50 px-1 rounded">C</kbd>
                </button>
                <button
                  data-testid="action-substitution-btn"
                  onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_SUB_OUT' })}
                  className="p-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 flex flex-col items-center gap-2"
                >
                  <Repeat size={24} /> {t('matchTracker.substitution')}
                </button>
              </div>
            )}
            {(contextMenu.step as any) === 'SELECT_CARD_TYPE' && (
              <div className="grid grid-cols-2 gap-4" data-testid="select-card-type-modal">
                <button
                  data-testid="yellow-card-btn"
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'CARD', cardType: 'YELLOW', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="p-6 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg flex flex-col items-center gap-2 border-2 border-yellow-300"
                >
                  <div className="w-8 h-12 bg-yellow-400 rounded-sm shadow-sm" />
                  <span className="font-bold">{t('matchTracker.yellowCard')}</span>
                </button>
                <button
                  data-testid="red-card-btn"
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'CARD', cardType: 'RED', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="p-6 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex flex-col items-center gap-2 border-2 border-red-300"
                >
                  <div className="w-8 h-12 bg-red-600 rounded-sm shadow-sm" />
                  <span className="font-bold">{t('matchTracker.redCard')}</span>
                </button>
              </div>
            )}
            {contextMenu.step === 'SELECT_SHOT_TYPE' && (
              <div className="space-y-4" data-testid="select-shot-type-modal">
                <button
                  onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } })}
                  className="w-full px-3 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow font-bold text-lg mb-4 flex items-center justify-center gap-2"
                >
                  {t('matchTracker.goal')} ({contextMenu.calculatedShotType}) <kbd className="text-xs bg-white/20 px-1 rounded text-white">Enter</kbd>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    data-testid="shot-type-btn-RUNNING_IN"
                    onClick={() => {
                    const autoLoc = contextMenu.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 };
                    addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'RUNNING_IN', result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } })
                  }} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">{t('matchTracker.runningIn')} <kbd className="text-[10px] bg-black/10 px-1 rounded">1</kbd></button>
                  <button 
                    data-testid="shot-type-btn-PENALTY"
                    onClick={() => {
                    setContextMenu(prev => prev ? { ...prev, step: 'SELECT_RESULT', calculatedShotType: 'PENALTY' } : null);
                  }} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">{t('matchTracker.penalty')} <kbd className="text-[10px] bg-black/10 px-1 rounded">2</kbd></button>
                  <button 
                    data-testid="shot-type-btn-FREE_THROW"
                    onClick={() => {
                    setContextMenu(prev => prev ? { ...prev, step: 'SELECT_RESULT', calculatedShotType: 'FREE_THROW' } : null);
                  }} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">{t('matchTracker.freePass')} <kbd className="text-[10px] bg-black/10 px-1 rounded">3</kbd></button>
                  <button 
                    data-testid="shot-type-btn-MISS"
                    onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'MISS', location: { x: contextMenu.x, y: contextMenu.y } })} className="px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 font-bold flex flex-col items-center">{t('matchTracker.miss')} <kbd className="text-[10px] bg-black/10 px-1 rounded">4</kbd></button>
                </div>
              </div>
            )}
            {(contextMenu.step as any) === 'SELECT_TEAM_FOR_SUB' && (
              <div className="space-y-4" data-testid="select-team-for-sub-modal">
                <h3 className="text-lg font-bold text-center mb-4">{t('matchTracker.selectTeamSub')}</h3>
                <button
                  onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'HOME', step: 'SELECT_SUB_OUT' })}
                  className="w-full p-4 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors"
                  style={{ borderColor: matchState.homeTeam.color }}
                >
                  <div className="flex items-center gap-3">
                    <Shirt size={24} fill={matchState.homeTeam.color} />
                    <span className="font-bold text-lg">{matchState.homeTeam.name}</span>
                  </div>
                  <div className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-500 font-bold">
                    {matchState.homeTeam.substitutionCount}/8 {t('matchTracker.subs')}
                  </div>
                </button>
                <button
                  onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'AWAY', step: 'SELECT_SUB_OUT' })}
                  className="w-full p-4 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors"
                  style={{ borderColor: matchState.awayTeam.color }}
                >
                  <div className="flex items-center gap-3">
                    <Shirt size={24} fill={matchState.awayTeam.color} />
                    <span className="font-bold text-lg">{matchState.awayTeam.name}</span>
                  </div>
                  <div className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-500 font-bold">
                    {matchState.awayTeam.substitutionCount}/8 {t('matchTracker.subs')}
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
              <div className="text-5xl font-black font-mono text-white leading-none">{getScore(matchState, 'HOME')}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-black/50 px-6 py-2 rounded-t-lg border-b border-gray-700 w-48 text-center relative cursor-pointer">
                <div className={`text-4xl font-mono font-bold tracking-widest ${matchState.timer.isRunning ? 'text-green-400' : 'text-red-400'}`}>
                  {formatTime(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds))}
                </div>
                <div className="text-[10px] text-gray-500 font-bold tracking-widest">
                  HALF {matchState.currentHalf}
                </div>
              </div>
              <div data-testid="shot-clock-toggle" className="mt-2 flex flex-col items-center">
                <div className={`text-3xl font-mono font-bold ${matchState.shotClock.seconds <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                  {Math.ceil(matchState.shotClock.seconds)}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">SHOT CLOCK</div>
              </div>
              <button data-testid="switch-possession-btn" onClick={togglePossession} className="mt-2 w-32 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1 px-2 rounded-lg text-xs flex items-center justify-center gap-1">
                <ArrowRightLeft size={12} /> Switch Poss <kbd className="hidden lg:inline ml-1 text-[9px] opacity-70 bg-black/30 px-1 rounded">A/H</kbd>
              </button>
            </div>
            <div className={`flex flex-col items-center p-3 rounded-lg transition-colors ${matchState.possession === 'AWAY' ? 'bg-gray-800 ring-2 ring-yellow-500' : ''}`}>
              <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: matchState.awayTeam.color }}></div>
              <h2 className="font-bold text-gray-400 text-xs md:text-sm uppercase">{matchState.awayTeam.name}</h2>
              <div className="text-5xl font-black font-mono text-white leading-none">{getScore(matchState, 'AWAY')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="mute-btn"
              onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
              className={`p-2 rounded text-xs font-bold ${!soundEnabled ? 'bg-red-900/50 text-red-400 hover:bg-red-900' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              title={!soundEnabled ? t('matchTracker.unmute') : t('matchTracker.mute')}
            >
              {!soundEnabled ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="w-px h-8 bg-gray-700 mx-1"></div>
            <button
              data-testid="undo-btn"
              onClick={handleUndo}
              className="p-2 bg-gray-700 hover:bg-red-600 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('common.undo')}
              disabled={matchState.events.length === 0}
            >
              <Undo2 size={20} /> <span className="hidden lg:inline ml-1 text-[10px] opacity-70">DEL</span>
            </button>
            <div className="w-px h-8 bg-gray-700 mx-1"></div>
            <button
              data-testid="voice-btn"
              onClick={toggleListening}
              className={`p-2 rounded text-xs font-bold transition-all ${isListening ? 'bg-red-600 animate-pulse text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              title={isListening ? t('matchTracker.stopVoice') : t('matchTracker.startVoice')}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            {isListening && <span className="text-[10px] text-red-400 font-mono animate-pulse uppercase tracking-wider">{t('matchTracker.listening')}</span>}
            <div className="w-px h-8 bg-gray-700 mx-1"></div>
            <button data-testid="timeout-btn" onClick={startTimeout} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white shadow flex items-center gap-1" title={t('matchTracker.timeout')}><Clock size={20} /><span className="hidden lg:inline font-mono text-[10px]">T</span></button>
            <div className="w-px h-8 bg-gray-700 mx-2"></div>
            <button
              data-testid="vote-btn"
              onClick={() => setShowVotingShare(true)}
              className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded transition-colors text-white"
            >
              <Trophy size={20} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Vote</span>
            </button>
            <button
              data-testid="share-match-btn"
              onClick={() => setShowShareModal(true)}
              className="p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold"
              title={t('matchTracker.shareResult')}
            >
              <Share2 size={16} /> <span className="hidden lg:inline ml-1 font-mono text-[10px]">{t('matchTracker.share')}</span>
            </button>
            <div className="w-px h-8 bg-gray-700 mx-2"></div>
            {/* Navigation buttons removed as per user request */}
            <button data-testid="end-period-btn" onClick={handlePhaseEnd} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg ml-2 font-bold text-xs"><PieChart size={16} /> End Period</button>
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
                    <div className="text-right">
                      <span className="font-bold">{event.type}</span>
                      {event.type === 'SHOT' && (
                        <span className="ml-1 text-[10px] uppercase opacity-70">
                          {event.shotType === 'FREE_THROW' ? '(Free Pass)' : event.shotType === 'PENALTY' ? '(Penalty)' : ''}
                          {event.result === 'MISS' ? ' (MISS)' : ''}
                        </span>
                      )}
                    </div>
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
                          data-testid={`player-btn-${p.id}`}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md" data-testid="timeout-modal">
          <div className="text-center text-white">
            <h2 className="text-6xl font-black font-mono mb-4">{Math.ceil(matchState.timeout.remainingSeconds)}</h2>
            <div className="text-2xl font-bold uppercase tracking-widest mb-8">Time Out</div>
            <div className="text-xl font-bold mb-4" style={{ color: matchState.timeout.teamId === 'HOME' ? matchState.homeTeam.color : matchState.awayTeam.color }}>
              {matchState.timeout.teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name}
            </div>
            {matchState.timeout.remainingSeconds <= 15 && <div className="text-red-500 font-bold animate-pulse text-xl">{t('matchTracker.endingSoon')}</div>}
            <button onClick={cancelTimeout} className="mt-8 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full font-bold">{t('matchTracker.resumeMatch')}</button>
          </div>
        </div>
      )}
      {matchState.break?.isActive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-indigo-900/90 backdrop-blur-md" data-testid="break-modal">
          <div className="text-center text-white">
            <h2 className="text-8xl font-black font-mono mb-4">{formatTime(Math.ceil(matchState.break.durationSeconds))}</h2>
            <div className="text-2xl font-bold uppercase tracking-widest mb-8">{t('matchTracker.halftimeBreak')}</div>

            <button onClick={endBreak} className="mt-8 px-8 py-4 bg-white text-indigo-900 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl">
              {t('matchTracker.start2ndHalf')}
            </button>
          </div>
        </div>
      )}
      {/* Quick Actions Menu (Restored) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex items-center gap-6 z-40 transform transition-all hover:scale-105">
        <button onClick={() => handleShortcutAction('GOAL')} className="flex flex-col items-center gap-1 text-green-600 hover:text-green-700 font-bold group">
          <Target size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px]">{t('matchTracker.goal')}</span>
        </button>
        <button onClick={() => handleShortcutAction('MISS')} className="flex flex-col items-center gap-1 text-red-500 hover:text-red-700 font-bold group">
          <Target size={24} className="opacity-70 group-hover:scale-110 transition-transform" />
          <span className="text-[10px]">{t('matchTracker.miss')}</span>
        </button>
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
        <button onClick={() => handleShortcutAction('PENALTY')} className="flex flex-col items-center gap-1 text-yellow-600 hover:text-yellow-700 font-bold group">
          <AlertOctagon size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px]">{t('matchTracker.penalty')}</span>
        </button>
        <button onClick={() => handleShortcutAction('FREE_THROW')} className="flex flex-col items-center gap-1 text-blue-600 hover:text-blue-700 font-bold group">
          <Target size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px]">{t('matchTracker.freePass')}</span>
        </button>
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
        <button onClick={() => handleShortcutAction('TURNOVER')} className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-700 font-bold group">
          <ArrowRightLeft size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px]">{t('matchTracker.turnover')}</span>
        </button>
        <button onClick={() => handleShortcutAction('REBOUND')} className="flex flex-col items-center gap-1 text-orange-500 hover:text-orange-700 font-bold group">
          <Shield size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px]">{t('matchTracker.rebound')}</span>
        </button>
      </div>

      {matchState.timer.elapsedSeconds >= matchState.halfDurationSeconds && !matchState.timer.isRunning && matchState.currentHalf < 2 && !matchState.break?.isActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" data-testid="half-end-modal">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="text-indigo-500" /> {t('matchTracker.halfEnded')}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">{t('matchTracker.halfEndedDesc')}</p>
            <div className="space-y-4">
              <button
                data-testid="start-break-btn"
                onClick={() => startBreak(10)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
              >
                {t('matchTracker.startBreak')}
              </button>
              <button
                data-testid="start-next-period-btn"
                onClick={() => startNextPeriod(25)}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg"
              >
                {t('matchTracker.skipTo2ndHalf')}
              </button>
              <button
                data-testid="finish-match-btn"
                onClick={onFinishMatch}
                className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl font-bold text-lg hover:bg-gray-300 transition-colors"
              >
                {t('matchTracker.finishMatch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {matchState.timer.elapsedSeconds >= matchState.halfDurationSeconds && !matchState.timer.isRunning && matchState.currentHalf >= 2 && !matchState.break?.isActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" data-testid="match-end-modal">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="text-red-500" /> {t('matchTracker.matchEnded')}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">{t('matchTracker.matchEndedDesc')}</p>
            <div className="space-y-4">
              <button
                data-testid="overtime-btn"
                onClick={() => { setCustomDuration(5); setActiveModal('OT_SETUP'); setShowModal(true); }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
              >
                {t('matchTracker.overtime')}
              </button>
              <button
                onClick={onFinishMatch}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-colors shadow-lg"
              >
                {t('matchTracker.finishMatch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {renderPhaseModals()}
      {renderContextMenu()}

      {/* Voting Share Modal */}
      {showVotingShare && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowVotingShare(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="text-yellow-500" /> Goal of the Match
              </h3>
               <button data-testid="close-modal-btn" onClick={() => setShowVotingShare(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">{t('matchTracker.goalOfTheMatch')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('matchTracker.voteShareDesc')}</p>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
               <div className="text-xs font-mono text-indigo-600 break-all mb-3 text-center">
                 {window.location.origin}/?view=VOTING
               </div>
               <button 
                data-testid="copy-link-btn"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?view=VOTING`);
                  alert(t('matchTracker.copySuccess'));
                }}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm"
               >
                 {t('matchTracker.copyLink')}
               </button>
            </div>

            <div className="space-y-3">
              <button 
                data-testid="reset-votes-btn"
                onClick={() => socket?.emit('vote-reset')}
                className="w-full py-3 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors"
              >
                {t('matchTracker.resetVotes')}
              </button>
              <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest leading-tight">
                {t('matchTracker.voteStorageDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <SocialShareModal
          matchState={matchState}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default MatchTracker;