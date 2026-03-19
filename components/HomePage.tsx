import React, { useMemo } from 'react';
import { 
  PlayCircle, History, BarChart2, BrainCircuit, 
  Monitor, Video, Tv, LayoutTemplate, Clock, Code, X, 
  Wifi, Users, Activity, Play, Globe, Trophy, Watch,
  Plus, Settings, Save, Edit2, ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MatchState } from '../types';
import DashboardWidget, { WidgetConfig } from './DashboardWidget';
import { useSettings } from '../contexts/SettingsContext';

interface HomePageProps {
  onNavigate: (view: any) => void;
  activeSessions?: any[];
  matchState?: MatchState;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'control', type: 'MATCH_CONTROL', w: 2, h: 1 },
  { id: 'sessions', type: 'SESSIONS', w: 1, h: 1 },
  { id: 'director', type: 'QUICK_LINK', targetView: 'DIRECTOR', w: 1, h: 1 },
  { id: 'track', type: 'QUICK_LINK', targetView: 'TRACK', w: 1, h: 1 },
  { id: 'jury', type: 'QUICK_LINK', targetView: 'JURY', w: 1, h: 1 },
  { id: 'history', type: 'QUICK_LINK', targetView: 'MATCH_HISTORY', w: 1, h: 1 },
  { id: 'overall', type: 'QUICK_LINK', targetView: 'OVERALL_STATS', w: 1, h: 1 },
  { id: 'strategy', type: 'QUICK_LINK', targetView: 'STRATEGY', w: 1, h: 1 },
  { id: 'clubs', type: 'QUICK_LINK', targetView: 'CLUB_MANAGER', w: 1, h: 1 },
  { id: 'seasons', type: 'QUICK_LINK', targetView: 'SEASON_MANAGER', w: 1, h: 1 },
  { id: 'spotter', type: 'QUICK_LINK', targetView: 'SPOTTER', w: 1, h: 1 },
  { id: 'live-stats', type: 'QUICK_LINK', targetView: 'LIVESTREAM_STATS', w: 1, h: 1 },
];

