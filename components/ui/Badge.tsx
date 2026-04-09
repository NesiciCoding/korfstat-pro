import React from 'react';
import { SubscriptionPlan } from '../../types/subscription';
import { SyncState } from '../../services/SyncService';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border-default)]',
  success: 'bg-green-500/15 text-green-500 border-green-500/30',
  warning: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  danger:  'bg-red-500/15 text-red-500 border-red-500/30',
  info:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  muted:   'bg-transparent text-[var(--text-muted)] border-[var(--border-subtle)]',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--text-muted)]',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-400',
  muted:   'bg-[var(--text-muted)]',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', dot = false, children, className = '', ...props }) => (
  <span
    className={[
      'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-[var(--radius-pill)] border',
      variantClasses[variant],
      className,
    ].join(' ')}
    {...props}
  >
    {dot && <span className={['w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant]].join(' ')} />}
    {children}
  </span>
);

/** Plan badge with appropriate colour per tier */
export const PlanBadge: React.FC<{ plan: SubscriptionPlan; className?: string }> = ({ plan, className = '' }) => {
  const map: Record<SubscriptionPlan, { label: string; style: string }> = {
    free:    { label: 'Free',    style: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
    starter: { label: 'Starter', style: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    pro:     { label: 'Pro',     style: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
    elite:   { label: 'Elite',   style: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  };
  const { label, style } = map[plan];
  return (
    <span className={['inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-[var(--radius-pill)] border uppercase tracking-wide', style, className].join(' ')}>
      {label}
    </span>
  );
};

/** Sync state badge used in the status bar */
export const SyncBadge: React.FC<{ state: SyncState; className?: string }> = ({ state, className = '' }) => {
  const map: Record<SyncState, { label: string; variant: BadgeVariant; animate?: boolean }> = {
    idle:    { label: 'Cloud',     variant: 'muted' },
    syncing: { label: 'Syncing…',  variant: 'info',    animate: true },
    success: { label: 'Saved',     variant: 'success' },
    error:   { label: 'Sync Error',variant: 'danger' },
    offline: { label: 'Offline',   variant: 'warning' },
  };
  const { label, variant, animate } = map[state];
  return (
    <Badge variant={variant} dot className={className}>
      {animate && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping absolute" />}
      {label}
    </Badge>
  );
};
