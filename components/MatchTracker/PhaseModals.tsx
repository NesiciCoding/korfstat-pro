import React from 'react';
import { Clock, PieChart, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ActiveModal } from './types';

interface PhaseModalsProps {
  show: boolean;
  activeModal: ActiveModal;
  customDuration: number;
  onClose: () => void;
  onCustomDurationChange: (v: number) => void;
  onStartBreak: (minutes: number) => void;
  onStartNextPeriod: (minutes: number) => void;
  onSetActiveModal: (modal: ActiveModal) => void;
  onFinishMatch: () => void;
}

const PhaseModals: React.FC<PhaseModalsProps> = ({
  show, activeModal, customDuration, onClose,
  onCustomDurationChange, onStartBreak, onStartNextPeriod,
  onSetActiveModal, onFinishMatch,
}) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md" onClick={e => e.stopPropagation()}>

        {activeModal === 'END_HALF' && (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('matchTracker.endHalf')}</h3>
            <p className="text-gray-500 mb-6">{t('matchTracker.halfEndDesc')}</p>
            <div className="space-y-3">
              <button data-testid="start-break-btn-main" onClick={() => onStartBreak(10)} className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center justify-between">
                <span>{t('matchTracker.startBreak')}</span><Clock size={20} />
              </button>
              <button onClick={() => { onCustomDurationChange(10); onSetActiveModal('BREAK_SETUP'); }} className="w-full p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-left">
                {t('matchTracker.customBreak')}
              </button>
              <div className="border-t my-2" />
              <button onClick={() => onStartNextPeriod(25)} className="w-full p-4 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg text-left">
                {t('matchTracker.skipTo2ndHalf')}
              </button>
              <div className="border-t my-2" />
              <button data-testid="finish-match-btn" onClick={onFinishMatch} className="w-full p-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-left">
                {t('matchTracker.finishMatch')}
              </button>
            </div>
          </>
        )}

        {activeModal === 'BREAK_SETUP' && (
          <>
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('matchTracker.breakDuration')}</h3>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => onCustomDurationChange(Math.max(1, customDuration - 1))} className="p-3 bg-gray-100 rounded-lg font-bold">-</button>
              <div className="text-3xl font-mono font-bold w-20 text-center">{customDuration}m</div>
              <button onClick={() => onCustomDurationChange(customDuration + 1)} className="p-3 bg-gray-100 rounded-lg font-bold">+</button>
            </div>
            <button data-testid="start-break-btn-custom" onClick={() => onStartBreak(customDuration)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg">
              {t('matchTracker.startBreak')}
            </button>
          </>
        )}

        {activeModal === 'END_MATCH' && (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('matchTracker.endMatch')}</h3>
            <p className="text-gray-500 mb-6">{t('matchTracker.periodEndDesc')}</p>
            <div className="space-y-3">
              <button data-testid="finish-match-btn" onClick={onFinishMatch} className="w-full p-4 bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-lg flex items-center justify-between shadow-lg">
                <span>{t('matchTracker.finishMatch')}</span><PieChart size={20} />
              </button>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-300" />
                <span className="flex-shrink mx-4 text-gray-400 text-sm font-bold">{t('common.or')}</span>
                <div className="flex-grow border-t border-gray-300" />
              </div>
              <button data-testid="overtime-btn" onClick={() => { onCustomDurationChange(5); onSetActiveModal('OT_SETUP'); }} className="w-full p-4 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg flex items-center justify-between">
                <span>{t('matchTracker.overtime')}</span><Timer size={20} />
              </button>
            </div>
          </>
        )}

        {activeModal === 'OT_SETUP' && (
          <div data-testid="select-overtime-duration-modal">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t('matchTracker.overtimeDuration')}</h3>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => onCustomDurationChange(Math.max(1, customDuration - 1))} className="p-3 bg-gray-100 rounded-lg font-bold">-</button>
              <div className="text-3xl font-mono font-bold w-20 text-center">{customDuration}m</div>
              <button onClick={() => onCustomDurationChange(customDuration + 1)} className="p-3 bg-gray-100 rounded-lg font-bold">+</button>
            </div>
            <button onClick={() => onStartNextPeriod(customDuration)} className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg">
              {t('matchTracker.startOvertime')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhaseModals;
