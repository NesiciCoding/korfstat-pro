import React, { useState } from 'react';
import { X, Moon, Sun, Monitor, Volume2, VolumeX, Trash2, Radio, Languages, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings, Settings } from '../contexts/SettingsContext';
import CompanionSetup from './CompanionSetup';
import AssetUploader from './AssetUploader';
import BroadcasterSettingsView from './BroadcasterSettingsView';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (view: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onNavigate }) => {
    const { settings, updateSettings, clearAllData } = useSettings();
    const { t } = useTranslation();
    const [showCompanion, setShowCompanion] = useState(false);
    const [showBroadcaster, setShowBroadcaster] = useState(false);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh] transition-colors duration-300">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex gap-4">
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{t('settings.title')}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8 overflow-y-auto flex-1">


                    <>
                        {/* Appearance Section */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('settings.general')}</label>
                            <div className="grid grid-cols-3 gap-2">
                                <ThemeOption
                                    active={settings.theme === 'light'}
                                    onClick={() => updateSettings({ theme: 'light' })}
                                    icon={<Sun size={18} />}
                                    label={t('settings.light')}
                                />
                                <ThemeOption
                                    active={settings.theme === 'dark'}
                                    onClick={() => updateSettings({ theme: 'dark' })}
                                    icon={<Moon size={18} />}
                                    label={t('settings.dark')}
                                />
                                <ThemeOption
                                    active={settings.theme === 'system'}
                                    onClick={() => updateSettings({ theme: 'system' })}
                                    icon={<Monitor size={18} />}
                                    label={t('settings.system')}
                                />
                            </div>

                            {/* Language Selector */}
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mt-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                                        <Languages size={18} />
                                    </div>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">{t('settings.language')}</span>
                                </div>
                                <select
                                    value={settings.language}
                                    onChange={(e) => updateSettings({ language: e.target.value as any })}
                                    className="bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                                >
                                    <option value="en">English</option>
                                    <option value="nl">Nederlands</option>
                                </select>
                            </div>

                            {/* Show Timer in Title */}
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-900 dark:text-gray-100">{t('settings.showTimerTitle')}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.showTimerInTitle}
                                        onChange={(e) => updateSettings({ showTimerInTitle: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Match Settings Section */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('settings.matchFunctions')}</label>

                            {/* Sound */}
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${settings.soundEnabled ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                    </div>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{t('settings.gameEffects')}</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.soundEnabled}
                                        onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {/* Match Type */}
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-900 dark:text-gray-100">{t('settings.matchType')}</span>
                                <select
                                    value={settings.matchType}
                                    onChange={(e) => updateSettings({ matchType: e.target.value as any })}
                                    className="bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                                >
                                    <option value="indoor">{t('settings.indoor')}</option>
                                    <option value="beach">{t('settings.beach')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Keyboard Shortcuts Section */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('settings.shortcuts')}</label>
                            
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                                {/* Chorded Shortcuts */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                                                <Monitor size={18} />
                                            </div>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">{t('settings.enableChorded')}</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.enableChordedShortcuts}
                                                onChange={(e) => updateSettings({ enableChordedShortcuts: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg flex gap-3 text-xs text-amber-700 dark:text-amber-400">
                                        <div className="mt-0.5">⚠️</div>
                                        <span>{t('settings.shortcutWarning')}</span>
                                    </div>
                                </div>

                                {/* Sequence Buffering */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                                            <Radio size={18} />
                                        </div>
                                        <span className="text-gray-900 dark:text-gray-100 font-medium">{t('settings.enableSequence')}</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.enableSequenceBuffering}
                                            onChange={(e) => updateSettings({ enableSequenceBuffering: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Match Defaults */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('settings.match_defaults')}</label>

                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-900 dark:text-gray-100 text-sm">{t('settings.wearOsMode')}</span>
                                    <select
                                        value={settings.watchControlMode}
                                        onChange={(e) => updateSettings({ watchControlMode: e.target.value as any })}
                                        className="bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                                    >
                                        <option value="read-only">{t('settings.readOnly')}</option>
                                        <option value="write">{t('settings.write')}</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-900 dark:text-gray-100 text-sm">{t('settings.halfDuration')}</span>
                                    <select
                                        value={settings.defaultHalfDuration}
                                        onChange={(e) => updateSettings({ defaultHalfDuration: Number(e.target.value) })}
                                        className="bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                                    >
                                        <option value={10}>{t('settings.minutes', { count: 10 })}</option>
                                        <option value={12.5}>{t('settings.minutes', { count: 12.5 })}</option>
                                        <option value={15}>{t('settings.minutes', { count: 15 })}</option>
                                        <option value={20}>{t('settings.minutes', { count: 20 })}</option>
                                        <option value={25}>{t('settings.minutes', { count: 25 })}</option>
                                        <option value={30}>{t('settings.minutes', { count: 30 })}</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Home Team</label>
                                        <input
                                            type="text"
                                            value={settings.defaultHomeName}
                                            onChange={(e) => updateSettings({ defaultHomeName: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg p-2"
                                            placeholder="Home"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Away Team</label>
                                        <input
                                            type="text"
                                            value={settings.defaultAwayName}
                                            onChange={(e) => updateSettings({ defaultAwayName: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg p-2"
                                            placeholder="Away"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Integrations */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('settings.integrations')}</label>

                            {/* Companion / Button-Box Integration */}
                            <div>
                                <button
                                    onClick={() => setShowCompanion(c => !c)}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                        showCompanion
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Radio size={16} className={showCompanion ? 'text-indigo-500' : 'text-gray-500'} />
                                        <span className="font-medium text-sm">{t('settings.companion')}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">{showCompanion ? t('settings.hide') : t('settings.configure')}</span>
                                </button>
                                {showCompanion && (
                                    <div className="mt-2 p-3 bg-gray-900 rounded-xl border border-gray-700">
                                        <CompanionSetup onNavigate={(v) => {
                                            onNavigate?.(v);
                                            onClose(); // Close modal when navigating
                                        }} />
                                    </div>
                                )}
                            </div>

                            {/* Broadcaster Integration */}
                            <div>
                                <button
                                    onClick={() => setShowBroadcaster(b => !b)}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                        showBroadcaster
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Video size={16} className={showBroadcaster ? 'text-indigo-500' : 'text-gray-500'} />
                                        <span className="font-medium text-sm">{t('broadcaster.title', 'Broadcaster Integration')}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">{showBroadcaster ? t('settings.hide') : t('settings.configure')}</span>
                                </button>
                                {showBroadcaster && (
                                    <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <BroadcasterSettingsView />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Social Graphics Output Config */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('settings.socialGraphics')}</label>

                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.layoutStyle')}</label>
                                    <select
                                        value={settings.socialGraphicConfig?.style || 'modern'}
                                        onChange={(e) => updateSettings({ 
                                            socialGraphicConfig: { 
                                                ...(settings.socialGraphicConfig || { style: 'modern' }), 
                                                style: e.target.value as any 
                                            } 
                                        })}
                                        className="w-full bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg p-2"
                                    >
                                        <option value="modern">{t('settings.modern')}</option>
                                        <option value="minimal">{t('settings.minimal')}</option>
                                        <option value="neon">{t('settings.neon')}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <AssetUploader 
                                        label={t('settings.bgImage')}
                                        currentUrl={settings.socialGraphicConfig?.backgroundImageUrl} 
                                        onUploadSuccess={(url) => updateSettings({ 
                                            socialGraphicConfig: { 
                                                ...(settings.socialGraphicConfig || { style: 'modern' }), 
                                                backgroundImageUrl: url 
                                            } 
                                        })} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <AssetUploader 
                                        label={t('settings.sponsorLogo')}
                                        currentUrl={settings.socialGraphicConfig?.sponsorLogoUrl} 
                                        onUploadSuccess={(url) => updateSettings({ 
                                            socialGraphicConfig: { 
                                                ...(settings.socialGraphicConfig || { style: 'modern' }), 
                                                sponsorLogoUrl: url 
                                            } 
                                        })} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sponsor Multi-Asset Management */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('settings.sponsors')}</label>
                            
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-5">
                                {/* Interval Control */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.rotationInterval')}</label>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="range"
                                            min="5"
                                            max="60"
                                            step="5"
                                            value={settings.sponsorRotationInterval}
                                            onChange={(e) => updateSettings({ sponsorRotationInterval: parseInt(e.target.value) })}
                                            className="flex-1 accent-indigo-600"
                                        />
                                        <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 w-8">{settings.sponsorRotationInterval}s</span>
                                    </div>
                                </div>

                                {/* Logo List */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">{t('settings.sponsors')}</label>
                                    
                                    {(settings.sponsorLogos || []).length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {settings.sponsorLogos.map((url, idx) => (
                                                <div key={idx} className="group relative aspect-video bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                                                    <img 
                                                        src={url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${url}`} 
                                                        alt={`Sponsor ${idx + 1}`}
                                                        className="w-full h-full object-contain p-2"
                                                    />
                                                    <button 
                                                        onClick={() => updateSettings({ 
                                                            sponsorLogos: settings.sponsorLogos.filter((_, i) => i !== idx) 
                                                        })}
                                                        className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                            <p className="text-xs text-gray-400 italic">{t('settings.noSponsors')}</p>
                                        </div>
                                    )}

                                    <AssetUploader 
                                        label={t('settings.addSponsor')}
                                        onUploadSuccess={(url) => {
                                            if (url) {
                                                updateSettings({ sponsorLogos: [...(settings.sponsorLogos || []), url] });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        {/* Danger Zone */}
                        <div className="space-y-3 pt-2">
                            <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">{t('settings.dangerZone')}</h3>
                            <button
                                onClick={clearAllData}
                                className="w-full flex items-center justify-center gap-2 p-3 text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-lg transition-colors font-semibold text-sm"
                            >
                                <Trash2 size={16} />
                                {t('settings.clearAll')}
                            </button>
                        </div>
                    </>

                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                    >
                        {t('settings.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ThemeOption = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 gap-2
      ${active
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-750'
            }`}
    >
        {icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);

export default SettingsModal;
