import React from 'react';
import { Target, Shield, AlertOctagon, ArrowRightLeft, EyeOff, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ShortcutAction = 'GOAL' | 'MISS' | 'FREE_THROW' | 'PENALTY' | 'TURNOVER' | 'REBOUND';

interface QuickActionsBarProps {
  refWatchMode: boolean;
  onAction: (action: ShortcutAction) => void;
  onOpenRefWatch: () => void;
  onToggleLog?: () => void;
  showLog?: boolean;
}

const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  refWatchMode,
  onAction,
  onOpenRefWatch,
  onToggleLog,
  showLog,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-3 md:px-6 py-3 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3 md:gap-6 z-40 transform transition-all hover:scale-105 max-w-[calc(100vw-1rem)] overflow-x-auto"
      style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <button onClick={() => onAction('GOAL')} className="flex flex-col items-center gap-1 text-green-600 hover:text-green-700 font-bold group min-w-[44px] min-h-[44px] justify-center">
        <Target size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.goal')}</span>
      </button>
      <button onClick={() => onAction('MISS')} className="flex flex-col items-center gap-1 text-red-500 hover:text-red-700 font-bold group min-w-[44px] min-h-[44px] justify-center">
        <Target size={24} className="opacity-70 group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.miss')}</span>
      </button>
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 flex-none" />
      <button onClick={() => onAction('PENALTY')} className="flex flex-col items-center gap-1 text-yellow-600 hover:text-yellow-700 font-bold group min-w-[44px] min-h-[44px] justify-center">
        <AlertOctagon size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.penalty')}</span>
      </button>
      <button onClick={() => onAction('FREE_THROW')} className="flex flex-col items-center gap-1 text-blue-600 hover:text-blue-700 font-bold group min-w-[44px] min-h-[44px] justify-center">
        <Target size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.freePass')}</span>
      </button>
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 flex-none" />
      <button onClick={() => onAction('TURNOVER')} className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-700 font-bold group min-w-[44px] min-h-[44px] justify-center">
        <ArrowRightLeft size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] hidden sm:inline">{t('matchTracker.turnover')}</span>
        <span className="text-[10px] sm:hidden">TO</span>
      </button>
      <button onClick={() => onAction('REBOUND')} className="flex flex-col items-center gap-1 text-orange-500 hover:text-orange-700 font-bold group min-w-[44px] min-h-[44px] justify-center">
        <Shield size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px]">{t('matchTracker.rebound')}</span>
      </button>
      {refWatchMode && (
        <>
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 flex-none" />
          <button
            data-testid="quick-ref-watch-btn"
            onClick={onOpenRefWatch}
            className="flex flex-col items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold group min-w-[44px] min-h-[44px] justify-center"
          >
            <EyeOff size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px]">Ref-Watch</span>
          </button>
        </>
      )}
      {/* Log toggle — mobile only */}
      {onToggleLog && (
        <>
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 flex-none lg:hidden" />
          <button
            onClick={onToggleLog}
            className={`lg:hidden flex flex-col items-center gap-1 font-bold group min-w-[44px] min-h-[44px] justify-center ${
              showLog ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="Match log"
          >
            <ClipboardList size={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px]">Log</span>
          </button>
        </>
      )}
    </div>
  );
};

export default QuickActionsBar;
