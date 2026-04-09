import React from 'react';
import KorfballField from '../KorfballField';
import { MatchState } from '../../types';
import { getTotalGoals } from '../../utils/lineupUtils';

interface FieldPanelProps {
  matchState: MatchState;
  onFieldClick: (x: number, y: number) => void;
}

const FieldPanel: React.FC<FieldPanelProps> = ({ matchState, onFieldClick }) => (
  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-4 relative transition-colors">
    <div className="flex-1 min-h-0 relative">
      <KorfballField
        mode="input"
        onFieldClick={onFieldClick}
        homeColor={matchState.homeTeam.color}
        awayColor={matchState.awayTeam.color}
        totalGoals={getTotalGoals(matchState)}
      />
    </div>
    <div className="flex justify-between px-2 mt-2 text-xs font-bold text-gray-400">
      <span style={{ color: matchState.homeTeam.color }}>HOME ZONE</span>
      <span style={{ color: matchState.awayTeam.color }}>AWAY ZONE</span>
    </div>
  </div>
);

export default FieldPanel;
