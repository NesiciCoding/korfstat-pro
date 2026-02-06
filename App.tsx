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

  // Global Timer Logic - High frequency (200ms = 5 updates per second)
  useEffect(() => {
    let interval: any;
    lastUpdateRef.current = Date.now();

    const tick = () => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      const deltaSec = deltaMs / 1000;
      lastUpdateRef.current = now;

      setMatchState(prev => {
        let newState = { ...prev };
        let stateChanged = false;

        // Game Clock & Shot Clock
        if (prev.timer.isRunning && !prev.timeout.isActive) {
          newState.timer = { 
            ...prev.timer, 
            elapsedSeconds: prev.timer.elapsedSeconds + deltaSec 
          };
          
          if (prev.shotClock.isRunning) {
            const nextShotClock = Math.max(0, prev.shotClock.seconds - deltaSec);
            newState.shotClock = { 
              ...prev.shotClock, 
              seconds: nextShotClock,
              isRunning: nextShotClock > 0
            };
          }
          stateChanged = true;
        } 
        
        // Timeout Clock
        if (prev.timeout.isActive) {
          const nextRemaining = Math.max(0, prev.timeout.remainingSeconds - deltaSec);
          newState.timeout = { 
            ...prev.timeout, 
            remainingSeconds: nextRemaining,
            isActive: nextRemaining > 0
          };
          stateChanged = true;
        }

        return stateChanged ? newState : prev;
      });
    };

    interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [matchState.timer.isRunning, matchState.timeout.isActive, matchState.shotClock.isRunning]);


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