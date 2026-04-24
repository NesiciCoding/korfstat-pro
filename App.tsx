import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import AppShell from './components/layout/AppShell';
import GatedView from './components/layout/GatedView';
import LandingGateway from './components/LandingGateway';
import UpdateChecker from './components/UpdateChecker';
import HomePage from './components/HomePage';
import MatchSetup from './components/MatchSetup';

const MatchTracker = lazy(() => import('./components/MatchTracker'));
const StatsView = lazy(() => import('./components/StatsView'));
const JuryView = lazy(() => import('./components/JuryView'));
const LiveStatsView = lazy(() => import('./components/LiveStatsView'));
const MatchHistory = lazy(() => import('./components/MatchHistory'));
import OverallStats from './components/OverallStats';
import StrategyPlanner from './components/StrategyPlanner';
import LivestreamView from './components/LivestreamView';
import StreamOverlay from './components/StreamOverlay';
import DirectorDashboard from './components/DirectorDashboard';
import ShotClockView from './components/ShotClockView';
import SpotterView from './components/SpotterView';
import SettingsModal from './components/SettingsModal';
import SeasonManager from './components/SeasonManager';
import ClubManager from './components/ClubManager';
import MatchAnalysis from './components/MatchAnalysis';
import ScoutingReportView from './components/ScoutingReportView';
import ErrorBoundary from './components/ErrorBoundary';
import ShortcutsModal from './components/ShortcutsModal';
import PhysicalTesting from './components/PhysicalTesting';
const TrainingManager = lazy(() => import('./components/TrainingManager'));
const LiveTicker = lazy(() => import('./components/LiveTicker'));
const SpectatorVoting = lazy(() => import('./components/SpectatorVoting'));
const CompanionDashboard = lazy(() => import('./components/CompanionDashboard'));
const TickerOverlay = lazy(() => import('./components/TickerOverlay'));
const TickerCustomizer = lazy(() => import('./components/TickerCustomizer'));
import LoginPage from './components/LoginPage';
import ClubOnboarding from './components/ClubOnboarding';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { syncService } from './services/SyncService';
import { useSyncStatus } from './hooks/useSyncStatus';
import { ClubProvider, useClub } from './contexts/ClubContext';
import StaticPages from './components/StaticPages';

import { MatchState, MatchEvent, TeamId, ShotType, Team, OverlayMessage } from './types';
import { MatchProfile, DEFAULT_PROFILES } from './types/profile';

import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { DialogProvider } from './contexts/DialogContext';
import { useBroadcastSync } from './hooks/useBroadcastSync';
import { calculateDerivedMatchState } from './utils/matchLogic';
import { generateUUID } from './utils/uuid';

