import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';
import { useDialog } from '../hooks/useDialog';
import { BroadcasterSettings, DEFAULT_BROADCASTER_SETTINGS } from '../types/broadcaster';
import { Player } from '../types';

type Theme = 'light' | 'dark' | 'system';

export interface Settings {
    theme: Theme;
    soundEnabled: boolean;
    defaultHalfDuration: number; // Minutes
    matchType: 'indoor' | 'beach';

    // Integrations
    geminiApiKey?: string;
    geminiModel: string; // 'gemini-1.5-flash', etc.

    // UI Preferences
    showTimerInTitle: boolean;
    language: 'en' | 'nl';

    // Match Defaults
    defaultHomeName: string;
    defaultAwayName: string;
    defaultHomeColor: string;
    defaultAwayColor: string;
    defaultHomePlayers?: Player[];
    defaultAwayPlayers?: Player[];

    // Wear OS Sync
    watchControlMode: 'read-only' | 'write';

    // Social Graphics
    socialGraphicConfig?: {
        backgroundImageUrl?: string;
        sponsorLogoUrl?: string;
        style: 'modern' | 'minimal' | 'neon';
    };
    sponsorLogos: string[];
    sponsorRotationInterval: number; // Seconds
    enableChordedShortcuts: boolean;
    enableSequenceBuffering: boolean;
    broadcaster: BroadcasterSettings;
}

interface SettingsContextType {
    settings: Settings;
    lastSaved: number | null;
    updateSettings: (newSettings: Partial<Settings>) => void;
    notifyAutoSave: () => void;
    resetSettings: () => void;
    clearAllData: () => void;
}

const defaultSettings: Settings = {
    theme: 'system',
    soundEnabled: true,
    defaultHalfDuration: 25,
    matchType: 'indoor',
    geminiModel: 'gemini-2.0-flash',
    showTimerInTitle: false,
    language: 'en',
    defaultHomeName: 'Home',
    defaultAwayName: 'Away',
    defaultHomeColor: '#EF4444', // Red-500
    defaultAwayColor: '#3B82F6', // Blue-500
    defaultHomePlayers: [
        { id: 'h1', number: 1, name: 'Player 1', gender: 'M', initialPosition: 'ATTACK', isStarter: true },
        { id: 'h2', number: 2, name: 'Player 2', gender: 'F', initialPosition: 'ATTACK', isStarter: true },
        { id: 'h3', number: 3, name: 'Player 3', gender: 'M', initialPosition: 'DEFENSE', isStarter: true },
        { id: 'h4', number: 4, name: 'Player 4', gender: 'F', initialPosition: 'DEFENSE', isStarter: true },
        { id: 'h5', number: 5, name: 'Player 5', gender: 'M', initialPosition: 'ATTACK', isStarter: false }
    ],
    defaultAwayPlayers: [],
    watchControlMode: 'read-only',
    socialGraphicConfig: {
        style: 'modern'
    },
    sponsorLogos: [],
    sponsorRotationInterval: 10,
    enableChordedShortcuts: true,
    enableSequenceBuffering: true,
    broadcaster: DEFAULT_BROADCASTER_SETTINGS
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { confirm } = useDialog();
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const saved = localStorage.getItem('korfstat_settings');
            return saved ? JSON.parse(saved) : defaultSettings;
        } catch (e) {
            console.error("Failed to parse settings from localStorage", e);
            return defaultSettings;
        }
    });

    useEffect(() => {
        localStorage.setItem('korfstat_settings', JSON.stringify(settings));
        setLastSaved(Date.now());
        applyTheme(settings.theme);
        if (i18n.language !== settings.language) {
            i18n.changeLanguage(settings.language);
        }
    }, [settings]);

    const applyTheme = (theme: Theme) => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            root.classList.add('dark');
            // If we want to support tailwind config in JS that we added:
            // tailwind.config.darkMode = 'class' handles this if 'dark' class is on html.
        } else {
            root.classList.remove('dark');
        }
    };

    // Listen for system theme changes if using system
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (settings.theme === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [settings.theme]);

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    const clearAllData = async () => {
        if (await confirm(i18n.t('common.confirmClearAll'))) {
            localStorage.clear();
            window.location.reload();
        }
    }

    const notifyAutoSave = () => {
        setLastSaved(Date.now());
    };

    return (
        <SettingsContext.Provider value={{ settings, lastSaved, updateSettings, resetSettings, clearAllData, notifyAutoSave }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
