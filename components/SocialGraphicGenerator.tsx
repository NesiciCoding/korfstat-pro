import React, { useRef, useState } from 'react';
import { MatchState } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Download, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getScore } from '../utils/matchUtils';

interface SocialGraphicGeneratorProps {
    matchState: MatchState;
    onClose: () => void;
}

const SocialGraphicGenerator: React.FC<SocialGraphicGeneratorProps> = ({ matchState, onClose }) => {
    const { settings } = useSettings();
    const [format, setFormat] = useState<'square' | 'story'>('square');
    const [status, setStatus] = useState<'preview' | 'generating' | 'done'>('preview');
    const previewRef = useRef<HTMLDivElement>(null);

    const config = settings.socialGraphicConfig || { style: 'modern' };

    const handleDownload = async () => {
        if (!previewRef.current) return;
        
        try {
            setStatus('generating');
            // Give a tiny tick for UI to update to 'generating' state if we wanted to show a spinner,
            // though html-to-image blocks the main thread heavily.
            await new Promise(r => setTimeout(r, 50));
            
            const dataUrl = await toPng(previewRef.current, {
                cacheBust: true,
                canvasWidth: format === 'square' ? 1080 : 1080,
                canvasHeight: format === 'story' ? 1920 : 1080,
                pixelRatio: 1, // We are already rendering at 1080p size
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                }
            });

            const link = document.createElement('a');
            link.download = `match-${format}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            
            setStatus('done');
            setTimeout(() => setStatus('preview'), 2000);
        } catch (err) {
            console.error('Failed to generate image', err);
            alert('Failed to generate image. See console for details.');
            setStatus('preview');
        }
    };

    const isMatchOver = matchState.period === 'FINISHED';
    const isHalftime = matchState.period === 'HALFTIME';
    const matchStatusText = isMatchOver ? 'FINAL SCORE' : isHalftime ? 'HALFTIME' : 'MATCH UPDATE';

    // The scale factor allows us to preview a 1080p image inside a smaller modal window
    const scaleFactor = format === 'square' ? 0.35 : 0.25; 

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Social Media Graphic
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 flex flex-col lg:flex-row gap-8 items-start bg-gray-50 dark:bg-gray-900/50">
                    
                    {/* Controls Sidebar */}
                    <div className="w-full lg:w-64 shrink-0 space-y-6">
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Format</label>
                            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                                <button 
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-shadow ${format === 'square' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                    onClick={() => setFormat('square')}
                                >
                                    Instagram Square<br/><span className="text-xs opacity-50">1080x1080</span>
                                </button>
                                <button 
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-shadow ${format === 'story' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                                    onClick={() => setFormat('story')}
                                >
                                    Story<br/><span className="text-xs opacity-50">1080x1920</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Backgrounds and Sponsor Logos can be changed in the App Settings menu under "Social Graphics Output".
                            </p>
                            <button
                                onClick={handleDownload}
                                disabled={status === 'generating'}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                    status === 'generating' ? 'bg-indigo-400 text-white cursor-wait' :
                                    status === 'done' ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg' :
                                    'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                                }`}
                            >
                                {status === 'generating' ? 'Rendering...' :
                                 status === 'done' ? 'Downloaded!' :
                                 <><Download size={20} /> Download Graphic</>}
                            </button>
                        </div>
                    </div>

                    {/* Preview Area. We render it at full 1080p resolution but scale it down using CSS transform to fit the screen. */}
                    <div className="flex-1 flex justify-center items-center overflow-hidden min-h-[500px] w-full border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-100/50 dark:bg-gray-800/50">
                        <div 
                            style={{ 
                                width: format === 'square' ? 1080 : 1080, 
                                height: format === 'story' ? 1920 : 1080,
                                transform: `scale(${scaleFactor})`,
                                transformOrigin: 'center center'
                            }} 
                            className="bg-gray-900 shadow-2xl relative flex-shrink-0"
                        >
                            {/* The actual DOM node to be captured */}
                            <div
                                ref={previewRef}
                                className="w-full h-full relative overflow-hidden flex flex-col font-sans"
                                style={{
                                    backgroundColor: '#0f172a', // slate-900 fallback
                                    backgroundImage: config.backgroundImageUrl ? `url(${config.backgroundImageUrl})` : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                }}
                            >
                                {/* Dimmer overlay for text readability if background image exists */}
                                {config.backgroundImageUrl && (
                                    <div className="absolute inset-0 bg-black/60" />
                                )}

                                {/* Main Content Wrapper */}
                                <div className="relative z-10 flex flex-col h-full p-16">
                                    
                                    {/* Top Status & Logos */}
                                    <div className="flex justify-between items-start w-full">
                                        <div className="bg-indigo-600 text-white px-8 py-3 rounded-full text-3xl font-black tracking-widest uppercase">
                                            {matchStatusText}
                                        </div>

                                        {config.sponsorLogoUrl && (
                                            <div className="bg-white p-4 rounded-2xl shadow-xl max-w-[250px]">
                                                <img src={config.sponsorLogoUrl} alt="Sponsor" className="w-full h-auto object-contain max-h-24" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Spacer to push scores to middle */}
                                    <div className="flex-1" />

                                    {/* Scores Container */}
                                    <div className="flex flex-col gap-12 bg-white/10 backdrop-blur-md p-12 rounded-[3rem] border border-white/20 shadow-2xl w-full">
                                        
                                        {/* Home Team */}
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-8">
                                                {matchState.homeTeam.logoUrl ? (
                                                    <img src={matchState.homeTeam.logoUrl} className="w-32 h-32 object-contain drop-shadow-lg" alt="" />
                                                ) : (
                                                    <div className="w-32 h-32 rounded-full bg-gradient-to-br border-4 border-white/50 shadow-lg" style={{
                                                        backgroundImage: `linear-gradient(to bottom right, ${matchState.homeTeam.color}, ${matchState.homeTeam.secondaryColor || '#000'})`
                                                    }} />
                                                )}
                                                <div className="text-white text-6xl font-black uppercase tracking-tight max-w-[500px] leading-tight drop-shadow-md">
                                                    {matchState.homeTeam.name}
                                                </div>
                                            </div>
                                            <div className="text-white text-9xl font-black font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                                {getScore(matchState, 'HOME')}
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="w-full h-1 bg-white/20 rounded-full" />

                                        {/* Away Team */}
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-8">
                                                {matchState.awayTeam.logoUrl ? (
                                                    <img src={matchState.awayTeam.logoUrl} className="w-32 h-32 object-contain drop-shadow-lg" alt="" />
                                                ) : (
                                                    <div className="w-32 h-32 rounded-full bg-gradient-to-br border-4 border-white/50 shadow-lg" style={{
                                                        backgroundImage: `linear-gradient(to bottom right, ${matchState.awayTeam.color}, ${matchState.awayTeam.secondaryColor || '#000'})`
                                                    }} />
                                                )}
                                                <div className="text-white text-6xl font-black uppercase tracking-tight max-w-[500px] leading-tight drop-shadow-md">
                                                    {matchState.awayTeam.name}
                                                </div>
                                            </div>
                                            <div className="text-white text-9xl font-black font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                                {getScore(matchState, 'AWAY')}
                                            </div>
                                        </div>

                                    </div>

                                    <div className="flex-1" />

                                    {/* Footer */}
                                    <div className="w-full text-center text-white/50 text-2xl font-medium tracking-widest uppercase">
                                        Generated by KorfStat Pro
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SocialGraphicGenerator;
