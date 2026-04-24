import React, { useState } from 'react';
import {
  Home, ClipboardList, Timer, Scale, Eye,
  BarChart2, History, TrendingUp, Search, Telescope, Monitor,
  Radio, Layers, Video, Newspaper, Layout, Palette,
  Calendar, Users, Dumbbell, Activity, Map, Smartphone,
  HelpCircle, FileText, BookOpen,
  ChevronLeft, ChevronRight, ChevronDown, Settings, LogOut,
  LucideIcon,
} from 'lucide-react';
import { useClub } from '../../contexts/ClubContext';
import { FeatureLockBadge } from '../FeatureGate';
import { SyncStatusBadge } from '../SyncStatusBadge';
import AutoSaveIndicator from '../AutoSaveIndicator';

type ViewId = string;

interface NavItem {
  view: ViewId;
  label: string;
  icon: LucideIcon;
  feature?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'match',
    label: 'Match',
    icon: Timer,
    items: [
      { view: 'SETUP', label: 'Setup', icon: ClipboardList },
      { view: 'TRACK', label: 'Tracker', icon: Timer },
      { view: 'JURY', label: 'Jury', icon: Scale },
      { view: 'SPOTTER', label: 'Spotter', icon: Eye },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart2,
    items: [
      { view: 'STATS', label: 'Statistics', icon: BarChart2 },
      { view: 'MATCH_HISTORY', label: 'Match History', icon: History },
      { view: 'OVERALL_STATS', label: 'Season Stats', icon: TrendingUp },
      { view: 'ANALYSIS', label: 'Analysis', icon: Search, feature: 'ANALYSIS' },
      { view: 'SCOUTING_REPORT', label: 'Scouting', icon: Telescope, feature: 'SCOUTING' },
      { view: 'LIVESTREAM_STATS', label: 'Livestream Stats', icon: Monitor, feature: 'BROADCASTING' },
    ],
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    icon: Radio,
    items: [
      { view: 'LIVE', label: 'Live Stats', icon: Monitor },
      { view: 'DIRECTOR', label: 'Director', icon: Video, feature: 'BROADCASTING' },
      { view: 'STREAM_OVERLAY', label: 'Stream Overlay', icon: Layers, feature: 'BROADCASTING' },
      { view: 'TICKER', label: 'Live Ticker', icon: Newspaper, feature: 'TICKER' },
      { view: 'TICKER_OVERLAY', label: 'Ticker Overlay', icon: Layout, feature: 'TICKER' },
      { view: 'TICKER_CUSTOMIZER', label: 'Ticker Style', icon: Palette, feature: 'TICKER' },
    ],
  },
  {
    id: 'management',
    label: 'Manage',
    icon: Users,
    items: [
      { view: 'HOME', label: 'Dashboard', icon: Home },
      { view: 'CLUB_MANAGER', label: 'Club', icon: Users },
      { view: 'SEASON_MANAGER', label: 'Seasons', icon: Calendar, feature: 'SEASON_MANAGER' },
      { view: 'TRAINING', label: 'Training', icon: Dumbbell, feature: 'TRAINING' },
      { view: 'PHYSICAL_TESTING', label: 'Fitness Tests', icon: Activity, feature: 'PHYSICAL_TESTING' },
      { view: 'STRATEGY', label: 'Strategy', icon: Map, feature: 'STRATEGY' },
      { view: 'COMPANION_DASHBOARD', label: 'Companion', icon: Smartphone, feature: 'COMPANION' },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    icon: HelpCircle,
    items: [
      { view: 'SUPPORT', label: 'Support', icon: HelpCircle },
      { view: 'API_DOCS', label: 'API Docs', icon: BookOpen },
      { view: 'ABOUT', label: 'About', icon: FileText },
    ],
  },
];

interface SidebarNavProps {
  view: ViewId;
  setView: (v: ViewId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  syncStatus: React.ComponentProps<typeof SyncStatusBadge>;
  lastSaved: number | null;
  onRetry: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({
  view,
  setView,
  collapsed,
  onToggleCollapsed,
  onOpenSettings,
  onLogout,
  syncStatus,
  lastSaved,
  onRetry,
}) => {
  const { activeClub, plan } = useClub();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const active = NAV_GROUPS.find(g => g.items.some(i => i.view === view));
    return new Set(active ? [active.id] : ['match']);
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNavItem = (item: NavItem) => {
    setView(item.view);
    if (collapsed) return;
  };

  const planColors: Record<string, string> = {
    free: 'text-gray-400',
    starter: 'text-blue-400',
    pro: 'text-violet-400',
    elite: 'text-amber-400',
  };

  return (
    <aside
      className={`flex flex-col h-screen bg-[var(--surface-1)] border-r border-[var(--border-default)] transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-[var(--border-default)]">
        {!collapsed && (
          <span className="font-bold text-[var(--text-primary)] text-sm tracking-tight truncate">
            KorfStat Pro
          </span>
        )}
        <button
          onClick={onToggleCollapsed}
          className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-auto"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5">
        {NAV_GROUPS.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const isGroupActive = group.items.some(i => i.view === view);
          const GroupIcon = group.icon;

          return (
            <div key={group.id}>
              {/* Group header */}
              <button
                onClick={() => !collapsed && toggleGroup(group.id)}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                  isGroupActive
                    ? 'text-[var(--brand-primary)] bg-blue-500/10'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? group.label : undefined}
              >
                <GroupIcon size={16} className="flex-none" />
                {!collapsed && (
                  <>
                    <span className="font-semibold flex-1 text-left">{group.label}</span>
                    <ChevronDown
                      size={14}
                      className={`flex-none transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </>
                )}
              </button>

              {/* Group items */}
              {(isExpanded || collapsed) && (
                <div className={collapsed ? 'space-y-0.5 mt-0.5' : 'ml-2 space-y-0.5 mt-0.5'}>
                  {group.items.map(item => {
                    const isActive = item.view === view;
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.view}
                        onClick={() => handleNavItem(item)}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors min-h-[36px] ${
                          isActive
                            ? 'bg-[var(--brand-primary)] text-white'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
                        } ${collapsed ? 'justify-center' : ''}`}
                        title={item.view === 'HOME' ? 'Go to Home' : (collapsed ? item.label : undefined)}
                        data-testid={item.view === 'HOME' ? 'home-nav-btn' : undefined}
                      >
                        <ItemIcon size={14} className="flex-none" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left truncate">{item.label}</span>
                            {item.feature && <FeatureLockBadge feature={item.feature} />}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border-default)] p-2 space-y-1">
        {/* Sync + autosave row */}
        {!collapsed && (
          <div className="flex items-center gap-2 px-1 py-1">
            <SyncStatusBadge
              state={syncStatus.state}
              lastError={syncStatus.lastError}
              lastSynced={syncStatus.lastSynced}
              onRetry={onRetry}
            />
            {lastSaved !== null && (
              <AutoSaveIndicator lastSaved={lastSaved} className="text-xs" />
            )}
          </div>
        )}

        {/* Club + plan info */}
        {!collapsed && activeClub && (
          <div className="px-2 py-1">
            <p className="text-xs text-[var(--text-muted)] truncate">{activeClub.name}</p>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${planColors[plan] ?? 'text-gray-400'}`}>
              {plan} plan
            </p>
          </div>
        )}

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Settings"
        >
          <Settings size={16} className="flex-none" />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Logout"
        >
          <LogOut size={16} className="flex-none" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default SidebarNav;
export { NAV_GROUPS };
export type { NavGroup, NavItem };
