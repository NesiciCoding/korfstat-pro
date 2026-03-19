import React, { useState, useEffect } from 'react';
import { MatchState } from '../types';
import {
  Monitor,
  Trophy,
  Users,
  Zap,
  Shield,
  ArrowRight,
  ChevronRight,
  Play,
  LayoutDashboard,
  LogIn,
  UserPlus,
  History,
  Calendar
} from 'lucide-react';
import { getScore } from '../utils/matchUtils';

interface LandingPageProps {
  onNavigate: (view: any) => void;
  onSelectMatch: (match: MatchState) => void;
  activeSessions: any[];
  matchState: MatchState;
  savedMatches: MatchState[];
  isAuthenticated: boolean;
}

export default function LandingPage({ 
  onNavigate, 
  onSelectMatch, 
  activeSessions, 
  matchState,
  savedMatches,
  isAuthenticated
}: LandingPageProps) {
  const [activeMatches, setActiveMatches] = useState<MatchState[]>([]);

  useEffect(() => {
    // Fetch active matches from server on mount (LAN/Cloud discovery)
    fetch('http://localhost:3002/api/matches/active')
      .then(res => res.json())
      .then(data => setActiveMatches(data))
      .catch(() => {});
  }, []);

  const latestMatches = savedMatches
    .sort((a, b) => (b.date || 0) - (a.date || 0))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap size={24} className="text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tightest">KorfStat <span className="text-indigo-400">Pro</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#matches" className="hover:text-white transition-colors">Matches</a>
            <button onClick={() => onNavigate('ABOUT')} className="hover:text-white transition-colors">Platform</button>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button 
                onClick={() => onNavigate('HOME')}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
            ) : (
              <>
                <button 
                  onClick={() => onNavigate('HOME')} // Note: Home in App.tsx triggers login if not auth
                  className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  Log In
                </button>
                <button 
                  onClick={() => onNavigate('HOME')}
                  className="px-6 py-2.5 bg-white text-zinc-950 rounded-full font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Zap size={14} className="fill-indigo-300" />
            V0.6.1 Live Now
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            The Future of <br />
            <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">Korfball Analytics</span>
          </h1>
          
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            Professional-grade match tracking, real-time cloud synchronization, and AI-powered scouting reports. All in one beautiful interface.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <button 
              onClick={() => onNavigate('HOME')}
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-600/20 hover:-translate-y-1 active:scale-95"
            >
              <Play size={20} className="fill-white" />
              {isAuthenticated ? 'Enter Dashboard' : 'Open App Free'}
            </button>
            <button 
              className="flex items-center gap-2 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-2xl font-black text-lg transition-all hover:-translate-y-1 active:scale-95"
            >
              <Users size={20} />
              Live Demo
            </button>
          </div>
        </div>
      </section>

      {/* Recent Matches Section */}
      <section id="matches" className="py-24 px-6 border-t border-white/5 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-black mb-3">Last Played Matches</h2>
              <p className="text-zinc-500 font-medium">Recently concluded games across your local network.</p>
            </div>
            <button 
              onClick={() => onNavigate('MATCH_HISTORY')}
              className="hidden md:flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
            >
              View Full History
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latestMatches.length > 0 ? (
              latestMatches.map((match) => (
                <div 
                  key={match.id}
                  onClick={() => onSelectMatch(match)}
                  className="group bg-zinc-900/50 border border-white/5 rounded-3xl p-6 hover:bg-zinc-800/80 hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 blur-3xl group-hover:bg-indigo-600/10 transition-colors" />
                  
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-6">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {new Date(match.date || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="px-2 py-0.5 rounded bg-zinc-800 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                      {match.profile?.name || 'Standard'}
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-300 truncate pr-4">{match.homeTeam.name}</span>
                      <span className="text-2xl font-black text-white">{getScore(match, 'HOME')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-300 truncate pr-4">{match.awayTeam.name}</span>
                      <span className="text-2xl font-black text-white">{getScore(match, 'AWAY')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[11px] font-bold text-zinc-500">
                    <span className="group-hover:text-indigo-400 transition-colors">View Analysis</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 bg-zinc-900/20 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-zinc-500 italic">
                <History size={48} className="mb-4 opacity-20" />
                No local match data found. Start your first game!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 rounded-[40px] border border-white/5 hover:border-indigo-500/30 transition-all group">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Zap size={28} className="text-indigo-400 fill-indigo-400" />
              </div>
              <h3 className="text-2xl font-black mb-4">Real-Time Sync</h3>
              <p className="text-zinc-500 leading-relaxed">
                Connect multiple devices simultaneously. Changes you make on the tablet reflect instantly on the big screen and stream overlay.
              </p>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 rounded-[40px] border border-white/5 hover:border-blue-500/30 transition-all group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Trophy size={28} className="text-blue-400 fill-blue-400" />
              </div>
              <h3 className="text-2xl font-black mb-4">AI Scouting</h3>
              <p className="text-zinc-500 leading-relaxed">
                Leverage Google Gemini to analyze opponent history and generate professional scouting reports with tactical alerts.
              </p>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 rounded-[40px] border border-white/5 hover:border-indigo-500/30 transition-all group">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Shield size={28} className="text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black mb-4">Cloud Secure</h3>
              <p className="text-zinc-500 leading-relaxed">
                Private database with Row Level Security. Your match data is encrypted and only accessible to your authenticated account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-zinc-400 fill-zinc-400" />
            </div>
            <span className="text-sm font-black text-zinc-500 tracking-tight">KORFSTAT PRO</span>
          </div>
          
          <p className="text-sm text-zinc-600 font-medium tracking-tight">
            © 2026 NesiciCoding. Built for the modern courtside.
          </p>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('PRIVACY')} className="text-xs font-bold text-zinc-600 hover:text-indigo-400 transition-colors uppercase tracking-widest">Privacy</button>
            <button onClick={() => onNavigate('SUPPORT')} className="text-xs font-bold text-zinc-600 hover:text-indigo-400 transition-colors uppercase tracking-widest">Support</button>
            <button onClick={() => onNavigate('API_DOCS')} className="text-xs font-bold text-zinc-600 hover:text-indigo-400 transition-colors uppercase tracking-widest">API Docs</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
