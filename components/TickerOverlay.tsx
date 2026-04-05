import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface TickerData {
  homeTeam: { name: string; color: string; score: number };
  awayTeam: { name: string; color: string; score: number };
  timer: { display: string; isRunning: boolean; remaining: number };
  period: number;
  shotClock?: number;
}

const TickerOverlay: React.FC = () => {
  const [data, setData] = useState<TickerData | null>(null);
  const [connected, setConnected] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);

  // Customization via URL Params
  const theme = searchParams.get('theme') || 'modern';
  const accentColor = searchParams.get('color') || '#6366f1';
  const showShotClock = searchParams.get('sc') === 'true';

  useEffect(() => {
    const socket: Socket = io(window.location.origin);

    socket.on('connect', () => {
      setConnected(true);
      // Join global match for ticker or specific if ID provided
      const matchId = searchParams.get('matchId');
      if (matchId) {
        socket.emit('join-match', matchId);
      } else {
        // Initial fetch for latest
        fetch(`${window.location.origin}/api/ticker`)
          .then(res => res.json())
          .then(setData)
          .catch(console.error);
      }
    });

    socket.on('ticker-update', (newData: any) => {
      setData(newData);
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, [searchParams]);

  if (!data) return null;

  const isMinimal = theme === 'minimal';

  return (
    <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-0 font-sans select-none ${isMinimal ? 'scale-75' : ''}`}>
      {/* Home Team */}
      <div className="flex items-center">
        <div 
          className="px-6 py-3 bg-white text-gray-900 font-black uppercase italic tracking-tighter text-2xl shadow-xl rounded-l-2xl border-b-4 border-gray-100"
          style={{ borderLeft: `8px solid ${data.homeTeam.color}` }}
        >
          {data.homeTeam.name}
        </div>
        <div className="px-5 py-3 bg-gray-900 text-white font-black text-3xl shadow-xl border-b-4 border-black">
          {data.homeTeam.score}
        </div>
      </div>

      {/* Center / Timer Area */}
      <div className="flex flex-col items-center justify-center bg-indigo-600 px-6 py-2 shadow-2xl border-b-4 border-indigo-800 min-w-[120px] relative overflow-hidden group">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-0.5">
          {data.period}º PERIOD
        </div>
        <div className={`text-2xl font-mono font-black text-white ${!data.timer.isRunning ? 'animate-pulse opacity-70' : ''}`}>
          {data.timer.display}
        </div>
        
        {showShotClock && data.shotClock !== null && (
          <div className="absolute -top-1 -right-1 bg-amber-500 text-gray-900 font-black px-2 py-0.5 text-xs rounded-bl-lg shadow-md border-b-2 border-l-2 border-amber-700">
            {data.shotClock}
          </div>
        )}
      </div>

      {/* Away Team */}
      <div className="flex items-center">
        <div className="px-5 py-3 bg-gray-900 text-white font-black text-3xl shadow-xl border-b-4 border-black">
          {data.awayTeam.score}
        </div>
        <div 
          className="px-6 py-3 bg-white text-gray-900 font-black uppercase italic tracking-tighter text-2xl shadow-xl rounded-r-2xl border-b-4 border-gray-100"
          style={{ borderRight: `8px solid ${data.awayTeam.color}` }}
        >
          {data.awayTeam.name}
        </div>
      </div>
      
      {!connected && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-red-500 uppercase tracking-widest bg-white px-2 py-0.5 rounded shadow-sm">
          Disconnected from Server
        </div>
      )}
    </div>
  );
};

export default TickerOverlay;
