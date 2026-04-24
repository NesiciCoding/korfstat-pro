import React, { useState } from 'react';
import { MatchState, TeamId, MatchEvent, ActionType, CardType, ShotType, RefereeDecision } from '../../types';
import { useTranslation } from 'react-i18next';
import { getShotDistanceType } from '../KorfballField';
import {
  Target, Shield, AlertTriangle, ArrowRightLeft,
  Repeat, Shirt, Gavel, CheckCircle, XCircle,
  Monitor, ExternalLink, Trophy, Brain, AlertCircle
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useGameAudio } from '../../hooks/useGameAudio';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { getScore, formatTime } from '../../utils/matchUtils';
import { getPlayerRole, getTotalGoals } from '../../utils/lineupUtils';
import { generateUUID } from '../../utils/uuid';
import { useDialog } from '../../hooks/useDialog';
import SocialShareModal from '../SocialShareModal';
import { useVoiceCommands, VoiceCommandAction } from '../../hooks/useVoiceCommands';
import { broadcasterService } from '../../services/BroadcasterService';
import { localServerClient } from '../../lib/localServerClient';

import { ContextMenuState, PendingAction, ActiveModal } from './types';
import MatchHeader from './MatchHeader';
import MatchLog from './MatchLog';
import FieldPanel from './FieldPanel';
import PlayerGrid from './PlayerGrid';
import QuickActionsBar from './QuickActionsBar';
import PhaseModals from './PhaseModals';

interface MatchTrackerProps {
  matchState: MatchState;
  onUpdateMatch: (newState: MatchState) => void;
  onFinishMatch: () => void;
  onViewChange?: (view: 'STATS' | 'JURY' | 'LIVE' | 'LIVESTREAM_STATS' | 'STREAM_OVERLAY' | 'HOME' | 'LANDING') => void;
  socket: any;
  onSpotterAction: (action: any) => void;
}

