import React, { useState, useRef, useEffect } from 'react';
import {
  PieChart, Clock, ArrowRightLeft, Undo2, Volume2, VolumeX,
  Share2, Mic, MicOff, Trophy, Video, EyeOff, MoreHorizontal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MatchState } from '../../types';
import { getScore, formatTime } from '../../utils/matchUtils';

interface MatchHeaderProps {
  matchState: MatchState;
  soundEnabled: boolean;
  isListening: boolean;
  refWatchMode: boolean;
  broadcasterEnabled: boolean;
  onToggleSound: () => void;
  onUndo: () => void;
  onToggleVoice: () => void;
  onToggleRefWatch: () => void;
  onManualClip: () => void;
  onTimeout: () => void;
  onToggleVotingShare: () => void;
  onShare: () => void;
  onPhaseEnd: () => void;
  onTogglePossession: () => void;
}

const MatchHeader: React.FC<MatchHeaderProps> = ({
  matchState,
  soundEnabled,
  isListening,
  refWatchMode,
  broadcasterEnabled,
  onToggleSound,
  onUndo,
  onToggleVoice,
  onToggleRefWatch,
  onManualClip,
  onTimeout,
  onToggleVotingShare,
  onShare,
  onPhaseEnd,
  onTogglePossession,
}) => {
  const { t } = useTranslation();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    if (overflowOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  return (
    <div className="bg-gray-900 text-white shadow-lg p-3 md:p-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">

        {/* Scoreboard */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-8 flex-1">
          {/* Home */}
          <div className={`flex flex-col items-center p-2 md:p-3 rounded-lg transition-colors ${matchState.possession === 'HOME' ? 'bg-gray-800 ring-2 ring-yellow-500' : ''}`}>
            <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: matchState.homeTeam.color }} />
            <h2 className="font-bold text-gray-400 text-[10px] md:text-sm uppercase truncate max-w-[120px] sm:max-w-none">{matchState.homeTeam.name}</h2>
            <div className="text-4xl md:text-5xl font-black font-mono text-white leading-none">{getScore(matchState, 'HOME')}</div>
          </div>

          {/* Timer block */}
          <div className="flex flex-col items-center">
            <div className="bg-black/50 px-4 md:px-6 py-2 rounded-t-lg border-b border-gray-700 w-40 md:w-48 text-center">
              <div className={`text-3xl md:text-4xl font-mono font-bold tracking-widest ${matchState.timer.isRunning ? 'text-green-400' : 'text-red-400'}`}>
                {formatTime(Math.max(0, matchState.halfDurationSeconds - matchState.timer.elapsedSeconds))}
              </div>
              <div className="text-[10px] text-gray-500 font-bold tracking-widest">HALF {matchState.currentHalf}</div>
            </div>
            <div data-testid="shot-clock-toggle" className="mt-1 md:mt-2 flex flex-col items-center">
              <div className={`text-2xl md:text-3xl font-mono font-bold ${matchState.shotClock.seconds <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                {Math.ceil(matchState.shotClock.seconds)}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">SHOT CLOCK</div>
            </div>
            <button
              data-testid="switch-possession-btn"
              onClick={onTogglePossession}
              className="mt-1 md:mt-2 w-28 md:w-32 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1 px-2 rounded-lg text-xs flex items-center justify-center gap-1"
            >
              <ArrowRightLeft size={12} /> Switch Poss <kbd className="hidden lg:inline ml-1 text-[9px] opacity-70 bg-black/30 px-1 rounded">A/H</kbd>
            </button>
          </div>

          {/* Away */}
          <div className={`flex flex-col items-center p-2 md:p-3 rounded-lg transition-colors ${matchState.possession === 'AWAY' ? 'bg-gray-800 ring-2 ring-yellow-500' : ''}`}>
            <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: matchState.awayTeam.color }} />
            <h2 className="font-bold text-gray-400 text-[10px] md:text-sm uppercase truncate max-w-[120px] sm:max-w-none">{matchState.awayTeam.name}</h2>
            <div className="text-4xl md:text-5xl font-black font-mono text-white leading-none">{getScore(matchState, 'AWAY')}</div>
          </div>
        </div>

        {/* Action buttons — always-visible core + overflow for secondary */}
        <div className="flex items-center gap-1 md:gap-2 flex-wrap md:flex-nowrap justify-end w-full md:w-auto">

          {/* Always visible: Undo, Timeout, End Period */}
          <button
            data-testid="undo-btn"
            onClick={onUndo}
            disabled={matchState.events.length === 0}
            className="p-2 bg-gray-700 hover:bg-red-600 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.undo')}
          >
            <Undo2 size={18} /><span className="hidden lg:inline ml-1 text-[10px] opacity-70">DEL</span>
          </button>

          <button
            data-testid="timeout-btn"
            onClick={onTimeout}
            className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white shadow flex items-center gap-1"
            title={t('matchTracker.timeout')}
          >
            <Clock size={18} /><span className="hidden lg:inline font-mono text-[10px]">T</span>
          </button>

          <button
            data-testid="end-period-btn"
            onClick={onPhaseEnd}
            className="flex items-center gap-1 md:gap-2 bg-indigo-600 text-white px-2 md:px-3 py-2 rounded-lg font-bold text-xs whitespace-nowrap"
          >
            <PieChart size={15} />
            <span className="hidden sm:inline">End Period</span>
            <span className="sm:hidden">End</span>
          </button>

          <div className="w-px h-8 bg-gray-700 mx-1" />

          {/* Secondary actions — hidden on small screens, shown via overflow on md- */}
          <div className="hidden md:flex items-center gap-1 md:gap-2">
            <button
              data-testid="mute-btn"
              onClick={onToggleSound}
              className={`p-2 rounded text-xs font-bold ${!soundEnabled ? 'bg-red-900/50 text-red-400 hover:bg-red-900' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              title={!soundEnabled ? t('matchTracker.unmute') : t('matchTracker.mute')}
            >
              {!soundEnabled ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              data-testid="voice-btn"
              onClick={onToggleVoice}
              className={`p-2 rounded text-xs font-bold transition-all ${isListening ? 'bg-red-600 animate-pulse text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              title={isListening ? t('matchTracker.stopVoice') : t('matchTracker.startVoice')}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              data-testid="ref-watch-toggle"
              onClick={onToggleRefWatch}
              className={`p-2 rounded text-xs font-bold transition-all ${refWatchMode ? 'bg-indigo-600 ring-2 ring-indigo-400 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              title="Toggle Ref-Watch Mode"
            >
              <EyeOff size={18} />
            </button>
            <button
              data-testid="manual-clip-btn"
              onClick={onManualClip}
              disabled={!broadcasterEnabled}
              className={`p-2 rounded text-xs font-bold transition-all ${broadcasterEnabled ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'}`}
              title={t('broadcaster.manualClip', 'Manual Highlight Clip')}
            >
              <Video size={18} />
            </button>
            <div className="w-px h-8 bg-gray-700 mx-1" />
            <button data-testid="vote-btn" onClick={onToggleVotingShare} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded transition-colors text-white" title="Vote">
              <Trophy size={18} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Vote</span>
            </button>
            <button
              data-testid="share-match-btn"
              onClick={onShare}
              className="p-2 bg-gray-700 hover:bg-indigo-600 rounded text-xs font-bold"
              title={t('matchTracker.shareResult')}
            >
              <Share2 size={16} />
            </button>
          </div>

          {/* Overflow menu — visible only on small/medium screens */}
          <div className="md:hidden relative" ref={overflowRef}>
            <button
              data-testid="header-overflow-btn"
              onClick={() => setOverflowOpen(prev => !prev)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              title="More options"
            >
              <MoreHorizontal size={18} />
            </button>
            {overflowOpen && (
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1 min-w-[180px]">
                <button
                  data-testid="mute-btn"
                  onClick={() => { onToggleSound(); setOverflowOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold w-full text-left ${!soundEnabled ? 'bg-red-900/50 text-red-400' : 'text-gray-200 hover:bg-gray-700'}`}
                >
                  {!soundEnabled ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {!soundEnabled ? t('matchTracker.unmute') : t('matchTracker.mute')}
                </button>
                <button
                  data-testid="voice-btn"
                  onClick={() => { onToggleVoice(); setOverflowOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold w-full text-left ${isListening ? 'bg-red-600 text-white' : 'text-gray-200 hover:bg-gray-700'}`}
                >
                  {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                  {isListening ? t('matchTracker.stopVoice') : t('matchTracker.startVoice')}
                </button>
                <button
                  data-testid="ref-watch-toggle"
                  onClick={() => { onToggleRefWatch(); setOverflowOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold w-full text-left ${refWatchMode ? 'bg-indigo-600 text-white' : 'text-gray-200 hover:bg-gray-700'}`}
                >
                  <EyeOff size={16} /> Ref-Watch Mode
                </button>
                {broadcasterEnabled && (
                  <button
                    data-testid="manual-clip-btn"
                    onClick={() => { onManualClip(); setOverflowOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold w-full text-left text-gray-200 hover:bg-gray-700"
                  >
                    <Video size={16} /> {t('broadcaster.manualClip', 'Manual Clip')}
                  </button>
                )}
                <div className="border-t border-gray-700 my-1" />
                <button
                  data-testid="vote-btn"
                  onClick={() => { onToggleVotingShare(); setOverflowOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold w-full text-left text-gray-200 hover:bg-gray-700"
                >
                  <Trophy size={16} /> Player of the Match
                </button>
                <button
                  data-testid="share-match-btn"
                  onClick={() => { onShare(); setOverflowOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold w-full text-left text-gray-200 hover:bg-gray-700"
                >
                  <Share2 size={16} /> {t('matchTracker.shareResult')}
                </button>
              </div>
            )}
          </div>

          {isListening && <span className="hidden md:inline text-[10px] text-red-400 font-mono animate-pulse uppercase tracking-wider">{t('matchTracker.listening')}</span>}
        </div>
      </div>
    </div>
  );
};

export default MatchHeader;
