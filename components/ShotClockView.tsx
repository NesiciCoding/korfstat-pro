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
        // Trigger sound only on an active countdown transitioning to 0. Validated via lastStartTime.
        if (prevShotClockRef.current > 0 && currentShotClock <= 0 && matchState.shotClock.lastStartTime) {
            playShotClockBuzzer();
        }
        prevShotClockRef.current = currentShotClock;
    }, [matchState.shotClock.seconds, matchState.shotClock.lastStartTime, playShotClockBuzzer]);

    const seconds = Math.ceil(matchState.shotClock.seconds);
    const isLowTime = seconds <= 5;
    const isExpired = seconds === 0;

    // Clock colors: High contrast yellow (default) and red (low time / expired)

    let bgColor = "bg-black";
    let textColor = "text-yellow-400"; // Standard LED yellow

    if (isExpired) {
        // End of shot clock
        textColor = "text-red-500";
    } else if (isLowTime) {
        textColor = "text-red-500";
    }

    // Use standard full-screen styling for maximal readability

    return (
        <div className={`w-screen h-screen flex items-center justify-center ${bgColor} overflow-hidden`}>
            <div className={`font-mono font-black ${textColor}`} style={{ fontSize: '45vw', lineHeight: '1' }}>
                {seconds}
            </div>
        </div>
    );
};

export default ShotClockView;
