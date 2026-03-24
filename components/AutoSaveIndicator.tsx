import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AutoSaveIndicatorProps {
    lastSaved: number | null;
    className?: string;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ lastSaved, className = "" }) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (lastSaved) {
            setShow(true);
            const timer = setTimeout(() => setShow(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [lastSaved]);

    if (!lastSaved) return null;

    const timeString = new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'} ${className}`}>
            <div className={`w-2 h-2 rounded-full ${show ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-none">
                    {t('common.autoSave')}
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                    {timeString}
                </span>
            </div>
        </div>
    );
};

export default AutoSaveIndicator;
