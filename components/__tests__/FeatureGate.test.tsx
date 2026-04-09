import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeatureGate, { FeatureLockBadge, UpgradeBanner } from '../FeatureGate';

// Mock ClubContext so we can control plan/hasFeature per test
const mockHasFeature = vi.fn();
const mockPlan = { current: 'free' as string };

vi.mock('../../contexts/ClubContext', () => ({
  useClub: () => ({
    hasFeature: mockHasFeature,
    plan: mockPlan.current,
    activeClub: null,
    clubId: null,
    role: null,
    isLoading: false,
    refreshClub: vi.fn(),
    setActiveClub: vi.fn(),
  }),
}));

// subscription.ts uses require() inside lowestPlanFor — mock it
vi.mock('../../types/subscription', () => ({
  PLAN_FEATURES: {
    free: ['MATCH_TRACKING', 'BASIC_STATS', 'MATCH_HISTORY'],
    starter: ['MATCH_TRACKING', 'BASIC_STATS', 'MATCH_HISTORY', 'CLOUD_SYNC'],
    pro: ['MATCH_TRACKING', 'BASIC_STATS', 'MATCH_HISTORY', 'CLOUD_SYNC', 'ANALYSIS', 'BROADCASTING'],
    elite: ['MATCH_TRACKING', 'BASIC_STATS', 'MATCH_HISTORY', 'CLOUD_SYNC', 'ANALYSIS', 'BROADCASTING', 'COMPANION'],
  },
  hasFeature: (plan: string, feature: string) => mockHasFeature(feature),
}));

describe('FeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlan.current = 'free';
  });

  it('renders children when feature is available', () => {
    mockHasFeature.mockReturnValue(true);
    render(
      <FeatureGate feature="MATCH_TRACKING">
        <div data-testid="protected-content">Content</div>
      </FeatureGate>
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-gate-lock')).not.toBeInTheDocument();
  });

  it('shows lock overlay when feature is not available (mode=lock)', () => {
    mockHasFeature.mockReturnValue(false);
    render(
      <FeatureGate feature="ANALYSIS" requiredPlan="pro">
        <div data-testid="protected-content">Premium Content</div>
      </FeatureGate>
    );
    expect(screen.getByTestId('feature-gate-lock')).toBeInTheDocument();
    expect(screen.getByText(/Pro plan required/i)).toBeInTheDocument();
    // Content is rendered but blurred (aria-hidden)
    expect(screen.getByText('Premium Content')).toBeInTheDocument();
  });

  it('hides children when mode=hide and feature unavailable', () => {
    mockHasFeature.mockReturnValue(false);
    render(
      <FeatureGate feature="ANALYSIS" mode="hide">
        <div data-testid="protected-content">Hidden</div>
      </FeatureGate>
    );
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feature-gate-lock')).not.toBeInTheDocument();
  });

  it('renders custom fallback when provided and feature unavailable', () => {
    mockHasFeature.mockReturnValue(false);
    render(
      <FeatureGate feature="ANALYSIS" fallback={<div data-testid="custom-fallback">Upgrade!</div>}>
        <div data-testid="protected-content">Premium</div>
      </FeatureGate>
    );
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows upgrade nudge text when plan is below required', () => {
    mockHasFeature.mockReturnValue(false);
    mockPlan.current = 'free';
    render(
      <FeatureGate feature="BROADCASTING" requiredPlan="pro">
        <div>Broadcaster</div>
      </FeatureGate>
    );
    expect(screen.getByText(/upgrade to unlock/i)).toBeInTheDocument();
  });
});

describe('FeatureLockBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when feature is available', () => {
    mockHasFeature.mockReturnValue(true);
    const { container } = render(<FeatureLockBadge feature="MATCH_TRACKING" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders lock badge when feature is unavailable', () => {
    mockHasFeature.mockReturnValue(false);
    render(<FeatureLockBadge feature="ANALYSIS" />);
    expect(screen.getByTestId('feature-lock-badge')).toBeInTheDocument();
  });
});

describe('UpgradeBanner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when feature is available', () => {
    mockHasFeature.mockReturnValue(true);
    const { container } = render(<UpgradeBanner feature="MATCH_TRACKING" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders upgrade banner when feature is unavailable', () => {
    mockHasFeature.mockReturnValue(false);
    mockPlan.current = 'free';
    render(<UpgradeBanner feature="ANALYSIS" />);
    expect(screen.getByTestId('upgrade-banner')).toBeInTheDocument();
    expect(screen.getByText(/free/i)).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    mockHasFeature.mockReturnValue(false);
    render(<UpgradeBanner feature="ANALYSIS" message="Go Pro to access AI analysis" />);
    expect(screen.getByText('Go Pro to access AI analysis')).toBeInTheDocument();
  });
});
