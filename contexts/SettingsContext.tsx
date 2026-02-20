import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';

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
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
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
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>(() => {
        const saved = localStorage.getItem('korfstat_settings');
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('korfstat_settings', JSON.stringify(settings));
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

    const clearAllData = () => {
        if (window.confirm("Are you sure you want to clear ALL data? This includes match history and saved strategies.")) {
            localStorage.clear();
            window.location.reload();
        }
    }

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, clearAllData }}>
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
