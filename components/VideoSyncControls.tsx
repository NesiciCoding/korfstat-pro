import React, { useState } from 'react';
import { Upload, Link, Clock, Check } from 'lucide-react';

interface VideoSyncControlsProps {
    onVideoSelected: (url: string, type: 'local' | 'url') => void;
    onSyncSet: (videoTime: number) => void;
    currentVideoTime: number;
    videoOffset?: number;
    hasVideo: boolean;
}

const VideoSyncControls: React.FC<VideoSyncControlsProps> = ({
    onVideoSelected,
    onSyncSet,
    currentVideoTime,
    videoOffset,
    hasVideo
}) => {
    const [inputType, setInputType] = useState<'local' | 'url'>('local');
    const [urlInput, setUrlInput] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const objectUrl = URL.createObjectURL(file);
            onVideoSelected(objectUrl, 'local');
        }
    };

    const handleUrlSubmit = () => {
        if (urlInput) {
            onVideoSelected(urlInput, 'url');
        }
    };

    if (!hasVideo) {
        return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Match Video</h3>

                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setInputType('local')}
                        className={`flex-1 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 ${inputType === 'local' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Upload size={16} /> Local File
                    </button>
                    <button
                        onClick={() => setInputType('url')}
                        className={`flex-1 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 ${inputType === 'url' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <Link size={16} /> Direct URL
                    </button>
                </div>

                {inputType === 'local' ? (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-400">MP4, WebM supported</p>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://example.com/match.mp4"
                            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
                        />
                        <button
                            onClick={handleUrlSubmit}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700"
                        >
                            Load
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Clock size={20} className="text-indigo-500" />
                Sync Video
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Pause the video exactly when the match starts (whistle), then click the button below.
            </p>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="font-mono text-xl text-gray-900 dark:text-white">
                    {new Date(currentVideoTime * 1000).toISOString().substr(11, 8)}
                </div>
                <button
                    onClick={() => onSyncSet(currentVideoTime)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                >
                    <Check size={16} /> Set Start Time
                </button>
            </div>

            {videoOffset !== undefined && (
                <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <Check size={12} /> Synced at {new Date(videoOffset * 1000).toISOString().substr(11, 8)}
                </div>
            )}
        </div>
    );
};

export default VideoSyncControls;
