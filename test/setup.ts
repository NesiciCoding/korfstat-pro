import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Global Fetch Mock
global.fetch = vi.fn().mockImplementation(() => 
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ localIp: '127.0.0.1' }),
        text: () => Promise.resolve(''),
        blob: () => Promise.resolve(new Blob()),
    })
) as any;

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
            signInWithPassword: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
            signUp: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
    })),
}));

// Mock SyncService
vi.mock('../services/SyncService', () => ({
    syncService: {
        setUserId: vi.fn(),
        syncMatch: vi.fn().mockResolvedValue({}),
        loadMatches: vi.fn().mockResolvedValue([]),
        deleteMatch: vi.fn().mockResolvedValue({}),
    },
    SyncService: vi.fn().mockImplementation(() => ({
        setUserId: vi.fn(),
        syncMatch: vi.fn().mockResolvedValue({}),
        loadMatches: vi.fn().mockResolvedValue([]),
        deleteMatch: vi.fn().mockResolvedValue({}),
    })),
}));

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
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock i18next
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
        changeLanguage: () => Promise.resolve(),
        language: 'en',
    };
    return {
        default: mockI18n,
        t,
        ...mockI18n,
    };
});

// Mock Recharts
vi.mock('recharts', async () => {
    const React = await import('react');
    const OriginalModule = await vi.importActual('recharts') as any;
    
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: any) => React.createElement('div', { className: 'responsive-container' }, children),
        LineChart: ({ children }: any) => React.createElement('div', { className: 'line-chart' }, children),
        BarChart: ({ children }: any) => React.createElement('div', { className: 'bar-chart' }, children),
        PieChart: ({ children }: any) => React.createElement('div', { className: 'pie-chart' }, children),
        XAxis: () => React.createElement('div', { className: 'x-axis' }),
        YAxis: () => React.createElement('div', { className: 'y-axis' }),
        CartesianGrid: () => React.createElement('div', { className: 'cartesian-grid' }),
        Tooltip: () => React.createElement('div', { className: 'tooltip' }),
        Legend: () => React.createElement('div', { className: 'legend' }),
        Line: () => React.createElement('div', { className: 'line' }),
        Bar: () => React.createElement('div', { className: 'bar' }),
        Cell: () => React.createElement('div', { className: 'cell' }),
    };
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
});

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: any) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }),
});
