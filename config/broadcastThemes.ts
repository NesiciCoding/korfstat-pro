// Broadcast Overlay Theme System
export type OverlayTheme = 'modern' | 'classic' | 'neon' | 'minimal';
export type OverlayFont = 'roboto' | 'inter' | 'montserrat' | 'oswald';

export interface BroadcastThemeConfig {
    theme: OverlayTheme;
    font: OverlayFont;
    accentColor?: string;
    showShotClock?: boolean;
    scoreboardPosition?: 'bottom' | 'top';
}

export const THEME_PRESETS: Record<OverlayTheme, {
    name: string;
    description: string;
    scoreboard: {
        background: string;
        textColor: string;
        borderStyle: string;
        glassEffect: boolean;
    };
    popup: {
        style: string;
        animation: string;
    };
}> = {
    modern: {
        name: 'Modern Sport',
        description: 'Sleek glassmorphism with floating elements',
        scoreboard: {
            background: 'rgba(15, 23, 42, 0.85)',
            textColor: '#ffffff',
            borderStyle: 'rounded-2xl',
            glassEffect: true,
        },
        popup: {
            style: 'gradient',
            animation: 'slide-bounce',
        },
    },
    classic: {
        name: 'Classic Broadcast',
        description: 'Traditional sports broadcast look',
        scoreboard: {
            background: 'rgba(0, 0, 0, 0.9)',
            textColor: '#ffffff',
            borderStyle: 'rounded-lg',
            glassEffect: false,
        },
        popup: {
            style: 'solid',
            animation: 'slide',
        },
    },
    neon: {
        name: 'Neon Cyber',
        description: 'Vibrant neon accents with dark backdrop',
        scoreboard: {
            background: 'rgba(0, 0, 0, 0.95)',
            textColor: '#00fff7',
            borderStyle: 'rounded-xl',
            glassEffect: false,
        },
        popup: {
            style: 'neon',
            animation: 'glow-in',
        },
    },
    minimal: {
        name: 'Minimal Clean',
        description: 'Simplified, distraction-free overlay',
        scoreboard: {
            background: 'rgba(255, 255, 255, 0.15)',
            textColor: '#ffffff',
            borderStyle: 'rounded-full',
            glassEffect: true,
        },
        popup: {
            style: 'flat',
            animation: 'fade',
        },
    },
};

export const FONT_OPTIONS: Record<OverlayFont, {
    name: string;
    cssImport: string;
    fontFamily: string;
}> = {
    roboto: {
        name: 'Roboto',
        cssImport: '@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap");',
        fontFamily: '"Roboto", sans-serif',
    },
    inter: {
        name: 'Inter',
        cssImport: '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap");',
        fontFamily: '"Inter", sans-serif',
    },
    montserrat: {
        name: 'Montserrat',
        cssImport: '@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap");',
        fontFamily: '"Montserrat", sans-serif',
    },
    oswald: {
        name: 'Oswald',
        cssImport: '@import url("https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&display=swap");',
        fontFamily: '"Oswald", sans-serif',
    },
};
