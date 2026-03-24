import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../App';

// Mock components with RELATIVE paths
vi.mock('../MatchSetup', () => ({ default: ({ onStartMatch }: any) => <div data-testid="match-setup"><button onClick={() => onStartMatch({ id: 'H', players: [] }, { id: 'A', players: [] })}>Start</button></div> }));
vi.mock('../MatchTracker', () => ({ default: ({ onFinishMatch }: any) => <div data-testid="match-tracker"><button onClick={onFinishMatch}>Finish</button></div> }));
vi.mock('../JuryView', () => ({ default: ({ onBack }: any) => <div data-testid="jury-view"><button onClick={onBack}>Back</button></div> }));
vi.mock('../SettingsModal', () => ({ default: ({ isOpen, onClose }: any) => isOpen ? <div data-testid="settings-modal"><button onClick={onClose}>Close</button></div> : null }));
vi.mock('../ClubManager', () => ({ default: () => <div data-testid="club-manager">Club Manager</div> }));
vi.mock('../SeasonManager', () => ({ default: () => <div data-testid="season-manager">Season Manager</div> }));
vi.mock('../StatsView', () => ({ default: ({ onBack }: any) => <div data-testid="stats-view">Stats View<button onClick={onBack}>Back</button></div> }));
vi.mock('../LiveStatsView', () => ({ default: () => <div data-testid="live-stats-view">Live Stats View</div> }));
vi.mock('../LivestreamView', () => ({ default: () => <div data-testid="livestream-view">Livestream View</div> }));
vi.mock('../StreamOverlay', () => ({ default: () => <div data-testid="stream-overlay">Overlay</div> }));
vi.mock('../DirectorDashboard', () => ({ default: () => <div data-testid="director-dashboard">Director Dashboard</div> }));
vi.mock('../ShotClockView', () => ({ default: () => <div data-testid="shot-clock-view">Shot Clock</div> }));
vi.mock('../SpotterView', () => ({ default: () => <div data-testid="spotter-view">Spotter View</div> }));
vi.mock('../MatchHistory', () => ({ 
    default: ({ matches, onDeleteMatch, onAnalyzeMatch, onBack }: any) => (
        <div data-testid="match-history">
            {matches.map((m: any) => (
                <div key={m.id}>
                    <button onClick={() => onDeleteMatch(m.id)}>Delete {m.id}</button>
                    <button onClick={() => onAnalyzeMatch(m)}>Analyze {m.id}</button>
                </div>
            ))}
            <button onClick={onBack}>Back</button>
        </div>
    )
}));
vi.mock('../MatchAnalysis', () => ({ default: ({ onBack }: any) => <div data-testid="match-analysis"><button onClick={onBack}>Back</button></div> }));
vi.mock('../ShortcutsModal', () => ({ default: ({ isOpen, onClose }: any) => isOpen ? <div data-testid="shortcuts-modal">shortcuts.title<button onClick={onClose}>Close</button></div> : null }));
vi.mock('../OverallStats', () => ({ default: () => <div data-testid="overall-stats">Overall Stats</div> }));
vi.mock('../StrategyPlanner', () => ({ default: () => <div data-testid="strategy-planner">Strategy Planner</div> }));

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(() => Promise.resolve()),
    }
  }
}));

