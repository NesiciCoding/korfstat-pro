import React from 'react';
import { MatchState } from '../types';
import { ArrowLeft, Calendar, ChevronRight, Trash2, FileJson, FileText } from 'lucide-react';
import { generatePDF, generateJSON } from '../services/reportGenerator';

interface MatchHistoryProps {
  matches: MatchState[];
  onSelectMatch: (match: MatchState) => void;
  onDeleteMatch: (id: string) => void;
  onBack: () => void;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, onSelectMatch, onDeleteMatch, onBack }) => {
  const getScore = (match: MatchState, teamId: 'HOME' | 'AWAY') =>
    match.events.filter(e => e.teamId === teamId && e.result === 'GOAL').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Match History</h1>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No matches recorded</h3>
            <p className="text-gray-500">Complete a match to see it listed here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.sort((a, b) => (b.date || 0) - (a.date || 0)).map((match) => (
              <div
                key={match.id}
                className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between"
                onClick={() => onSelectMatch(match)}
              >
                <div className="flex-1">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Calendar size={12} />
                    {new Date(match.date || Date.now()).toLocaleDateString()} &bull; {new Date(match.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right flex-1">
                      <div className="font-bold text-lg">{match.homeTeam.name}</div>
                      <div className="text-3xl font-black text-gray-900">{getScore(match, 'HOME')}</div>
                    </div>
                    <div className="text-gray-300 text-xl font-light">-</div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-lg">{match.awayTeam.name}</div>
                      <div className="text-3xl font-black text-gray-900">{getScore(match, 'AWAY')}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-6 pl-6 border-l border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); generatePDF(match); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Export PDF"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); generateJSON(match); }}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Export JSON"
                  >
                    <FileJson size={18} />
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-2"></div>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (match.id) onDeleteMatch(match.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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