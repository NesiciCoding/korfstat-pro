import React, { useState, useEffect, useRef } from 'react';
import HomePage from './components/HomePage';
import MatchSetup from './components/MatchSetup';
import MatchTracker from './components/MatchTracker';
import StatsView from './components/StatsView';
import JuryView from './components/JuryView';
import LiveStatsView from './components/LiveStatsView';
import MatchHistory from './components/MatchHistory';
import OverallStats from './components/OverallStats';
import StrategyPlanner from './components/StrategyPlanner';
import { MatchState, Team } from './types';

function App() {
  const lastUpdateRef = useRef<number>(Date.now());


  // Initialize view from URL parameter if present
  const [view, setView] = useState<'HOME' | 'SETUP' | 'TRACK' | 'STATS' | 'JURY' | 'LIVE' | 'MATCH_HISTORY' | 'OVERALL_STATS' | 'STRATEGY'>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const validViews = ['HOME', 'SETUP', 'TRACK', 'STATS', 'JURY', 'LIVE', 'MATCH_HISTORY', 'OVERALL_STATS', 'STRATEGY'];
    if (viewParam && validViews.includes(viewParam)) {
      return viewParam as any;
    }
    return 'HOME';
  });

  // Initialize matchState from localStorage to ensure synchronization and persistence
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

  const [savedMatches, setSavedMatches] = useState<MatchState[]>([]);

  // Load match history
  useEffect(() => {
    const saved = localStorage.getItem('korfstat_matches');
    if (saved) {
      try {
        setSavedMatches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load matches", e);
      }
    }
  }, []);

  // Sync refs with state when state changes meaningfully (e.g. manual edits/loading)
  // We only sync if the difference is large (implied manual change) to avoid overwriting micro-progress
  // ACTUALLY: We need to detect manual edits efficiently.

  // Ref to hold the latest matchState for the loop to access without dependencies
  const matchStateRef = useRef(matchState);
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  // Refs for "Physics Time"
  const accumulatedTimeRef = useRef<number>(0);
  const shotClockTimeRef = useRef<number>(0);
  const timeoutTimeRef = useRef<number>(0);

  // We need to detect "External Resets" (e.g. user presses Reset Shot Clock).
  // Strategy: Store the "Last Committed State Time". If the current matchState time differs 
  // significantly from what we last committed, it's an external edit -> Sync Ref.
  const lastCommittedElapsed = useRef<number>(matchState.timer.elapsedSeconds);
  const lastCommittedShot = useRef<number>(matchState.shotClock.seconds);
  const lastCommittedTimeout = useRef<number>(matchState.timeout.remainingSeconds);

  // Initial Sync on Mount
  useEffect(() => {
    accumulatedTimeRef.current = matchState.timer.elapsedSeconds;
    shotClockTimeRef.current = matchState.shotClock.seconds;
    timeoutTimeRef.current = matchState.timeout.remainingSeconds;
  }, []); // Only on mount. Subsequent syncs happen via mismatch detection in loop.

  // PERSISTENCE: Write state to localStorage on change
  useEffect(() => {
    if (matchState.isConfigured) {
      const json = JSON.stringify(matchState);
      if (localStorage.getItem('korfstat_current_match') !== json) {
        localStorage.setItem('korfstat_current_match', json);
      }
    }
  }, [matchState]);

  // PERSISTENCE: Listen for changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'korfstat_current_match') {
        if (e.newValue) {
          try {
            const newState = JSON.parse(e.newValue);
            // Update local state without triggering an immediate re-broadcast if possible
            setMatchState(newState);
          } catch (err) {
            console.error("Error parsing synced state", err);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastFrameTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const deltaMs = now - lastFrameTime;
      const deltaSec = deltaMs / 1000;
      lastFrameTime = now;

      // Access latest state via Ref
      const current = matchStateRef.current;

      // EXTERNAL EDIT DETECTION
      // If the current state differs from what we last committed (and it's not just floating point drift), 
      // assume external edit and snap physics ref to it.
      if (Math.abs(current.timer.elapsedSeconds - lastCommittedElapsed.current) > 0.1) {
        accumulatedTimeRef.current = current.timer.elapsedSeconds;
        lastCommittedElapsed.current = current.timer.elapsedSeconds;
      }
      if (Math.abs(current.shotClock.seconds - lastCommittedShot.current) > 0.1) {
        shotClockTimeRef.current = current.shotClock.seconds;
        lastCommittedShot.current = current.shotClock.seconds;
      }
      if (Math.abs(current.timeout.remainingSeconds - lastCommittedTimeout.current) > 0.1) {
        timeoutTimeRef.current = current.timeout.remainingSeconds;
        lastCommittedTimeout.current = current.timeout.remainingSeconds;
      }

      let shouldUpdate = false;
      let newElapsedState = accumulatedTimeRef.current;
      let newShotClockState = shotClockTimeRef.current;
      let newTimeoutState = timeoutTimeRef.current;

      // Game Clock Update
      if (current.timer.isRunning && !current.timeout.isActive) {
        accumulatedTimeRef.current += deltaSec;
        newElapsedState = accumulatedTimeRef.current;
      }

      // Shot Clock Update (DECOUPLED from Timer Running)
      // User requested "Make sure they are separated".
      // We process physics for Shot Clock if IT is running, regardless of Game Clock.
      if (current.shotClock.isRunning && !current.timeout.isActive) {
        // Shot clock counts DOWN
        shotClockTimeRef.current = Math.max(0, shotClockTimeRef.current - deltaSec);
        newShotClockState = shotClockTimeRef.current;
      }

      // Timeout Clock
      if (current.timeout.isActive) {
        timeoutTimeRef.current = Math.max(0, timeoutTimeRef.current - deltaSec);
        newTimeoutState = timeoutTimeRef.current;
      }

      // CHECK FOR VISUAL UPDATES
      // Game Clock Visibility
      const dispElapsed = Math.floor(newElapsedState);
      const currElapsedDisp = Math.floor(current.timer.elapsedSeconds);
      if (dispElapsed !== currElapsedDisp) shouldUpdate = true;

      // Shot Clock Visibility
      const dispShot = Math.ceil(newShotClockState);
      const currShotDisp = Math.ceil(current.shotClock.seconds);
      if (dispShot !== currShotDisp || (newShotClockState === 0 && current.shotClock.seconds !== 0)) shouldUpdate = true;

      // Timeout Visibility
      const dispTimeout = Math.ceil(newTimeoutState);
      const currTimeoutDisp = Math.ceil(current.timeout.remainingSeconds);
      if (dispTimeout !== currTimeoutDisp || (newTimeoutState === 0 && current.timeout.isActive)) shouldUpdate = true;

      if (shouldUpdate) {
        setMatchState(prev => {
          const next = { ...prev };
          // Verify running states didn't change in micro-time (unlikely with single thread JS but good practice)
          // We just commit the Physics Times.

          if (prev.timer.isRunning && !prev.timeout.isActive) {
            next.timer = { ...prev.timer, elapsedSeconds: newElapsedState };
          }
          if (prev.shotClock.isRunning && !prev.timeout.isActive) {
            next.shotClock = {
              ...prev.shotClock,
              seconds: newShotClockState,
              isRunning: newShotClockState > 0
            };
          }
          if (prev.timeout.isActive) {
            next.timeout = {
              ...prev.timeout,
              remainingSeconds: newTimeoutState,
              isActive: newTimeoutState > 0
            };
          }

          // Update Last Committed trackers to prevent loop looking like external edit next frame
          // Note: We update refs to 'new' values here? No, refs are updated in outer scope.
          // We need to update the `lastCommitted` refs to match THIS update.
          // But we can't update refs cleanly inside setState updater if we want 100% purity.
          // However, separating it causes the "External Edit" check to fail next frame.
          // Safe approach: Update `lastCommitted` refs here immediately? 
          // Or update them AFTER setMatchState? 
          // Loop continues... next frame checks `current` (which is `next` from here).
          // `current` will match `newElapsedState`.
          // `lastCommitted` must match `newElapsedState`.
          // So we must update `lastCommitted` logic.
          return next;
        });

        // Optimistically update committed trackers to what we JUST sent to state.
        // This assumes the state update processes synchronously enough or we don't care about 1 frame race.
        lastCommittedElapsed.current = newElapsedState;
        lastCommittedShot.current = newShotClockState;
        lastCommittedTimeout.current = newTimeoutState;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    // Start loop if ANYTHING is running. 
    // We check Ref to avoid restarting effect constantly.
    // Actually, we just want the loop running if active.
    // Dependency: [timer.isRunning, shotClock.isRunning, ...].
    // If we remove dependencies, loop runs ONCE.
    // But if we stop everything, we want to stop RAF to save battery.
    // So we KEEP dependencies.
    // BUT we made `matchState` access robust via Ref.
    // AND we handle "External Resets" via `lastCommitted` check.
    // So dependencies restarting the effect is FINE now. It restarts, `accumulated` is preserved?
    // Wait, if effect restarts, `accumulatedTimeRef` persists (Component Ref).
    // `loop` closure is recreated. 
    // `lastFrameTime` resets to `Date.now()`.
    // Logic: `deltaMs = now - lastFrameTime`. 
    // If effect restarts, `lastFrameTime` is `Date.now()`. Delta is 0.
    // This is FINE. We just miss one frame of motion during toggle, which is <16ms.
    // Acceptable.

    if (matchState.timer.isRunning || matchState.shotClock.isRunning || matchState.timeout.isActive) {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [matchState.timer.isRunning, matchState.shotClock.isRunning, matchState.timeout.isActive]);


  const handleStartMatch = (home: Team, away: Team) => {
    const newState: MatchState = {
      id: crypto.randomUUID(),
      date: Date.now(),
      isConfigured: true,
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
    localStorage.setItem('korfstat_current_match', JSON.stringify(newState));
    setView('TRACK');
  };

  const handleFinishMatch = () => {
    const finalState = {
      ...matchState,
      timer: { ...matchState.timer, isRunning: false },
      shotClock: { ...matchState.shotClock, isRunning: false }
    };

    setMatchState(finalState);
    const newHistory = [...savedMatches, finalState];
    setSavedMatches(newHistory);
    localStorage.setItem('korfstat_matches', JSON.stringify(newHistory));
    localStorage.removeItem('korfstat_current_match');

    setView('STATS');
  };

  const handleDeleteMatch = (id: string) => {
    const newHistory = savedMatches.filter(m => m.id !== id);
    setSavedMatches(newHistory);
    localStorage.setItem('korfstat_matches', JSON.stringify(newHistory));
  };

  const handleBackNavigation = () => {
    if (window.opener) {
      window.close();
    } else {
      setView('TRACK');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">

      {view === 'HOME' && (
        <HomePage onNavigate={setView} />
      )}

      {view === 'SETUP' && (
        <MatchSetup onStartMatch={handleStartMatch} />
      )}

      {view === 'TRACK' && (
        <MatchTracker
          matchState={matchState}
          onUpdateMatch={setMatchState}
          onFinishMatch={handleFinishMatch}
          onViewChange={setView}
        />
      )}

      {view === 'STATS' && (
        <StatsView
          matchState={matchState}
          onBack={handleBackNavigation}
          onHome={() => setView('HOME')}
        />
      )}

      {view === 'JURY' && (
        <JuryView
          matchState={matchState}
          onUpdateMatch={setMatchState}
          onBack={handleBackNavigation}
        />
      )}

      {view === 'LIVE' && (
        <LiveStatsView matchState={matchState} />
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
    </div>
  );
}

export default App;