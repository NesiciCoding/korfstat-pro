import React, { useState, useEffect } from 'react';
import { MatchState } from '../types';
import { aggregateTeamData, TeamScoutData } from '../services/scoutingService';
import { generateScoutingReport } from '../services/geminiService';
import { generateScoutingPDF } from '../services/reportGenerator';
import { ArrowLeft, Brain, FileText, Loader2, Copy, Check, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ScoutingReportViewProps {
  teamName: string;
  allMatches: MatchState[];
  onBack: () => void;
}

const ScoutingReportView: React.FC<ScoutingReportViewProps> = ({ teamName, allMatches, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string>('');
  const [scoutData, setScoutData] = useState<TeamScoutData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = aggregateTeamData(teamName, allMatches);
        setScoutData(data);
        
        const aiReport = await generateScoutingReport(data);
        setReport(aiReport);
      } catch (err) {
        console.error(err);
        setReport("Failed to generate report. Make sure you have match history for this team.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamName, allMatches]);

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                Smart Scout: <span className="text-indigo-600 dark:text-indigo-400">{teamName}</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">AI-Powered Opponent Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold text-sm disabled:opacity-50"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              onClick={() => scoutData && generateScoutingPDF(scoutData, report)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              <FileText size={16} />
              Export PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full animate-ping absolute inset-0" />
              <div className="w-20 h-20 border-4 border-t-indigo-500 rounded-full animate-spin" />
              <Brain className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={32} />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold dark:text-white italic">Aggregating historical patterns...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gemini is analyzing {scoutData?.matchCount || ''} match logs for tactical vulnerabilities</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               {/* Analysis Content */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-gray-800 min-h-[600px] prose dark:prose-invert max-w-none">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>

            <div className="space-y-6">
              {/* Snapshot Metrics */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/30">
                <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info size={14} />
                  Input Metadata
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Matches Analyzed</span>
                    <span className="text-2xl font-black dark:text-white">{scoutData?.matchCount}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Avg Efficiency</span>
                    <span className="text-2xl font-black dark:text-white">{scoutData?.shootingEfficiency.total}%</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Avg Goals</span>
                    <span className="text-2xl font-black dark:text-white">{scoutData?.avgGoals.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Shot Distribution */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Shooting Profile</h3>
                <div className="space-y-3">
                  {Object.entries(scoutData?.shootingEfficiency || {}).map(([key, value]) => {
                    if (key === 'total') return null;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize text-gray-600 dark:text-gray-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold dark:text-white">{value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-100 dark:border-yellow-900/30">
                <h3 className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Brain size={14} />
                  Coach Tip
                </h3>
                <p className="text-xs text-yellow-800 dark:text-yellow-400 leading-relaxed italic">
                   "AI analysis indicates a trend. Review the Shot Map Insights carefully to decide if your defense needs to sag or stay tight on the posts."
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoutingReportView;
