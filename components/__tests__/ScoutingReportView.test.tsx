import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScoutingReportView from '../ScoutingReportView';
import { aggregateTeamData } from '../../services/scoutingService';
import { generateScoutingReport } from '../../services/geminiService';
import { generateScoutingPDF } from '../../services/reportGenerator';

// Mock services
vi.mock('../../services/scoutingService', () => ({
  aggregateTeamData: vi.fn(),
}));

vi.mock('../../services/geminiService', () => ({
  generateScoutingReport: vi.fn(),
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aggregateTeamData).mockReturnValue(mockScoutData as any);
    vi.mocked(generateScoutingReport).mockResolvedValue('Mock AI Analysis Result');
    
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders loading state initially', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);
    expect(screen.getByText(/Aggregating historical patterns/i)).toBeInTheDocument();
  });

  it('renders report data after loading', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);
    
    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());
    
    expect(screen.getByText(mockTeamName)).toBeInTheDocument();
    expect(screen.getByText('Mock AI Analysis Result')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // matches analyzed
    expect(screen.getByText('45%')).toBeInTheDocument(); // efficiency
  });

  it('calls onBack when back button is clicked', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);
    
    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());
    
    const backBtn = screen.getByTestId('arrow-left').parentElement;
    fireEvent.click(backBtn!);
    
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('handles copy to clipboard', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);
    
    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());
    
    const copyBtn = screen.getByText(/Copy Text/i);
    fireEvent.click(copyBtn);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Mock AI Analysis Result');
    expect(screen.getByText(/Copied/i)).toBeInTheDocument();
  });

  it('triggers PDF generation', async () => {
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);
    
    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());
    
    const exportBtn = screen.getByText(/Export PDF/i);
    fireEvent.click(exportBtn);
    
    expect(generateScoutingPDF).toHaveBeenCalledWith(mockScoutData, 'Mock AI Analysis Result');
  });

  it('handles error in report generation', async () => {
    vi.mocked(generateScoutingReport).mockRejectedValue(new Error('AI Fail'));
    
    render(<ScoutingReportView teamName={mockTeamName} allMatches={mockMatches} onBack={mockOnBack} />);
    
    await waitFor(() => expect(screen.queryByText(/Aggregating historical patterns/i)).not.toBeInTheDocument());
    
    expect(screen.getByText(/Failed to generate report/i)).toBeInTheDocument();
  });
});
