import React from 'react';
import { Cloud, CloudOff, CloudCog, WifiOff, RefreshCw } from 'lucide-react';
import { SyncState } from '../services/SyncService';

interface SyncStatusBadgeProps {
  state: SyncState;
  lastError?: string | null;
  lastSynced?: Date | null;
  onRetry?: () => void;
  className?: string;
}

const stateConfig: Record<SyncState, {
  icon: React.ReactNode;
  label: string;
  textClass: string;
}> = {
  idle:    { icon: <Cloud size={12} />,    label: 'Cloud',      textClass: 'text-[var(--text-muted)]' },
  syncing: { icon: <CloudCog size={12} className="animate-pulse" />, label: 'Syncing…', textClass: 'text-[var(--sync-syncing)]' },
  success: { icon: <Cloud size={12} />,    label: 'Saved',      textClass: 'text-[var(--sync-success)]' },
  error:   { icon: <CloudOff size={12} />, label: 'Sync Error', textClass: 'text-[var(--sync-error)]' },
  offline: { icon: <WifiOff size={12} />,  label: 'Offline',    textClass: 'text-[var(--sync-offline)]' },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  state,
  lastError,
  lastSynced,
  onRetry,
  className = '',
}) => {
  const { icon, label, textClass } = stateConfig[state];

  return (
    <div
      className={[
        'flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm text-[10px] font-bold tracking-widest uppercase',
        textClass,
        className,
      ].join(' ')}
      title={
        state === 'error' ? (lastError ?? 'Sync failed') :
        state === 'success' && lastSynced ? `Last saved ${lastSynced.toLocaleTimeString()}` :
        state === 'offline' ? 'No internet connection' :
        undefined
      }
    >
      {icon}
      <span>{label}</span>
      {(state === 'error' || state === 'offline') && onRetry && (
        <button
          onClick={onRetry}
          className="ml-1 hover:opacity-75 transition-opacity"
          title="Retry sync"
          aria-label="Retry sync"
        >
          <RefreshCw size={10} />
        </button>
      )}
    </div>
  );
};
