import React from 'react';
import { render, screen, act } from '@testing-library/react';
import SpectatorVoting from '../SpectatorVoting';
import { MatchState } from '../../types';
import { vi, describe, it, expect } from 'vitest';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    close: vi.fn(),
  })),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SpectatorVoting', () => {
  it('renders loading state when match is null', () => {
    (io as any).mockReturnValue({
        on: vi.fn(),
        emit: vi.fn(),
        close: vi.fn(),
    });
    render(<SpectatorVoting />);
    expect(screen.getByText('Goal of the Match')).toBeInTheDocument();
    expect(screen.getByText(/The match hasn't started yet/)).toBeInTheDocument();
  });

  it('renders players when match-update is received', async () => {
    let socketCallback: any;
    const mockSocket = {
      on: vi.fn((event, cb) => {
        if (event === 'match-update') socketCallback = cb;
      }),
      emit: vi.fn(),
      close: vi.fn(),
    };
    (io as any).mockReturnValue(mockSocket);

    render(<SpectatorVoting />);

    const mockMatch: Partial<MatchState> = {
      isConfigured: true,
      homeTeam: { id: 'HOME', name: 'Home Team', players: [{ id: 'p1', name: 'John Doe', number: 10, gender: 'M', onField: true, initialPosition: 'ATTACK', isStarter: true }], color: '#ff0000', substitutionCount: 0 } as any,
      awayTeam: { id: 'AWAY', name: 'Away Team', players: [], color: '#0000ff', substitutionCount: 0 } as any,
      events: []
    };

    act(() => {
      socketCallback(mockMatch);
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Home Team')).toBeInTheDocument();
  });

  it('handles missing team data gracefully after socket update', () => {
    let socketCallback: any;
    const mockSocket = {
      on: vi.fn((event, cb) => {
        if (event === 'match-update') socketCallback = cb;
      }),
      emit: vi.fn(),
      close: vi.fn(),
    };
    (io as any).mockReturnValue(mockSocket);

    render(<SpectatorVoting />);

    const partialMatch: any = {
      isConfigured: true,
      // Missing homeTeam and awayTeam
      events: []
    };

    act(() => {
      socketCallback(partialMatch);
    });

    expect(screen.getByText('No Players Active')).toBeInTheDocument();
  });
});
