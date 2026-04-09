import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClubSettingsPanel from '../ClubSettingsPanel';

// Supabase mock already provided globally via test/setup.ts

const mockRefreshClub = vi.fn();
const mockClub = {
  id: 'club-uuid-1234-5678-abcd',
  name: 'Test Korfball Club',
  shortName: 'TKC',
  primaryColor: '#4f46e5',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  role: 'owner' as const,
  subscription: null,
};

vi.mock('../../contexts/ClubContext', () => ({
  useClub: vi.fn(() => ({
    activeClub: mockClub,
    role: 'owner',
    plan: 'free',
    isLoading: false,
    refreshClub: mockRefreshClub,
    setActiveClub: vi.fn(),
    hasFeature: vi.fn(() => true),
    clubId: mockClub.id,
  })),
}));

import { useClub } from '../../contexts/ClubContext';

describe('ClubSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default club mock
    vi.mocked(useClub).mockReturnValue({
      activeClub: mockClub,
      role: 'owner',
      plan: 'free',
      isLoading: false,
      refreshClub: mockRefreshClub,
      setActiveClub: vi.fn(),
      hasFeature: vi.fn(() => true),
      clubId: mockClub.id,
    });
  });

  it('shows no-club message when activeClub is null', () => {
    vi.mocked(useClub).mockReturnValue({
      activeClub: null,
      role: null,
      plan: 'free',
      isLoading: false,
      refreshClub: mockRefreshClub,
      setActiveClub: vi.fn(),
      hasFeature: vi.fn(),
      clubId: null,
    });
    render(<ClubSettingsPanel />);
    expect(screen.getByTestId('club-settings-no-club')).toBeInTheDocument();
  });

  it('renders club name and color swatch', () => {
    render(<ClubSettingsPanel />);
    expect(screen.getByTestId('club-name')).toHaveTextContent('Test Korfball Club');
    expect(screen.getByTestId('club-color-swatch')).toBeInTheDocument();
  });

  it('displays the club ID', () => {
    render(<ClubSettingsPanel />);
    expect(screen.getByTestId('club-id-display')).toHaveTextContent('club-uuid-1234-5678-abcd');
  });

  it('copies club ID to clipboard when copy button clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ClubSettingsPanel />);
    fireEvent.click(screen.getByTestId('copy-club-id-btn'));

    expect(writeText).toHaveBeenCalledWith('club-uuid-1234-5678-abcd');
    await waitFor(() => expect(screen.getByText('Copied!')).toBeInTheDocument());
  });

  it('shows edit button for owner and allows editing club name', async () => {
    const mockUpdate = vi.fn().mockReturnValue({ error: null });
    const { supabase } = await import('../../lib/supabase');
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: mockUpdate }),
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
    } as any);

    render(<ClubSettingsPanel />);
    fireEvent.click(screen.getByTestId('edit-club-name-btn'));

    const input = screen.getByTestId('edit-club-name-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Test Korfball Club');

    fireEvent.change(input, { target: { value: 'New Club Name' } });
    expect(input).toHaveValue('New Club Name');
  });

  it('hides edit button for non-owner/admin roles', () => {
    vi.mocked(useClub).mockReturnValue({
      activeClub: mockClub,
      role: 'scorer',
      plan: 'free',
      isLoading: false,
      refreshClub: mockRefreshClub,
      setActiveClub: vi.fn(),
      hasFeature: vi.fn(() => true),
      clubId: mockClub.id,
    });
    render(<ClubSettingsPanel />);
    expect(screen.queryByTestId('edit-club-name-btn')).not.toBeInTheDocument();
  });

  it('shows upgrade button when on free plan', () => {
    render(<ClubSettingsPanel />);
    expect(screen.getByTestId('upgrade-plan-btn')).toBeInTheDocument();
  });

  it('hides upgrade button when on elite plan', () => {
    vi.mocked(useClub).mockReturnValue({
      activeClub: { ...mockClub, subscription: { id: 's1', clubId: 'club-uuid-1234-5678-abcd', plan: 'elite', status: 'active' } },
      role: 'owner',
      plan: 'elite',
      isLoading: false,
      refreshClub: mockRefreshClub,
      setActiveClub: vi.fn(),
      hasFeature: vi.fn(() => true),
      clubId: mockClub.id,
    });
    render(<ClubSettingsPanel />);
    expect(screen.queryByTestId('upgrade-plan-btn')).not.toBeInTheDocument();
  });

  it('shows members loading state', async () => {
    const { supabase } = await import('../../lib/supabase');
    // Make the members query hang
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
        }),
      }),
    } as any);

    render(<ClubSettingsPanel />);
    expect(screen.getByTestId('members-loading')).toBeInTheDocument();
  });

  it('shows members list when loaded', async () => {
    const mockMembers = [
      { id: 'mem-1', user_id: 'user-aaa', role: 'owner', created_at: '2026-01-01' },
      { id: 'mem-2', user_id: 'user-bbb', role: 'scorer', created_at: '2026-01-02' },
    ];
    const { supabase } = await import('../../lib/supabase');
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
        }),
      }),
    } as any);

    render(<ClubSettingsPanel />);
    await waitFor(() => expect(screen.getByTestId('member-row-mem-1')).toBeInTheDocument());
    expect(screen.getByTestId('member-row-mem-2')).toBeInTheDocument();
    // Can't remove owner
    expect(screen.queryByTestId('remove-member-mem-1')).not.toBeInTheDocument();
    // Can remove scorer
    expect(screen.getByTestId('remove-member-mem-2')).toBeInTheDocument();
  });

  it('shows refresh button for members', () => {
    render(<ClubSettingsPanel />);
    expect(screen.getByTestId('refresh-members-btn')).toBeInTheDocument();
  });
});
