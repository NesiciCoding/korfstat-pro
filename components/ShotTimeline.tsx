import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { MatchState } from '../types';
import { formatTime, getMomentumData } from '../utils/matchUtils';

interface ShotTimelineProps {
  matchState: MatchState;
  startTime: number;
  endTime: number;
  onRangeChange: (start: number, end: number) => void;
}

const ShotTimeline: React.FC<ShotTimelineProps> = ({ 
  matchState, 
  startTime, 
  endTime, 
  onRangeChange 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const totalDuration = matchState.timer.elapsedSeconds;
  
  const momentumData = useMemo(() => getMomentumData(matchState), [matchState]);
  const maxShots = Math.max(...momentumData.map(d => d.homeShots + d.awayShots), 1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        if (endTime < totalDuration) {
          onRangeChange(startTime, Math.min(endTime + 2, totalDuration));
        } else {
          setIsPlaying(false);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, startTime, endTime, totalDuration, onRangeChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const val = parseInt(e.target.value);
    if (type === 'start') {
      onRangeChange(Math.min(val, endTime - 1), endTime);
    } else {
      onRangeChange(startTime, Math.max(val, startTime + 1));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              onRangeChange(0, totalDuration);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Reset Timeline"
          >
            <RotateCcw size={18} />
          </button>
          <div className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md">
            {formatTime(startTime)} — {formatTime(endTime)}
          </div>
        </div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {isPlaying ? 'Playing Match Replay' : 'Manual Scrutiny Mode'}
        </div>
      </div>

      <div className="relative h-16 w-full group">
        {/* Momentum Visualization Background */}
        <div className="absolute inset-0 flex items-end gap-px opacity-20 group-hover:opacity-40 transition-opacity">
          {momentumData.map((d, i) => (
            <div 
              key={i} 
              className="flex-1 bg-indigo-500 rounded-t-sm"
              style={{ height: `${((d.homeShots + d.awayShots) / maxShots) * 100}%` }}
            />
          ))}
        </div>

        {/* Dual Range Scrubber */}
        <div className="absolute inset-x-0 bottom-0 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
        
        {/* Active Range Highlight */}
        <div 
          className="absolute bottom-0 h-2 bg-blue-500/50 rounded-full"
          style={{ 
            left: `${(startTime / totalDuration) * 100}%`,
            right: `${100 - (endTime / totalDuration) * 100}%`
          }}
        />

        {/* Range Selectors (Inputs) */}
        <input
          type="range"
          min="0"
          max={totalDuration}
          value={startTime}
          onChange={(e) => handleSliderChange(e, 'start')}
          className="absolute inset-x-0 -bottom-1 w-full h-4 opacity-0 cursor-pointer z-20"
          style={{ pointerEvents: 'auto' }}
        />
        <input
          type="range"
          min="0"
          max={totalDuration}
          value={endTime}
          onChange={(e) => handleSliderChange(e, 'end')}
          className="absolute inset-x-0 -bottom-1 w-full h-4 opacity-0 cursor-pointer z-10"
          style={{ pointerEvents: 'auto' }}
        />

        {/* Visual Handles */}
        <div 
          className="absolute -bottom-2 w-4 h-4 bg-white dark:bg-gray-200 border-2 border-blue-500 rounded-full shadow-md z-30 pointer-events-none"
          style={{ left: `calc(${(startTime / totalDuration) * 100}% - 8px)` }}
        />
        <div 
          className="absolute -bottom-2 w-4 h-4 bg-white dark:bg-gray-200 border-2 border-blue-500 rounded-full shadow-md z-30 pointer-events-none"
          style={{ left: `calc(${(endTime / totalDuration) * 100}% - 8px)` }}
        />
      </div>

      <div className="flex justify-between mt-6 text-[10px] font-bold text-gray-400">
        <span>START</span>
        <span>MOMENTUM / SHOT DENSITY</span>
        <span>END</span>
      </div>
    </div>
  );
};

export default ShotTimeline;
