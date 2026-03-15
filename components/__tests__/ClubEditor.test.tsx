import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClubEditor from '../ClubEditor';
import { ClubService } from '../../services/clubService';
import { calculateCareerStats } from '../../utils/statsCalculator';

// Mock translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => options?.count !== undefined ? `${key}_${options.count}` : key
    })
}));

// Mock services and utils
vi.mock('../../services/clubService', () => ({
    ClubService: {
        saveClub: vi.fn()
    }
}));

vi.mock('../../utils/statsCalculator', () => ({
    calculateCareerStats: vi.fn()
}));

// Mock PlayerProfile component
vi.mock('../PlayerProfile', () => ({
    default: ({ player, onClose }: any) => (
        <div data-testid="player-profile">
            <span>Profile for {player.firstName}</span>
            <button onClick={onClose}>Close Profile</button>
        </div>
    )
}));

describe('ClubEditor', () => {
    const mockClub = {
        id: 'c1',
        name: 'Test Club',
        shortName: 'TC',
        primaryColor: '#ff0000',
        secondaryColor: '#0000ff',
        players: [
            { id: 'p1', firstName: 'John', lastName: 'Doe', gender: 'M', active: true, positions: ['ATTACK'] }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const mockOnBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(calculateCareerStats).mockReturnValue({ goals: 5, matchesPlayed: 10 } as any);
        // Mock crypto.randomUUID
        global.crypto.randomUUID = vi.fn().mockReturnValue('new-uuid');
    });

    it('renders club details correctly', () => {
        render(<ClubEditor club={mockClub as any} onBack={mockOnBack} />);

        expect(screen.getByText('clubManager.editClub')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Club')).toBeInTheDocument();
        expect(screen.getByDisplayValue('TC')).toBeInTheDocument();
        // Check colors (inputs with type color)
        const colorInputs = screen.getAllByRole('textbox').filter(input => (input as HTMLInputElement).value.startsWith('#'));
        expect(colorInputs).toHaveLength(2);
    });

    it('updates club basic information', () => {
        render(<ClubEditor club={mockClub as any} onBack={mockOnBack} />);

        const nameInput = screen.getByDisplayValue('Test Club');
        fireEvent.change(nameInput, { target: { value: 'Updated Club Name' } });
        expect(nameInput).toHaveValue('Updated Club Name');

        const shortNameInput = screen.getByDisplayValue('TC');
        fireEvent.change(shortNameInput, { target: { value: 'NEW' } });
        expect(shortNameInput).toHaveValue('NEW');
    });

    it('handles adding a new player', () => {
        render(<ClubEditor club={mockClub as any} onBack={mockOnBack} />);

        const addBtn = screen.getByText('clubManager.addPlayer');
        fireEvent.click(addBtn);

        // Check if new player fields appear
        const firstNameInputs = screen.getAllByPlaceholderText('clubManager.firstName');
        expect(firstNameInputs).toHaveLength(2); // Initial + New
    });

    it('handles removing a player', () => {
        render(<ClubEditor club={mockClub as any} onBack={mockOnBack} />);

        const removeBtns = screen.getAllByRole('button').filter(btn => btn.querySelector('svg')?.classList.contains('lucide-trash2'));
        fireEvent.click(removeBtns[0]);

        const firstNameInputs = screen.queryAllByPlaceholderText('clubManager.firstName');
        expect(firstNameInputs).toHaveLength(0);
    });

    it('updates player details', () => {
        render(<ClubEditor club={mockClub as any} onBack={mockOnBack} />);

        const firstNameInput = screen.getByPlaceholderText('clubManager.firstName');
        fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
        expect(firstNameInput).toHaveValue('Jane');

        const genderSelect = screen.getByRole('combobox');
        fireEvent.change(genderSelect, { target: { value: 'F' } });
        expect(genderSelect).toHaveValue('F');

        const shirtNumberInput = screen.getByPlaceholderText('#');
        fireEvent.change(shirtNumberInput, { target: { value: '10' } });
        expect(shirtNumberInput).toHaveValue(10);
    });

    it('opens player profile when stats section is clicked', () => {
        render(<ClubEditor club={mockClub as any} onBack={mockOnBack} />);

        const statsSection = screen.getByText('5 G').parentElement;
        fireEvent.click(statsSection!);

        expect(screen.getByTestId('player-profile')).toBeInTheDocument();
        expect(screen.getByText('Profile for John')).toBeInTheDocument();

        // Close profile
        fireEvent.click(screen.getByText('Close Profile'));
        expect(screen.queryByTestId('player-profile')).not.toBeInTheDocument();
    });

    it('calls ClubService.saveClub and onBack when saving', () => {
        render(<ClubEditor club={mockClub as any} onBack={mockOnBack} />);

        const saveBtn = screen.getByText('clubManager.saveChanges');
        fireEvent.click(saveBtn);

        expect(ClubService.saveClub).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Test Club',
            shortName: 'TC'
        }));
        expect(mockOnBack).toHaveBeenCalled();
    });

    it('calls onBack when back button is clicked', () => {
        render(<ClubEditor club={mockClub as any} onBack={mockOnBack} />);

        const backBtn = screen.getAllByRole('button')[0]; // First button is usually the back button
        fireEvent.click(backBtn);

        expect(mockOnBack).toHaveBeenCalled();
    });
});
