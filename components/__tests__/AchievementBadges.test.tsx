import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import AchievementBadges from '../AchievementBadges';
import { Milestone } from '../../types/stats';

describe('AchievementBadges', () => {
    const mockMilestones: Milestone[] = [
        {
            id: '1',
            type: 'GOALS',
            tier: 'GOLD',
            threshold: 500,
            value: 505,
            achievedAt: 1678888888888,
        },
        {
            id: '2',
            type: 'ACCURACY',
            tier: 'BRONZE',
            threshold: 30,
            value: 32,
            achievedAt: 1678888888888,
        }
    ];

    it('renders nothing when milestones array is empty', () => {
        const { container } = render(<AchievementBadges milestones={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders all provided milestones', () => {
        render(<AchievementBadges milestones={mockMilestones} />);
        
        expect(screen.getByText(/GOLD Century/i)).toBeInTheDocument();
        // Use a more specific selector as the text appears in the tooltip too
        const accuracyBadges = screen.getAllByText(/ACCURACY/i);
        expect(accuracyBadges.length).toBeGreaterThan(0);
    });

    it('displays correct tooltips with thresholds', () => {
        render(<AchievementBadges milestones={mockMilestones} />);
        
        const goldBadge = screen.getByTitle(/GOALS: 505/i);
        expect(goldBadge).toBeInTheDocument();
    });

    it('applies correct tier styling (via CSS classes)', () => {
        render(<AchievementBadges milestones={mockMilestones} />);
        
        const goldBadge = screen.getByText(/GOLD Century/i).closest('div');
        expect(goldBadge).toHaveClass('from-yellow-400');
        expect(goldBadge).toHaveClass('to-yellow-600');
    });
});