// Mock fetch
global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/matches/active')) {
        return Promise.resolve({ json: () => Promise.resolve([]) });
    }
    if (url.includes('/api/companion/setup-info')) {
        return Promise.resolve({ json: () => Promise.resolve({ localIp: 'localhost' }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
});

// Mock i18next
vi.mock('i18next', () => {
  const i18n: any = {
    use: vi.fn().mockImplementation(() => i18n),
    init: vi.fn(),
    changeLanguage: vi.fn().mockImplementation(() => Promise.resolve()),
    language: 'en',
    t: (key: string) => key,
  };
  return {
    default: i18n,
    ...i18n
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn().mockImplementation(() => Promise.resolve()), language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// Mock LOCAL i18n to prevent real init
vi.mock('../../i18n', () => ({
  default: {
    changeLanguage: vi.fn().mockImplementation(() => Promise.resolve()),
    language: 'en',
    t: (key: string) => key,
  },
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('App Navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.clear();
        // Provide a configured match to allow dashboard access
        const mockMatch = {
            id: 'm1',
            isConfigured: true,
            homeTeam: { id: 'H', name: 'Home', players: [], color: '#f00' },
            awayTeam: { id: 'A', name: 'Away', players: [], color: '#00f' },
            events: [],
            currentHalf: 1,
            timer: { elapsedSeconds: 0, isRunning: false },
            shotClock: { seconds: 25, isRunning: false },
            timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
        };
        localStorage.setItem('korfstat_current_match', JSON.stringify(mockMatch));
    });

    it('renders landing page by default', async () => {
        render(<App />);
        // LandingGateway uses hardcoded text (no i18n)
        expect(await screen.findByText(/The Future of/i)).toBeInTheDocument();
        expect(screen.getByText(/Korfball Analytics/i)).toBeInTheDocument();
    });

    const navigateToDashboard = async () => {
        // LandingGateway hero CTA uses hardcoded text (no i18n)
        const getStartedBtn = await screen.findByText(/Open App Free|Enter Dashboard/i);
        fireEvent.click(getStartedBtn);
        
        // Clicking 'HOME' goes to LoginPage because user is null after auth loading
        const guestBtn = await screen.findByText(/Continue in Offline\/Guest Mode/i);
        fireEvent.click(guestBtn);
    };

    it('navigates through all major views using global home button', async () => {
        render(<App />);
        await navigateToDashboard();
        
        const views = [
            { id: 'nav-club-manager', testId: 'club-manager' },
            { id: 'nav-season-manager', testId: 'season-manager' },
            { id: 'nav-match-history', testId: 'match-history' },
            { id: 'nav-overall-stats', testId: 'overall-stats' },
            { id: 'nav-strategy', testId: 'strategy-planner' },
            { id: 'nav-director', testId: 'director-dashboard' },
            { id: 'nav-spotter', testId: 'spotter-view' },
            { id: 'nav-livestream-stats', testId: 'livestream-view' }
        ];

        for (const view of views) {
            fireEvent.click(await screen.findByTestId(view.id));
            expect(await screen.findByTestId(view.testId)).toBeInTheDocument();
            
            const homeBtn = screen.getByTitle(/Go to Home/i);
            fireEvent.click(homeBtn);
            
            await waitFor(() => {
                expect(screen.getByTestId('start-match-btn')).toBeInTheDocument();
            });
        }
    });

    it('successfully starts a match, finishes it, and returns to stats', async () => {
        localStorage.removeItem('korfstat_current_match');
        render(<App />);
        await navigateToDashboard();
        
        // On discovery screen, click start match
        fireEvent.click(await screen.findByText('home.startNewMatch'));
        
        // Now in setup
        fireEvent.click(await screen.findByText('Start'));
        expect(await screen.findByTestId('match-tracker')).toBeInTheDocument();

        // Finish Match
        fireEvent.click(screen.getByText('Finish'));
        expect(await screen.findByTestId('stats-view')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Back')); // Go back from stats
    });

    it('toggles shortcuts modal with "?" key', async () => {
        render(<App />);
        await navigateToDashboard();
        fireEvent.keyDown(window, { key: '?' });
        expect(await screen.findByTestId('shortcuts-modal')).toBeInTheDocument();
    });

    it('handles match deletion from history', async () => {
        const mockMatch = { 
            id: 'delete-me', 
            isConfigured: true, 
            homeTeam: { name: 'H', players: [], color: '', id: 'H', substitutionCount: 0 }, 
            awayTeam: { name: 'A', players: [], color: '', id: 'A', substitutionCount: 0 }, 
            events: [],
            currentHalf: 1,
            timer: { elapsedSeconds: 0, isRunning: false },
            shotClock: { seconds: 25, isRunning: false },
            timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
        };
        localStorage.setItem('korfstat_matches', JSON.stringify([mockMatch]));
        
        render(<App />);
        await navigateToDashboard();
        fireEvent.click(await screen.findByTestId('nav-match-history'));
        
        const deleteBtn = await screen.findByText('Delete delete-me');
        fireEvent.click(deleteBtn);
        
        expect(screen.queryByText('Delete delete-me')).not.toBeInTheDocument();
    });

    it('handles back navigation to tracker', async () => {
        render(<App />);
        await navigateToDashboard();
        // Since many views go to tracker when match is configured
        // First navigate to tracker
        const resumeBtn = await screen.findByText('home.resumeTracker');
        fireEvent.click(resumeBtn);
        
        // Go back HOME to see the dashboard widgets
        const homeBtn = await screen.findByTitle(/Go to Home/i);
        fireEvent.click(homeBtn);

        fireEvent.click(await screen.findByTestId('nav-jury'));
        const backBtn = await screen.findByText('Back');
        fireEvent.click(backBtn);
        expect(await screen.findByTestId('match-tracker')).toBeInTheDocument();
    });

    it('navigates to match analysis from history', async () => {
        const mockMatch = { 
            id: 'analyze-me', 
            isConfigured: true, 
            homeTeam: { name: 'H', players: [], color: '', id: 'H', substitutionCount: 0 }, 
            awayTeam: { name: 'A', players: [], color: '', id: 'A', substitutionCount: 0 }, 
            events: [],
            currentHalf: 1,
            timer: { elapsedSeconds: 0, isRunning: false },
            shotClock: { seconds: 25, isRunning: false },
            timeout: { isActive: false, startTime: 0, remainingSeconds: 60 }
        };
        localStorage.setItem('korfstat_matches', JSON.stringify([mockMatch]));

        render(<App />);
        await navigateToDashboard();
        fireEvent.click(await screen.findByTestId('nav-match-history'));
        
        const analyzeBtn = await screen.findByText('Analyze analyze-me');
        fireEvent.click(analyzeBtn);
        
        expect(await screen.findByTestId('match-analysis')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Back'));
        expect(await screen.findByTestId('match-history')).toBeInTheDocument();
    });
});
