import React, { useState, useRef, useEffect } from 'react';
import { Home, Timer, BarChart2, Radio, MoreHorizontal, X, LucideIcon } from 'lucide-react';
import { NAV_GROUPS, NavItem } from './SidebarNav';
import { FeatureLockBadge } from '../FeatureGate';

type ViewId = string;

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  directView?: ViewId;
  groupId?: string;
}

const TABS: Tab[] = [
  { id: 'home', label: 'Home', icon: Home, directView: 'HOME' },
  { id: 'match', label: 'Match', icon: Timer, groupId: 'match' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, groupId: 'analytics' },
  { id: 'broadcast', label: 'Broadcast', icon: Radio, groupId: 'broadcast' },
  { id: 'more', label: 'More', icon: MoreHorizontal, groupId: 'management' },
];

interface MobileTabBarProps {
  view: ViewId;
  setView: (v: ViewId) => void;
}

const MobileTabBar: React.FC<MobileTabBarProps> = ({ view, setView }) => {
  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openSheet) return;
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setOpenSheet(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openSheet]);

  const handleTab = (tab: Tab) => {
    if (tab.directView) {
      setView(tab.directView);
      setOpenSheet(null);
    } else if (tab.groupId) {
      setOpenSheet(prev => (prev === tab.id ? null : tab.id));
    }
  };

  const handleItem = (item: NavItem) => {
    setView(item.view);
    setOpenSheet(null);
  };

  const isTabActive = (tab: Tab) => {
    if (tab.directView) return view === tab.directView;
    if (tab.groupId) {
      const group = NAV_GROUPS.find(g => g.id === tab.groupId);
      return !!group?.items.some(i => i.view === view);
    }
    return false;
  };

  const activeSheet = openSheet
    ? NAV_GROUPS.find(g => TABS.find(t => t.id === openSheet)?.groupId === g.id)
    : null;

  return (
    <>
      {/* Fly-up sheet */}
      {openSheet && activeSheet && (
        <div
          ref={sheetRef}
          className="fixed bottom-16 left-0 right-0 z-50 mx-3 mb-1 bg-[var(--surface-1)] border border-[var(--border-default)] rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-default)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{activeSheet.label}</span>
            <button
              onClick={() => setOpenSheet(null)}
              className="p-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {activeSheet.items.map(item => {
              const ItemIcon = item.icon;
              const isActive = item.view === view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleItem(item)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ItemIcon size={15} className="flex-none" />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.feature && <FeatureLockBadge feature={item.feature} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {openSheet && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpenSheet(null)}
        />
      )}

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface-1)] border-t border-[var(--border-default)] flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {TABS.map(tab => {
          const TabIcon = tab.icon;
          const active = isTabActive(tab);
          const sheetOpen = openSheet === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                active || sheetOpen
                  ? 'text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <TabIcon size={20} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default MobileTabBar;
