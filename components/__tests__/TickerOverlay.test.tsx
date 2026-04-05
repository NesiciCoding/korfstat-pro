import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TickerOverlay from '../TickerOverlay';

// Mock Socket.io-client
const mockSocketOn = vi.fn();
const mockSocketEmit = vi.fn();
const mockSocketDisconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: mockSocketOn,
    emit: mockSocketEmit,
    disconnect: mockSocketDisconnect,
  }),
}));

describe('TickerOverlay', () => {
  const mockTickerData = {
    homeTeam: { name: 'Royals', color: '#ff0000', score: 10 },
    awayTeam: { name: 'Wolves', color: '#0000ff', score: 8 },
    timer: { display: '12:34', isRunning: true, remaining: 754 },
    period: 1,
    shotClock: 14
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Define origin and search before render
    const location = {
      origin: 'http://localhost',
      search: '?theme=modern&sc=true'
    };
    Object.defineProperty(window, 'location', {
      value: location,
      writable: true,
      configurable: true
    });

    global.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTickerData)
      })
    );
  });

  it('should render the team names and scores from initial fetch', async () => {
    render(<TickerOverlay />);
    
    const connectCallback = mockSocketOn.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectCallback) connectCallback();
    
    await waitFor(() => {
      expect(screen.getByText('Royals')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Wolves')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('should update the UI when receiving ticker-update from socket', async () => {
    render(<TickerOverlay />);
    
    const connectCallback = mockSocketOn.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectCallback) connectCallback();

    await waitFor(() => {
      expect(screen.getByText('Royals')).toBeInTheDocument();
    });
    
    // Find the ticker-update registration
    const updateCallback = mockSocketOn.mock.calls.find(call => call[0] === 'ticker-update')[1];
    
    const updatedData = { ...mockTickerData, homeTeam: { ...mockTickerData.homeTeam, score: 11 } };
    updateCallback(updatedData);

    await waitFor(() => {
      expect(screen.getByText('11')).toBeInTheDocument();
    });
  });

  it('should show the shot clock if the sc parameter is true', async () => {
    render(<TickerOverlay />);
    
    const connectCallback = mockSocketOn.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectCallback) connectCallback();

    await waitFor(() => {
      expect(screen.getByText('14')).toBeInTheDocument();
    });
  });

  it('should hide the shot clock if the sc parameter is false', async () => {
    window.location.search = '?theme=modern&sc=false';
    render(<TickerOverlay />);
    
    const connectCallback = mockSocketOn.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectCallback) connectCallback();

    await waitFor(() => {
      expect(screen.queryByText('14')).not.toBeInTheDocument(); // Expect not to find it, but wait for data first
      // Better: Wait for Royals to be in the document (data loaded), then assert no '14'
      expect(screen.getByText('Royals')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('14')).not.toBeInTheDocument();
  });

  it('should show disconnect warning when socket is down', async () => {
    render(<TickerOverlay />);
    
    const connectCallback = mockSocketOn.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectCallback) connectCallback();

    await waitFor(() => {
      expect(screen.getByText('Royals')).toBeInTheDocument();
    });

    // Trigger disconnect callback
    const disconnectCallback = mockSocketOn.mock.calls.find(call => call[0] === 'disconnect')?.[1];
    if (disconnectCallback) disconnectCallback();

    await waitFor(() => {
      expect(screen.getByText(/Disconnected from Server/i)).toBeInTheDocument();
    });
  });
});
