import React from 'react';
import { PlayCircle, History, BarChart2, BrainCircuit } from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: 'SETUP' | 'MATCH_HISTORY' | 'OVERALL_STATS' | 'STRATEGY' | 'LIVESTREAM_STATS' | 'LIVE' | 'JURY') => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">KorfStat Pro</h1>
        <p className="text-xl text-gray-500">Advanced Statistics & Analysis for Korfball</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <button
          onClick={() => onNavigate('SETUP')}
          className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-indigo-500 transition-all duration-300 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PlayCircle size={120} className="text-indigo-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
              <PlayCircle size={28} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Start New Match</h3>
            <p className="text-gray-500">Configure teams and begin tracking a new game with real-time statistics.</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('MATCH_HISTORY')}
          className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-500 transition-all duration-300 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <History size={120} className="text-blue-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
              <History size={28} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Previous Matches</h3>
            <p className="text-gray-500">Browse history of played games and review detailed statistics for each match.</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('OVERALL_STATS')}
          className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-emerald-500 transition-all duration-300 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart2 size={120} className="text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 text-emerald-600">
              <BarChart2 size={28} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Overall Statistics</h3>
            <p className="text-gray-500">Analyze aggregated data across all games with advanced filtering options.</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('STRATEGY')}
          className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-purple-500 transition-all duration-300 text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BrainCircuit size={120} className="text-purple-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600">
              <BrainCircuit size={28} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Strategy Planner</h3>
            <p className="text-gray-500">AI-powered insights to form strategies based on historical matchups.</p>
          </div>
        </button>
      </div>

      <div className="mt-12 w-full max-w-4xl">
        <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">Join Active Match</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => onNavigate('LIVESTREAM_STATS')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all font-bold text-gray-700 flex items-center justify-center gap-2">
            Livestream Stats
          </button>
          <button onClick={() => onNavigate('LIVE')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition-all font-bold text-gray-700 flex items-center justify-center gap-2">
            Live Screen
          </button>
          <button onClick={() => onNavigate('JURY')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all font-bold text-gray-700 flex items-center justify-center gap-2">
            Jury Interface
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;