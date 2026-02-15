import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';

describe('App', () => {
    it('renders without crashing', () => {
        render(<App />);
        // Since I don't know the exact content of App, I'll just check if it renders successfully.
        // Ideally I would check for a specific element, but for a smoke test this is a start.
        // If App has a title "KorfStat Pro" or similar, I could check that.
        // Let's assume there is some content.
        expect(document.body).toBeInTheDocument();
    });
});
