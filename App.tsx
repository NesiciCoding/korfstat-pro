import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import HomePage from './components/HomePage';
import MatchSetup from './components/MatchSetup';

// Lazy load heavy route-level components for better initial bundle size
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
import ErrorBoundary from './components/ErrorBoundary';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { MatchState, Team } from './types';
import { Settings } from 'lucide-react';
import { useBroadcastSync } from './hooks/useBroadcastSync';
import { calculateDerivedMatchState } from './utils/matchLogic';

function AppContent() {
  // Initialize view from URL parameter
  const [view, setView] = useState<'HOME' | 'SETUP' | 'TRACK' | 'STATS' | 'JURY' | 'LIVE' | 'MATCH_HISTORY' | 'OVERALL_STATS' | 'STRATEGY' | 'LIVESTREAM_STATS' | 'STREAM_OVERLAY' | 'DIRECTOR' | 'SHOT_CLOCK' | 'SEASON_MANAGER' | 'SPOTTER'>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const validViews = ['HOME', 'SETUP', 'TRACK', 'STATS', 'JURY', 'LIVE', 'MATCH_HISTORY', 'OVERALL_STATS', 'STRATEGY', 'LIVESTREAM_STATS', 'STREAM_OVERLAY', 'DIRECTOR', 'SHOT_CLOCK', 'SEASON_MANAGER', 'SPOTTER'];
    if (viewParam && validViews.includes(viewParam)) {
      return viewParam as any;
    }
    return 'HOME';
  });

  const { settings } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Base Match State (Persistent Source of Truth)
  const [matchState, setMatchState] = useState<MatchState>(() => {
    try {
      const savedCurrent = localStorage.getItem('korfstat_current_match');
      if (savedCurrent) {
        return JSON.parse(savedCurrent);
      }
    } catch (e) {
      console.error("Failed to load active match state", e);
    }
    // We can't access 'settings' here in the callback easily for initial state if it's not passed in props (which it isn't yet, as we are in AppContent)
    // But since this runs only on mount, we can rely on handleExitToHome for resets.
    return {
      isConfigured: false,
      halfDurationSeconds: 1500, // Default 25m
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

  // const [savedMatches, setSavedMatches] = useState<MatchState[]>([]); // Replaced by Dexie
  // Helper to ensure we have a valid array even during loading
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
    localStorage.setItem('korfstat_matches', JSON.stringify(savedMatches));
  }, [savedMatches]);

  // Persist Current Match State
  useEffect(() => {
    if (matchState.isConfigured) {
      localStorage.setItem('korfstat_current_match', JSON.stringify(matchState));
    } else {
      // If not configured (e.g. at home), maybe we don't clear it immediately to avoid accidental loss?
      // But handleExitToHome clears it.
      // So if it's not configured, it's safe to assume we don't need to save it, or it is the empty state.
    }
  }, [matchState]);

  const [tick, setTick] = useState(0); // Force re-render for timer updates

  // Load match history (Legacy localStorage migration could go here)




  // Clean up legacy listeners if necessary, but we replaced the useEffect blocks.

  // Render Loop (visual updates only)
  useEffect(() => {
    let animationFrameId: number;
    let lastTick = Date.now();

    const loop = () => {
      const now = Date.now();
      // Only trigger React render if enough time passed (e.g. 100ms) to update UI
      // Or if we want smooth 60fps for seconds, we can do it.
      // 100ms is enough for 0.1s resolution.
      if (now - lastTick > 100) {
        setTick(t => t + 1);
        lastTick = now;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    // Only run loop if something needs animating
    // But we need to check the DERIVED state to know if running?
    // base matchState has isRunning.
    if (matchState.timer.isRunning || matchState.shotClock.isRunning || matchState.timeout.isActive || matchState.break?.isActive) {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [matchState.timer.isRunning, matchState.shotClock.isRunning, matchState.timeout.isActive, matchState.break?.isActive]);

  // Derived State Calculation
  // This calculates the "Display Time" based on "Base Time + (Now - StartTime)"
  const derivedMatchState = useMemo(() => {
    return calculateDerivedMatchState(matchState, tick ? Date.now() : Date.now());
  }, [matchState, tick]);

  // Update Page Title with Timer
  useEffect(() => {
    if (settings.showTimerInTitle && derivedMatchState.timer.isRunning) {
      const minutes = Math.floor(derivedMatchState.timer.elapsedSeconds / 60);
      const seconds = Math.floor(derivedMatchState.timer.elapsedSeconds % 60);
      document.title = `${minutes}:${seconds.toString().padStart(2, '0')} - KorfStat Pro`;
    } else {
      document.title = 'KorfStat Pro';
    }
  }, [derivedMatchState.timer.elapsedSeconds, derivedMatchState.timer.isRunning, settings.showTimerInTitle]);

  // --- SYNC ---
  // Re-implemented with BroadcastChannel for Local Tab Sync
  const handleRemoteUpdate = useCallback((remoteState: MatchState) => {
    // When we receive an update from another tab
    setMatchState(remoteState);
  }, []);

  const handleSpotterAction = useCallback((action: any) => {
    console.log('[App] Received Spotter Action via Sync:', action);
    // TODO: Implement actual logic to update matchState based on spotter action
    // For now, we just log it, matching previous behavior in MatchTracker
  }, []);

  const { broadcastUpdate, activeSessions, registerView } = useBroadcastSync(matchState, handleRemoteUpdate, handleSpotterAction);

  // Register View on Change
  useEffect(() => {
    if (registerView) {
      registerView(view);
    }
  }, [view, registerView]);

  // Smart Update Handler
  const handleUpdateMatch = useCallback((newState: MatchState) => {
    const now = Date.now();
    const adjustedState = { ...newState };

    // 1. Handle Game Timer
    if (adjustedState.timer.isRunning) {
      // If it's running, we MUST have a lastStartTime.
      // We always "rebase" on update to prevent drift and handle the "derived to base" transition.
      // The `newState.timer.elapsedSeconds` passed from UI is the *current* visual time.
      // We accept that as the new Base.
      adjustedState.timer.lastStartTime = now;
      // elapsedSeconds is kept as passed (the new base).
    } else {
      // If stopped, clear the start time.
      adjustedState.timer.lastStartTime = undefined;
      // elapsedSeconds is kept as passed (frozen).
    }

    // 2. Handle Shot Clock
    if (adjustedState.shotClock.isRunning) {
      adjustedState.shotClock.lastStartTime = now;
    } else {
      adjustedState.shotClock.lastStartTime = undefined;
    }

    // 3. Handle Timeout
    // If we just started it (active=true, valid startTime), ensure consistency.
    // If `newState` has `isActive` true, checking if it CHANGED isn't strictly necessary if we rely on `startTime`.
    // But if we want to use `lastStartTime` pattern for robustness:
    if (adjustedState.timeout.isActive && !matchState.timeout.isActive) {
      // Just started
      adjustedState.timeout.startTime = now; // Ensure startTime is fresh
      adjustedState.timeout.remainingSeconds = 60;
    }

    // 4. Special Case: Timeout blocks other timers?
    // If timeout is active, others shouldn't run?
    // Old logic: `if (current.timer.isRunning && !current.timeout.isActive)`
    // If timeout starts, we should probably PAUSE the other clocks in the base state?
    // Or just let them be "running" but not accumulate?
    // Cleaner: If timeout starts, we implicitly PAUSE the game timer?
    // The previous logic paused accumulation but kept `isRunning` true?
    // "if (current.timer.isRunning && !current.timeout.isActive)"
    // This implies `isRunning` stays true, but time doesn't add up.
    // This is TRICKY with timestamps.
    // If `isRunning` is true, strict timestamp math adds time.
    // So if I wait 1 min in timeout, the Game Clock jumps 1 min when I resume?
    // YES. THIS IS BAD.
    // Fix: When Timeout STARTS:
    // Fix: Update local state!
    setMatchState(adjustedState);

    // Broadcast change
    broadcastUpdate(adjustedState);

    // Log actions (simple diff logging could be enhanced, but logging the state update is a start)
    console.log('[Match Update]', {
      timestamp: new Date().toISOString(),
      eventCount: adjustedState.events.length,
      lastEvent: adjustedState.events[adjustedState.events.length - 1]
    });
  }, [matchState]);

  const handleStartMatch = useCallback((home: Team, away: Team, durationSeconds: number, seasonId?: string) => {
    const newState: MatchState = {
      id: crypto.randomUUID(),
      seasonId,
      date: Date.now(),
      isConfigured: true,
      halfDurationSeconds: durationSeconds,
      homeTeam: home,
      awayTeam: away,
      events: [],
      currentHalf: 1,
      possession: 'HOME',
      timer: { elapsedSeconds: 0, isRunning: false },
      shotClock: { seconds: 25, isRunning: false },
      timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
    };
    setMatchState(newState);
    broadcastUpdate(newState);
    setView('TRACK');
  }, [broadcastUpdate]);

  const handleFinishMatch = useCallback(() => {
    // Ensure everything stopped
    const finalState = {
      ...derivedMatchState, // Capture final derived values
      timer: { ...derivedMatchState.timer, isRunning: false, lastStartTime: undefined },
      shotClock: { ...derivedMatchState.shotClock, isRunning: false, lastStartTime: undefined },
      timeout: { ...derivedMatchState.timeout, isActive: false }
    };

    setMatchState(finalState);
    broadcastUpdate(finalState);

    // Save to localStorage
    const newHistory = [finalState, ...savedMatches];
    setSavedMatches(newHistory); // Triggers useEffect to save to localStorage

    console.log('Match saved to local storage');

    setView('STATS');
  }, [derivedMatchState, savedMatches, broadcastUpdate]);

  const handleDeleteMatch = useCallback((id: string) => {
    const newHistory = savedMatches.filter(m => m.id !== id);
    setSavedMatches(newHistory);
  }, [savedMatches]);

  const handleBackNavigation = useCallback(() => {
    if (window.opener) {
      window.close();
    } else {
      setView('TRACK');
    }
  }, []);

  const handleExitToHome = useCallback(() => {
    // Completely reset match state to allow new match
    const resetState: MatchState = {
      isConfigured: false,
      halfDurationSeconds: settings.defaultHalfDuration * 60 || 1500,
      homeTeam: { id: 'HOME', name: settings.defaultHomeName || 'Home', players: [], color: settings.defaultHomeColor || '', substitutionCount: 0 },
      awayTeam: { id: 'AWAY', name: settings.defaultAwayName || 'Away', players: [], color: settings.defaultAwayColor || '', substitutionCount: 0 },
      events: [],
      currentHalf: 1,
      possession: null,
      timer: { elapsedSeconds: 0, isRunning: false },
      shotClock: { seconds: 25, isRunning: false },
      timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
    };
    setMatchState(resetState);
    broadcastUpdate(resetState);
    localStorage.removeItem('korfstat_current_match');
    setView('HOME');
  }, [settings, broadcastUpdate]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans transition-colors duration-300">

      {/* Settings Floater */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed bottom-4 left-4 z-[90] p-2 bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white rounded-full backdrop-blur-sm transition-all"
        title="Settings"
      >
        <Settings size={20} />
      </button>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Locked Screen */}


      {view === 'HOME' && (
        <HomePage
          onNavigate={setView}
          activeSessions={activeSessions}
          matchState={derivedMatchState}
        />
      )}

      {view === 'SETUP' && (
        <MatchSetup onStartMatch={handleStartMatch} savedMatches={savedMatches} />
      )}

      {view === 'TRACK' && (
        <Suspense fallback={<div className="loading-fallback">Loading Match Tracker...</div>}>
          <MatchTracker
            matchState={derivedMatchState}
            onUpdateMatch={handleUpdateMatch}
            onFinishMatch={handleFinishMatch}
            onViewChange={setView}
          />
        </Suspense>
      )}

      {view === 'STATS' && (
        <Suspense fallback={<div className="loading-fallback">Loading Statistics...</div>}>
          <StatsView
            matchState={derivedMatchState}
            onBack={handleBackNavigation}
            onHome={handleExitToHome}
          />
        </Suspense>
      )}

      {view === 'JURY' && (
        <Suspense fallback={<div className="loading-fallback">Loading Jury View...</div>}>
          <JuryView
            matchState={derivedMatchState}
            onUpdateMatch={handleUpdateMatch}
            onBack={handleBackNavigation}
          />
        </Suspense>
      )}

      {view === 'LIVE' && (
        <Suspense fallback={<div className="loading-fallback">Loading Live Stats...</div>}>
          <LiveStatsView matchState={derivedMatchState} />
        </Suspense>
      )}

      {view === 'MATCH_HISTORY' && (
        <Suspense fallback={<div className="loading-fallback">Loading History...</div>}>
          <MatchHistory
            matches={savedMatches}
            onSelectMatch={(match) => { setMatchState(match); setView('STATS'); }}
            onDeleteMatch={handleDeleteMatch}
            onBack={() => setView('HOME')}
          />
        </Suspense>
      )}

      {view === 'OVERALL_STATS' && (
        <OverallStats
          matches={savedMatches}
          onBack={() => setView('HOME')}
        />
      )}

      {view === 'STRATEGY' && (
        <StrategyPlanner
          matches={savedMatches}
          onBack={() => setView('HOME')}
        />
      )}

      {view === 'LIVESTREAM_STATS' && (
        <LivestreamView
          matchState={derivedMatchState}
          savedMatches={savedMatches}
        />
      )}

      {view === 'STREAM_OVERLAY' && (
        <StreamOverlay
          matchState={derivedMatchState}
        />
      )}

      {view === 'DIRECTOR' && (
        <DirectorDashboard
          matchState={derivedMatchState}
          setMatchState={handleUpdateMatch}
          broadcastUpdate={broadcastUpdate}
        />
      )}

      {view === 'SHOT_CLOCK' && (
        <ShotClockView
          matchState={derivedMatchState}
        />
      )}

      {view === 'SEASON_MANAGER' && (
        <SeasonManager
          matches={savedMatches}
          onBack={() => setView('HOME')}
        />
      )}

      {view === 'SPOTTER' && (
        <SpotterView
          matchState={derivedMatchState}
          onBack={() => setView('HOME')}
        />
      )}
    </div>
  );
};


export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ErrorBoundary>
  );
};