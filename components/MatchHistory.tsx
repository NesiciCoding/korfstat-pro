import React from 'react';
import { MatchState } from '../types';
import { ArrowLeft, Calendar, ChevronRight, Trash2, FileJson, FileText, Video } from 'lucide-react';
import { generatePDF, generateJSON } from '../services/reportGenerator';
import { getScore } from '../utils/matchUtils';

interface MatchHistoryProps {
  matches: MatchState[];
  onSelectMatch: (match: MatchState) => void;
  onAnalyzeMatch: (match: MatchState) => void;
  onDeleteMatch: (id: string) => void;
  onBack: () => void;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, onSelectMatch, onAnalyzeMatch, onDeleteMatch, onBack }) => {


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match History</h1>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No matches recorded</h3>
            <p className="text-gray-500 dark:text-gray-400">Complete a match to see it listed here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.sort((a, b) => (b.date || 0) - (a.date || 0)).map((match) => (
              <div
                key={match.id}
                className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between"
                onClick={() => onSelectMatch(match)}
              >
                <div className="flex-1">
                  <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Calendar size={12} />
                    {new Date(match.date || Date.now()).toLocaleDateString()} &bull; {new Date(match.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right flex-1">
                      <div className="font-bold text-lg dark:text-gray-200">{match.homeTeam.name}</div>
                      <div className="text-3xl font-black text-gray-900 dark:text-white">{getScore(match, 'HOME')}</div>
                    </div>
                    <div className="text-gray-300 dark:text-gray-600 text-xl font-light">-</div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-lg dark:text-gray-200">{match.awayTeam.name}</div>
                      <div className="text-3xl font-black text-gray-900 dark:text-white">{getScore(match, 'AWAY')}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-6 pl-6 border-l border-gray-100 dark:border-gray-700">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAnalyzeMatch(match); }}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    title="Video Analysis"
                  >
                    <Video size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); generatePDF(match); }}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Export PDF"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); generateJSON(match); }}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    title="Export JSON"
                  >
                    <FileJson size={18} />
                  </button>
                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (match.id) onDeleteMatch(match.id); }}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete Match"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchHistory;