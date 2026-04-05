import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import TrainingManager from '../TrainingManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('TrainingManager', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render the session list initially', () => {
    renderWithProviders(<TrainingManager onBack={mockOnBack} />);
    // There are elements with "Training" text, but only one "New Session"
    expect(screen.getByText('training.newSession')).toBeDefined();
  });

  it('should navigate through the "New Session" wizard', async () => {
    renderWithProviders(<TrainingManager onBack={mockOnBack} />);
    
    // 1. Click New Session
    fireEvent.click(screen.getByText('training.newSession'));
    expect(screen.getByText('training.setupTitle')).toBeDefined();

    // 2. Enter Location and Continue
    const locationInput = screen.getByPlaceholderText(/e.g. Training Hall A/i);
    fireEvent.change(locationInput, { target: { value: 'Main Gym' } });
    fireEvent.click(screen.getByText('common.nextStep'));

    // 3. Attendance Step
    expect(screen.getByText('training.attendance')).toBeDefined();
    
    // Select Player 1 (from defaultHomePlayers)
    const player1 = await screen.findByText(/Player 1/i);
    fireEvent.click(player1);
    
    const nextBtn = screen.getByText('common.nextStep');
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(nextBtn);
    
    // 4. Drill Selection
    expect(screen.getByText('training.drillLibrary')).toBeDefined();
    // Drill names are from DRILL_LIBRARY (e.g. "50 Shots (Short)")
    const shootingDrill = screen.getByText(/50 Shots \(Short\)/i);
    fireEvent.click(shootingDrill);
    fireEvent.click(screen.getByText('common.nextStep'));
    
    // 5. Data Entry
    expect(screen.getByText('training.dataEntry')).toBeDefined();
    const input = screen.getByPlaceholderText('40');
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.click(screen.getByText('common.finish'));
    
    // 6. Summary
    expect(screen.getByText('training.sessionComplete')).toBeDefined();
    fireEvent.click(screen.getByText('training.saveSession'));
    
    // Final: Back to list
    expect(screen.getByText('training.newSession')).toBeDefined();
    expect(screen.getByText(/Main Gym/i)).toBeDefined();
  });

  it('should call onBack when clicking back from list', () => {
    renderWithProviders(<TrainingManager onBack={mockOnBack} />);
    fireEvent.click(screen.getByText('common.back'));
    expect(mockOnBack).toHaveBeenCalled();
  });
});
