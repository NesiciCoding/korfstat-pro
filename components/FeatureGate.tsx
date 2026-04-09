import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { useClub } from '../contexts/ClubContext';
import { SubscriptionPlan, PLAN_FEATURES } from '../types/subscription';

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  elite: 'Elite',
};

const PLAN_ORDER: SubscriptionPlan[] = ['free', 'starter', 'pro', 'elite'];

interface FeatureGateProps {
  /** The feature key to check (must match PLAN_FEATURES in subscription.ts) */
  feature: string;
  /** Minimum plan required — derived automatically if omitted */
  requiredPlan?: SubscriptionPlan;
  /** How to render when locked. 'lock' shows an overlay, 'hide' hides entirely. Default: 'lock' */
  mode?: 'lock' | 'hide';
  /** Custom locked fallback — overrides default lock overlay */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/** Returns the lowest plan that includes the given feature */
function lowestPlanFor(feature: string): SubscriptionPlan {
  for (const plan of PLAN_ORDER) {
    if ((PLAN_FEATURES[plan] as string[]).includes(feature)) return plan;
  }
  return 'elite';
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  requiredPlan,
  mode = 'lock',
  fallback,
  children,
}) => {
  const { hasFeature, plan } = useClub();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (mode === 'hide') {
    return fallback ? <>{fallback}</> : null;
  }

  // mode === 'lock' — show children blurred with overlay
  const needed = requiredPlan ?? lowestPlanFor(feature);
  const currentIdx = PLAN_ORDER.indexOf(plan);
  const neededIdx = PLAN_ORDER.indexOf(needed);

  const defaultLock = (
    <div className="relative inline-block w-full" data-testid="feature-gate-lock">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden>
        {children}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900/60 backdrop-blur-[1px] rounded-lg z-10">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-4 py-2 rounded-full shadow-xl">
          <Lock size={14} className="text-yellow-400" />
          <span className="text-sm font-bold text-white">
            {PLAN_LABELS[needed]} plan required
          </span>
        </div>
        {currentIdx < neededIdx && (
          <span className="text-xs text-gray-400">
            You're on {PLAN_LABELS[plan]} — upgrade to unlock
          </span>
        )}
      </div>
    </div>
  );

  return fallback ? <>{fallback}</> : defaultLock;
};

export default FeatureGate;

/**
 * Inline badge variant — shows a small lock icon next to nav items / buttons
 * without blurring content.
 */
export const FeatureLockBadge: React.FC<{ feature: string }> = ({ feature }) => {
  const { hasFeature } = useClub();
  if (hasFeature(feature)) return null;
  return (
    <span
      data-testid="feature-lock-badge"
      className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] font-bold uppercase tracking-wide"
    >
      <Lock size={9} /> Pro
    </span>
  );
};

/**
 * Upgrade nudge banner — use at the top of gated sections.
 */
export const UpgradeBanner: React.FC<{ feature: string; message?: string }> = ({
  feature,
  message,
}) => {
  const { hasFeature, plan } = useClub();
  if (hasFeature(feature)) return null;
  const needed = lowestPlanFor(feature);
  return (
    <div
      data-testid="upgrade-banner"
      className="flex items-center gap-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700/50 rounded-xl px-4 py-3 mb-4"
    >
      <Zap size={18} className="text-yellow-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">
          {message ?? `Upgrade to ${PLAN_LABELS[needed]} to unlock this feature`}
        </p>
        <p className="text-xs text-gray-400">
          Current plan: <span className="font-bold text-indigo-300">{PLAN_LABELS[plan]}</span>
        </p>
      </div>
    </div>
  );
};
