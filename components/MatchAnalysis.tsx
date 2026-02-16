import React, { useState, useRef } from 'react';
import { MatchState, MatchEvent } from '../types';
import VideoPlayer, { VideoPlayerRef } from './VideoPlayer';
import VideoSyncControls from './VideoSyncControls';
import { ArrowLeft, Play, Rewind, FastForward } from 'lucide-react';

interface MatchAnalysisProps {
    match: MatchState;
    onBack: () => void;
}

const MatchAnalysis: React.FC<MatchAnalysisProps> = ({ match, onBack }) => {
    const videoRef = useRef<VideoPlayerRef>(null);
    const [videoUrl, setVideoUrl] = useState<string | undefined>(match.videoUrl);
    const [videoOffset, setVideoOffset] = useState<number | undefined>(match.videoOffset);
    const [currentTime, setCurrentTime] = useState(0);

    const handleVideoSelected = (url: string) => {
        setVideoUrl(url);
    };

    const handleSyncSet = (time: number) => {
        setVideoOffset(time);
        // In a real app we would persist this to the match object in localStorage
        // match.videoOffset = time; 
        // saveMatch(match);
    };

    const jumpToEvent = (event: MatchEvent) => {
        if (videoRef.current && videoOffset !== undefined) {
            // Calculate exact time in video
            // Event timestamp is relative to match start (00:00)
            // Video Offset is where 00:00 is in the video.
            // So video time = offset + event time.
            // We subtract 5 seconds for context (PRE-ROLL).
            const targetTime = Math.max(0, videoOffset + event.timestamp - 5);
            videoRef.current.seekTo(targetTime);
        } else {
            alert("Please sync the video first!");
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Filter relevant events for the log
    const events = match.events
        .filter(e => ['SHOT', 'GOAL', 'CARD', 'SUBSTITUTION'].includes(e.type) || (e.type === 'SHOT' && e.result === 'GOAL'))
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <ArrowLeft className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                        </h1>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Match Analysis • {new Date(match.date || Date.now()).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Column: Video Player & Controls */}
                <div className="w-full md:w-2/3 bg-black flex flex-col relative">
                    <div className="flex-1 relative flex items-center justify-center bg-zinc-900">
                        {videoUrl ? (
                            <VideoPlayer
                                ref={videoRef}
                                src={videoUrl}
                                onTimeUpdate={setCurrentTime}
                                className="w-full h-full max-h-[80vh]"
                            />
                        ) : (
                            <div className="text-white/50 text-center p-12">
                                <Rewind className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <h3 className="text-xl font-medium mb-2">No Video Loaded</h3>
                                <p>Select a video source from the controls below to start.</p>
                            </div>
                        )}
                    </div>

                    {/* Sync Controls Panel */}
                    <div className="bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="max-w-3xl mx-auto">
                            <VideoSyncControls
                                hasVideo={!!videoUrl}
                                onVideoSelected={handleVideoSelected}
                                onSyncSet={handleSyncSet}
                                currentVideoTime={currentTime}
                                videoOffset={videoOffset}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Match Log */}
                <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Play size={16} className="text-indigo-500" /> Event Timeline
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Click an event to jump up to 5s before it occurred.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {events.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">No major events recorded.</div>
                        ) : events.map(event => (
                            <div
                                key={event.id}
                                onClick={() => jumpToEvent(event)}
                                className="group flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 cursor-pointer transition-all"
                            >
                                <div className="font-mono text-sm font-bold text-gray-500 w-12 text-right">
                                    {formatTime(event.timestamp)}
                                </div>
                                <div className={`w-2 h-12 rounded-full ${event.teamId === 'HOME' ? 'bg-indigo-500' : 'bg-rose-500'
                                    }`}></div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                        {event.type} {event.result === 'GOAL' && 'Goal!'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {/* Ideally lookup player name here */}
                                        Player {event.playerId ? '...' : ''}
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 text-indigo-600 dark:text-indigo-400">
                                    <Play size={16} fill="currentColor" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchAnalysis;
