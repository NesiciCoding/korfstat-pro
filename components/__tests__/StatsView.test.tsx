import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsView from '../StatsView';
import { MatchState } from '../../types';

// Mock Recharts to avoid heavy rendering
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => null,
}));

vi.mock('../KorfballField', () => ({
  default: () => <div data-testid="korfball-field">Field</div>
}));

describe('StatsView', () => {
  const mockOnBack = vi.fn();
  const mockOnHome = vi.fn();

  const createMockMatchState = (overrides: Partial<MatchState> = {}): MatchState => ({
    id: 'test-match',
    isConfigured: true,
    halfDurationSeconds: 1800,
    homeTeam: {
      id: 'HOME',
      name: 'Home Blazers',
      players: [{ id: '1', name: 'John Doe', number: 10, gender: 'M', initialPosition: 'ATTACK', isStarter: true }],
      color: '#ff0000',
      substitutionCount: 0
    },
    awayTeam: {
      id: 'AWAY',
      name: 'Away Stars',
      players: [{ id: '2', name: 'Jane Smith', number: 20, gender: 'F', initialPosition: 'DEFENSE', isStarter: true }],
      color: '#0000ff',
      substitutionCount: 0
    },
    events: [
      { id: '1', type: 'SHOT', teamId: 'HOME', playerId: '1', timestamp: 100, realTime: Date.now(), half: 1, result: 'GOAL', shotType: 'NEAR', location: { x: 0.5, y: 0.3 } }
    ],
    currentHalf: 1,
    possession: 'HOME',
    timer: { elapsedSeconds: 300, isRunning: false },
    shotClock: { seconds: 25, isRunning: false },
    timeout: { isActive: false, startTime: 0, remainingSeconds: 60 },
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders team names', () => {
    const matchState = createMockMatchState();
    render(<StatsView matchState={matchState} onBack={mockOnBack} onHome={mockOnHome} />);

    expect(screen.getByText('Home Blazers')).toBeInTheDocument();
    expect(screen.getByText('Away Stars')).toBeInTheDocument();
  });

  it('displays back navigation', () => {
    const matchState = createMockMatchState();
    render(<StatsView matchState={matchState} onBack={mockOnBack} />);

    // Back button exists (icon only, no text)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders without errors', () => {
    const matchState = createMockMatchState();
    const { container } = render(<StatsView matchState={matchState} onBack={mockOnBack} />);

    // Component renders successfully
    expect(container).toBeInTheDocument();
  });

  it('renders chart components', () => {
    const matchState = createMockMatchState();
    render(<StatsView matchState={matchState} onBack={mockOnBack} />);

    // Should render mocked line chart
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles empty events gracefully', () => {
    const matchState = createMockMatchState({ events: [] });
    const { container } = render(<StatsView matchState={matchState} onBack={mockOnBack} />);

    // Should not crash
    expect(container).toBeInTheDocument();
  });
});