const MatchTracker: React.FC<MatchTrackerProps> = ({
  matchState, onUpdateMatch, onFinishMatch, onViewChange, socket, onSpotterAction
}) => {
  const { t } = useTranslation();
  const { alert } = useDialog();
  const { settings, updateSettings } = useSettings();
  const soundEnabled = settings.soundEnabled;
  const { playShotClockBuzzer, playGameEndHorn } = useGameAudio(!soundEnabled);

  // ── State ───────────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>('END_HALF');
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVotingShare, setShowVotingShare] = useState(false);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [customDuration, setCustomDuration] = useState(10);
  const [pendingShortcutAction, setPendingShortcutAction] = useState<PendingAction>(null);
  const [shortcutBuffer, setShortcutBuffer] = useState<string[]>([]);
  const [refWatchMode, setRefWatchMode] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [serverIp, setServerIp] = useState<string>(window.location.hostname);
  const bufferTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // ── Effects ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    localServerClient.getSetupInfo().then(({ data }) => {
      if (data?.localIp) setServerIp(data.localIp);
    });
  }, []);

  const prevShotClockRef = React.useRef(matchState.shotClock.seconds);
  const prevGameTimeRef = React.useRef(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds));

  React.useEffect(() => {
    const currentShotClock = matchState.shotClock.seconds;
    if (prevShotClockRef.current > 0 && currentShotClock <= 0 && matchState.shotClock.lastStartTime) {
      playShotClockBuzzer();
    }
    prevShotClockRef.current = currentShotClock;

    const currentGameTime = Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds);
    if (prevGameTimeRef.current > 0 && currentGameTime <= 0) playGameEndHorn();
    prevGameTimeRef.current = currentGameTime;
  }, [matchState.shotClock.seconds, matchState.timer.elapsedSeconds, matchState.halfDurationSeconds, matchState.shotClock.lastStartTime, playShotClockBuzzer, playGameEndHorn]);

  React.useEffect(() => {
    if (settings.broadcaster) broadcasterService.updateSettings(settings.broadcaster);
  }, [settings.broadcaster]);

  React.useEffect(() => {
    if (!socket) return;
    const handleWatchAction = (payload: any) => {
      if (payload.action === 'FLAG_DECISION' && refWatchMode) {
        setContextMenu({ visible: true, x: 50, y: 50, step: 'SELECT_REF_TYPE', selectedTeam: matchState.possession || 'HOME' });
        socket.emit('haptic-signal', { type: 'SHORT', count: 2 });
      }
    };
    socket.on('watch-action', handleWatchAction);
    return () => socket.off('watch-action', handleWatchAction);
  }, [socket, refWatchMode, matchState.possession]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isMenuOpen = contextMenu?.visible;
  const currentStep = contextMenu?.step;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleUndo = () => {
    if (matchState.events.length === 0) return;
    const lastEvent = matchState.events[matchState.events.length - 1];
    const remainingEvents = matchState.events.slice(0, -1);
    let updates: Partial<MatchState> = { events: remainingEvents };
    if (lastEvent.previousPossession) updates.possession = lastEvent.previousPossession;
    if (lastEvent.type === 'SUBSTITUTION' && lastEvent.subInId && lastEvent.subOutId) {
      const team = lastEvent.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
      const updatedPlayers = team.players.map(p => {
        if (p.id === lastEvent.subInId) return { ...p, onField: false };
        if (p.id === lastEvent.subOutId) return { ...p, onField: true };
        return p;
      });
      const updatedTeam = { ...team, players: updatedPlayers, substitutionCount: Math.max(0, team.substitutionCount - (lastEvent.subReason === 'REGULAR' ? 1 : 0)) };
      if (lastEvent.teamId === 'HOME') updates.homeTeam = updatedTeam;
      else updates.awayTeam = updatedTeam;
    }
    onUpdateMatch({ ...matchState, ...updates });
  };

  const addEvent = (eventData: Partial<MatchEvent>) => {
    const team = eventData.teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
    const player = eventData.playerId ? team.players.find(p => p.id === eventData.playerId) : undefined;
    const newEvent: MatchEvent = {
      id: generateUUID(),
      timestamp: Math.floor(matchState.timer.elapsedSeconds),
      realTime: Date.now(),
      half: matchState.currentHalf,
      teamId: eventData.teamId || (matchState.possession || 'HOME'),
      playerId: eventData.playerId,
      type: eventData.type!,
      previousPossession: matchState.possession,
      location: eventData.location,
      shotType: eventData.shotType,
      result: eventData.result,
      reboundType: eventData.reboundType,
      foulType: eventData.foulType,
      cardType: eventData.cardType,
      refereeDecision: eventData.refereeDecision,
      currentZone: player ? getPlayerRole(player, getTotalGoals(matchState)) : undefined,
      lineupIds: team.players.filter(p => p.onField).map(p => p.id)
    };

    if (newEvent.type === 'OFFICIATING' && socket) socket.emit('haptic-signal', { type: 'LONG', pattern: [200, 100, 200] });

    let newPossession = matchState.possession;
    if (eventData.result === 'GOAL' || eventData.type === 'TURNOVER') {
      newPossession = eventData.teamId === 'HOME' ? 'AWAY' : 'HOME';
    } else if (eventData.type === 'REBOUND' && eventData.reboundType === 'DEFENSIVE') {
      newPossession = eventData.teamId;
    }

    onUpdateMatch({ ...matchState, events: [...matchState.events, newEvent], possession: newPossession, shotClock: { ...matchState.shotClock, seconds: 25 } });

    if (settings.broadcaster?.enabled) {
      const isGoal = newEvent.result === 'GOAL';
      const isCard = newEvent.type === 'CARD';
      const shouldClip = (isGoal && settings.broadcaster.autoClipGoals) || (isCard && settings.broadcaster.autoClipCards);
      if (shouldClip) broadcasterService.triggerHighlight(isGoal ? `GOAL: ${player?.name || 'Unknown'}` : `CARD: ${player?.name || 'Unknown'}`);
    }

    setContextMenu(null);
  };

  const handleSubstitution = (reason: 'REGULAR' | 'INJURY' | 'RED_CARD', contextOverride?: any) => {
    try {
      const context = contextOverride || contextMenu;
      const { selectedTeam, subOutId, subInId } = context || {};
      if (!selectedTeam || !subOutId || !subInId) return;
      const team = selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
      const updatedPlayers = team.players.map(p => {
        if (p.id === subOutId) return { ...p, onField: false };
        if (p.id === subInId) return { ...p, onField: true };
        return p;
      });
      const updatedTeam = { ...team, players: updatedPlayers, substitutionCount: reason === 'REGULAR' ? team.substitutionCount + 1 : team.substitutionCount };
      const subEntry: MatchEvent = {
        id: generateUUID(), timestamp: Math.floor(matchState.timer.elapsedSeconds), realTime: Date.now(),
        half: matchState.currentHalf, teamId: selectedTeam, type: 'SUBSTITUTION',
        subOutId, subInId, subReason: reason, previousPossession: matchState.possession,
        lineupIds: updatedPlayers.filter(p => p.onField).map(p => p.id)
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

  const handleShortcutAction = (action: 'GOAL' | 'MISS' | 'FREE_THROW' | 'PENALTY' | 'TIMEOUT' | 'SUB' | 'CARD' | 'TURNOVER' | 'FOUL' | 'REBOUND') => {
    if (isMenuOpen && currentStep === 'SELECT_ACTION' && contextMenu?.selectedPlayerId) {
      const teamId = contextMenu.selectedTeam || matchState.possession || 'HOME';
      const playerId = contextMenu.selectedPlayerId;
      const location = { x: 50, y: 50 };
      if (action === 'GOAL') addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
      else if (action === 'MISS') addEvent({ teamId, playerId, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
      else if (action === 'FREE_THROW') { const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'FREE_THROW', location: autoLoc }); }
      else if (action === 'PENALTY') { const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'PENALTY', location: autoLoc }); }
      else if (action === 'TURNOVER') addEvent({ teamId, playerId, type: 'TURNOVER', location });
      else if (action === 'FOUL') addEvent({ teamId, playerId, type: 'FOUL', location });
      else if (action === 'REBOUND') addEvent({ teamId, playerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location });
      if (action !== 'CARD' && action !== 'SUB' && action !== 'TIMEOUT') setPendingShortcutAction(null);
      return;
    }
    if (isMenuOpen && ['SELECT_SUB_OUT', 'SELECT_SUB_IN', 'CONFIRM_SUB_EXCEPTION', 'SELECT_SHOT_TYPE'].includes(currentStep || '')) return;

    const currentTeamId = contextMenu?.selectedTeam || matchState.possession || 'HOME';
    if (['GOAL', 'MISS', 'FREE_THROW', 'PENALTY', 'CARD', 'TURNOVER', 'FOUL', 'REBOUND'].includes(action)) {
      setPendingShortcutAction(action as PendingAction);
      setContextMenu(prev => ({ ...prev, visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_PLAYER', selectedTeam: currentTeamId } as any));
    } else if (action === 'TIMEOUT') {
      startTimeout();
    } else if (action === 'SUB') {
      if (!isMenuOpen || currentStep === 'SELECT_PLAYER') {
        setContextMenu({ visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_TEAM_FOR_SUB' } as any);
        setPendingShortcutAction(null);
      }
    }
  };

  const handleBufferedKey = (key: string) => {
    if (!settings.enableSequenceBuffering) return;
    if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    setShortcutBuffer(prev => {
      const newBuffer = [...prev, key.toUpperCase()];
      if (newBuffer.length >= 2) {
        const actionKey = newBuffer[0];
        const playerIndex = parseInt(newBuffer[1]) - 1;
        const isEnter = newBuffer[newBuffer.length - 1] === 'ENTER';
        if (isEnter && !isNaN(playerIndex)) {
          const teamId = contextMenu?.selectedTeam || matchState.possession || 'HOME';
          const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
          const players = team.players.filter(p => p.onField).sort((a, b) => a.number - b.number);
          const player = players[playerIndex];
          if (player) {
            const actionMap: Record<string, string> = { 'G': 'GOAL', 'M': 'MISS', 'K': 'FREE_THROW', 'P': 'PENALTY', 'O': 'TURNOVER', 'F': 'FOUL', 'R': 'REBOUND' };
            const action = actionMap[actionKey];
            if (action) { processBufferedAction(action, teamId, player.id); return []; }
          }
        }
      }
      bufferTimeoutRef.current = setTimeout(() => setShortcutBuffer([]), 2000);
      return newBuffer;
    });
  };

  const processBufferedAction = (action: string, teamId: TeamId, playerId: string) => {
    const location = { x: 50, y: 50 };
    if (action === 'GOAL') addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
    else if (action === 'MISS') addEvent({ teamId, playerId, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
    else if (action === 'FREE_THROW') { const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'FREE_THROW', location: autoLoc }); }
    else if (action === 'PENALTY') { const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'PENALTY', location: autoLoc }); }
    else if (action === 'TURNOVER') addEvent({ teamId, playerId, type: 'TURNOVER', location });
    else if (action === 'FOUL') addEvent({ teamId, playerId, type: 'FOUL', location });
    else if (action === 'REBOUND') addEvent({ teamId, playerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location });
    setContextMenu(null);
    setShortcutBuffer([]);
  };

  const handleChordedGoal = (playerIndex: number) => {
    if (!settings.enableChordedShortcuts) return;
    const teamId = matchState.possession || 'HOME';
    const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
    const players = team.players.filter(p => p.onField).sort((a, b) => a.number - b.number);
    const player = players[playerIndex];
    if (player) addEvent({ teamId, playerId: player.id, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } });
  };

  const handlePlayerNumberSelection = (numberIndex: number) => {
    try {
      if (!isMenuOpen) return;
      const step = contextMenu?.step;
      if (step === 'SELECT_TEAM_FOR_SUB' || step === 'SELECT_TEAM') {
        const teamId: TeamId = numberIndex === 0 ? 'HOME' : 'AWAY';
        setContextMenu(prev => prev ? { ...prev, selectedTeam: teamId, step: step === 'SELECT_TEAM' ? 'SELECT_PLAYER' : 'SELECT_SUB_OUT' } : null);
        return;
      }
      const currentSelectedTeam = contextMenu?.selectedTeam || matchState.possession || 'HOME';
      const team = currentSelectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
      if (step === 'SELECT_PLAYER' || step === 'SELECT_SUB_OUT') {
        const onFieldPlayers = team.players.filter(p => p.onField).sort((a, b) => a.number - b.number);
        const player = onFieldPlayers[numberIndex];
        if (player) {
          if (step === 'SELECT_PLAYER') {
            if (pendingShortcutAction) {
              const location = { x: 50, y: 50 };
              if (pendingShortcutAction === 'GOAL') addEvent({ teamId: team.id, playerId: player.id, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
              else if (pendingShortcutAction === 'MISS') addEvent({ teamId: team.id, playerId: player.id, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
              else if (pendingShortcutAction === 'FREE_THROW') { setContextMenu(prev => prev ? { ...prev, selectedPlayerId: player.id, step: 'SELECT_RESULT', calculatedShotType: 'FREE_THROW' } : null); return; }
              else if (pendingShortcutAction === 'PENALTY') { setContextMenu(prev => prev ? { ...prev, selectedPlayerId: player.id, step: 'SELECT_RESULT', calculatedShotType: 'PENALTY' } : null); return; }
              else if (pendingShortcutAction === 'TURNOVER') addEvent({ teamId: team.id, playerId: player.id, type: 'TURNOVER', location });
              else if (pendingShortcutAction === 'FOUL') addEvent({ teamId: team.id, playerId: player.id, type: 'FOUL', location });
              else if (pendingShortcutAction === 'REBOUND') addEvent({ teamId: team.id, playerId: player.id, type: 'REBOUND', reboundType: 'OFFENSIVE', location });
              else if (pendingShortcutAction === 'CARD') { setContextMenu(prev => prev ? { ...prev, selectedPlayerId: player.id, step: 'SELECT_CARD_TYPE' as any } : null); setPendingShortcutAction(null); return; }
              setPendingShortcutAction(null);
              setContextMenu(null);
            } else {
              setContextMenu(prev => prev ? { ...prev, selectedPlayerId: player.id, step: 'SELECT_ACTION' } : null);
            }
          } else if (step === 'SELECT_SUB_OUT') {
            setContextMenu(prev => prev ? { ...prev, subOutId: player.id, step: 'SELECT_SUB_IN' } : null);
          }
        }
      } else if (step === 'SELECT_SUB_IN') {
        const benchPlayers = team.players.filter(p => !p.onField);
        const player = benchPlayers[numberIndex];
        if (player) {
          if (team.substitutionCount >= 8) { setContextMenu(prev => prev ? { ...prev, subInId: player.id, step: 'CONFIRM_SUB_EXCEPTION' } : null); }
          else { handleSubstitution('REGULAR', { ...contextMenu, subInId: player.id }); setContextMenu(null); }
        }
      } else if (step === 'SELECT_ACTION') {
        if (numberIndex === 0) setContextMenu(c => c ? { ...c, step: 'SELECT_SHOT_TYPE' } : null);
        else if (numberIndex === 1) addEvent({ teamId: contextMenu?.selectedTeam || 'HOME', playerId: contextMenu?.selectedPlayerId, type: 'TURNOVER', location: { x: contextMenu?.x || 50, y: contextMenu?.y || 50 } });
        else if (numberIndex === 2) addEvent({ teamId: contextMenu?.selectedTeam || 'HOME', playerId: contextMenu?.selectedPlayerId, type: 'FOUL', location: { x: contextMenu?.x || 50, y: contextMenu?.y || 50 } });
        else if (numberIndex === 3) addEvent({ teamId: contextMenu?.selectedTeam || 'HOME', playerId: contextMenu?.selectedPlayerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location: { x: contextMenu?.x || 50, y: contextMenu?.y || 50 } });
      } else if (step === 'SELECT_SHOT_TYPE') {
        const location = { x: contextMenu?.x || 50, y: contextMenu?.y || 50 };
        if (numberIndex === 0) addEvent({ teamId: contextMenu?.selectedTeam || 'HOME', playerId: contextMenu?.selectedPlayerId, type: 'SHOT', shotType: 'RUNNING_IN', result: 'GOAL', location });
        else if (numberIndex === 1) { const autoLoc = contextMenu?.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId: contextMenu?.selectedTeam || 'HOME', playerId: contextMenu?.selectedPlayerId, type: 'SHOT', shotType: 'PENALTY', result: 'GOAL', location: autoLoc }); }
        else if (numberIndex === 2) { const autoLoc = contextMenu?.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId: contextMenu?.selectedTeam || 'HOME', playerId: contextMenu?.selectedPlayerId, type: 'SHOT', shotType: 'FREE_THROW', result: 'GOAL', location: autoLoc }); }
        else if (numberIndex === 3) addEvent({ teamId: contextMenu?.selectedTeam || 'HOME', playerId: contextMenu?.selectedPlayerId, type: 'SHOT', shotType: contextMenu?.calculatedShotType || 'NEAR', result: 'MISS', location });
      } else if (step === 'SELECT_REF_TYPE') {
        const types = ['Running / Push', 'Personal Foul', 'Advantage / Clear', 'Other / Technical'];
        setContextMenu(prev => prev ? { ...prev, foulType: types[numberIndex] || 'Other', step: 'SELECT_REF_DECISION' } : null);
      } else if (step === 'SELECT_REF_DECISION') {
        const decisions: RefereeDecision[] = ['CORRECT', 'DEBATABLE', 'INCORRECT', 'MISSED'];
        addEvent({ type: 'OFFICIATING', refereeDecision: decisions[numberIndex] || 'CORRECT', foulType: contextMenu?.foulType, location: { x: contextMenu?.x || 50, y: contextMenu?.y || 50 }, teamId: 'HOME' });
        setContextMenu(null);
      }
    } catch (err: any) {
      console.error('CRITICAL ERROR in handlePlayerNumberSelection:', err.message, err.stack);
    }
  };

  useKeyboardShortcuts([
    { key: 'h', action: () => setContextMenu({ visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_PLAYER', selectedTeam: 'HOME' } as any) },
    { key: 'a', action: () => setContextMenu({ visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_PLAYER', selectedTeam: 'AWAY' } as any) },
    { key: 'g', action: () => { handleShortcutAction('GOAL'); handleBufferedKey('G'); } },
    { key: 'm', action: () => { handleShortcutAction('MISS'); handleBufferedKey('M'); } },
    { key: 'k', action: () => { handleShortcutAction('FREE_THROW'); handleBufferedKey('K'); } },
    { key: 'p', action: () => { handleShortcutAction('PENALTY'); handleBufferedKey('P'); } },
    { key: 'o', action: () => { handleShortcutAction('TURNOVER'); handleBufferedKey('O'); } },
    { key: 'f', action: () => { handleShortcutAction('FOUL'); handleBufferedKey('F'); } },
    { key: 'r', action: () => { handleShortcutAction('REBOUND'); handleBufferedKey('R'); } },
    { key: 't', action: () => handleShortcutAction('TIMEOUT') },
    { key: 's', action: () => handleShortcutAction('SUB') },
    { key: 'c', action: () => handleShortcutAction('CARD') },
    { key: '1', action: () => { handlePlayerNumberSelection(0); handleBufferedKey('1'); } },
    { key: '2', action: () => { handlePlayerNumberSelection(1); handleBufferedKey('2'); } },
    { key: '3', action: () => { handlePlayerNumberSelection(2); handleBufferedKey('3'); } },
    { key: '4', action: () => { handlePlayerNumberSelection(3); handleBufferedKey('4'); } },
    { key: '5', action: () => { handlePlayerNumberSelection(4); handleBufferedKey('5'); } },
    { key: '6', action: () => { handlePlayerNumberSelection(5); handleBufferedKey('6'); } },
    { key: '7', action: () => { handlePlayerNumberSelection(6); handleBufferedKey('7'); } },
    { key: '8', action: () => { handlePlayerNumberSelection(7); handleBufferedKey('8'); } },
    { key: '1', shiftKey: true, action: () => handleChordedGoal(0) },
    { key: '2', shiftKey: true, action: () => handleChordedGoal(1) },
    { key: '3', shiftKey: true, action: () => handleChordedGoal(2) },
    { key: '4', shiftKey: true, action: () => handleChordedGoal(3) },
    { key: '5', shiftKey: true, action: () => handleChordedGoal(4) },
    { key: '6', shiftKey: true, action: () => handleChordedGoal(5) },
    { key: '7', shiftKey: true, action: () => handleChordedGoal(6) },
    { key: '8', shiftKey: true, action: () => handleChordedGoal(7) },
    { key: 'Enter', action: () => {
      handleBufferedKey('Enter');
      if (isMenuOpen && contextMenu && (currentStep === 'SELECT_SHOT_TYPE' || currentStep === 'SELECT_RESULT')) {
        const teamId = contextMenu.selectedTeam;
        const playerId = contextMenu.selectedPlayerId;
        const shotType = contextMenu.calculatedShotType || 'NEAR';
        const location = currentStep === 'SELECT_RESULT' ? (teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }) : { x: contextMenu.x, y: contextMenu.y };
        addEvent({ teamId, playerId, type: 'SHOT', shotType, result: 'GOAL', location });
        setContextMenu(null);
        setPendingShortcutAction(null);
      }
    }},
    { key: 'Escape', action: () => { setContextMenu(null); setShowModal(false); setPendingShortcutAction(null); setShortcutBuffer([]); } },
    { key: 'z', ctrlKey: true, action: handleUndo },
    { key: 'z', metaKey: true, action: handleUndo },
  ]);

  const handlePhaseEnd = () => {
    setActiveModal(matchState.currentHalf === 1 ? 'END_HALF' : 'END_MATCH');
    setShowModal(true);
  };

  const startBreak = (durationMinutes: number) => {
    onUpdateMatch({ ...matchState, timer: { ...matchState.timer, isRunning: false, lastStartTime: undefined }, shotClock: { ...matchState.shotClock, isRunning: false, lastStartTime: undefined }, break: { isActive: true, startTime: Date.now(), durationSeconds: durationMinutes * 60 } });
    setShowModal(false);
  };

  const startNextPeriod = (durationMinutes: number) => {
    onUpdateMatch({ ...matchState, currentHalf: matchState.currentHalf + 1, halfDurationSeconds: durationMinutes * 60, timer: { elapsedSeconds: 0, isRunning: false }, shotClock: { seconds: 25, isRunning: false }, break: { isActive: false, startTime: 0, durationSeconds: 0 }, possession: matchState.possession === 'HOME' ? 'AWAY' : 'HOME' });
    setShowModal(false);
  };

  const startTimeout = () => {
    onUpdateMatch({ ...matchState, timeout: { isActive: true, startTime: Date.now(), remainingSeconds: 60, teamId: matchState.possession || 'HOME' }, events: [...matchState.events, { id: generateUUID(), timestamp: Math.floor(matchState.timer.elapsedSeconds), realTime: Date.now(), half: matchState.currentHalf, teamId: matchState.possession || 'HOME', type: 'TIMEOUT' }] });
  };

  const cancelTimeout = () => onUpdateMatch({ ...matchState, timeout: { ...matchState.timeout, isActive: false } });
  const togglePossession = () => onUpdateMatch({ ...matchState, possession: matchState.possession === 'HOME' ? 'AWAY' : 'HOME' });

  const handleFieldClick = (x: number, y: number) => {
    if (refWatchMode) {
      setContextMenu({ visible: true, x, y, step: 'SELECT_REF_TYPE' });
    } else {
      // Skip team selection when possession is already known (~80% of interactions).
      // The SELECT_PLAYER step shows a "Switch" button for the remaining cases.
      const defaultTeam = (matchState.possession || 'HOME') as TeamId;
      setContextMenu({
        visible: true, x, y,
        step: 'SELECT_PLAYER',
        selectedTeam: defaultTeam,
        calculatedShotType: getShotDistanceType(x, y) || 'NEAR',
      });
    }
  };

  const handleVoiceCommand = (action: VoiceCommandAction) => {
    if (action.type === 'UNDO') { handleUndo(); return; }
    if (action.type === 'TIMEOUT') { startTimeout(); return; }
    if (action.type === 'UNKNOWN') return;
    let teamId: TeamId = matchState.possession || 'HOME';
    if ('team' in action && action.team) teamId = action.team;
    const team = teamId === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
    let playerId = team.players[0]?.id;
    if ('playerNumber' in action && action.playerNumber !== undefined) {
      const found = team.players.find(p => p.number.toString() === action.playerNumber?.toString());
      if (found) playerId = found.id;
    }
    const location = { x: 50, y: 50 };
    if (action.type === 'GOAL') addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
    else if (action.type === 'MISS') addEvent({ teamId, playerId, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
    else if (action.type === 'TURNOVER') addEvent({ teamId, playerId, type: 'TURNOVER', location });
    else if (action.type === 'FOUL') addEvent({ teamId, playerId, type: 'FOUL', location });
    else if (action.type === 'FREE_THROW') { const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'FREE_THROW', location: autoLoc }); }
    else if (action.type === 'PENALTY') { const autoLoc = teamId === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'PENALTY', location: autoLoc }); }
  };

  const openExternalView = (view: 'JURY' | 'LIVE' | 'LIVESTREAM_STATS' | 'STREAM_OVERLAY') => {
    const url = `${window.location.origin}${window.location.pathname}?view=${view}`;
    window.open(url, view, 'popup=yes,width=1280,height=720');
  };

  const { isListening, toggleListening, transcript } = useVoiceCommands({ onCommand: handleVoiceCommand, homeName: matchState.homeTeam.name, awayName: matchState.awayTeam.name });

  // ── Context Menu render (kept inline — tight state coupling) ────────────────
  const renderContextMenu = () => {
    if (!contextMenu?.visible) return null;
    const activeTeam = contextMenu.selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam;
    const totalGoals = getTotalGoals(matchState);
    const onFieldPlayers = (activeTeam?.players.filter(p => p.onField) || []).sort((a, b) => {
      const rA = getPlayerRole(a, totalGoals), rB = getPlayerRole(b, totalGoals);
      if (rA !== rB) return rA === 'ATTACK' ? -1 : 1;
      return a.number - b.number;
    });
    const benchPlayers = activeTeam?.players.filter(p => !p.onField) || [];

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" data-testid="context-menu-overlay" onClick={() => setContextMenu(null)}>
        <div className="bg-[var(--surface-1)] rounded-xl shadow-2xl p-6 w-[90%] max-w-md animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {contextMenu.step === 'SELECT_PLAYER' && t('matchTracker.selectPlayer')}
              {contextMenu.step === 'SELECT_ACTION' && t('matchTracker.action')}
              {contextMenu.step === 'SELECT_SHOT_TYPE' && t('matchTracker.shotDetails')}
              {contextMenu.step === 'SELECT_SUB_OUT' && t('matchTracker.subOut')}
              {contextMenu.step === 'SELECT_SUB_IN' && t('matchTracker.subIn')}
              {contextMenu.step === 'CONFIRM_SUB_EXCEPTION' && t('matchTracker.subLimitReached')}
              {contextMenu.step === 'SELECT_REF_TYPE' && 'Select Foul Type'}
              {contextMenu.step === 'SELECT_REF_DECISION' && 'Select Decision Quality'}
            </h3>
            <div className="flex items-center gap-2">
              {contextMenu.step === 'SELECT_PLAYER' && pendingShortcutAction && (
                <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded animate-pulse">{t('matchTracker.selectPlayerFor', { action: pendingShortcutAction })}</span>
              )}
              <button onClick={() => setContextMenu(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>
          </div>

          <div className="space-y-4">
            {contextMenu.step === 'SELECT_TEAM' && (
              <div className="space-y-4" data-testid="select-team-modal">
                <h3 className="text-lg font-bold text-center mb-4">{t('matchTracker.selectTeam')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button data-testid="select-home-team-btn" onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'HOME', step: 'SELECT_PLAYER' })} className="p-4 rounded-xl border-2 flex flex-col items-center gap-3 hover:bg-gray-50 transition-all" style={{ borderColor: matchState.homeTeam.color }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: matchState.homeTeam.color }}><Shirt size={24} color="white" /></div>
                    <span className="font-bold text-gray-900">{matchState.homeTeam.name}</span>
                  </button>
                  <button data-testid="select-away-team-btn" onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'AWAY', step: 'SELECT_PLAYER' })} className="p-4 rounded-xl border-2 flex flex-col items-center gap-3 hover:bg-gray-50 transition-all" style={{ borderColor: matchState.awayTeam.color }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: matchState.awayTeam.color }}><Shirt size={24} color="white" /></div>
                    <span className="font-bold text-gray-900">{matchState.awayTeam.name}</span>
                  </button>
                </div>
              </div>
            )}
            {contextMenu.step === 'SELECT_RESULT' && (
              <div className="space-y-4" data-testid="select-result-modal">
                <div className="text-center font-bold text-lg mb-4">Result for {contextMenu.calculatedShotType === 'FREE_THROW' ? 'Free Pass' : 'Penalty'}</div>
                <div className="grid grid-cols-2 gap-4">
                  <button data-testid="result-goal-btn" onClick={() => { const autoLoc = contextMenu.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', result: 'GOAL', shotType: contextMenu.calculatedShotType, location: autoLoc }); setPendingShortcutAction(null); }} className="p-6 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg flex flex-col items-center gap-2 border-2 border-green-300"><CheckCircle size={48} /><span className="font-black text-2xl">GOAL</span></button>
                  <button data-testid="result-miss-btn" onClick={() => { const autoLoc = contextMenu.selectedTeam === 'HOME' ? { x: 22.9, y: 50 } : { x: 77.1, y: 50 }; addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', result: 'MISS', shotType: contextMenu.calculatedShotType, location: autoLoc }); setPendingShortcutAction(null); }} className="p-6 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex flex-col items-center gap-2 border-2 border-red-300"><XCircle size={48} /><span className="font-black text-2xl">MISS</span></button>
                </div>
              </div>
            )}
            {contextMenu.step === 'SELECT_PLAYER' && (
              <div data-testid="select-player-modal">
                {/* Switch team button — quick correction when possession default is wrong */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeTeam?.color }} />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{activeTeam?.name}</span>
                  </div>
                  <button
                    onClick={() => setContextMenu(prev => prev ? {
                      ...prev,
                      selectedTeam: prev.selectedTeam === 'HOME' ? 'AWAY' : 'HOME',
                    } : null)}
                    className="text-xs px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
                  >
                    <ArrowRightLeft size={11} /> Switch
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                  {onFieldPlayers.length === 0 && <div className="col-span-4 text-center py-4 text-gray-500 italic">{t('matchTracker.noPlayersOnField')}</div>}
                  {onFieldPlayers.map((p, idx) => (
                    <button key={p.id} data-testid={`player-btn-${p.id}`} onClick={() => {
                      if (pendingShortcutAction) {
                        const location = { x: 50, y: 50 };
                        if (pendingShortcutAction === 'GOAL') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location });
                        else if (pendingShortcutAction === 'MISS') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'SHOT', result: 'MISS', shotType: 'RUNNING_IN', location });
                        else if (pendingShortcutAction === 'FREE_THROW') { setContextMenu(prev => prev ? { ...prev, selectedPlayerId: p.id, step: 'SELECT_RESULT', calculatedShotType: 'FREE_THROW' } : null); return; }
                        else if (pendingShortcutAction === 'PENALTY') { setContextMenu(prev => prev ? { ...prev, selectedPlayerId: p.id, step: 'SELECT_RESULT', calculatedShotType: 'PENALTY' } : null); return; }
                        else if (pendingShortcutAction === 'TURNOVER') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'TURNOVER', location });
                        else if (pendingShortcutAction === 'FOUL') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'FOUL', location });
                        else if (pendingShortcutAction === 'REBOUND') addEvent({ teamId: contextMenu.selectedTeam, playerId: p.id, type: 'REBOUND', reboundType: 'OFFENSIVE', location });
                        else if (pendingShortcutAction === 'CARD') { setContextMenu(prev => prev ? { ...prev, selectedPlayerId: p.id, step: 'SELECT_CARD_TYPE' as any } : null); return; }
                        setPendingShortcutAction(null); setContextMenu(null);
                      } else { setContextMenu({ ...contextMenu, selectedPlayerId: p.id, step: 'SELECT_ACTION' }); }
                    }} className="aspect-square min-w-[52px] min-h-[52px] rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent hover:border-indigo-500 flex flex-col items-center justify-center font-bold text-gray-700 dark:text-gray-200 transition-all shadow-sm relative">
                      <span className="text-lg">{p.number}</span>
                      <span className="text-[10px] text-gray-500">{p.gender}</span>
                      <div className="absolute -top-1 -right-1"><span className={`px-1 rounded text-[8px] font-bold text-white ${getPlayerRole(p, totalGoals) === 'ATTACK' ? 'bg-orange-500' : 'bg-blue-500'}`}>{getPlayerRole(p, totalGoals) === 'ATTACK' ? 'ATT' : 'DEF'}</span></div>
                      <div className="absolute top-1 left-1 flex items-center justify-center bg-black/20 rounded-md px-1.5 py-0.5"><kbd className="text-[10px] font-black text-gray-600 font-mono">{idx + 1}</kbd></div>
                    </button>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <button data-testid="substitution-menu-btn" onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_SUB_OUT' })} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-bold border border-gray-200">
                    <Repeat size={18} /> {t('matchTracker.substitution')} ({activeTeam.substitutionCount}/8)
                  </button>
                  <button data-testid="open-jury-btn" onClick={() => openExternalView('JURY')} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                    <div className="flex items-center gap-3"><Monitor className="text-indigo-500" size={18} /><div className="text-left"><div className="text-sm font-bold text-gray-900">{t('matchTracker.setupJuryTable')}</div><div className="text-[10px] text-gray-500 font-medium">{t('matchTracker.juryTableDesc')}</div></div></div>
                    <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </button>
                </div>
              </div>
            )}
            {contextMenu.step === 'SELECT_SUB_OUT' && (
              <div className="grid grid-cols-4 gap-3" data-testid="select-sub-out-modal">
                {onFieldPlayers.length === 0 && <div className="col-span-4 text-center py-4 text-gray-500 italic">{t('matchTracker.noPlayersToSubOut')}</div>}
                {onFieldPlayers.map(p => <button key={p.id} data-testid={`sub-out-player-btn-${p.id}`} onClick={() => setContextMenu({ ...contextMenu, subOutId: p.id, step: 'SELECT_SUB_IN' })} className="aspect-square rounded-full bg-red-50 hover:bg-red-100 border-red-200 border flex items-center justify-center font-bold">{p.number}</button>)}
              </div>
            )}
            {contextMenu.step === 'SELECT_SUB_IN' && (
              <div className="grid grid-cols-4 gap-3" data-testid="select-sub-in-modal">
                {benchPlayers.map(p => <button key={p.id} data-testid={`sub-in-player-btn-${p.id}`} onClick={() => { if (activeTeam.substitutionCount >= 8) { setContextMenu({ ...contextMenu, subInId: p.id, step: 'CONFIRM_SUB_EXCEPTION' }); } else { const updatedMenu = { ...contextMenu, subInId: p.id }; setContextMenu(updatedMenu as any); handleSubstitution('REGULAR', updatedMenu); }}} className="aspect-square rounded-full bg-green-50 hover:bg-green-100 border-green-200 border flex items-center justify-center font-bold">{p.number}</button>)}
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
                <button data-testid="goal-miss-action-btn" onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_SHOT_TYPE' })} className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex flex-col items-center gap-2"><Target size={24} /> {t('matchTracker.goal')} / {t('matchTracker.miss')} <kbd className="text-xs bg-white/50 px-1 rounded">1</kbd></button>
                <button data-testid="turnover-action-btn" onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'TURNOVER', location: { x: contextMenu.x, y: contextMenu.y } })} className="p-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 flex flex-col items-center gap-2"><ArrowRightLeft size={24} /> {t('matchTracker.turnover')} <kbd className="text-[10px] bg-black/10 px-1 rounded">2</kbd></button>
                <button data-testid="foul-action-btn" onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'FOUL', location: { x: contextMenu.x, y: contextMenu.y } })} className="p-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 flex flex-col items-center gap-2"><AlertTriangle size={24} /> {t('matchTracker.foul')} <kbd className="text-[10px] bg-white/50 px-1 rounded">3</kbd></button>
                <button data-testid="rebound-action-btn" onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'REBOUND', reboundType: 'OFFENSIVE', location: { x: contextMenu.x, y: contextMenu.y } })} className="p-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex flex-col items-center gap-2"><Shield size={24} /> {t('matchTracker.rebound')} <kbd className="text-[10px] bg-white/50 px-1 rounded">4</kbd></button>
                <button data-testid="card-action-btn" onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_CARD_TYPE' as any })} className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 flex flex-col items-center gap-2"><Gavel size={24} /> {t('matchTracker.card')} <kbd className="text-[10px] bg-white/50 px-1 rounded">C</kbd></button>
                <button data-testid="action-substitution-btn" onClick={() => setContextMenu({ ...contextMenu, step: 'SELECT_SUB_OUT' })} className="p-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 flex flex-col items-center gap-2"><Repeat size={24} /> {t('matchTracker.substitution')}</button>
              </div>
            )}
            {(contextMenu.step as any) === 'SELECT_CARD_TYPE' && (
              <div className="grid grid-cols-2 gap-4" data-testid="select-card-type-modal">
                <button data-testid="yellow-card-btn" onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'CARD', cardType: 'YELLOW', location: { x: contextMenu.x, y: contextMenu.y } })} className="p-6 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg flex flex-col items-center gap-2 border-2 border-yellow-300">
                  <div className="w-8 h-12 bg-yellow-400 rounded-sm shadow-sm" /><span className="font-bold">{t('matchTracker.yellowCard')}</span>
                </button>
                <button data-testid="red-card-btn" onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'CARD', cardType: 'RED', location: { x: contextMenu.x, y: contextMenu.y } })} className="p-6 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg flex flex-col items-center gap-2 border-2 border-red-300">
                  <div className="w-8 h-12 bg-red-600 rounded-sm shadow-sm" /><span className="font-bold">{t('matchTracker.redCard')}</span>
                </button>
              </div>
            )}
            {contextMenu.step === 'SELECT_SHOT_TYPE' && (
              <div className="space-y-4" data-testid="select-shot-type-modal">
                <button onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } })} className="w-full px-3 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow font-bold text-lg mb-4 flex items-center justify-center gap-2">
                  {t('matchTracker.goal')} ({contextMenu.calculatedShotType}) <kbd className="text-xs bg-white/20 px-1 rounded text-white">Enter</kbd>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button data-testid="shot-type-btn-RUNNING_IN" onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: 'RUNNING_IN', result: 'GOAL', location: { x: contextMenu.x, y: contextMenu.y } })} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">{t('matchTracker.runningIn')} <kbd className="text-[10px] bg-black/10 px-1 rounded">1</kbd></button>
                  <button data-testid="shot-type-btn-PENALTY" onClick={() => setContextMenu(prev => prev ? { ...prev, step: 'SELECT_RESULT', calculatedShotType: 'PENALTY' } : null)} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">{t('matchTracker.penalty')} <kbd className="text-[10px] bg-black/10 px-1 rounded">2</kbd></button>
                  <button data-testid="shot-type-btn-FREE_THROW" onClick={() => setContextMenu(prev => prev ? { ...prev, step: 'SELECT_RESULT', calculatedShotType: 'FREE_THROW' } : null)} className="px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 font-bold flex flex-col items-center">{t('matchTracker.freePass')} <kbd className="text-[10px] bg-black/10 px-1 rounded">3</kbd></button>
                  <button data-testid="shot-type-btn-MISS" onClick={() => addEvent({ teamId: contextMenu.selectedTeam, playerId: contextMenu.selectedPlayerId, type: 'SHOT', shotType: contextMenu.calculatedShotType, result: 'MISS', location: { x: contextMenu.x, y: contextMenu.y } })} className="px-3 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 font-bold flex flex-col items-center">{t('matchTracker.miss')} <kbd className="text-[10px] bg-black/10 px-1 rounded">4</kbd></button>
                </div>
              </div>
            )}
            {contextMenu.step === 'SELECT_TEAM_FOR_SUB' && (
              <div className="space-y-4" data-testid="select-team-for-sub-modal">
                <h3 className="text-lg font-bold text-center mb-4">{t('matchTracker.selectTeamSub')}</h3>
                <button onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'HOME', step: 'SELECT_SUB_OUT' })} className="w-full p-4 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors" style={{ borderColor: matchState.homeTeam.color }}>
                  <div className="flex items-center gap-3"><Shirt size={24} fill={matchState.homeTeam.color} /><span className="font-bold text-lg">{matchState.homeTeam.name}</span></div>
                  <div className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-500 font-bold">{matchState.homeTeam.substitutionCount}/8 {t('matchTracker.subs')}</div>
                </button>
                <button onClick={() => setContextMenu({ ...contextMenu, selectedTeam: 'AWAY', step: 'SELECT_SUB_OUT' })} className="w-full p-4 rounded-xl border flex items-center justify-between hover:bg-gray-50 transition-colors" style={{ borderColor: matchState.awayTeam.color }}>
                  <div className="flex items-center gap-3"><Shirt size={24} fill={matchState.awayTeam.color} /><span className="font-bold text-lg">{matchState.awayTeam.name}</span></div>
                  <div className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-500 font-bold">{matchState.awayTeam.substitutionCount}/8 {t('matchTracker.subs')}</div>
                </button>
              </div>
            )}
            {contextMenu.step === 'SELECT_REF_TYPE' && (
              <div className="grid grid-cols-2 gap-3" data-testid="select-ref-type-modal">
                {['Running / Push', 'Personal Foul', 'Advantage / Clear', 'Other / Technical'].map((type, idx) => (
                  <button key={type} data-testid={`ref-type-btn-${idx}`} onClick={() => setContextMenu({ ...contextMenu, foulType: type, step: 'SELECT_REF_DECISION' })} className="p-4 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex flex-col items-center gap-2 font-bold">
                    {type} <kbd className="text-xs bg-white/50 px-1 rounded">{idx + 1}</kbd>
                  </button>
                ))}
              </div>
            )}
            {contextMenu.step === 'SELECT_REF_DECISION' && (
              <div className="grid grid-cols-2 gap-3" data-testid="select-ref-decision-modal">
                {[{ label: 'Correct', value: 'CORRECT', color: 'bg-green-500', icon: '✓', key: '1' }, { label: 'Debatable', value: 'DEBATABLE', color: 'bg-orange-500', icon: '!', key: '2' }, { label: 'Incorrect', value: 'INCORRECT', color: 'bg-red-500', icon: '✕', key: '3' }, { label: 'Missed', value: 'MISSED', color: 'bg-gray-400', icon: '○', key: '4' }].map(d => (
                  <button key={d.value} data-testid={`ref-decision-btn-${d.value.toLowerCase()}`} onClick={() => addEvent({ type: 'OFFICIATING', foulType: contextMenu.foulType, refereeDecision: d.value as RefereeDecision, location: { x: contextMenu.x, y: contextMenu.y } })} className={`p-4 ${d.color} text-white rounded-lg hover:opacity-90 flex flex-col items-center gap-1 font-bold shadow-sm`}>
                    <span className="text-2xl">{d.icon}</span><span>{d.label}</span><kbd className="text-[10px] bg-black/20 px-1 rounded">{d.key}</kbd>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <MatchHeader
        matchState={matchState}
        soundEnabled={soundEnabled}
        isListening={isListening}
        refWatchMode={refWatchMode}
        broadcasterEnabled={!!settings.broadcaster?.enabled}
        onToggleSound={() => updateSettings({ soundEnabled: !soundEnabled })}
        onUndo={handleUndo}
        onToggleVoice={toggleListening}
        onToggleRefWatch={() => setRefWatchMode(m => !m)}
        onManualClip={() => broadcasterService.triggerHighlight('Manual Clip')}
        onTimeout={startTimeout}
        onToggleVotingShare={() => setShowVotingShare(true)}
        onShare={() => setShowShareModal(true)}
        onPhaseEnd={handlePhaseEnd}
        onTogglePossession={togglePossession}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col lg:flex-row gap-6">
        <div className="hidden lg:flex lg:flex-none lg:w-64 lg:h-[calc(100vh-160px)]">
          <MatchLog matchState={matchState} />
        </div>
        <div className="flex-1 flex flex-col">
          <FieldPanel matchState={matchState} onFieldClick={handleFieldClick} />
          <PlayerGrid matchState={matchState} onPlayerClick={(teamId, playerId) => setContextMenu({ visible: true, x: 0, y: 0, step: 'SELECT_ACTION', selectedTeam: teamId, selectedPlayerId: playerId })} />
        </div>
      </div>

      <QuickActionsBar
        refWatchMode={refWatchMode}
        onAction={handleShortcutAction as any}
        onOpenRefWatch={() => setContextMenu({ visible: true, x: window.innerWidth / 2, y: window.innerHeight / 2, step: 'SELECT_REF_TYPE' })}
        onToggleLog={() => setShowLog(v => !v)}
        showLog={showLog}
      />

      {/* Mobile event log drawer — visible on <lg when toggled */}
      {showLog && (
        <div className="fixed inset-0 z-[55] lg:hidden" onClick={() => setShowLog(false)}>
          <div
            className="absolute inset-x-0 bottom-0 bg-[var(--surface-1)] rounded-t-2xl shadow-2xl h-[60vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center py-2">
              <div className="w-10 h-1 bg-[var(--border-strong)] rounded-full" />
            </div>
            <div className="flex-1 overflow-hidden px-2 pb-2">
              <MatchLog matchState={matchState} />
            </div>
          </div>
        </div>
      )}

      {/* Timeout overlay */}
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

      {/* Break overlay */}
      {matchState.break?.isActive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-indigo-900/90 backdrop-blur-md" data-testid="break-modal">
          <div className="text-center text-white">
            <h2 className="text-8xl font-black font-mono mb-4">{formatTime(Math.ceil(matchState.break.durationSeconds))}</h2>
            <div className="text-2xl font-bold uppercase tracking-widest mb-8">{t('matchTracker.halftimeBreak')}</div>
            <button onClick={() => startNextPeriod(25)} className="mt-8 px-8 py-4 bg-white text-indigo-900 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl">{t('matchTracker.start2ndHalf')}</button>
          </div>
        </div>
      )}

      {/* Auto half-end prompt (half 1) */}
      {matchState.timer.elapsedSeconds >= matchState.halfDurationSeconds && !matchState.timer.isRunning && matchState.currentHalf < 2 && !matchState.break?.isActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" data-testid="half-end-modal">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><span className="text-indigo-500">🕐</span> {t('matchTracker.halfEnded')}</h3><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button></div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">{t('matchTracker.halfEndedDesc')}</p>
            <div className="space-y-4">
              <button data-testid="start-break-btn" onClick={() => startBreak(10)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg">{t('matchTracker.startBreak')}</button>
              <button data-testid="start-next-period-btn" onClick={() => startNextPeriod(25)} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg">{t('matchTracker.skipTo2ndHalf')}</button>
              <button data-testid="finish-match-btn" onClick={onFinishMatch} className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl font-bold text-lg hover:bg-gray-300 transition-colors">{t('matchTracker.finishMatch')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Auto match-end prompt (half 2+) */}
      {matchState.timer.elapsedSeconds >= matchState.halfDurationSeconds && !matchState.timer.isRunning && matchState.currentHalf >= 2 && !matchState.break?.isActive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" data-testid="match-end-modal">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><span className="text-red-500">🏁</span> {t('matchTracker.matchEnded')}</h3><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button></div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">{t('matchTracker.matchEndedDesc')}</p>
            <div className="space-y-4">
              <button data-testid="overtime-btn" onClick={() => { setCustomDuration(5); setActiveModal('OT_SETUP'); setShowModal(true); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg">{t('matchTracker.overtime')}</button>
              <button data-testid="finish-match-btn" onClick={onFinishMatch} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-colors shadow-lg">{t('matchTracker.finishMatch')}</button>
            </div>
          </div>
        </div>
      )}

      <PhaseModals
        show={showModal}
        activeModal={activeModal}
        customDuration={customDuration}
        onClose={() => setShowModal(false)}
        onCustomDurationChange={setCustomDuration}
        onStartBreak={startBreak}
        onStartNextPeriod={startNextPeriod}
        onSetActiveModal={setActiveModal}
        onFinishMatch={onFinishMatch}
      />
      {renderContextMenu()}

      {/* Voting share modal */}
      {showVotingShare && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowVotingShare(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2">🏆 Goal of the Match</h3><button data-testid="close-modal-btn" onClick={() => setShowVotingShare(false)} className="text-gray-400 hover:text-gray-600">✕</button></div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{t('matchTracker.goalOfTheMatch')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('matchTracker.voteShareDesc')}</p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <div className="text-xs font-mono text-indigo-600 break-all mb-3 text-center">http://{serverIp}:3002/?view=VOTING</div>
              <button data-testid="copy-link-btn" onClick={async () => { await navigator.clipboard.writeText(`http://${serverIp}:3002/?view=VOTING`); await alert(t('matchTracker.copySuccess')); }} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm">{t('matchTracker.copyLink')}</button>
            </div>
            <div className="space-y-3">
              <button data-testid="reset-votes-btn" onClick={() => socket?.emit('vote-reset')} className="w-full py-3 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors">{t('matchTracker.resetVotes')}</button>
              <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest leading-tight">{t('matchTracker.voteStorageDesc')}</p>
            </div>
          </div>
        </div>
      )}

      {showShareModal && <SocialShareModal matchState={matchState} onClose={() => setShowShareModal(false)} />}
    </div>
  );
};

export default MatchTracker;
