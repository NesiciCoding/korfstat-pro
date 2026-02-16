import React, { forwardRef, useImperativeHandle, useRef } from 'react';

interface VideoPlayerProps {
    src: string;
    onTimeUpdate?: (currentTime: number) => void;
    className?: string;
}

export interface VideoPlayerRef {
    seekTo: (time: number) => void;
    getCurrentTime: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ src, onTimeUpdate, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
        seekTo: (time: number) => {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
                videoRef.current.play().catch(() => {
                    // Auto-play might be blocked, or user hasn't interacted yet.
                    // Just seeking is fine.
                });
            }
        },
        getCurrentTime: () => videoRef.current?.currentTime || 0
    }));

    const handleTimeUpdate = () => {
        if (videoRef.current && onTimeUpdate) {
            onTimeUpdate(videoRef.current.currentTime);
        }
    };

    return (
        <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain"
                controls
                onTimeUpdate={handleTimeUpdate}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
