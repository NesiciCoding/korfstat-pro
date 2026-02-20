import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations directly for now, or use a backend plugin if they get too large
// For this headstart, we'll define a few core strings for English and Dutch
const resources = {
    en: {
        translation: {
            "settings": {
                "title": "Settings",
                "theme": "Theme",
                "language": "Language",
                "general": "General",
                "integrations": "Integrations",
                "match_defaults": "Match Defaults",
                "light": "Light",
                "dark": "Dark",
                "system": "System",
                "close": "Close",
                "save": "Save",
                "apiKey": "Gemini API Key",
                "aiModel": "AI Model",
                "showTimerTitle": "Show Timer in Title",
            },
            "common": {
                "cancel": "Cancel",
                "confirm": "Confirm",
                "delete": "Delete",
                "edit": "Edit",
                "loading": "Loading...",
            }
        }
    },
    nl: {
        translation: {
            "settings": {
                "title": "Instellingen",
                "theme": "Thema",
                "language": "Taal",
                "general": "Algemeen",
                "integrations": "Integraties",
                "match_defaults": "Wedstrijd Standaarden",
                "light": "Licht",
                "dark": "Donker",
                "system": "Systeem",
                "close": "Sluiten",
                "save": "Opslaan",
                "apiKey": "Gemini API Sleutel",
                "aiModel": "AI Model",
                "showTimerTitle": "Toon Timer in Titel",
            },
            "common": {
                "cancel": "Annuleren",
                "confirm": "Bevestigen",
                "delete": "Verwijderen",
                "edit": "Bewerken",
                "loading": "Laden...",
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        }
    });

export default i18n;
