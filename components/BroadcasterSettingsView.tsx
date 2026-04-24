import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { BroadcasterType, BroadcasterSettings } from '../types/broadcaster';
import { broadcasterService } from '../services/BroadcasterService';
import { Video, Shield, Radio, Check, X, AlertCircle, Terminal, HelpCircle } from 'lucide-react';

const BroadcasterSettingsView: React.FC = () => {
    const { t } = useTranslation();
    const { settings, updateSettings } = useSettings();
    const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });

    const broadcaster = settings.broadcaster;

    const handleUpdate = (updates: Partial<BroadcasterSettings>) => {
        const newBroadcaster = { ...broadcaster, ...updates };
        updateSettings({ broadcaster: newBroadcaster });
    };

    const runTestConnection = async () => {
        setTestStatus({ loading: true });
        const result = await broadcasterService.testConnection(broadcaster);
        setTestStatus({ loading: false, success: result.success, message: result.message });
        
        // If test was successful, also update the active service
        if (result.success) {
            broadcasterService.updateSettings(broadcaster);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Info */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 flex gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-800 rounded-xl">
                    <Video className="text-indigo-600 dark:text-indigo-300" size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('broadcaster.title', 'Broadcaster Integration')}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {t('broadcaster.desc', 'Connect KorfStat Pro to OBS or vMix for automated highlight generation.')}
                    </p>
                </div>
            </div>

            {/* Main Toggle */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-[var(--surface-2)] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                    <Radio className="text-slate-400" size={20} />
                    <div>
                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                           {t('broadcaster.enableIntegration', 'Enable Integration')}
                        </span>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={broadcaster.enabled} 
                        onChange={(e) => handleUpdate({ enabled: e.target.checked })} 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                </label>
            </div>

            {broadcaster.enabled && (
                <div className="space-y-6 mt-6 animate-in slide-in-from-top-4 duration-300">
                    {/* Broadcaster Type Selection */}
                    <div className="grid grid-cols-3 gap-4">
                        {(['OBS', 'VMIX', 'NONE'] as BroadcasterType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => handleUpdate({ type })}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 group ${
                                    broadcaster.type === type 
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-400 dark:text-indigo-300 shadow-md' 
                                    : 'bg-white dark:bg-[var(--surface-2)] border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${broadcaster.type === type ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                    {type}
                                </span>
                                {type === 'OBS' && <Terminal size={20} />}
                                {type === 'VMIX' && <Radio size={20} />}
                                {type === 'NONE' && <X size={20} />}
                            </button>
                        ))}
                    </div>

                    {broadcaster.type !== 'NONE' && (
                        <div className="space-y-4 bg-white dark:bg-[var(--surface-2)]/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('broadcaster.ip', 'IP Address')}</label>
                                    <input 
                                        type="text" 
                                        value={broadcaster.ip} 
                                        onChange={(e) => handleUpdate({ ip: e.target.value })}
                                        className="w-full bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder="localhost"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('broadcaster.port', 'Port')}</label>
                                    <input 
                                        type="number" 
                                        value={broadcaster.port} 
                                        onChange={(e) => handleUpdate({ port: parseInt(e.target.value) })}
                                        className="w-full bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder={broadcaster.type === 'OBS' ? '4455' : '8088'}
                                    />
                                </div>
                            </div>

                            {broadcaster.type === 'OBS' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <Shield size={10} /> {t('broadcaster.password', 'Websocket Password')}
                                    </label>
                                    <input 
                                        type="password" 
                                        value={broadcaster.password || ''} 
                                        onChange={(e) => handleUpdate({ password: e.target.value })}
                                        className="w-full bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            {/* Timing Controls */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('broadcaster.preRoll', 'Pre-Roll (sec)')}</label>
                                    <input 
                                        type="number" 
                                        value={broadcaster.preRollSeconds} 
                                        onChange={(e) => handleUpdate({ preRollSeconds: parseInt(e.target.value) })}
                                        className="w-full bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('broadcaster.postRoll', 'Post-Roll (sec)')}</label>
                                    <input 
                                        type="number" 
                                        value={broadcaster.postRollSeconds} 
                                        onChange={(e) => handleUpdate({ postRollSeconds: parseInt(e.target.value) })}
                                        className="w-full bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                </div>
                            </div>

                            {/* Automation Toggles */}
                            <div className="space-y-3 pt-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={broadcaster.autoClipGoals} 
                                        onChange={(e) => handleUpdate({ autoClipGoals: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors uppercase tracking-widest text-[10px]">
                                        {t('broadcaster.autoGoals', 'Auto-Clip Goals')}
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={broadcaster.autoClipCards} 
                                        onChange={(e) => handleUpdate({ autoClipCards: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors uppercase tracking-widest text-[10px]">
                                        {t('broadcaster.autoCards', 'Auto-Clip Cards')}
                                    </span>
                                </label>
                            </div>

                            {/* Test Connection Button */}
                            <div className="pt-4">
                                <button
                                    onClick={runTestConnection}
                                    disabled={testStatus.loading}
                                    className={`w-full py-3 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                                        testStatus.loading 
                                        ? 'bg-[var(--surface-2)] text-slate-400 cursor-not-allowed' 
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]'
                                    }`}
                                >
                                    {testStatus.loading ? (
                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Radio size={16} />
                                            {t('broadcaster.testConnection', 'Test Connection')}
                                        </>
                                    )}
                                </button>

                                {testStatus.message && (
                                    <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 text-xs animate-in zoom-in-95 duration-200 ${
                                        testStatus.success 
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800' 
                                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-800'
                                    }`}>
                                        {testStatus.success ? <Check size={16} /> : <AlertCircle size={16} />}
                                        <span className="font-medium">{testStatus.message}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Help Section */}
            <div className="bg-[var(--surface-2)] dark:bg-[var(--surface-1)] p-4 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-widest">
                    <HelpCircle size={14} /> {t('common.help', 'Setup Guide')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {broadcaster.type === 'OBS' && (
                        <p>In OBS Studio, go to <span className="font-bold text-slate-700 dark:text-slate-200">Tools → WebSocket Server Settings</span>. Ensure the server is enabled and matches the port and password above. KorfStat Pro uses the <strong>Replay Buffer</strong> feature; make sure it is started in OBS before the match.</p>
                    )}
                    {broadcaster.type === 'VMIX' && (
                        <p>In vMix, go to <span className="font-bold text-slate-700 dark:text-slate-200">Settings → Replay</span>. Ensure Instant Replay is configured. Also check <span className="font-bold text-slate-700 dark:text-slate-200">Settings → Web Controller</span> to ensure the HTTP API is active.</p>
                    )}
                    {broadcaster.type === 'NONE' && (
                        <p>Broadcaster integration allows you to focus on the game while KorfStat Pro manages your stream production. High-quality clips will be saved automatically for post-match analysis.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BroadcasterSettingsView;
