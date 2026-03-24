import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Activity, 
  Terminal, 
  Play, 
  Square, 
  RefreshCcw, 
  Plus, 
  Minus, 
  Frown, 
  Clock, 
  Wifi, 
  WifiOff, 
  ShieldCheck,
  Zap,
  Trash2,
  Copy,
  ExternalLink,
  Timer,
  History,
  Trophy,
  Users as UsersIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateUUID } from '../utils/uuid';

interface LogEntry {
  id: string;
  timestamp: number;
  type: string;
  payload: any;
  source: 'SERVER' | 'LOCAL';
}

interface MatchEvent {
  id: string;
  timestamp: number;
  type: string;
  teamId: string;
  playerId: string;
  result?: string;
}

interface CompanionDashboardProps {
  socket: any;
  onBack: () => void;
}

const CompanionDashboard: React.FC<CompanionDashboardProps> = ({ socket, onBack }) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(socket?.connected || false);
  const [setupInfo, setSetupInfo] = useState<any>(null);
  const [matchState, setMatchState] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0); // Display seconds
  const [shotClock, setShotClock] = useState(0);

  // Fetch setup info & initial match state
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3002/api/companion/setup-info`);
        const data = await response.json();
        setSetupInfo(data);
        if (data.activeMatch) {
          setMatchState(data.activeMatch);
        }
        if (data.activeMatchId && socket) {
          socket.emit('join-match', data.activeMatchId);
        }
      } catch (e) {
        console.error('Failed to fetch setup info', e);
      }
    };
    fetchInfo();
  }, []);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    
    const handleCompanionAction = (payload: any) => {
      const newEntry: LogEntry = {
        id: generateUUID(),
        timestamp: Date.now(),
        type: payload.type || 'UNKNOWN',
        payload: payload,
        source: 'SERVER'
      };
      setLogs(prev => [newEntry, ...prev].slice(0, 50));
    };

    const handleMatchUpdate = (state: any) => {
      setMatchState(state);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('companion-action', handleCompanionAction);
    socket.on('match-update', handleMatchUpdate);

    // If we already have a match ID from setup info, join it now
    if (setupInfo?.activeMatchId) {
      socket.emit('join-match', setupInfo.activeMatchId);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('companion-action', handleCompanionAction);
      socket.off('match-update', handleMatchUpdate);
    };
  }, [socket, setupInfo?.activeMatchId]);

  // Timer calculation loop
  useEffect(() => {
    if (!matchState) return;

    const interval = setInterval(() => {
      const { timer, shotClock: sc, halfDurationSeconds } = matchState;
      
      // Calculate Game Time
      let elapsed = timer.elapsedSeconds;
      if (timer.isRunning && timer.lastStartTime) {
        elapsed += (Date.now() - timer.lastStartTime) / 1000;
      }
      setCurrentTime(Math.max(0, halfDurationSeconds - elapsed));

      // Calculate Shot Clock
      let scRemaining = sc.seconds;
      if (sc.isRunning && sc.lastStartTime) {
        scRemaining -= (Date.now() - sc.lastStartTime) / 1000;
      }
      setShotClock(Math.max(0, scRemaining));
    }, 100);

    return () => clearInterval(interval);
  }, [matchState]);

  const triggerAction = async (endpoint: string, method: 'GET' | 'POST' = 'POST', body: any = {}) => {
    const serverUrl = `${window.location.protocol}//${window.location.hostname}:3002`;
    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Companion-Token': setupInfo?.token || 'korfstat'
        },
        body: method === 'POST' ? JSON.stringify(body) : undefined
      });
      
      const data = await response.json();
      
      // Log the local trigger
      const newEntry: LogEntry = {
        id: generateUUID(),
        timestamp: Date.now(),
        type: `LOCAL_TRIGGER: ${endpoint.split('/').pop()?.toUpperCase()}`,
        payload: { status: response.status, data },
        source: 'LOCAL'
      };
      setLogs(prev => [newEntry, ...prev].slice(0, 50));
    } catch (e: any) {
      const errorEntry: LogEntry = {
        id: generateUUID(),
        timestamp: Date.now(),
        type: 'ERROR',
        payload: { message: e.message },
        source: 'LOCAL'
      };
      setLogs(prev => [errorEntry, ...prev].slice(0, 50));
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const score = useMemo(() => {
    if (!matchState?.events) return { home: 0, away: 0 };
    const home = matchState.events.filter((e: any) => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'HOME').length;
    const away = matchState.events.filter((e: any) => e.type === 'SHOT' && e.result === 'GOAL' && e.teamId === 'AWAY').length;
    return { home, away };
  }, [matchState]);

  const actions = [
    { group: 'Clock Control', items: [
      { label: 'Toggle Clock', icon: <Play size={16} />, endpoint: '/api/companion/clock/toggle' },
      { label: 'Reset Clock', icon: <RefreshCcw size={16} />, endpoint: '/api/companion/clock/reset' },
      { label: 'Reset Shotclock', icon: <Zap size={16} />, endpoint: '/api/companion/shotclock/reset' },
    ]},
    { group: 'Home Team', color: 'text-red-500', items: [
      { label: 'Goal Home', icon: <Plus size={16} />, endpoint: '/api/companion/goal/home' },
      { label: 'Undo Home', icon: <Trash2 size={16} />, endpoint: '/api/companion/goal/home/undo' },
      { label: 'Foul Home', icon: <Frown size={16} />, endpoint: '/api/companion/foul/home' },
      { label: 'Timeout Home', icon: <Clock size={16} />, endpoint: '/api/companion/timeout/home' },
    ]},
    { group: 'Away Team', color: 'text-blue-500', items: [
      { label: 'Goal Away', icon: <Plus size={16} />, endpoint: '/api/companion/goal/away' },
      { label: 'Undo Away', icon: <Trash2 size={16} />, endpoint: '/api/companion/goal/away/undo' },
      { label: 'Foul Away', icon: <Frown size={16} />, endpoint: '/api/companion/foul/away' },
      { label: 'Timeout Away', icon: <Clock size={16} />, endpoint: '/api/companion/timeout/away' },
    ]},
    { group: 'Match Management', items: [
      { label: 'Next Period', icon: <Zap size={16} />, endpoint: '/api/companion/period/next' },
      { label: 'Dismiss Graphics', icon: <Square size={16} />, endpoint: '/api/companion/graphics/dismiss' },
      { label: 'Lineup Graphic', icon: <Activity size={16} />, endpoint: '/api/companion/graphics/lineup' },
    ]}
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Master Companion Dashboard</h1>
            <p className="text-gray-400 text-sm">Real-time monitoring & manual override</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isConnected ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="text-xs font-bold uppercase tracking-widest">{isConnected ? 'WS Connected' : 'WS Offline'}</span>
          </div>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold transition-colors"
          >
            Exit Dashboard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Columns: Match State & Actions */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Match Scoreboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Clocks */}
            <div className="md:col-span-1 grid grid-cols-2 gap-2">
              <div className="bg-gray-800/80 rounded-2xl border border-gray-700 p-4 flex flex-col items-center justify-center">
                <Timer className="text-indigo-400 mb-2" size={20} />
                <span className="text-3xl font-black font-mono tracking-tighter text-white">
                  {formatTime(currentTime)}
                </span>
                <span className="text-[10px] uppercase font-bold text-gray-500">Game Clock</span>
              </div>
              <div className={`bg-gray-800/80 rounded-2xl border border-gray-700 p-4 flex flex-col items-center justify-center ${shotClock <= 5 ? 'border-red-500 animate-pulse' : ''}`}>
                <Zap className={`${shotClock <= 5 ? 'text-red-500' : 'text-orange-400'} mb-2`} size={20} />
                <span className={`text-3xl font-black font-mono tracking-tighter ${shotClock <= 5 ? 'text-red-500' : 'text-white'}`}>
                  {Math.ceil(shotClock)}
                </span>
                <span className="text-[10px] uppercase font-bold text-gray-500">Shot Clock</span>
              </div>
            </div>

            {/* Score */}
            <div className="md:col-span-2 bg-gray-800/80 rounded-2xl border border-gray-700 p-4 flex items-center justify-between px-8 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-blue-500/5 pointer-events-none" />
               
               <div className="text-center z-10 w-24">
                 <p className="text-[9px] uppercase font-black text-red-500 mb-1 leading-tight">{matchState?.homeTeam?.name || 'Home'}</p>
                 <span className="text-5xl font-black font-mono tracking-tighter text-white">{score.home}</span>
               </div>
               
               <div className="flex flex-col items-center gap-1 z-10 opacity-30">
                 <div className="w-px h-8 bg-gray-500" />
                 <span className="text-xs font-bold text-gray-500 italic">VS</span>
                 <div className="w-px h-8 bg-gray-500" />
               </div>

               <div className="text-center z-10 w-24">
                 <p className="text-[9px] uppercase font-black text-blue-500 mb-1 leading-tight">{matchState?.awayTeam?.name || 'Away'}</p>
                 <span className="text-5xl font-black font-mono tracking-tighter text-white">{score.away}</span>
               </div>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="text-yellow-400" size={20} />
              <h2 className="text-lg font-bold">Manual Action Triggers</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {actions.map((group, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${group.color || 'text-gray-500'}`}>
                    {group.group}
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.items.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => triggerAction(item.endpoint)}
                        className="flex items-center justify-between p-2.5 bg-gray-700/30 hover:bg-indigo-600/20 border border-gray-700 hover:border-indigo-600/50 rounded-lg transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 group-hover:text-indigo-400">{item.icon}</span>
                          <span className="text-xs font-medium">{item.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-3">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Server URL (3002)</p>
              <div className="flex items-center justify-between">
                <code className="text-xs text-indigo-400">http://{setupInfo?.localIp || '...'}:3002</code>
                <button onClick={() => navigator.clipboard.writeText(`http://${setupInfo?.localIp}:3002`)}><Copy size={12}/></button>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-3">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Companion Token</p>
              <div className="flex items-center justify-between">
                <code className="text-xs text-green-400">{setupInfo?.token || 'korfstat'}</code>
                <button onClick={() => navigator.clipboard.writeText(setupInfo?.token || 'korfstat')}><Copy size={12}/></button>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-3">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Active Match Room</p>
              <p className="text-xs text-indigo-400 tracking-tight">{matchState?.id?.substring(0, 18) || 'No Match Active'}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Logs */}
        <div className="flex flex-col gap-6">
          
          {/* Match Events (New) */}
          <div className="bg-gray-950 rounded-xl border border-gray-800 flex flex-col h-[350px]">
            <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-indigo-950/10 active-sessions-header">
              <div className="flex items-center gap-2 text-indigo-400">
                <History size={16} />
                <h2 className="text-xs font-black uppercase tracking-widest">Match History</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-sans">
              {!matchState?.events || matchState.events.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-700 italic text-[10px]">
                  <Trophy size={20} className="mb-1 opacity-20" />
                  <p>No events recorded</p>
                </div>
              ) : (
                matchState.events.slice().reverse().map((event: any) => (
                  <div key={event.id} className="p-2 bg-gray-900 border border-gray-800 rounded flex justify-between items-center animate-in fade-in slide-in-from-right-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-4 rounded-full ${event.teamId === 'HOME' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-[10px] font-bold text-gray-300">
                          {event.type} {event.result === 'GOAL' ? '✓' : ''}
                        </p>
                        <p className="text-[8px] text-gray-500 uppercase font-bold">
                          {event.teamId === 'HOME' ? matchState.homeTeam.name : matchState.awayTeam.name}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-gray-600">
                      {Math.floor(event.timestamp / 60)}:{(event.timestamp % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Log */}
          <div className="bg-gray-950 rounded-xl border border-gray-800 flex flex-col h-[350px]">
            <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
              <div className="flex items-center gap-2 text-gray-400">
                <Terminal size={16} />
                <h2 className="text-xs font-black uppercase tracking-widest">Protocol Log</h2>
              </div>
              <button 
                onClick={() => setLogs([])}
                className="text-[9px] uppercase font-bold text-gray-600 hover:text-red-400"
              >
                Clear
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-[10px]">
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-800 italic opacity-50">
                  <Activity size={24} className="mb-1 opacity-10" />
                  <p>Idle</p>
                </div>
              )}
              {logs.map(log => (
                <div 
                  key={log.id} 
                  className={`p-1.5 rounded border border-gray-800/50 ${
                    log.source === 'SERVER' ? 'bg-indigo-950/10 border-l-2 border-l-indigo-500' : 'bg-green-950/10 border-l-2 border-l-green-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <span className={`font-black ${log.source === 'SERVER' ? 'text-indigo-400' : 'text-green-400'}`}>
                      {log.type}
                    </span>
                    <span className="text-gray-700">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <pre className="text-[8px] text-gray-600 overflow-x-hidden whitespace-pre-wrap">
                    {JSON.stringify(log.payload)}
                  </pre>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default CompanionDashboard;
