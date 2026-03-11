import React, { useState, useEffect } from 'react';
import { MatchState } from '../types';
import {
  Monitor,
  Settings as SettingsIcon,
  Watch,
  Tv,
  Video,
  Clock,
  Gamepad2,
  History,
  LayoutDashboard
} from 'lucide-react';

interface LandingGatewayProps {
  onNavigate: (view: any) => void;
  activeSessions: any[];
  matchState: MatchState;
}

export default function LandingGateway({ onNavigate, activeSessions, matchState }: LandingGatewayProps) {
  const [serverIp, setServerIp] = useState<string>('localhost');

  useEffect(() => {
    // In a real deployed Tauri app, we'll fetch the actual local IPv4 address
    // For now we use the window location
    if (window.location.hostname !== 'localhost') {
      setServerIp(window.location.hostname);
    }
  }, []);

  const hasActiveMatch = matchState.isConfigured;

  // -------------------------
  // NO ACTIVE MATCH VIEW
  // -------------------------
  if (!hasActiveMatch) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">KorfStat <span className="text-blue-600">Pro</span></h1>
          <p className="text-xl text-gray-600 font-medium">The Ultimate Korfball Statistics & Management Server</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {/* Main Action - Start Match */}
          <button
            onClick={() => onNavigate('SETUP')}
            className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 flex flex-col items-center justify-center text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 group"
          >
            <div className="bg-white/20 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Gamepad2 size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Start New Match</h2>
            <p className="text-blue-100 text-lg">Configure teams, rules, and begin tracking.</p>
          </button>

          {/* Secondary Actions */}
          <button onClick={() => onNavigate('MATCH_HISTORY')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 flex flex-col items-center justify-center transition-all hover:-translate-y-1 group">
            <div className="bg-orange-100 p-3 rounded-xl mb-3 group-hover:bg-orange-200 transition-colors">
              <History size={32} className="text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Match History</h3>
            <p className="text-sm text-gray-500 text-center mt-1">View previous games & exports</p>
          </button>

          <button onClick={() => onNavigate('OVERALL_STATS')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 flex flex-col items-center justify-center transition-all hover:-translate-y-1 group">
            <div className="bg-emerald-100 p-3 rounded-xl mb-3 group-hover:bg-emerald-200 transition-colors">
              <LayoutDashboard size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Overall Statistics</h3>
            <p className="text-sm text-gray-500 text-center mt-1">Analyze combined team data</p>
          </button>

          <button onClick={() => onNavigate('STRATEGY')} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 flex flex-col items-center justify-center transition-all hover:-translate-y-1 group">
            <div className="bg-purple-100 p-3 rounded-xl mb-3 group-hover:bg-purple-200 transition-colors">
              <Monitor size={32} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Strategy Board</h3>
            <p className="text-sm text-gray-500 text-center mt-1">Draw tactical plays</p>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------
  // ACTIVE MATCH RUNNING - ROLE SELECTOR
  // -------------------------
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Server IP: {serverIp}:3002
      </div>

      <div className="max-w-4xl w-full text-center mb-10">
        <div className="inline-flex items-center gap-3 bg-blue-900/50 text-blue-300 px-5 py-2 rounded-full font-semibold border border-blue-700/50 mb-6">
          <span className="animate-pulse">●</span> MATCH IN PROGRESS
        </div>
        <h1 className="text-4xl font-extrabold mb-3">Choose Your Role</h1>
        <p className="text-gray-400 text-lg">Select how you want to interact with the current match.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-6xl">

        {/* Core Officials */}
        <div className="space-y-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-2">Match Officials</h2>

          <button onClick={() => onNavigate('TRACK')} className="col-span-1 w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-2xl p-6 flex items-start gap-4 transition-all hover:border-blue-500 group text-left">
            <div className="bg-blue-600/20 p-3 rounded-xl group-hover:bg-blue-600/30 transition-colors">
              <LayoutDashboard size={28} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 group-hover:text-blue-400 transition-colors">Match Tracker</h3>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">Full access to statistics logging, substitutions, and deep match control.</p>
            </div>
          </button>

          <button onClick={() => onNavigate('JURY')} className="col-span-1 w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-2xl p-6 flex items-start gap-4 transition-all hover:border-orange-500 group text-left">
            <div className="bg-orange-600/20 p-3 rounded-xl group-hover:bg-orange-600/30 transition-colors">
              <Clock size={28} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 group-hover:text-orange-400 transition-colors">Jury / Timekeeper</h3>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">Dedicated view for table officials. Manage Game Clock and Scoreboard only.</p>
            </div>
          </button>
        </div>

        {/* Displays & Stream */}
        <div className="space-y-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-2">Displays & Broadcast</h2>

          <button onClick={() => window.open(window.location.href.split('?')[0] + '?view=STREAM_OVERLAY', '_blank')} className="col-span-1 w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-2xl p-6 flex items-start gap-4 transition-all hover:border-purple-500 group text-left">
            <div className="bg-purple-600/20 p-3 rounded-xl group-hover:bg-purple-600/30 transition-colors">
              <Video size={28} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 group-hover:text-purple-400 transition-colors">OBS Broadcast</h3>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">Chromeless transparent overlay optimized for Livestreaming software.</p>
            </div>
          </button>

          <button onClick={() => window.open(window.location.href.split('?')[0] + '?view=LIVE', '_blank')} className="col-span-1 w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-2xl p-6 flex items-start gap-4 transition-all hover:border-emerald-500 group text-left">
            <div className="bg-emerald-600/20 p-3 rounded-xl group-hover:bg-emerald-600/30 transition-colors">
              <Tv size={28} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 group-hover:text-emerald-400 transition-colors">Big Screen Scoreboard</h3>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">Fullscreen scoreboard optimized for TVs and projectors in the hall.</p>
            </div>
          </button>

          <button onClick={() => window.open(window.location.href.split('?')[0] + '?view=SHOTCLOCK', '_blank')} className="col-span-1 w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-2xl p-6 flex items-start gap-4 transition-all hover:border-emerald-500 group text-left">
            <div className="bg-emerald-600/20 p-3 rounded-xl group-hover:bg-emerald-600/30 transition-colors">
              <Clock size={28} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 group-hover:text-emerald-400 transition-colors">Shotclock</h3>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">Fullscreen shotclock optimized for screens at the sides of the pitch.</p>
            </div>
          </button>
        </div>


        {/* Remote Sync */}
        <div className="space-y-5">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-2">Remote Sync</h2>

          <button onClick={() => onNavigate('DIRECTOR')} className="col-span-1 w-full bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-2xl p-6 flex items-start gap-4 transition-all hover:border-red-500 group text-left">
            <div className="bg-red-600/20 p-3 rounded-xl group-hover:bg-red-600/30 transition-colors">
              <Monitor size={28} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-100 group-hover:text-red-400 transition-colors">Broadcast Director</h3>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">Control the OBS Stream Overlay remotely. Trigger full-screen graphics.</p>
            </div>
          </button>

          <div className="col-span-1 w-full bg-gray-800/80 border border-gray-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <Watch size={36} className="text-gray-500 mb-3" />
            <h3 className="text-lg font-bold text-gray-300">Wear OS Referee Link</h3>
            <p className="text-gray-500 text-xs mt-2 px-4 leading-tight">Ensure your smart watch is connected to the same Wi-Fi network and pointing to <strong className="text-gray-300">{serverIp}</strong></p>
          </div>
        </div>

      </div>

      <button onClick={() => onNavigate('TRACK')} className="mt-12 text-sm text-gray-500 hover:text-white transition-colors underline underline-offset-4 cursor-pointer z-10 relative">
        Skip to Match Tracker
      </button>
    </div>
  );
}
