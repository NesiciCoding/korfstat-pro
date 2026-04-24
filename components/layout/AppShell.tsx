/**
 * AppShell — wraps all authenticated views with a persistent sidebar (lg+)
 * and a mobile bottom tab bar (<lg).
 *
 * Breakpoint strategy:
 *   sm (640px) — secondary tablet portrait tweaks
 *   md (768px) — primary layout breakpoint
 *   lg (1024px) — sidebar visible, two-column layouts active
 *
 * View categories:
 *   Desktop/tablet-first (mouse/touch, phone secondary): TRACK, JURY, SPOTTER
 *   Mobile-optimised (phone is realistic primary):       COMPANION_DASHBOARD
 *   Desktop-first (data-heavy):                         STATS, ANALYSIS, etc.
 *   Broadcast-only (fixed aspect, no mobile):           STREAM_OVERLAY, TICKER_OVERLAY, SHOT_CLOCK
 *
 * Shell-exempt views render as bare children with no sidebar/tabbar chrome.
 * Full-bleed views get a sidebar but their content area has p-0.
 */
import React, { useCallback } from 'react';
import SidebarNav from './SidebarNav';
import MobileTabBar from './MobileTabBar';
import { SyncState } from '../../services/SyncService';

type ViewId = string;

/** Rendered bare — used as OBS browser sources, popups, or public pages */
const SHELL_EXEMPT = new Set([
  'LANDING',
  'TICKER',
  'TICKER_OVERLAY',
  'STREAM_OVERLAY',
  'SHOT_CLOCK',
  'VOTING',
  'ABOUT',
  'PRIVACY',
  'SUPPORT',
  'API_DOCS',
]);

/** Sidebar visible but content area has p-0 (view manages its own layout) */
const FULL_BLEED = new Set(['TRACK']);

interface SyncStatusProps {
  state: SyncState;
  lastError?: string | null;
  lastSynced?: Date | null;
}

interface AppShellProps {
  view: ViewId;
  setView: (v: ViewId) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  syncStatus: SyncStatusProps;
  lastSaved: number | null;
  onSyncRetry: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({
  view,
  setView,
  onOpenSettings,
  onLogout,
  syncStatus,
  lastSaved,
  onSyncRetry,
  isCollapsed,
  onToggleCollapsed,
  children,
}) => {
  // Shell-exempt views — pass children through unchanged
  if (SHELL_EXEMPT.has(view)) {
    return <>{children}</>;
  }

  const isFullBleed = FULL_BLEED.has(view);
  const sidebarWidth = isCollapsed ? 'lg:pl-14' : 'lg:pl-60';

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-0)]">
      {/* Sidebar — visible on lg+ only */}
      <div className="hidden lg:flex flex-none">
        <SidebarNav
          view={view}
          setView={setView}
          collapsed={isCollapsed}
          onToggleCollapsed={onToggleCollapsed}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
          syncStatus={syncStatus}
          lastSaved={lastSaved}
          onRetry={onSyncRetry}
        />
      </div>

      {/* Content area */}
      <main
        className={`flex-1 overflow-y-auto ${
          isFullBleed ? '' : 'p-4 md:p-6'
        } pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-6`}
      >
        {children}
      </main>

      {/* Mobile tab bar — visible below lg only */}
      <div className="lg:hidden">
        <MobileTabBar view={view} setView={setView} />
      </div>
    </div>
  );
};

export default AppShell;
export { SHELL_EXEMPT, FULL_BLEED };