function AppContent() {
  const [view, setView] = useState<'LANDING' | 'HOME' | 'SETUP' | 'TRACK' | 'STATS' | 'JURY' | 'LIVE' | 'MATCH_HISTORY' | 'OVERALL_STATS' | 'STRATEGY' | 'LIVESTREAM_STATS' | 'STREAM_OVERLAY' | 'DIRECTOR' | 'SHOT_CLOCK' | 'SEASON_MANAGER' | 'CLUB_MANAGER' | 'SPOTTER' | 'ANALYSIS' | 'TICKER' | 'TICKER_OVERLAY' | 'TICKER_CUSTOMIZER' | 'VOTING' | 'SCOUTING_REPORT' | 'PHYSICAL_TESTING' | 'ABOUT' | 'PRIVACY' | 'SUPPORT' | 'API_DOCS' | 'COMPANION_DASHBOARD' | 'TRAINING'>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const validViews = ['LANDING', 'HOME', 'SETUP', 'TRACK', 'STATS', 'JURY', 'LIVE', 'MATCH_HISTORY', 'OVERALL_STATS', 'STRATEGY', 'LIVESTREAM_STATS', 'STREAM_OVERLAY', 'DIRECTOR', 'SHOT_CLOCK', 'SEASON_MANAGER', 'CLUB_MANAGER', 'SPOTTER', 'ANALYSIS', 'TICKER', 'TICKER_OVERLAY', 'TICKER_CUSTOMIZER', 'VOTING', 'SCOUTING_REPORT', 'PHYSICAL_TESTING', 'ABOUT', 'PRIVACY', 'SUPPORT', 'API_DOCS', 'COMPANION_DASHBOARD', 'TRAINING'];
    if (viewParam && validViews.includes(viewParam)) return viewParam as any;
    
    // Support path-based rendering for public endpoints (like OBS Browser Sources)
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (path === 'ticker') return 'TICKER';
    if (path === 'overlay') return 'TICKER_OVERLAY';

    return 'LANDING';
  });

  const [scoutingTeam, setScoutingTeam] = useState<string>('');
  const { settings, lastSaved } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('korfstat_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('korfstat_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // --- SOCKET PROXIES (Break Circularity) ---
  const broadcastUpdateRef = useRef<((state: MatchState) => void) | null>(null);
  const registerViewRef = useRef<((v: string) => void) | null>(null);

  const broadcastUpdate = useCallback((state: MatchState) => {
    broadcastUpdateRef.current?.(state);
  }, []);

  const registerViewProxy = useCallback((v: string) => {
    registerViewRef.current?.(v);
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { clubId, activeClub, isLoading: isClubLoading } = useClub();
  const syncStatus = useSyncStatus();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      syncService.setUserId(u?.id ?? null);
      setIsAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      syncService.setUserId(u?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Keep syncService club-aware whenever the active club changes
  useEffect(() => {
    syncService.setClubId(clubId);
  }, [clubId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const [matchState, setMatchState] = useState<MatchState>(() => {
    try {
      const savedCurrent = localStorage.getItem('korfstat_current_match');
      if (savedCurrent) return JSON.parse(savedCurrent);
    } catch (e) {
      console.error("Failed to load active match state", e);
    }
    return {
      isConfigured: false,
      halfDurationSeconds: 1500,
      homeTeam: { id: 'HOME', name: '', players: [], color: '', substitutionCount: 0 },
      awayTeam: { id: 'AWAY', name: '', players: [], color: '', substitutionCount: 0 },
      events: [],
      currentHalf: 1,
      possession: null,
      timer: { elapsedSeconds: 0, isRunning: false },
      shotClock: { seconds: 25, isRunning: false },
      timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
    };
  });

  const [savedMatches, setSavedMatches] = useState<MatchState[]>(() => {
    try {
      const saved = localStorage.getItem('korfstat_matches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load match history", e);
      return [];
    }
  });

  useEffect(() => {
    if (user && user.id !== 'guest') {
      setIsAuthLoading(true);
      syncService.loadMatchSummaries().then(cloudMatches => {
        if (cloudMatches.length > 0) {
          setSavedMatches(prev => {
             const existingIds = new Set(prev.map(m => m.id));
             const newMatches = cloudMatches.filter(m => !existingIds.has(m.id));
             return [...newMatches, ...prev];
          });
        }
        setIsAuthLoading(false);
      });
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('korfstat_matches', JSON.stringify(savedMatches));
  }, [savedMatches]);

  // Tracks the last-seen (matchId, events.length) to detect newly added events.
  const prevEventTracker = useRef<{ matchId: string; len: number }>({ matchId: '', len: 0 });

  useEffect(() => {
    if (matchState.isConfigured && matchState.id) {
       localStorage.setItem(`korfstat_match_${matchState.id}`, JSON.stringify(matchState));
       localStorage.setItem('korfstat_current_match_id', matchState.id);
       localStorage.setItem('korfstat_current_match', JSON.stringify(matchState));

       if (user && user.id !== 'guest') {
         const { matchId: prevId, len: prevLen } = prevEventTracker.current;
         const matchId = matchState.id;
         const events = matchState.events;
         // Reset counter when switching to a different match
         const effectivePrevLen = prevId === matchId ? prevLen : 0;

         if (events.length > effectivePrevLen) {
           // Queue each new discrete event individually (offline-safe, idempotent)
           events.slice(effectivePrevLen).forEach((event, i) => {
             syncService.queueEvent(matchId, event, effectivePrevLen + i);
           });
         }
         prevEventTracker.current = { matchId, len: events.length };

         // Full blob sync is debounced — keeps data_json consistent without
         // hammering Supabase on every timer tick or possession change.
         syncService.syncMatchDebounced(matchState);
       }
    }
  }, [matchState, user]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let lastTick = Date.now();
    const loop = () => {
      const now = Date.now();
      if (now - lastTick > 100) {
        setTick(t => t + 1);
        lastTick = now;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    if (matchState.timer.isRunning || matchState.shotClock.isRunning || matchState.timeout.isActive || matchState.break?.isActive) {
      animationFrameId = requestAnimationFrame(loop);
    }
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [matchState.timer.isRunning, matchState.shotClock.isRunning, matchState.timeout.isActive, matchState.break?.isActive]);

  const derivedMatchState = useMemo(() => {
    return calculateDerivedMatchState(matchState, tick ? Date.now() : Date.now());
  }, [matchState, tick]);

  useEffect(() => {
    if (settings.showTimerInTitle && derivedMatchState.timer.isRunning) {
      const minutes = Math.floor(derivedMatchState.timer.elapsedSeconds / 60);
      const seconds = Math.floor(derivedMatchState.timer.elapsedSeconds % 60);
      document.title = `${minutes}:${seconds.toString().padStart(2, '0')} - KorfStat Pro`;
    } else {
      document.title = 'KorfStat Pro';
    }
  }, [derivedMatchState.timer.elapsedSeconds, derivedMatchState.timer.isRunning, settings.showTimerInTitle]);

  // --- HANDLERS ---
  const handleRemoteUpdate = useCallback((remoteState: MatchState) => {
    setMatchState(remoteState);
  }, []);

  const handleUpdateMatch = useCallback((newState: MatchState) => {
    const now = Date.now();
    const adjustedState = { ...newState };
    if (adjustedState.timer.isRunning) adjustedState.timer.lastStartTime = now;
    else adjustedState.timer.lastStartTime = undefined;
    if (adjustedState.shotClock.isRunning) adjustedState.shotClock.lastStartTime = now;
    else adjustedState.shotClock.lastStartTime = undefined;
    if (adjustedState.timeout.isActive && !matchState.timeout.isActive) {
      adjustedState.timeout.startTime = now;
      adjustedState.timeout.remainingSeconds = 60;
    }
    setMatchState(adjustedState);
    broadcastUpdate(adjustedState);
  }, [matchState, broadcastUpdate]);

  const handleStartMatch = useCallback((home: Team, away: Team, profile?: typeof DEFAULT_PROFILES[0], seasonId?: string) => {
    const newState: MatchState = {
      id: generateUUID(), date: Date.now(), isConfigured: true, seasonId,
      halfDurationSeconds: profile ? profile.periodDurationSeconds : 1500, profile, homeTeam: home, awayTeam: away,
      events: [], currentHalf: 1, possession: null,
      timer: { elapsedSeconds: 0, isRunning: false },
      shotClock: { seconds: profile ? profile.shotClockDurationSeconds : 25, isRunning: false },
      timeout: { isActive: false, startTime: 0, remainingSeconds: 0 }
    };
    setMatchState(newState);
    broadcastUpdate(newState);
    setView('TRACK');
  }, [broadcastUpdate]);

  const handleFinishMatch = useCallback(() => {
    const finalState = {
      ...derivedMatchState,
      timer: { ...derivedMatchState.timer, isRunning: false, lastStartTime: undefined },
      shotClock: { ...derivedMatchState.shotClock, isRunning: false, lastStartTime: undefined },
      timeout: { ...derivedMatchState.timeout, isActive: false }
    };
    setMatchState(finalState);
    broadcastUpdate(finalState);
    setSavedMatches(prev => [finalState, ...prev]);
    if (finalState.id) {
       const protocol = window.location.protocol;
       const hostname = window.location.hostname;
       const fetchUrl = (protocol === 'tauri:' || hostname === 'tauri.localhost' || hostname === 'localhost' || hostname === '127.0.0.1')
           ? 'http://localhost:3002' : `${window.location.origin.replace(':5173', ':3002').replace(':3000', ':3002')}`;
       fetch(`${fetchUrl}/api/matches/active/${finalState.id}`, { method: 'DELETE' }).catch(()=>{});
    }
    setView('STATS');
  }, [derivedMatchState, broadcastUpdate]);

  const handleDeleteMatch = useCallback((id: string) => {
    setSavedMatches(prev => prev.filter(m => m.id !== id));
  }, []);

  /**
   * Select a saved match for viewing. If the match is a cloud summary (players
   * array is empty — loaded via loadMatchSummaries), fetch the full data_json
   * blob before navigating to the stats view.
   */
  const handleSelectSavedMatch = useCallback(async (match: MatchState, targetView: 'STATS' | 'ANALYSIS' = 'STATS') => {
    const isSummaryOnly = match.homeTeam.players.length === 0 && match.id;
    if (isSummaryOnly) {
      const detail = await syncService.loadMatchDetail(match.id!);
      if (detail) {
        setMatchState(detail);
        setSavedMatches(prev => prev.map(m => m.id === detail.id ? detail : m));
      } else {
        setMatchState(match);
      }
    } else {
      setMatchState(match);
    }
    setView(targetView);
  }, []);

  const handleSpotterAction = useCallback((action: any) => {
    const actionType: string = action?.action ?? action;
    setMatchState(prev => {
      const now = Date.now();
      if (actionType === 'TOGGLE_TIMER') {
        const nowRunning = !prev.timer.isRunning;
        let frozenElapsed = prev.timer.elapsedSeconds;
        let frozenShotClock = prev.shotClock.seconds;
        if (!nowRunning && prev.timer.lastStartTime) {
          const elapsedSinceLast = (now - prev.timer.lastStartTime) / 1000;
          frozenElapsed = prev.timer.elapsedSeconds + elapsedSinceLast;
          if (prev.shotClock.isRunning && prev.shotClock.lastStartTime) {
            const consumed = (now - prev.shotClock.lastStartTime) / 1000;
            frozenShotClock = Math.max(0, prev.shotClock.seconds - consumed);
          }
        }
        return {
          ...prev,
          timer: { ...prev.timer, isRunning: nowRunning, elapsedSeconds: frozenElapsed, lastStartTime: nowRunning ? now : undefined },
          shotClock: { ...prev.shotClock, isRunning: nowRunning, seconds: frozenShotClock, lastStartTime: nowRunning ? now : undefined }
        };
      }
      if (actionType === 'RESET_SHOT_CLOCK') return { ...prev, shotClock: { ...prev.shotClock, seconds: prev.profile?.shotClockDurationSeconds || 25, isRunning: prev.timer.isRunning, lastStartTime: prev.timer.isRunning ? now : undefined } };
      if (actionType === 'RESET_TIMER') return { ...prev, timer: { ...prev.timer, elapsedSeconds: 0, isRunning: false, lastStartTime: undefined }, shotClock: { ...prev.shotClock, seconds: prev.profile?.shotClockDurationSeconds || 25, isRunning: false, lastStartTime: undefined } };
      if (actionType === 'ADJUST_TIMER') return { ...prev, timer: { ...prev.timer, elapsedSeconds: Math.max(0, prev.timer.elapsedSeconds - (action.delta || 0)), lastStartTime: prev.timer.isRunning ? now : undefined } };
      if (actionType === 'OVERRIDE_SHOT_CLOCK') return { ...prev, shotClock: { ...prev.shotClock, seconds: action.seconds || 25, isRunning: prev.timer.isRunning, lastStartTime: prev.timer.isRunning ? now : undefined } };
      if (actionType === 'PLAYER_GOAL' || actionType === 'GOAL') {
        const teamId = (action.teamId || 'HOME') as TeamId;
        const team = teamId === 'HOME' ? prev.homeTeam : prev.awayTeam;
        const playerId = action.playerId || team.players.find(p => p.onField)?.id || team.players[0]?.id;
        if (!playerId) return prev;
        return { ...prev, events: [...prev.events, { id: generateUUID(), timestamp: Math.floor(prev.timer.elapsedSeconds), realTime: now, half: prev.currentHalf, teamId, playerId, type: 'SHOT', result: 'GOAL', shotType: 'RUNNING_IN', location: { x: 50, y: 50 } }] };
      }
      if (actionType === 'PLAYER_FOUL' || actionType === 'FOUL') {
        const teamId = (action.teamId || 'HOME') as TeamId;
        const team = teamId === 'HOME' ? prev.homeTeam : prev.awayTeam;
        const playerId = action.playerId || team.players.find(p => p.onField)?.id || team.players[0]?.id;
        if (!playerId) return prev;
        return { ...prev, events: [...prev.events, { id: generateUUID(), timestamp: Math.floor(prev.timer.elapsedSeconds), realTime: now, half: prev.currentHalf, teamId, playerId, type: 'FOUL', location: { x: 50, y: 50 } }] };
      }
      if (actionType === 'TIMEOUT') return { ...prev, timeout: { isActive: true, startTime: now, remainingSeconds: 60, teamId: action.teamId || prev.possession || 'HOME' }, events: [...prev.events, { id: generateUUID(), timestamp: Math.floor(prev.timer.elapsedSeconds), realTime: now, half: prev.currentHalf, teamId: action.teamId || prev.possession || 'HOME', type: 'TIMEOUT' }] };
      if (actionType === 'PERIOD_NEXT') return { ...prev, currentHalf: (prev.currentHalf || 1) + 1, timer: { ...prev.timer, elapsedSeconds: 0, isRunning: false, lastStartTime: undefined } };
      if (actionType === 'GOAL_UNDO') return { ...prev, events: prev.events.slice(0, -1) };
      return prev;
    });
    if (actionType === 'MATCH_RESET') { handleFinishMatch(); setView('HOME'); }
  }, [handleFinishMatch]);

  // --- SYNC HOOK ---
  const { broadcastUpdate: innerBroadcast, activeSessions, registerView: innerRegister, sendHapticSignal, socket } = useBroadcastSync(matchState.id, matchState, handleRemoteUpdate, handleSpotterAction);

  useEffect(() => {
    broadcastUpdateRef.current = innerBroadcast;
    registerViewRef.current = innerRegister;
  }, [innerBroadcast, innerRegister]);

  useEffect(() => {
    registerViewProxy(view);
  }, [view, registerViewProxy]);

  const handleBackNavigation = useCallback(() => {
    if (window.opener) window.close();
    else setView('TRACK');
  }, []);

  const handleExitToHome = useCallback(() => {
    const resetState: MatchState = {
      isConfigured: false,
      halfDurationSeconds: settings.defaultHalfDuration * 60 || 1500,
      homeTeam: { id: 'HOME', name: settings.defaultHomeName || 'Home', players: [], color: settings.defaultHomeColor || '', substitutionCount: 0 },
      awayTeam: { id: 'AWAY', name: settings.defaultAwayName || 'Away', players: [], color: settings.defaultAwayColor || '', substitutionCount: 0 },
      events: [], currentHalf: 1, possession: null,
      timer: { elapsedSeconds: 0, isRunning: false },
      shotClock: { seconds: 25, isRunning: false },
      timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
    };
    setMatchState(resetState);
    broadcastUpdate(resetState);
    localStorage.removeItem('korfstat_current_match');
    setView('HOME');
  }, [settings, broadcastUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthLoading || (user && user.id !== 'guest' && activeClub === undefined)) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[var(--text-muted)] mt-4 font-bold tracking-widest text-sm uppercase">KorfStat Pro</p>
      </div>
    );
  }

  const publicViews = ['LANDING', 'ABOUT', 'PRIVACY', 'SUPPORT', 'API_DOCS', 'TICKER', 'TICKER_OVERLAY'];

  if (!user && !publicViews.includes(view)) {
    return <LoginPage onLoginSuccess={setUser} onBack={() => setView('LANDING')} />;
  }

  // Logged-in but not yet in a club — show onboarding wizard
  if (user && user.id !== 'guest' && !activeClub && !publicViews.includes(view)) {
    return <ClubOnboarding />;
  }

  return (
    <AppShell
      view={view}
      setView={setView as (v: string) => void}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onLogout={handleLogout}
      syncStatus={syncStatus}
      lastSaved={user && user.id !== 'guest' ? lastSaved : null}
      onSyncRetry={() => syncStatus.retry(matchState)}
      isCollapsed={sidebarCollapsed}
      onToggleCollapsed={handleToggleSidebar}
    >
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onNavigate={setView} />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {view === 'LANDING' && <LandingGateway onNavigate={setView} onSelectMatch={(match) => handleSelectSavedMatch(match)} activeSessions={activeSessions} matchState={derivedMatchState} savedMatches={savedMatches} isAuthenticated={!!user} />}
      {view === 'HOME' && <HomePage onNavigate={setView} activeSessions={activeSessions} matchState={derivedMatchState} onJoinMatch={(match) => { setMatchState(match); }} />}
      {view === 'SETUP' && <MatchSetup onStartMatch={handleStartMatch} onNavigate={setView} savedMatches={savedMatches} />}
      {view === 'TRACK' && <Suspense fallback={<div>Loading Match Tracker...</div>}><MatchTracker matchState={derivedMatchState} onUpdateMatch={handleUpdateMatch} onFinishMatch={handleFinishMatch} onViewChange={setView} socket={socket} onSpotterAction={handleSpotterAction} /></Suspense>}
      {view === 'STATS' && <Suspense fallback={<div>Loading Statistics...</div>}><StatsView matchState={derivedMatchState} savedMatches={savedMatches} onBack={handleBackNavigation} onHome={handleExitToHome} onAnalyze={() => setView('ANALYSIS')} /></Suspense>}
      {view === 'JURY' && <Suspense fallback={<div>Loading Jury View...</div>}><JuryView matchState={derivedMatchState} onUpdateMatch={handleUpdateMatch} onBack={handleBackNavigation} sendHapticSignal={sendHapticSignal} /></Suspense>}
      {view === 'LIVE' && <Suspense fallback={<div>Loading Live Stats...</div>}><LiveStatsView matchState={derivedMatchState} /></Suspense>}
      {view === 'MATCH_HISTORY' && <Suspense fallback={<div>Loading History...</div>}><MatchHistory matches={savedMatches} onSelectMatch={(match) => handleSelectSavedMatch(match)} onAnalyzeMatch={(match) => handleSelectSavedMatch(match, 'ANALYSIS')} onScoutTeam={(team) => { setScoutingTeam(team); setView('SCOUTING_REPORT'); }} onDeleteMatch={handleDeleteMatch} onBack={() => setView('HOME')} /></Suspense>}
      {view === 'OVERALL_STATS' && <OverallStats matches={savedMatches} onBack={() => setView('HOME')} />}
      {view === 'STRATEGY' && <GatedView feature="STRATEGY" featureLabel="Strategy Planner" onBack={() => setView('HOME')}><StrategyPlanner matches={savedMatches} onBack={() => setView('HOME')} /></GatedView>}
      {view === 'LIVESTREAM_STATS' && <GatedView feature="BROADCASTING" featureLabel="Livestream Statistics" onBack={() => setView('HOME')}><LivestreamView matchState={derivedMatchState} savedMatches={savedMatches} /></GatedView>}
      {view === 'STREAM_OVERLAY' && <StreamOverlay matchState={derivedMatchState} socket={socket} />}
      {view === 'DIRECTOR' && <GatedView feature="BROADCASTING" featureLabel="Director Dashboard" onBack={() => setView('HOME')}><DirectorDashboard matchState={derivedMatchState} setMatchState={handleUpdateMatch} broadcastUpdate={broadcastUpdate} socket={socket} /></GatedView>}
      {view === 'SHOT_CLOCK' && <ShotClockView matchState={derivedMatchState} />}
      {view === 'SEASON_MANAGER' && <SeasonManager matches={savedMatches} onBack={() => setView('HOME')} />}
      {view === 'CLUB_MANAGER' && <ClubManager onBack={() => setView('HOME')} savedMatches={savedMatches} onScoutTeam={(team) => { setScoutingTeam(team); setView('SCOUTING_REPORT'); }} />}
      {view === 'SPOTTER' && <SpotterView matchState={derivedMatchState} onBack={() => setView('HOME')} />}
      {view === 'ANALYSIS' && <GatedView feature="ANALYSIS" featureLabel="Match Analysis" onBack={() => setView('MATCH_HISTORY')}><MatchAnalysis match={matchState} onBack={() => setView('MATCH_HISTORY')} /></GatedView>}
      {view === 'TICKER' && <Suspense fallback={<div>Loading Ticker...</div>}><LiveTicker /></Suspense>}
      {view === 'TICKER_OVERLAY' && <Suspense fallback={<div>Loading Overlay...</div>}><TickerOverlay /></Suspense>}
      {view === 'TICKER_CUSTOMIZER' && <Suspense fallback={<div>Loading Customizer...</div>}><TickerCustomizer /></Suspense>}
      {view === 'VOTING' && <Suspense fallback={<div>Loading Voting...</div>}><SpectatorVoting /></Suspense>}
      {view === 'SCOUTING_REPORT' && <GatedView feature="SCOUTING" featureLabel="Scouting Report" onBack={() => setView('MATCH_HISTORY')}><ScoutingReportView teamName={scoutingTeam} allMatches={savedMatches} onBack={() => setView('MATCH_HISTORY')} /></GatedView>}
      {view === 'PHYSICAL_TESTING' && <GatedView feature="PHYSICAL_TESTING" featureLabel="Physical Testing" onBack={() => setView('HOME')}><PhysicalTesting onBack={() => setView('HOME')} /></GatedView>}
      {view === 'COMPANION_DASHBOARD' && <GatedView feature="COMPANION" featureLabel="Companion Dashboard" onBack={() => setView('HOME')}><Suspense fallback={<div>Loading Dashboard...</div>}><CompanionDashboard socket={socket} onBack={() => setView('HOME')} /></Suspense></GatedView>}
      {view === 'TRAINING' && <GatedView feature="TRAINING" featureLabel="Training Manager" onBack={() => setView('HOME')}><Suspense fallback={<div>Loading Training Tracker...</div>}><TrainingManager onBack={() => setView('HOME')} /></Suspense></GatedView>}
      {['ABOUT', 'PRIVACY', 'SUPPORT', 'API_DOCS'].includes(view) && <StaticPages view={view as any} onBack={() => setView('LANDING')} />}
    </AppShell>
  );
}

function AppWithClub() {
  const [userId, setUserId] = React.useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <ClubProvider userId={userId}>
      <AppContent />
      <UpdateChecker />
    </ClubProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DialogProvider>
        <SettingsProvider>
          <AppWithClub />
        </SettingsProvider>
      </DialogProvider>
    </ErrorBoundary>
  );
}