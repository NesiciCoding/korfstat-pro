import React, { createContext, useState, useContext, ReactNode } from 'react';
import { X, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type DialogType = 'alert' | 'confirm' | 'prompt';

interface DialogConfig {
    title?: string;
    message: string;
    defaultValue?: string;
    type: DialogType;
    resolve: (value: any) => void;
}

interface DialogContextType {
    alert: (message: string, title?: string) => Promise<void>;
    confirm: (message: string, title?: string) => Promise<boolean>;
    prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<DialogConfig | null>(null);
    const [inputValue, setInputValue] = useState('');
    const { t } = useTranslation();

    const alert = (message: string, title?: string): Promise<void> => {
        return new Promise((resolve) => {
            setConfig({ type: 'alert', message, title, resolve });
        });
    };

    const confirm = (message: string, title?: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfig({ type: 'confirm', message, title, resolve });
        });
    };

    const prompt = (message: string, defaultValue: string = '', title?: string): Promise<string | null> => {
        setInputValue(defaultValue);
        return new Promise((resolve) => {
            setConfig({ type: 'prompt', message, title, defaultValue, resolve });
        });
    };

    const handleClose = (value: any) => {
        if (config) {
            config.resolve(value);
            setConfig(null);
            setInputValue('');
        }
    };

    return (
        <DialogContext.Provider value={{ alert, confirm, prompt }}>
            {children}
            {config && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        {/* Header/Icon Area */}
                        <div className="p-6 pb-2 flex flex-col items-center gap-4">
                            <div className={`p-4 rounded-full ${
                                config.type === 'alert' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                config.type === 'confirm' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                                {config.type === 'alert' && <AlertTriangle size={32} />}
                                {config.type === 'confirm' && <HelpCircle size={32} />}
                                {config.type === 'prompt' && <Info size={32} />}
                            </div>
                            
                            {config.title && (
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{config.title}</h3>
                            )}
                            
                            <p className="text-center text-gray-600 dark:text-gray-300 font-medium">
                                {config.message}
                            </p>
                        </div>

                        {/* Prompt Input */}
                        {config.type === 'prompt' && (
                            <div className="px-6 py-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleClose(inputValue);
                                        if (e.key === 'Escape') handleClose(null);
                                    }}
                                />
                            </div>
                        )}

                        {/* Footer Buttons */}
                        <div className="p-6 pt-4 flex gap-3">
                            {(config.type === 'confirm' || config.type === 'prompt') && (
                                <button
                                    onClick={() => handleClose(config.type === 'confirm' ? false : null)}
                                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-bold transition-all"
                                >
                                    {t('common.cancel')}
                                </button>
                            )}
                            <button
                                onClick={() => handleClose(config.type === 'prompt' ? inputValue : true)}
                                className={`flex-1 px-4 py-3 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${
                                    config.type === 'alert' ? 'bg-amber-600 hover:bg-amber-700' :
                                    'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {config.type === 'alert' ? 'OK' : t('common.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};
