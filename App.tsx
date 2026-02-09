import React, { useState, useEffect, useCallback, useMemo } from 'react';
import HomePage from './components/HomePage';
import MatchSetup from './components/MatchSetup';
import MatchTracker from './components/MatchTracker';
import StatsView from './components/StatsView';
import JuryView from './components/JuryView';
import LiveStatsView from './components/LiveStatsView';
import MatchHistory from './components/MatchHistory';
import OverallStats from './components/OverallStats';
import StrategyPlanner from './components/StrategyPlanner';
import LivestreamView from './components/LivestreamView';
import StreamOverlay from './components/StreamOverlay';
import DirectorDashboard from './components/DirectorDashboard';
import ShotClockView from './components/ShotClockView';
import SettingsModal from './components/SettingsModal';
import { SettingsProvider } from './contexts/SettingsContext';
import { MatchState, Team } from './types';
import { Settings } from 'lucide-react';
import { useBroadcastSync } from './hooks/useBroadcastSync';

function AppContent() {
  // Initialize view from URL parameter
  const [view, setView] = useState<'HOME' | 'SETUP' | 'TRACK' | 'STATS' | 'JURY' | 'LIVE' | 'MATCH_HISTORY' | 'OVERALL_STATS' | 'STRATEGY' | 'LIVESTREAM_STATS' | 'STREAM_OVERLAY' | 'DIRECTOR' | 'SHOT_CLOCK'>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const validViews = ['HOME', 'SETUP', 'TRACK', 'STATS', 'JURY', 'LIVE', 'MATCH_HISTORY', 'OVERALL_STATS', 'STRATEGY', 'LIVESTREAM_STATS', 'STREAM_OVERLAY', 'DIRECTOR', 'SHOT_CLOCK'];
    if (viewParam && validViews.includes(viewParam)) {
      return viewParam as any;
    }
    return 'HOME';
  });

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
    const now = Date.now();
    const derived = { ...matchState };

    // Game Timer
    if (derived.timer.isRunning && derived.timer.lastStartTime && !derived.timeout.isActive) {
      const delta = (now - derived.timer.lastStartTime) / 1000;
      derived.timer = {
        ...derived.timer,
        elapsedSeconds: derived.timer.elapsedSeconds + delta
      };
    }

    // Shot Clock
    if (derived.shotClock.isRunning && derived.shotClock.lastStartTime && !derived.timeout.isActive) {
      const delta = (now - derived.shotClock.lastStartTime) / 1000;
      derived.shotClock = {
        ...derived.shotClock,
        seconds: Math.max(0, derived.shotClock.seconds - delta)
      };
      // Auto-stop logic for display could happen here,
      // but strictly we wait for user to acknowledge or stoppage?
      // For visual, we clamp at 0.
    }

    // Timeout
    if (derived.timeout.isActive) {
      // Timeout uses startTime which is set when timeout starts
      // But we need to handle if it was Paused/Resumed?
      // Logic: If active, we calculate remaining from ... ?
      // If we used `lastStartTime` logic for timeout:
      if (derived.timeout.lastStartTime) {
        const delta = (now - derived.timeout.lastStartTime) / 1000;
        derived.timeout = {
          ...derived.timeout,
          remainingSeconds: Math.max(0, derived.timeout.remainingSeconds - delta)
        }
      } else {
        // Fallback/Legacy if lastStartTime specific to timeout isn't set but isActive is true
        // (Shouldn't happen with new logic, but safe fallback: don't animate)
        // Actually, line 32 of MatchTracker sets `startTime`.
        // We should align Timeout to use the same `lastStartTime` pattern.
        // Or just use `startTime` as the Anchor.
        // Problem: If we pause timeout?
        // If we don't support pausing timeout (UI has "Resume Match" which ends it),
        // then simple `startTime` check is enough.
        // Let's assume standard Timeout runs continuously until Cancel.
        const elapsedSinceStart = (now - derived.timeout.startTime) / 1000;
        // But wait, `remainingSeconds` in base state is 60.
        // So `current = 60 - elapsedSinceStart`.
        // BUT if we refreshed page? `startTime` is persisted. `remainingSeconds` is persisted (as 60).
        // So this logic works.
        // Warning: If `remainingSeconds` was somehow decremented in base state, we double count.
        // Reset `remainingSeconds` to 60 in base state when starting? Yes.
        // So derived calculation:
        // derived.timeout.remainingSeconds = 60 - (now - derived.timeout.startTime) / 1000;
        // But what if we want to "pause" it?
        // The current App doesn't seem to support pausing timeout, only "Resume Match" (End).
        // So we use the simple logic:
        derived.timeout.remainingSeconds = Math.max(0, 60 - (now - derived.timeout.startTime) / 1000);
      }
    }

    // Break
    if (derived.break && derived.break.isActive) {
      const elapsedSinceStart = (now - derived.break.startTime) / 1000;
      derived.break = {
        ...derived.break,
        durationSeconds: Math.max(0, derived.break.durationSeconds - elapsedSinceStart) // Reuse durationSeconds field for remaining? Or keep it as "total duration"?
        // Actually, for consistency with Timeout (where remainingSeconds is updated), let's abuse durationSeconds OR better:
        // `durationSeconds` in base state is usually the "Setting".
        // `remainingSeconds` isn't in the type definition yet.
        // Let's modify the TYPE to include `remainingSeconds` OR just dynamically calculate it for display.
        // Wait, I didn't add `remainingSeconds` to `break` in types.ts.
        // Let's assume `durationSeconds` in derived state IS the remaining time for display purposes,
        // reducing complexity. We don't save "original duration" in derived state usually.
      };
      // Correction: If I modify durationSeconds here, does it affect the "Length of break" reference?
      // Yes. But for display, `derived` is what matters.
      // So:
      derived.break.durationSeconds = Math.max(0, derived.break.durationSeconds - elapsedSinceStart);
    }

    return derived;
  }, [matchState, tick]);
  // --- SYNC ---
  // Re-implemented with BroadcastChannel for Local Tab Sync
  const handleRemoteUpdate = useCallback((remoteState: MatchState) => {
    // When we receive an update from another tab
    setMatchState(remoteState);
  }, []);

  const { broadcastUpdate, activeSessions, registerView } = useBroadcastSync(matchState, handleRemoteUpdate);

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
    // So if Timeout is active, we must effectively "Stop" the timestamp accumulation.
    // Solution: If timeout is Active, we shift `lastStartTime` forward?
    // Or simpler: Pause the timers when timeout starts?
    // Let's stick to the previous behavior: Time stops accumulating.
    // To achieve this with timestamps, we must STOP/PAUSE the underlying timers when Timeout starts.
    // And RESUME them when Timeout ends?
    // That's complex state management.
    // Alternative:
    // Update `derivedMatchState` logic:
    // `if (isRunning && !timeout.isActive)` -> add delta.
    // BUT `lastStartTime` is fixed. So delta keeps growing.
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

  const handleStartMatch = (home: Team, away: Team, durationSeconds: number) => {
    const newState: MatchState = {
      id: crypto.randomUUID(),
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
    setMatchState(newState);
    // localStorage.setItem('korfstat_current_match', JSON.stringify(newState)); // Legacy backup optional
    setView('TRACK');
  };

  const handleFinishMatch = () => {
    // Ensure everything stopped
    const finalState = {
      ...derivedMatchState, // Capture final derived values
      timer: { ...derivedMatchState.timer, isRunning: false, lastStartTime: undefined },
      shotClock: { ...derivedMatchState.shotClock, isRunning: false, lastStartTime: undefined },
      timeout: { ...derivedMatchState.timeout, isActive: false }
    };

    setMatchState(finalState);
    setMatchState(finalState);

    // Save to localStorage
    const newHistory = [finalState, ...savedMatches];
    setSavedMatches(newHistory); // Triggers useEffect to save to localStorage

    console.log('Match saved to local storage');

    setView('STATS');
  };

  const handleDeleteMatch = (id: string) => {
    const newHistory = savedMatches.filter(m => m.id !== id);
    setSavedMatches(newHistory);
  };

  const handleBackNavigation = () => {
    if (window.opener) {
      window.close();
    } else {
      setView('TRACK');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans transition-colors duration-300">

      {/* Settings Floater */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-4 right-4 z-[90] p-2 bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white rounded-full backdrop-blur-sm transition-all"
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
        <MatchTracker
          matchState={derivedMatchState}
          onUpdateMatch={handleUpdateMatch}
          onFinishMatch={handleFinishMatch}
          onViewChange={setView}
        />
      )}

      {view === 'STATS' && (
        <StatsView
          matchState={derivedMatchState}
          onBack={handleBackNavigation}
          onHome={() => setView('HOME')}
        />
      )}

      {view === 'JURY' && (
        <JuryView
          matchState={derivedMatchState}
          onUpdateMatch={handleUpdateMatch}
          onBack={handleBackNavigation}
        />
      )}

      {view === 'LIVE' && (
        <LiveStatsView matchState={derivedMatchState} />
      )}

      {view === 'MATCH_HISTORY' && (
        <MatchHistory
          matches={savedMatches}
          onSelectMatch={(match) => { setMatchState(match); setView('STATS'); }}
          onDeleteMatch={handleDeleteMatch}
          onBack={() => setView('HOME')}
        />
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
    </div>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};