import React from 'react';
import { X, Moon, Sun, Monitor, Volume2, VolumeX, Trash2, RotateCcw, User } from 'lucide-react';
import { useSettings, Settings } from '../contexts/SettingsContext';


interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings, clearAllData } = useSettings();



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transition-colors duration-300">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex gap-4">
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Settings</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8 min-h-[400px]">


                    <>
                        {/* Theme Section */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Appearance</label>
                            <div className="grid grid-cols-3 gap-2">
                                <ThemeOption
                                    active={settings.theme === 'light'}
                                    onClick={() => updateSettings({ theme: 'light' })}
                                    icon={<Sun size={18} />}
                                    label="Light"
                                />
                                <ThemeOption
                                    active={settings.theme === 'dark'}
                                    onClick={() => updateSettings({ theme: 'dark' })}
                                    icon={<Moon size={18} />}
                                    label="Dark"
                                />
                                <ThemeOption
                                    active={settings.theme === 'system'}
                                    onClick={() => updateSettings({ theme: 'system' })}
                                    icon={<Monitor size={18} />}
                                    label="System"
                                />
                            </div>
                        </div>

                        {/* Audio Section */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Sound</label>
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${settings.soundEnabled ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                        {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                    </div>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">Game Effects</span>
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
                            <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Controls buzzer and horn sounds during match.</p>
                        </div>

                        {/* Match Defaults */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Match Defaults</label>
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-900 dark:text-gray-100">Default Half Duration</span>
                                <select
                                    value={settings.defaultHalfDuration}
                                    onChange={(e) => updateSettings({ defaultHalfDuration: Number(e.target.value) })}
                                    className="bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                                >
                                    <option value={10}>10 Minutes</option>
                                    <option value={15}>15 Minutes</option>
                                    <option value={20}>20 Minutes</option>
                                    <option value={25}>25 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                </select>
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        {/* Danger Zone */}
                        <div className="space-y-3 pt-2">
                            <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">Danger Zone</h3>
                            <button
                                onClick={clearAllData}
                                className="w-full flex items-center justify-center gap-2 p-3 text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-lg transition-colors font-semibold text-sm"
                            >
                                <Trash2 size={16} />
                                Clear All Data
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
                        Done
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
