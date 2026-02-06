import React, { useState, useMemo } from 'react';
import { MatchState } from '../types';
import { ArrowLeft, BrainCircuit, Loader2, PlayCircle } from 'lucide-react';
import { generateStrategyReport } from '../services/geminiService';

interface StrategyPlannerProps {
  matches: MatchState[];
  onBack: () => void;
}

const StrategyPlanner: React.FC<StrategyPlannerProps> = ({ matches, onBack }) => {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [strategyReport, setStrategyReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract unique teams
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    matches.forEach(m => {
      teams.add(m.homeTeam.name);
      teams.add(m.awayTeam.name);
    });
    return Array.from(teams).sort();
  }, [matches]);

  const handleGenerate = async () => {
    if (!teamA || !teamB || teamA === teamB) return;
    setIsLoading(true);
    const report = await generateStrategyReport(teamA, teamB, matches);
    setStrategyReport(report);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <BrainCircuit size={24} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AI Strategy Planner</h1>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Select Matchup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Team</label>
                    <select 
                        value={teamA} 
                        onChange={e => setTeamA(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="">Select Team...</option>
                        {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                
                <div className="hidden md:flex justify-center pt-6">
                    <span className="font-bold text-gray-300">VS</span>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Opponent</label>
                    <select 
                         value={teamB} 
                         onChange={e => setTeamB(e.target.value)}
                         className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="">Select Team...</option>
                        {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            <div className="mt-6">
                <button 
                    onClick={handleGenerate}
                    disabled={isLoading || !teamA || !teamB || teamA === teamB}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                    Generate Strategy Report
                </button>
                {teamA === teamB && teamA !== '' && (
                    <p className="text-red-500 text-sm mt-2 text-center">Please select two different teams.</p>
                )}
            </div>
        </div>

        {strategyReport && (
            <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-8 ring-4 ring-purple-50 animate-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-2xl font-bold text-purple-900 mb-6 flex items-center gap-2">
                    <BrainCircuit /> Strategic Analysis: {teamA} vs {teamB}
                </h3>
                <div className="prose prose-purple max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                    {strategyReport}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StrategyPlanner;