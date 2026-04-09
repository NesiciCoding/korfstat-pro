import React from 'react';
import { Target, Shield, AlertOctagon, ArrowRightLeft, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ShortcutAction = 'GOAL' | 'MISS' | 'FREE_THROW' | 'PENALTY' | 'TURNOVER' | 'REBOUND';

interface QuickActionsBarProps {
  refWatchMode: boolean;
  onAction: (action: ShortcutAction) => void;
  onOpenRefWatch: () => void;
}

const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ refWatchMode, onAction, onOpenRefWatch }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-3 md:px-6 py-3 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3 md:gap-6 z-40 transform transition-all hover:scale-105 max-w-[calc(100vw-1rem)]">
      <button onClick={() => onAction('GOAL')} className="flex flex-col items-center gap-1 text-green-600 hover:text-green-700 font-bold group">
        <Target size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.goal')}</span>
      </button>
      <button onClick={() => onAction('MISS')} className="flex flex-col items-center gap-1 text-red-500 hover:text-red-700 font-bold group">
        <Target size={24} className="opacity-70 group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.miss')}</span>
      </button>
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
      <button onClick={() => onAction('PENALTY')} className="flex flex-col items-center gap-1 text-yellow-600 hover:text-yellow-700 font-bold group">
        <AlertOctagon size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.penalty')}</span>
      </button>
      <button onClick={() => onAction('FREE_THROW')} className="flex flex-col items-center gap-1 text-blue-600 hover:text-blue-700 font-bold group">
        <Target size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.freePass')}</span>
      </button>
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
      <button onClick={() => onAction('TURNOVER')} className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-700 font-bold group">
        <ArrowRightLeft size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] hidden sm:inline">{t('matchTracker.turnover')}</span>
        <span className="text-[10px] sm:hidden">TO</span>
      </button>
      <button onClick={() => onAction('REBOUND')} className="flex flex-col items-center gap-1 text-orange-500 hover:text-orange-700 font-bold group">
        <Shield size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.rebound')}</span>
      </button>
      {refWatchMode && (
        <>
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <button
            data-testid="quick-ref-watch-btn"
            onClick={onOpenRefWatch}
            className="flex flex-col items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold group"
          >
            <EyeOff size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px]">Ref-Watch</span>
          </button>
        </>
      )}
    </div>
  );
};

export default QuickActionsBar;
