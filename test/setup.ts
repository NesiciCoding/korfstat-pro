import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            if (!options || (Object.keys(options).length === 1 && options.defaultValue)) {
                return key;
            }
            let text = options.defaultValue || key;
            Object.keys(options).forEach(optKey => {
                if (optKey !== 'defaultValue') {
                    text = text.replace(new RegExp(`{{${optKey}}}`, 'g'), options[optKey]);
                }
            });
            return text;
        },
        i18n: {
            changeLanguage: () => Promise.resolve(),
            language: 'en',
        },
    }),
    initReactI18next: {
        type: '3rdParty',
        init: () => { },
    },
}));

vi.mock('i18next', () => {
    const t = (key: string, options?: any) => {
        if (!options || (Object.keys(options).length === 1 && options.defaultValue)) {
            return key;
        }
        let text = options.defaultValue || key;
        Object.keys(options).forEach(optKey => {
            if (optKey !== 'defaultValue') {
                text = text.replace(new RegExp(`{{${optKey}}}`, 'g'), options[optKey]);
            }
        });
        return text;
    };
    const mockI18n = {
        t,
        use: () => mockI18n,
        init: () => Promise.resolve(),
    };
    return {
        default: mockI18n,
        t,
    };
});

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { }, // Deprecated
        removeListener: () => { }, // Deprecated
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }),
});
