import { 
  Play, Activity, Wifi, Users, 
  ExternalLink, Trash2, GripVertical, Plus,
  Monitor, Video, Tv, LayoutTemplate, Clock, Code,
  Globe, Trophy, Watch, BrainCircuit, History, BarChart2,
  Lock, Settings, UserCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MatchState } from '../types';

export type WidgetType = 'MATCH_CONTROL' | 'SESSIONS' | 'QUICK_LINK' | 'PLACEHOLDER';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title?: string;
  targetView?: string;
  w: number; // 1 or 2
  h: number; // 1 or 2
}

interface DashboardWidgetProps {
  config: WidgetConfig;
  isEditing?: boolean;
  onRemove?: () => void;
  onNavigate?: (view: any) => void;
  matchState?: MatchState;
  activeSessions?: any[];
  uniqueSessions?: any[];
  onAdd?: () => void;
  onResize?: (id: string, w: number, h: number) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  config,
  isEditing,
  onRemove,
  onNavigate,
  matchState,
  uniqueSessions = [],
  onAdd,
  onResize,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}) => {
  const { t } = useTranslation();

  const getSpanClass = () => {
    const { w, h } = config;
    let classes = '';
    if (w === 2 && h === 2) classes = 'col-span-1 md:col-span-2 row-span-2';
    else if (w === 2) classes = 'col-span-1 md:col-span-2 row-span-1';
    else if (h === 2) classes = 'col-span-1 row-span-2';
    else classes = 'col-span-1 row-span-1';
    return classes;
  };

  const getIcon = (view: string, size: number = 20) => {
    switch (view) {
      case 'SETUP': return <Settings size={size} />;
      case 'TRACK': return <Activity size={size} />;
      case 'STATS': return <BarChart2 size={size} />;
      case 'JURY': return <LayoutTemplate size={size} />;
      case 'LIVE': return <Tv size={size} />;
      case 'MATCH_HISTORY': return <History size={size} />;
      case 'OVERALL_STATS': return <BarChart2 size={size} />;
      case 'STRATEGY': return <BrainCircuit size={size} />;
      case 'LIVESTREAM_STATS': return <Globe size={size} />;
      case 'STREAM_OVERLAY': return <Video size={size} />;
      case 'DIRECTOR': return <Monitor size={size} />;
      case 'SHOT_CLOCK': return <Clock size={size} />;
      case 'SEASON_MANAGER': return <Trophy size={size} />;
      case 'CLUB_MANAGER': return <Users size={size} />;
      case 'SPOTTER': return <Users size={size} />;
      case 'ANALYSIS': return <BrainCircuit size={size} />;
      case 'VOTING': return <Users size={size} />;
      case 'TICKER': return <Code size={size} />;
      default: return <ExternalLink size={size} />;
    }
  };

  const renderContent = () => {
    switch (config.type) {
      case 'MATCH_CONTROL': {
        const hasActiveMatch = matchState?.isConfigured;
        const isLarge = config.w === 2 || config.h === 2;
        const isExtraLarge = config.w === 2 && config.h === 2;

        return (
          <div className="flex flex-col h-full justify-center p-6 bg-white dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 relative group overflow-hidden shadow-sm dark:shadow-none">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Play className="text-indigo-600 dark:text-indigo-400" size={20} /> {t('home.matchControl')}
                </h2>
                {isLarge && (
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">
                      {t('matchTracker.period')} {matchState?.currentHalf || 1}
                    </div>
                )}
            </div>
            
            <div className={`flex gap-4 ${config.h === 2 ? 'flex-col' : 'flex-row'} h-full items-stretch`}>
              <button
                onClick={() => !hasActiveMatch && onNavigate?.('SETUP')}
                disabled={hasActiveMatch}
                data-testid="start-match-btn"
                className={`p-6 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all flex-1
                  ${hasActiveMatch
                    ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02]'
                  }`}
              >
                <Play size={isExtraLarge ? 48 : 32} fill={hasActiveMatch ? "none" : "currentColor"} />
                <div className="text-center">
                  <div className="font-bold text-lg">{t('home.startNewMatch')}</div>
                  {hasActiveMatch && <div className="text-xs mt-1 text-slate-500 dark:text-slate-400">{t('home.matchInProgress')}</div>}
                </div>
              </button>
              {hasActiveMatch && (
                <button
                  onClick={() => onNavigate?.('TRACK')}
                  className="p-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] flex flex-col items-center justify-center gap-3 transition-all flex-1"
                >
                  <Activity size={isExtraLarge ? 48 : 32} />
                  <div className="text-center">
                    <div className="font-bold text-lg">{t('home.resumeTracker')}</div>
                    <div className="text-xs text-emerald-100 mt-1">{t('home.returnToActive')}</div>
                  </div>
                </button>
              )}
            </div>

            {isExtraLarge && matchState?.events && matchState.events.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{t('matchTracker.lastEvents')}</h3>
                    <div className="space-y-2">
                        {matchState.events.slice(-3).reverse().map((event, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 dark:text-slate-400">{event.type}</span>
                                <span className="font-mono text-slate-400">
                                    {Math.floor(event.timestamp / 60)}:{(event.timestamp % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        );
      }

      case 'SESSIONS': {
        const isLarge = config.h === 2;
        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden flex flex-col h-full min-h-[160px]">
            <div className={`p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 flex justify-between items-center ${isLarge ? 'py-6' : 'py-4'}`}>
              <h2 className={`font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2 ${isLarge ? 'text-xl' : 'text-base'}`}>
                <Wifi size={isLarge ? 24 : 18} className="text-emerald-600 dark:text-emerald-400" /> {t('home.activeSessions')}
              </h2>
              <span data-testid="active-sessions-count" className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full font-mono">{uniqueSessions.length}</span>
            </div>
            <div className={`flex-1 p-2 overflow-y-auto ${isLarge ? 'max-h-full' : 'max-h-[200px]'} space-y-1`}>
              {uniqueSessions.length === 0 ? (
                <div className="text-center p-8 text-slate-600 italic text-sm">
                  {t('home.waitingConnections')}
                </div>
              ) : (
                uniqueSessions.map(session => (
                    <div key={session.id} className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isLarge ? 'p-4' : 'p-2'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`font-bold text-slate-700 dark:text-slate-200 leading-tight ${isLarge ? 'text-sm' : 'text-xs'}`}>
                                {session.view || 'Connected'}
                            </div>
                            {isLarge && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                    ID: {session.id.slice(0, 8)}
                                </div>
                            )}
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                ))
              )}
            </div>
          </div>
        );
      }

      case 'QUICK_LINK': {
        const viewKey = config.targetView?.toLowerCase();
        const navTestId = `nav-${viewKey?.replace(/_/g, '-')}`;
        const isLarge = config.w === 2 || config.h === 2;
        return (
          <button
            onClick={() => onNavigate?.(config.targetView)}
            data-testid={navTestId}
            className="w-full p-6 h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left transition-all duration-200 group hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 shadow-sm dark:shadow-lg flex flex-col justify-between overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className={`flex ${isLarge ? 'flex-row justify-between w-full' : 'flex-col'} items-start`}>
              <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 group-hover:scale-110 transition-transform text-indigo-600 dark:text-indigo-400 shadow-sm z-10`}>
                {getIcon(config.targetView || '', isLarge ? 28 : 20)}
              </div>
              {!isLarge && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-2">{t('home.quickLink')}</div>}
              {isLarge && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full z-10">{t('home.quickLink')}</div>}
            </div>
            <div className={`${isLarge ? 'mt-auto w-full' : 'mt-4'} z-10`}>
              <h4 className={`${isLarge ? 'text-xl' : 'text-base'} font-bold text-slate-900 dark:text-white transition-colors`}>
                {t(`views.${viewKey}` as any) || config.title || formatViewName(config.targetView || '')}
              </h4>
              <p className={`${isLarge ? 'text-sm' : 'text-xs'} text-slate-500 dark:text-slate-400 transition-colors mt-1 line-clamp-2`}>
                {t(`views.${viewKey}_desc` as any)}
              </p>
            </div>
          </button>
        );
      }

      case 'PLACEHOLDER':
        return (
          <button
            onClick={onAdd}
            className="w-full h-full min-h-[140px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Plus size={32} />
            <span className="font-bold text-sm uppercase tracking-widest">{t('home.addWidget')}</span>
          </button>
        );

      default:
        return null;
    }
  };

  const formatViewName = (view: string) => {
    return view.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div 
      className={`relative group/widget ${getSpanClass()} transition-all duration-300 ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={isEditing && config.type !== 'PLACEHOLDER'}
      onDragStart={(e) => onDragStart?.(e, config.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver?.(e, config.id)}
      onDrop={(e) => onDrop?.(e, config.id)}
    >
      {renderContent()}
      
      {isEditing && config.type !== 'PLACEHOLDER' && (
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 items-end">
          <button
            onClick={onRemove}
            className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-xl shadow-lg transition-transform hover:scale-110 flex items-center gap-1 text-[10px] font-bold px-2"
          >
            <Trash2 size={12} /> {t('common.remove')}
          </button>
          
          <div className="flex gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <button 
                onClick={() => onResize?.(config.id, 1, 1)}
                className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold transition-colors ${config.w === 1 && config.h === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title="1x1"
            >
                1x1
            </button>
            <button 
                onClick={() => onResize?.(config.id, 2, 1)}
                className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold transition-colors ${config.w === 2 && config.h === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title="2x1"
            >
                2x1
            </button>
            <button 
                onClick={() => onResize?.(config.id, 1, 2)}
                className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold transition-colors ${config.w === 1 && config.h === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title="1x2"
            >
                1x2
            </button>
            <button 
                onClick={() => onResize?.(config.id, 2, 2)}
                className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold transition-colors ${config.w === 2 && config.h === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title="2x2"
            >
                2x2
            </button>
          </div>
        </div>
      )}
      
      {isEditing && config.type !== 'PLACEHOLDER' && (
        <div className="absolute bottom-2 left-2 z-20 pointer-events-none text-slate-400 dark:text-slate-600 opacity-50">
          <GripVertical size={16} />
        </div>
      )}
    </div>
  );
};

export default DashboardWidget;
