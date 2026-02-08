import { useRef, useCallback, useState, useEffect } from 'react';

export const useGameAudio = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    // Initialize AudioContext on user interaction if needed (browser policy),
    // but we can try lazily.
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, startTime: number = 0) => {
        if (isMuted) return;
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime + startTime;
        osc.start(now);

        // Smooth envelope to avoid clicks
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc.stop(now + duration);
    }, [getAudioContext, isMuted]);

    const playShotClockBuzzer = useCallback(() => {
        if (isMuted) return;
        // Pattern: Beep - Beep - Beep (High pitch)
        // 880Hz (A5), Square wave for "buzzer" feel
        playTone(880, 'square', 0.2, 0);
        playTone(880, 'square', 0.2, 0.4);
        playTone(880, 'square', 0.4, 0.8);
    }, [playTone, isMuted]);

    const playGameEndHorn = useCallback(() => {
        if (isMuted) return;
        // Pattern: LOOOONG Horn (Low pitch)
        // 150Hz, Sawtooth for "horn" feel
        const ctx = getAudioContext();
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator(); // Detune for richer sound
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.value = 150;
        osc2.type = 'sawtooth';
        osc2.frequency.value = 154; // Slight detune

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        const duration = 2.0;

        osc1.start(now);
        osc2.start(now);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.linearRampToValueAtTime(0.6, now + duration - 0.2);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }, [getAudioContext, isMuted]);

    const toggleMute = () => setIsMuted(prev => !prev);

    return {
        playShotClockBuzzer,
        playGameEndHorn,
        isMuted,
        toggleMute
    };
};
