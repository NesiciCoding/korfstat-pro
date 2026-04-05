import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Monitor, Layout, Eye, Palette, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TickerCustomizer: React.FC = () => {
    const { t } = useTranslation();
    const [theme, setTheme] = useState('modern');
    const [showShotClock, setShowShotClock] = useState(true);
    const [accentColor, setAccentColor] = useState('#6366f1');
    const [copied, setCopied] = useState(false);
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

    useEffect(() => {
        // Find latest active matchId for preview/testing
        fetch(`${window.location.origin}/api/matches/active`)
            .then(res => res.json())
            .then(data => {
                if (data.length > 0) setActiveMatchId(data[0].id);
            })
            .catch(console.error);
    }, []);

    const baseUrl = `${window.location.origin}/ticker`;
    const tickerUrl = `${baseUrl}?theme=${theme}&sc=${showShotClock}&color=${encodeURIComponent(accentColor)}${activeMatchId ? `&matchId=${activeMatchId}` : ''}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(tickerUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 transition-colors duration-300">
            <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30">
                        <Monitor className="text-white" size={32} />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                        Ticker <span className="text-indigo-600">Customizer</span>
                    </h1>
                    <p className="text-gray-500 max-w-xl mx-auto font-medium">
                        Generate a professional score ticker URL for your OBS or vMix broadcast. 
                        Compatible with all major streaming software as a Browser Source.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Configuration Section */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl space-y-8">
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <Palette size={20} className="text-indigo-600" />
                                Appearance
                            </h3>
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Theme Style</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['modern', 'minimal'].map(tStyle => (
                                        <button
                                            key={tStyle}
                                            onClick={() => setTheme(tStyle)}
                                            className={`py-3 px-4 rounded-xl font-bold border-2 transition-all capitalize ${
                                                theme === tStyle 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                                : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                                            }`}
                                        >
                                            {tStyle}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <Clock className="text-gray-400" size={20} />
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">Show Shot Clock</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Toggle 25s Indicator</div>
                                    </div>
                                </div>
                                <button
                                    data-testid="shot-clock-toggle"
                                    onClick={() => setShowShotClock(!showShotClock)}
                                    className={`w-12 h-6 rounded-full transition-all relative ${showShotClock ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showShotClock ? 'right-1' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                             <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <Layout size={20} className="text-indigo-600" />
                                Browser Source URL
                            </h3>
                            <div className="relative group">
                                <input 
                                    readOnly 
                                    value={tickerUrl}
                                    className="w-full bg-gray-100 dark:bg-gray-900 border-2 border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900/50 rounded-2xl px-5 py-4 text-xs font-mono text-gray-600 dark:text-gray-400 pr-24 transition-all"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="absolute right-2 top-2 bottom-2 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:text-indigo-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    {copied ? 'Copied' : 'Copy URL'}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 italic">
                                Paste this URL as a "Browser Source" in OBS. Set width to 1920 and height to 1080.
                            </p>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <Eye size={20} className="text-indigo-600" />
                                Preview
                            </h3>
                            <a 
                                href={tickerUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 hover:translate-x-1 transition-transform"
                            >
                                Open in New Window <ExternalLink size={12} />
                            </a>
                        </div>
                        
                        <div className="aspect-video bg-gray-900 rounded-[32px] border-4 border-gray-800 shadow-2xl relative overflow-hidden group">
                             {/* Mock OBS View */}
                             <div className="absolute inset-0 opacity-10 pointer-events-none">
                                 <div className="w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                             </div>
                             
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="text-center space-y-4 opacity-30 group-hover:opacity-50 transition-opacity">
                                     <h4 className="text-xl font-black text-white uppercase italic tracking-widest">Broadcast Feed</h4>
                                     <div className="w-32 h-1 bg-white/20 mx-auto rounded-full"></div>
                                 </div>
                             </div>

                             {/* Component Preview (Mock Ticker logic) */}
                             <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-0 pointer-events-none transition-all duration-500 ${theme === 'minimal' ? 'scale-75' : ''}`}>
                                <div className="px-4 py-2 bg-white text-gray-900 font-black uppercase italic tracking-tighter text-lg shadow-xl rounded-l-xl" style={{ borderLeft: '4px solid red' }}>HOME</div>
                                <div className="px-3 py-2 bg-gray-900 text-white font-black text-xl shadow-xl">12</div>
                                <div className="flex flex-col items-center justify-center bg-indigo-600 px-4 py-1 shadow-2xl min-w-[80px] relative">
                                    <div className="text-[8px] font-black uppercase tracking-widest text-white/60">1º PERIOD</div>
                                    <div className="text-base font-mono font-black text-white">24:59</div>
                                    {showShotClock && <div className="absolute -top-1 -right-1 bg-amber-500 text-gray-900 font-black px-1.5 py-0.5 text-[8px] rounded-bl-sm">25</div>}
                                </div>
                                <div className="px-3 py-2 bg-gray-900 text-white font-black text-xl shadow-xl">10</div>
                                <div className="px-4 py-2 bg-white text-gray-900 font-black uppercase italic tracking-tighter text-lg shadow-xl rounded-r-xl" style={{ borderRight: '4px solid blue' }}>AWAY</div>
                             </div>
                        </div>

                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/50">
                            <h4 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm mb-2">OBS Instructions</h4>
                            <ol className="text-xs text-indigo-800/70 dark:text-indigo-200/70 space-y-2 list-decimal list-inside font-medium">
                                <li>Add a "Browser Source" to your scene.</li>
                                <li>Paste the URL above.</li>
                                <li>Set resolution to 1920x1080.</li>
                                <li>The ticker sits at the bottom center automatically.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TickerCustomizer;
