import React, { useEffect, useRef } from 'react';
import { MatchState } from '../types';
import { useGameAudio } from '../hooks/useGameAudio';

interface ShotClockViewProps {
    matchState: MatchState;
}

const ShotClockView: React.FC<ShotClockViewProps> = ({ matchState }) => {
    // Always enable sound for this specific view as requested
    const { playShotClockBuzzer } = useGameAudio(false);

    const prevShotClockRef = useRef(matchState.shotClock.seconds);

    useEffect(() => {
        const currentShotClock = matchState.shotClock.seconds;
        // Trigger sound when transitioning to 0 from a positive number
        // AND the clock was actually running (or just experienced a time update that hit 0)
        // We check matchState.shotClock.lastStartTime to ensure it's an active game transition
        if (prevShotClockRef.current > 0 && currentShotClock <= 0 && matchState.shotClock.lastStartTime) {
            playShotClockBuzzer();
        }
        prevShotClockRef.current = currentShotClock;
    }, [matchState.shotClock.seconds, matchState.shotClock.lastStartTime, playShotClockBuzzer]);

    const seconds = Math.ceil(matchState.shotClock.seconds);
    const isLowTime = seconds <= 5;
    const isExpired = seconds === 0;

    // Determine background and text color based on state
    // Default: Black background, Yellow text
    // Low time (<5s): Black background, Red text
    // Expired (0s): Red background, White text ? Or just Red text? 
    // User asked for "very clear". 
    // Standard shot clocks often go red at 0 or low time.
    // Let's stick to high contrast.

    let bgColor = "bg-black";
    let textColor = "text-yellow-400"; // Standard LED yellow

    if (isExpired) {
        // End of shot clock
        textColor = "text-red-500";
    } else if (isLowTime) {
        textColor = "text-red-500";
    }

    // Override for simple clear look:
    // We want MAX READABILITY.

    return (
        <div className={`w-screen h-screen flex items-center justify-center ${bgColor} overflow-hidden`}>
            <div className={`font-mono font-black ${textColor}`} style={{ fontSize: '45vw', lineHeight: '1' }}>
                {seconds}
            </div>
        </div>
    );
};

export default ShotClockView;
