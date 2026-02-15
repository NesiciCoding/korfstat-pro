import { useState, useEffect, useRef, useCallback } from 'react';
import { MatchEvent, TeamId } from '../types';

// Types for Web Speech API (often missing in standard lib)
interface IWindow extends Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
}

export type VoiceCommandAction =
    | { type: 'GOAL'; team?: 'HOME' | 'AWAY'; playerNumber?: number }
    | { type: 'MISS'; team?: 'HOME' | 'AWAY'; playerNumber?: number }
    | { type: 'TURNOVER'; team?: 'HOME' | 'AWAY'; playerNumber?: number }
    | { type: 'FOUL'; team?: 'HOME' | 'AWAY'; playerNumber?: number } // Generic Foul
    | { type: 'PENALTY'; team?: 'HOME' | 'AWAY'; playerNumber?: number }
    | { type: 'FREE_THROW'; team?: 'HOME' | 'AWAY'; playerNumber?: number } // Free Pass
    | { type: 'TIMEOUT'; team?: 'HOME' | 'AWAY' }
    | { type: 'UNDO' }
    | { type: 'UNKNOWN'; original: string };

interface UseVoiceCommandsProps {
    onCommand: (action: VoiceCommandAction) => void;
    homeName?: string;
    awayName?: string;
}

export const useVoiceCommands = ({ onCommand, homeName = 'Home', awayName = 'Away' }: UseVoiceCommandsProps) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastCommand, setLastCommand] = useState<VoiceCommandAction | null>(null);
    const recognitionRef = useRef<any>(null);

    // Initialize
    useEffect(() => {
        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
        const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

        if (!SpeechRecognitionConstructor) {
            console.warn("Web Speech API not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = true; // Keep listening
        recognition.interimResults = false; // Only final results
        recognition.lang = 'en-US'; // Default

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            // Auto-restart if we intended to keep listening?
            // For now, let's allow it to stop naturally or handle restart manually
            // if (isListening) recognition.start(); // Be careful of infinite loops
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
            const lastResultIndex = event.results.length - 1;
            const text = event.results[lastResultIndex][0].transcript.trim();
            setTranscript(text);
            processCommand(text);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [onCommand]); // Re-init if callback changes? Better to use ref for callback.

    // Use Ref for callback to avoid re-init
    const callbackRef = useRef(onCommand);
    useEffect(() => { callbackRef.current = onCommand; }, [onCommand]);

    const processCommand = (text: string) => {
        // console.log("Processing Voice Command:", text);
        const lower = text.toLowerCase();
        let action: VoiceCommandAction = { type: 'UNKNOWN', original: text };

        // --- Parsing Logic ---

        // Detect Team
        let team: 'HOME' | 'AWAY' | undefined;
        if (lower.includes('home') || lower.includes(homeName.toLowerCase()) || lower.includes('white') || lower.includes('blue')) {
            team = 'HOME'; // Assuming Home defaults
        } else if (lower.includes('away') || lower.includes(awayName.toLowerCase()) || lower.includes('red') || lower.includes('black')) {
            team = 'AWAY';
        }

        // Detect Number (Player)
        // Look for digits 1-99
        const numberMatch = lower.match(/\b(\d{1,2})\b/);
        const playerNumber = numberMatch ? parseInt(numberMatch[1]) : undefined;


        // Detect Action
        if (lower.includes('goal') || lower.includes('score')) {
            action = { type: 'GOAL', team, playerNumber };
        } else if (lower.includes('miss') || lower.includes('shot')) {
            action = { type: 'MISS', team, playerNumber };
        } else if (lower.includes('turnover') || lower.includes('turn') || lower.includes('lost')) {
            action = { type: 'TURNOVER', team, playerNumber };
        } else if (lower.includes('foul')) {
            action = { type: 'FOUL', team, playerNumber };
        } else if (lower.includes('penalty')) {
            action = { type: 'PENALTY', team, playerNumber };
        } else if (lower.includes('free pass') || lower.includes('free throw')) { // 'free throw' is common misnomer
            action = { type: 'FREE_THROW', team, playerNumber };
        } else if (lower.includes('timeout') || lower.includes('time out')) {
            action = { type: 'TIMEOUT', team };
        } else if (lower.includes('undo') || lower.includes('cancel')) {
            action = { type: 'UNDO' };
        }

        setLastCommand(action);
        if (action.type !== 'UNKNOWN') {
            callbackRef.current(action);
        }
    };

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    }, [isListening]);

    return {
        isListening,
        toggleListening,
        transcript,
        lastCommand
    };
};
