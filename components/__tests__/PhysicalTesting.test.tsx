import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PhysicalTesting from '../PhysicalTesting';

// Mock audio API
const mockOscillator = {
    frequency: { value: 0 },
    type: 'sine',
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn()
};
const mockGain = {
    gain: { exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn()
};
const mockAudioContext = {
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn().mockReturnValue(mockOscillator),
    createGain: vi.fn().mockReturnValue(mockGain),
    destination: {},
    currentTime: 0
};
(window as any).AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
(window as any).webkitAudioContext = vi.fn().mockImplementation(() => mockAudioContext);

// Mock SpeechSynthesis
(window as any).speechSynthesis = {
    speak: vi.fn()
};

describe('PhysicalTesting', () => {
    const mockOnBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the header and controls', () => {
        render(<PhysicalTesting onBack={mockOnBack} />);
        expect(screen.getByText('Physical Testing (Beep Test)')).toBeInTheDocument();
        expect(screen.getByText('Start Beep Test')).toBeInTheDocument();
    });

    it('allows adding a participant', () => {
        render(<PhysicalTesting onBack={mockOnBack} />);
        
        const nameInput = screen.getByPlaceholderText('Player Name');
        const numberInput = screen.getByPlaceholderText('#');
        const addButton = screen.getByRole('button', { name: /Add to Roster/i });

        fireEvent.change(numberInput, { target: { value: '10' } });
        fireEvent.change(nameInput, { target: { value: 'Test Player' } });
        fireEvent.click(addButton);

        expect(screen.getByText('Test Player')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('allows giving warnings and eliminating players', () => {
        render(<PhysicalTesting onBack={mockOnBack} />);
        
        // Add player
        fireEvent.change(screen.getByPlaceholderText('Player Name'), { target: { value: 'John Doe' } });
        fireEvent.click(screen.getByRole('button', { name: /Add to Roster/i }));

        const playerCard = screen.getByText('John Doe').closest('button')!;
        
        // 0 warnings initially
        expect(screen.getByText('Running')).toBeInTheDocument();

        // 1 warning
        fireEvent.click(playerCard);
        expect(screen.getByText('1 Warning')).toBeInTheDocument();

        // 2 warnings -> Eliminated
        fireEvent.click(playerCard);
        expect(screen.getByText('Eliminated')).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', () => {
        render(<PhysicalTesting onBack={mockOnBack} />);
        const backBtn = screen.getAllByRole('button')[0]; // First button is usually the back button in header
        fireEvent.click(backBtn);
        expect(mockOnBack).toHaveBeenCalled();
    });
});
