import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScoutingReportView from '../ScoutingReportView';
import { aggregateTeamData } from '../../services/scoutingService';
import { generateScoutingPDF } from '../../services/reportGenerator';

// Mock services
vi.mock('../../services/scoutingService', () => ({
  aggregateTeamData: vi.fn(),
}));

vi.mock('../../services/insightService', () => ({
  generateScoutingReport: vi.fn().mockResolvedValue('Statistical Analysis Result'),
}));

vi.mock('../../services/reportGenerator', () => ({
  generateScoutingPDF: vi.fn(),
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

// Mock lucide icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left" />,
  Brain: () => <div data-testid="brain" />,
  FileText: () => <div data-testid="file-text" />,
  Loader2: () => <div data-testid="loader" />,
  Copy: () => <div data-testid="copy" />,
  Check: () => <div data-testid="check" />,
  Info: () => <div data-testid="info" />,
}));

describe('ScoutingReportView', () => {
  const mockOnBack = vi.fn();
  const mockTeamName = 'Opponent Team';
  const mockMatches: any[] = [];
  const mockScoutData = {
    teamName: mockTeamName,
    matchCount: 3,
    avgGoals: 15.5,
    shootingEfficiency: { total: 45, near: 50, medium: 40, far: 30, penalty: 80, freeThrow: 70, runningIn: 60 },
    rebounds: { avgPerGame: 4.0, total: 12 },
    fouls: { avgPerGame: 3.0, total: 9 },
    momentum: { firstHalfGoals: 10, secondHalfGoals: 8 },
    topPlayers: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aggregateTeamData).mockReturnValue(mockScoutData as any);

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders loading state initially', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);
    expect(screen.getByText(/Aggregating historical patterns/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());
  });

  it('renders report data after loading', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);

    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());

    expect(await screen.findByText(mockTeamName)).toBeInTheDocument();
    expect(await screen.findByText('Statistical Analysis Result')).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(await screen.findByText('45%')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);

    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());

    const backBtn = (await screen.findByTestId('arrow-left')).parentElement;
    fireEvent.click(backBtn!);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('handles copy to clipboard', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);

    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());

    const copyBtn = await screen.findByText(/Copy Text/i);
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Statistical Analysis Result');
    expect(await screen.findByText(/Copied/i)).toBeInTheDocument();
  });

  it('triggers PDF generation', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);

    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());

    const exportBtn = await screen.findByText(/Export PDF/i);
    fireEvent.click(exportBtn);

    expect(generateScoutingPDF).toHaveBeenCalledWith(mockScoutData, 'Statistical Analysis Result');
  });

  it('handles error in report generation', async () => {
    const { generateScoutingReport } = await import('../../services/insightService');
    vi.mocked(generateScoutingReport).mockRejectedValueOnce(new Error('Service Error'));

    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);

    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());

    expect(await screen.findByText(/Failed to generate report/i)).toBeInTheDocument();
  });
});
