import React from 'react';
import { Lock, Zap, ChevronLeft } from 'lucide-react';
import { useClub } from '../../contexts/ClubContext';
import { SubscriptionPlan, PLAN_FEATURES } from '../../types/subscription';

const PLAN_ORDER: SubscriptionPlan[] = ['free', 'starter', 'pro', 'elite'];
const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  elite: 'Elite',
};
const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: 'text-gray-400',
  starter: 'text-blue-400',
  pro: 'text-violet-400',
  elite: 'text-amber-400',
};

function lowestPlanFor(feature: string): SubscriptionPlan {
  for (const plan of PLAN_ORDER) {
    if ((PLAN_FEATURES[plan] as string[]).includes(feature)) return plan;
  }
  return 'elite';
}

interface UpgradePromptViewProps {
  feature: string;
  featureLabel?: string;
  onBack?: () => void;
}

const UpgradePromptView: React.FC<UpgradePromptViewProps> = ({ feature, featureLabel, onBack }) => {
  const { plan } = useClub();
  const requiredPlan = lowestPlanFor(feature);
  const label = featureLabel ?? feature.toLowerCase().replace(/_/g, ' ');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      {onBack && (
        <button
          onClick={onBack}
          className="self-start flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-8 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
      )}

      <div className="max-w-sm w-full">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-6">
          <Lock size={28} className="text-yellow-400" />
        </div>

        <h1
          className="font-bold text-[var(--text-primary)] mb-2 capitalize"
          style={{ fontSize: 'var(--text-h1)' }}
        >
          {label}
        </h1>
        <p className="text-[var(--text-muted)] mb-6" style={{ fontSize: 'var(--text-body)' }}>
          This feature requires the{' '}
          <span className={`font-bold ${PLAN_COLORS[requiredPlan]}`}>
            {PLAN_LABELS[requiredPlan]}
          </span>{' '}
          plan or higher.
        </p>

        <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Your current plan</span>
            <span className={`font-bold ${PLAN_COLORS[plan]}`}>{PLAN_LABELS[plan]}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-[var(--text-muted)]">Required plan</span>
            <span className={`font-bold ${PLAN_COLORS[requiredPlan]}`}>{PLAN_LABELS[requiredPlan]}</span>
          </div>
        </div>

        <a
          href="https://korfstat.pro/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl font-semibold transition-colors"
        >
          <Zap size={16} /> View plans &amp; pricing
        </a>
      </div>
    </div>
  );
};

export default UpgradePromptView;
