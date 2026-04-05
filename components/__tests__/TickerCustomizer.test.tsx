import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TickerCustomizer from '../TickerCustomizer';
import { useTranslation } from 'react-i18next';

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TickerCustomizer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock global fetch for match detection
        global.fetch = vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue([{ id: 'test-match-123' }])
        });
    });

    it('should generate the correct URL based on theme selection', async () => {
        render(<TickerCustomizer />);
        
        // Wait for the input to appear and matchId to be set
        const input = await screen.findByDisplayValue(new RegExp('/ticker', 'i'));
        
        // Simulate clicking Minimal theme
        const minimalBtn = screen.getByText(/Minimal/i);
        fireEvent.click(minimalBtn);

        await waitFor(() => {
            expect(screen.getByDisplayValue(/theme=minimal/)).toBeInTheDocument();
        });
        
        // Check for matchId if we mocked it successfully
        expect(screen.getByDisplayValue(/matchId=test-match-123/)).toBeInTheDocument();
    });

    it('should toggle the shot clock parameter in the URL', async () => {
        render(<TickerCustomizer />);
        
        const toggleSwitch = screen.getByTestId('shot-clock-toggle');
        
        fireEvent.click(toggleSwitch);
        await waitFor(() => {
            expect(screen.getByDisplayValue(/sc=false/)).toBeInTheDocument();
        });
    });

    it('should copy the URL to clipboard when requested', async () => {
        const mockClipboard = {
            writeText: vi.fn().mockResolvedValue(undefined),
        };
        Object.assign(navigator, { clipboard: mockClipboard });

        render(<TickerCustomizer />);
        
        const copyBtn = screen.getByText(/Copy URL/i);
        fireEvent.click(copyBtn);

        expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/ticker'));
        expect(screen.getByText(/Copied/i)).toBeInTheDocument();
    });
});
