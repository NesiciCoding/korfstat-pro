import React, { useMemo } from 'react';
import {
  PlayCircle, History, BarChart2, BrainCircuit,
  Monitor, Video, Tv, LayoutTemplate, Clock,
  Wifi, Users, Activity, Play, Globe, Trophy, Watch
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MatchState } from '../types';

interface HomePageProps {
  onNavigate: (view: any) => void;
  activeSessions?: any[];
  matchState?: MatchState;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate, activeSessions = [], matchState }) => {
  const [serverIp, setServerIp] = React.useState<string>('localhost');
  
  React.useEffect(() => {
    if (window.location.hostname !== 'localhost') {
        setServerIp(window.location.hostname);
    }
  }, []);

  const { t } = useTranslation();
  const isMatchActive = matchState?.timer.isRunning || matchState?.isConfigured;
  // Check if a match configuration is active to enable tracker resumption
  const hasActiveMatch = matchState?.isConfigured;

  const uniqueSessions = useMemo(() => {
    return activeSessions
      .filter((s, index, self) =>
        index === self.findIndex((t) => t.id === s.id)
      );
  }, [activeSessions]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">

      {/* HEADER / COMMAND CENTER */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">KorfStat Pro</h1>
              <p className="text-xs text-slate-400 font-medium">{t('home.commandCenter')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Match Status Indicator */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${hasActiveMatch ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500'} flex items-center gap-2`}>
              <div className={`w-2 h-2 rounded-full ${hasActiveMatch ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
              {hasActiveMatch ? t('home.matchActive') : t('home.noActiveMatch')}
            </div>
            
            <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-400 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {serverIp}:3002
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* TOP SECTION: ACTION & MONITORING */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 1. MATCH CONTROL (Start/Resume) */}
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-1 border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="h-full bg-slate-950/50 rounded-xl p-6 flex flex-col justify-center relative z-10">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PlayCircle className="text-indigo-400" /> {t('home.matchControl')}
              </h2>

              <div className="flex gap-4">
                {/* Start New Match Button */}
                <button
                  onClick={() => !hasActiveMatch && onNavigate('SETUP')}
                  disabled={hasActiveMatch}
                  className={`flex-1 p-6 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all
                    ${hasActiveMatch
                      ? 'bg-slate-800/50 border-slate-800 text-slate-500 cursor-not-allowed grayscale'
                      : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02]'
                    }`}
                >
                  <Play size={32} fill={hasActiveMatch ? "none" : "currentColor"} />
                  <div className="text-center">
                    <div className="font-bold text-lg">{t('home.startNewMatch')}</div>
                    {hasActiveMatch && <div className="text-xs mt-1">{t('home.matchInProgress')}</div>}
                  </div>
                </button>

                {/* Resume Tracker Button (Only if active) */}
                {hasActiveMatch ? (
                  <button
                    onClick={() => onNavigate('TRACK')}
                    className="flex-1 p-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] flex flex-col items-center justify-center gap-3 transition-all"
                  >
                    <Activity size={32} />
                    <div className="text-center">
                      <div className="font-bold text-lg">{t('home.resumeTracker')}</div>
                      <div className="text-xs text-emerald-100 mt-1">{t('home.returnToActive')}</div>
                    </div>
                  </button>
                ) : (
                  <div className="flex-1 p-6 rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center gap-2 text-slate-600">
                    <div className="font-medium">{t('home.noActiveMatch')}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. ACTIVE SESSIONS MONITOR */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
              <h2 className="font-bold text-slate-200 flex items-center gap-2">
                <Wifi size={18} className="text-emerald-400" /> {t('home.activeSessions')}
              </h2>
              <span data-testid="active-sessions-count" className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-full font-mono">{uniqueSessions.length}</span>
            </div>
            <div className="flex-1 p-2 overflow-y-auto max-h-[200px] space-y-1">
              {uniqueSessions.length === 0 ? (
                <div className="text-center p-8 text-slate-600 italic text-sm">
                  {t('home.waitingConnections')}
                </div>
              ) : (
                uniqueSessions.map(session => (
                  <div key={session.id} className="p-3 rounded-lg bg-slate-800/50 flex items-center justify-between group hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getViewColor(session.view)}`}>
                        {getViewIcon(session.view)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-200 leading-tight">
                          {formatViewName(session.view)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[120px]" title={session.userAgent}>
                          {session.ip || 'Local'} • {getSimpleDeviceName(session.userAgent)}
                        </div>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 3. CATEGORIZED VIEW GRID */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* COL 1: LIVESTREAM */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">{t('home.livestream')}</h3>
              <div className="space-y-3">
                <NavCard
                  title={t('views.director')}
                  desc={t('views.directorDesc')}
                  icon={<Monitor />}
                  color="indigo"
                  onClick={() => onNavigate('DIRECTOR')}
                />
                <NavCard
                  title={t('views.livestreamStats')}
                  desc={t('views.livestreamStatsDesc')}
                  icon={<Globe />}
                  color="blue"
                  onClick={() => onNavigate('LIVESTREAM_STATS')}
                />
                <NavCard
                  title={t('views.streamOverlay')}
                  desc={t('views.streamOverlayDesc')}
                  icon={<Video />}
                  color="purple"
                  onClick={() => onNavigate('STREAM_OVERLAY')}
                />
              </div>
            </div>

            {/* COL 2: STATISTICS */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">{t('home.statistics')}</h3>
              <div className="space-y-3">
                <NavCard
                  title={t('views.matchHistory')}
                  desc={t('views.matchHistoryDesc')}
                  icon={<History />}
                  color="slate"
                  onClick={() => onNavigate('MATCH_HISTORY')}
                />
                <NavCard
                  title={t('views.overallStats')}
                  desc={t('views.overallStatsDesc')}
                  icon={<BarChart2 />}
                  color="emerald"
                  onClick={() => onNavigate('OVERALL_STATS')}
                />
                <NavCard
                  title={t('views.strategyPlanner')}
                  desc={t('views.strategyPlannerDesc')}
                  icon={<BrainCircuit />}
                  color="amber"
                  onClick={() => onNavigate('STRATEGY')}
                />
                <NavCard
                  title={t('views.clubManager')}
                  desc={t('views.clubManagerDesc')}
                  icon={<Users />}
                  color="cyan"
                  onClick={() => onNavigate('CLUB_MANAGER')}
                />
                <NavCard
                  title={t('views.seasonManager')}
                  desc={t('views.seasonManagerDesc')}
                  icon={<Trophy />}
                  color="yellow"
                  onClick={() => onNavigate('SEASON_MANAGER')}
                />
              </div>
            </div>

            {/* COL 3: IN-HALL */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">{t('home.inHall')}</h3>
              <div className="space-y-3">
                <NavCard
                  title={t('views.shotClock')}
                  desc={t('views.shotClockDesc')}
                  icon={<Clock />}
                  color="red"
                  onClick={() => onNavigate('SHOT_CLOCK')}
                />
                <NavCard
                  title={t('views.liveScreen')}
                  desc={t('views.liveScreenDesc')}
                  icon={<Tv />}
                  color="orange"
                  onClick={() => onNavigate('LIVE')}
                />
                <NavCard
                  title={t('views.juryInterface')}
                  desc={t('views.juryInterfaceDesc')}
                  icon={<LayoutTemplate />}
                  color="cyan"
                  onClick={() => onNavigate('JURY')}
                />
                <NavCard
                  title={t('views.spotterInterface')}
                  desc={t('views.spotterInterfaceDesc')}
                  icon={<Users />}
                  color="blue"
                  onClick={() => onNavigate('SPOTTER')}
                />
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};

// --- Sub-components & Helpers ---

const NavCard = ({ title, desc, icon, color, onClick }: any) => {
  const colorMap: any = {
    indigo: 'hover:border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400',
    blue: 'hover:border-blue-500/50 hover:bg-blue-500/10 text-blue-400',
    purple: 'hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-400',
    emerald: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400',
    amber: 'hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-400',
    red: 'hover:border-red-500/50 hover:bg-red-500/10 text-red-400',
    orange: 'hover:border-orange-500/50 hover:bg-orange-500/10 text-orange-400',
    cyan: 'hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400',
    slate: 'hover:border-slate-500/50 hover:bg-slate-500/10 text-slate-400',
    yellow: 'hover:border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500',
  };

  const bgStep = color === 'slate' ? 'bg-slate-800' : 'bg-slate-900';

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border border-slate-800 ${bgStep} text-left transition-all duration-200 group ${colorMap[color] || ''} hover:shadow-lg`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg bg-slate-950 border border-slate-800 group-hover:scale-110 transition-transform ${colorMap[color]?.replace('hover:', '')}`}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
        <div>
          <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors">{title}</h4>
          <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{desc}</p>
        </div>
      </div>
    </button>
  );
};

const formatViewName = (view: string) => {
  if (!view || view === 'Unknown') return 'Connecting…';
  return view.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const getSimpleDeviceName = (ua: string) => {
  if (!ua) return 'Device';
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Macintosh')) return 'Mac';
  if (ua.includes('Windows')) return 'PC';
  if (ua.includes('Android')) return 'Android';
  return 'Browser';
};

const getViewIcon = (view: string) => {
  switch (view) {
    case 'SHOT_CLOCK': return <Clock size={16} />;
    case 'DIRECTOR': return <Monitor size={16} />;
    case 'TRACK': return <Activity size={16} />;
    case 'WATCH': return <Watch size={16} />;
    default: return <Users size={16} />;
  }
}

const getViewColor = (view: string) => {
  switch (view) {
    case 'SHOT_CLOCK': return 'bg-red-500/20 text-red-400';
    case 'DIRECTOR': return 'bg-indigo-500/20 text-indigo-400';
    case 'TRACK': return 'bg-emerald-500/20 text-emerald-400';
    case 'WATCH': return 'bg-cyan-500/20 text-cyan-400';
    default: return 'bg-slate-700 text-slate-400';
  }
}

export default HomePage;