const HomePage: React.FC<HomePageProps> = ({ onNavigate, activeSessions = [], matchState }) => {
  const [serverIp, setServerIp] = React.useState<string>('localhost');
  const [isTickerModalOpen, setIsTickerModalOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [widgets, setWidgets] = React.useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('korfstat_dashboard_widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });
  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
  const [activeMatches, setActiveMatches] = React.useState<MatchState[]>([]);

  React.useEffect(() => {
    // Fetch active matches from server on mount
    fetch('http://localhost:3002/api/matches/active')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActiveMatches(data);
        }
      })
      .catch(() => {});
  }, []);
  
  const saveWidgets = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('korfstat_dashboard_widgets', JSON.stringify(newWidgets));
  };

  const handleAddWidget = (type: WidgetConfig['type'], targetView?: string) => {
    const newWidget: WidgetConfig = {
      id: crypto.randomUUID(),
      type,
      targetView,
      w: type === 'MATCH_CONTROL' ? 2 : 1,
      h: 1,
      title: targetView ? formatViewName(targetView) : undefined
    };
    saveWidgets([...widgets, newWidget]);
    setIsGalleryOpen(false);
  };

  const handleRemoveWidget = (id: string) => {
    saveWidgets(widgets.filter(w => w.id !== id));
  };

  const handleResizeWidget = (id: string, w: number, h: number) => {
    saveWidgets(widgets.map(widget => 
      widget.id === id ? { ...widget, w, h } : widget
    ));
  };

  // Drag and Drop Logic
  const [draggedId, setDraggedId] = React.useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create ghost image effect
    if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = '1';
    }
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId === targetId) return;

    const newWidgets = [...widgets];
    const draggedIndex = newWidgets.findIndex(w => w.id === draggedId);
    const targetIndex = newWidgets.findIndex(w => w.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedWidget] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(targetIndex, 0, draggedWidget);
      saveWidgets(newWidgets);
    }
  };

  React.useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch(`${window.location.origin.replace(':5173', ':3002')}/api/companion/setup-info`);
        const data = await response.json();
        if (data.localIp) {
          setServerIp(data.localIp);
        }
      } catch (error) {
        console.error('Failed to fetch local IP:', error);
        if (window.location.hostname !== 'localhost') {
          setServerIp(window.location.hostname);
        }
      }
    };
    fetchIp();
  }, []);

  const { t } = useTranslation();
  const { settings } = useSettings();
  
  const uniqueSessions = useMemo(() => {
    return activeSessions
      .filter((s, index, self) =>
        index === self.findIndex((t) => t.id === s.id)
      );
  }, [activeSessions]);

  const AVAILABLE_VIEWS = [
    'SETUP', 'TRACK', 'STATS', 'JURY', 'LIVE', 'MATCH_HISTORY', 'OVERALL_STATS', 
    'STRATEGY', 'LIVESTREAM_STATS', 'STREAM_OVERLAY', 'DIRECTOR', 'SHOT_CLOCK', 
    'SEASON_MANAGER', 'CLUB_MANAGER', 'SPOTTER', 'ANALYSIS', 'VOTING', 'TICKER'
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300">

      {/* HEADER / COMMAND CENTER */}
      <header className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">KorfStat Pro</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('home.commandCenter')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold
                ${isEditing 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' 
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}
            >
              {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
              {isEditing ? t('home.saveLayout') : t('home.editDashboard')}
            </button>

            {/* Match Status Indicator */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${matchState?.isConfigured ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'} flex items-center gap-2`}>
              <div className={`w-2 h-2 rounded-full ${matchState?.isConfigured ? 'bg-green-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`}></div>
              {matchState?.isConfigured ? t('home.matchActive') : t('home.noActiveMatch')}
            </div>
            
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {serverIp}:3002
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ACTIVE CLOUD/LAN MATCHES */}
        {activeMatches.length > 0 && (
          <div className="bg-indigo-600/5 dark:bg-indigo-500/5 border border-indigo-200/50 dark:border-indigo-500/20 rounded-3xl p-6 shadow-sm overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Trophy size={120} className="text-indigo-600" />
             </div>
             <div className="relative z-10">
                <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  {t('home.activeDiscovery', { defaultValue: 'Live Matches on Network / Cloud' })}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeMatches.map(match => (
                    <button
                      key={match.id}
                      onClick={() => onNavigate('TRACK')} // In a more advanced version, we'd pass the matchId to TRACK
                      className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500 transition-all shadow-sm hover:shadow-md"
                    >
                      <div>
                         <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter mb-1">Join Session</div>
                         <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                         </div>
                         <div className="text-[10px] text-slate-500 font-mono mt-1">{match.id?.slice(0, 8)}</div>
                      </div>
                      <ExternalLink size={18} className="text-slate-300 group-hover:text-indigo-500" />
                    </button>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* DYNAMIC WIDGET GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)] grid-flow-row-dense">
          {widgets.map((widget) => (
            <DashboardWidget
              key={widget.id}
              config={widget}
              isEditing={isEditing}
              onRemove={() => handleRemoveWidget(widget.id)}
              onResize={handleResizeWidget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onNavigate={onNavigate}
              matchState={matchState}
              uniqueSessions={uniqueSessions}
            />
          ))}
          
          {isEditing && (
            <DashboardWidget 
              config={{ id: 'placeholder', type: 'PLACEHOLDER', w: 1, h: 1 }}
              onAdd={() => setIsGalleryOpen(true)}
            />
          )}
        </div>


        {/* GALLERY MODAL */}
        {isGalleryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="text-indigo-600 dark:text-indigo-400" /> {t('home.widgetGallery')}
                </h3>
                <button 
                  onClick={() => setIsGalleryOpen(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Core Widgets */}
                  <GalleryItem 
                    title={t('home.matchControl')}
                    desc="Start or resume matches"
                    icon={<PlayCircle />}
                    color="indigo"
                    onClick={() => handleAddWidget('MATCH_CONTROL')}
                  />
                  <GalleryItem 
                    title={t('home.activeSessions')}
                    desc="Monitor connected devices"
                    icon={<Wifi />}
                    color="emerald"
                    onClick={() => handleAddWidget('SESSIONS')}
                  />
                  
                  {/* View Quick Links */}
                  {AVAILABLE_VIEWS.map(view => {
                    const viewKey = view.toLowerCase();
                    return (
                      <GalleryItem 
                        key={view}
                        title={t(`views.${viewKey}` as any) || formatViewName(view)}
                        desc={t(`views.${viewKey}_desc` as any)}
                        icon={getViewIcon(view)}
                        color="slate"
                        onClick={() => view === 'TICKER' ? setIsTickerModalOpen(true) : handleAddWidget('QUICK_LINK', view)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ticker Embed Modal */}
        {isTickerModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-slate-900 dark:text-slate-200 transition-colors">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                    <Code className="text-emerald-600 dark:text-emerald-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Embed Live-Ticker</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Copy this code to your club website</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTickerModalOpen(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Iframe Code</label>
                  <div className="relative group">
                    <pre className="bg-slate-900 dark:bg-black p-4 rounded-xl text-emerald-400 dark:text-emerald-500 font-mono text-xs overflow-x-auto border border-slate-800 dark:border-slate-800">
                      {`<iframe 
  src="${window.location.origin}/?view=TICKER" 
  width="100%" 
  height="150" 
  frameborder="0" 
  scrolling="no">
</iframe>`}
                    </pre>
                    <button 
                      onClick={() => {
                        const code = `<iframe src="${window.location.origin}/?view=TICKER" width="100%" height="150" frameborder="0" scrolling="no"></iframe>`;
                        navigator.clipboard.writeText(code);
                      }}
                      className="absolute top-2 right-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded shadow-lg transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex gap-4 items-start">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg mt-1">
                    <Globe className="text-blue-600 dark:text-blue-400" size={16} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Public Access Note</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      This ticker shows live data from your active match. By embedding it, you make this match data visible to anyone visiting your website. No login is required to view the ticker.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => onNavigate('TICKER')}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                  >
                    Preview Ticker
                  </button>
                  <button 
                    onClick={() => setIsTickerModalOpen(false)}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
};
const GalleryItem = ({ title, desc, icon, color, onClick }: any) => {
  const colorMap: any = {
    indigo: 'hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    blue: 'hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    purple: 'hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    emerald: 'hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    slate: 'hover:border-slate-500/50 hover:bg-slate-100 dark:hover:bg-slate-500/10 text-slate-600 dark:text-slate-400',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-left transition-all duration-200 group ${colorMap[color] || ''} hover:shadow-lg`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:scale-110 transition-transform ${colorMap[color]?.replace('hover:', '').replace('text-', 'bg-').split(' ')[0]}`}>
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">{title}</h4>
          <p className="text-[10px] text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors line-clamp-2 mt-1">{desc}</p>
        </div>
      </div>
    </button>
  );
};

const formatViewName = (view: string) => {
  if (!view || view === 'Unknown') return 'Connecting…';
  return view.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const getViewIcon = (view: string) => {
  switch (view) {
    case 'SETUP': return <Settings size={16} />;
    case 'TRACK': return <Activity size={16} />;
    case 'STATS': return <BarChart2 size={16} />;
    case 'JURY': return <LayoutTemplate size={16} />;
    case 'LIVE': return <Tv size={16} />;
    case 'MATCH_HISTORY': return <History size={16} />;
    case 'OVERALL_STATS': return <BarChart2 size={16} />;
    case 'STRATEGY': return <BrainCircuit size={16} />;
    case 'LIVESTREAM_STATS': return <Globe size={16} />;
    case 'STREAM_OVERLAY': return <Video size={16} />;
    case 'SEASON_MANAGER': return <Trophy size={16} />;
    case 'CLUB_MANAGER': return <Users size={16} />;
    case 'SPOTTER': return <Users size={16} />;
    case 'DIRECTOR': return <Monitor size={16} />;
    case 'SHOT_CLOCK': return <Clock size={16} />;
    case 'ANALYSIS': return <BrainCircuit size={16} />;
    case 'VOTING': return <Users size={16} />;
    case 'TICKER': return <Code size={16} />;
    default: return <ExternalLink size={16} />;
  }
}

export default HomePage;
