import React, { useState } from 'react';
import { Team, TeamId, Player, Gender, Position } from '../types';
import { Plus, Trash2, PlayCircle, User, Users, Shield, Sword, Paintbrush } from 'lucide-react';

interface MatchSetupProps {
  onStartMatch: (home: Team, away: Team, durationSeconds: number) => void;
  savedMatches: any[]; // Using any[] to avoid circular dependency import issues if simple
}

interface PlayerRowProps {
  p: Player;
  toggleStarter: (id: string) => void;
  updatePlayer: (id: string, field: keyof Player, value: any) => void;
  removePlayer: (id: string) => void;
  suggestions: Player[];
}

const PlayerRow: React.FC<PlayerRowProps> = ({ p, toggleStarter, updatePlayer, removePlayer, suggestions = [] }) => (
  <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 p-2 rounded shadow-sm mb-2">
    <button
      onClick={() => toggleStarter(p.id)}
      className={`p-1.5 rounded ${p.isStarter ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'}`}
      title={p.isStarter ? "Move to Bench" : "Move to Starters"}
    >
      <User size={16} />
    </button>

    <input
      type="number"
      className="w-12 border border-gray-300 bg-white text-gray-900 rounded px-1 py-1 text-center font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
      value={p.number}
      placeholder="#"
      onChange={(e) => updatePlayer(p.id, 'number', parseInt(e.target.value) || 0)}
    />

    <input
      type="text"
      className="flex-1 min-w-[120px] border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
      value={p.name}
      placeholder="Name"
      list={`suggestions-${p.id}`}
      onChange={(e) => {
        const newName = e.target.value;
        updatePlayer(p.id, 'name', newName);

        // Auto-fill details if name matches known player
        const match = suggestions.find(s => s.name.toLowerCase() === newName.toLowerCase());
        if (match) {
          // Preserve unique ID logic? 
          // The user wants "Add a unique ID to each name".
          // If we reuse the ID from history, it links stats.
          updatePlayer(p.id, 'id', match.id); // Reuse ID
          // updatePlayer(p.id, 'gender', match.gender); // Optional: autofill gender
        }
      }}
    />
    <datalist id={`suggestions-${p.id}`}>
      {suggestions.map(s => (
        <option key={s.id} value={s.name} />
      ))}
    </datalist>

    <select
      value={p.gender}
      onChange={(e) => updatePlayer(p.id, 'gender', e.target.value)}
      className="border border-gray-300 bg-white text-gray-900 rounded px-1 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
    >
      <option value="M">M</option>
      <option value="F">F</option>
    </select>

    <div className="flex bg-gray-100 rounded p-0.5">
      <button
        onClick={() => updatePlayer(p.id, 'initialPosition', 'ATTACK')}
        className={`p-1 rounded text-xs font-bold ${p.initialPosition === 'ATTACK' ? 'bg-white shadow text-red-600' : 'text-gray-400'}`}
        title="Attack"
      >
        <Sword size={14} />
      </button>
      <button
        onClick={() => updatePlayer(p.id, 'initialPosition', 'DEFENSE')}
        className={`p-1 rounded text-xs font-bold ${p.initialPosition === 'DEFENSE' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
        title="Defense"
      >
        <Shield size={14} />
      </button>
    </div>

    <button onClick={() => removePlayer(p.id)} className="text-gray-400 hover:text-red-600 p-1">
      <Trash2 size={16} />
    </button>
  </div>
);

const TeamConfig = ({
  teamId,
  name,
  setName,
  color,
  setColor,
  players,
  setPlayers,
  suggestions = []
}: {
  teamId: TeamId,
  name: string,
  setName: (s: string) => void,
  color: string,
  setColor: (s: string) => void,
  players: Player[],
  setPlayers: (p: Player[]) => void,
  suggestions?: Player[]
}) => {

  const addPlayer = () => {
    const newPlayer: Player = {
      id: `${teamId === 'HOME' ? 'h' : 'a'}${Date.now()}`,
      number: 0,
      name: 'New Player',
      gender: 'M',
      initialPosition: 'ATTACK',
      isStarter: players.length < 8,
    };
    setPlayers([...players, newPlayer]);
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const updatePlayer = (id: string, field: keyof Player, value: any) => {
    setPlayers(players.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const toggleStarter = (id: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, isStarter: !p.isStarter } : p));
  };

  const starters = players.filter(p => p.isStarter);
  const reserves = players.filter(p => !p.isStarter);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex-1 min-w-[350px] flex flex-col h-full">
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${teamId === 'HOME' ? 'text-blue-700' : 'text-red-700'}`}>
          <Users size={20} />
          {teamId === 'HOME' ? 'Home Team' : 'Away Team'}
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase">Jersey</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 p-0 rounded cursor-pointer border-none"
            title="Select Team Color"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Team Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 bg-white text-gray-900 text-lg font-semibold rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="Enter team name..."
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Starters Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
              Starters (8)
            </label>
            <div className="flex gap-2 text-xs">
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {starters.filter(p => p.gender === 'M').length} M
              </span>
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {starters.filter(p => p.gender === 'F').length} F
              </span>
              <span className={`px-2 py-0.5 rounded font-bold ${starters.length === 8 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {starters.length}/8
              </span>
            </div>
          </div>
          {starters.length === 0 && <div className="text-sm text-gray-400 italic mb-2">No starters selected</div>}
          {starters.map(p => (
            <PlayerRow
              key={p.id}
              p={p}
              toggleStarter={toggleStarter}
              updatePlayer={updatePlayer}
              removePlayer={removePlayer}
              suggestions={suggestions}
            />
          ))}
        </div>

        {/* Reserves Section */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Reserves / Bench
          </label>
          {reserves.map(p => (
            <PlayerRow
              key={p.id}
              p={p}
              toggleStarter={toggleStarter}
              updatePlayer={updatePlayer}
              removePlayer={removePlayer}
              suggestions={suggestions}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={addPlayer}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium"
        >
          <Plus size={18} /> Add Player
        </button>
      </div>
    </div>
  );
};

const MatchSetup: React.FC<MatchSetupProps> = ({ onStartMatch, savedMatches = [] }) => {
  console.log('[MatchSetup] Rendering. SavedMatches length:', savedMatches?.length);
  const [homeName, setHomeName] = useState('Home Team');
  const [homeColor, setHomeColor] = useState('#2563eb'); // Blue-600
  const [awayName, setAwayName] = useState('Away Team');
  const [awayColor, setAwayColor] = useState('#dc2626'); // Red-600

  // Extract unique historical players
  const allPlayers = React.useMemo(() => {
    console.log('[MatchSetup] Recalculating allPlayers from savedMatches', savedMatches);
    const playersMap = new Map();
    if (Array.isArray(savedMatches)) {
      savedMatches.forEach((match, index) => {
        try {
          if (!match) return;
          const homePlayers = match.homeTeam?.players || [];
          const awayPlayers = match.awayTeam?.players || [];

          [...homePlayers, ...awayPlayers].forEach(p => {
            if (p && p.name && !playersMap.has(p.name)) {
              playersMap.set(p.name, p);
            }
          });
        } catch (err) {
          console.error(`[MatchSetup] Error processing match at index ${index}`, err, match);
        }
      });
    } else {
      console.warn('[MatchSetup] savedMatches is not an array:', savedMatches);
    }
    const result = Array.from(playersMap.values());
    console.log('[MatchSetup] Derived unique players:', result.length);
    return result;
  }, [savedMatches]);

  const createInitialRoster = (prefix: string): Player[] => Array.from({ length: 10 }).map((_, i) => ({
    id: `${prefix}${i + 1}`,
    number: i + 1,
    name: `Player ${i + 1}`,
    gender: i % 2 === 0 ? 'M' : 'F',
    initialPosition: i < 4 ? 'ATTACK' : 'DEFENSE',
    isStarter: i < 8
  }));

  const [homePlayers, setHomePlayers] = useState<Player[]>(createInitialRoster('h'));
  const [awayPlayers, setAwayPlayers] = useState<Player[]>(createInitialRoster('a'));

  const [duration, setDuration] = useState(25); // Minutes

  const handleStart = () => {
    const prepareTeam = (id: TeamId, name: string, players: Player[], color: string): Team => ({
      id,
      name,
      color,
      substitutionCount: 0,
      players: players.map(p => ({ ...p, onField: p.isStarter }))
    });

    onStartMatch(
      prepareTeam('HOME', homeName, homePlayers, homeColor),
      prepareTeam('AWAY', awayName, awayPlayers, awayColor),
      duration * 60
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">KorfStat Pro</h1>
        <p className="text-gray-500 mb-4">Match Configuration</p>
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
          <span className="text-sm font-bold text-gray-500">Half Duration:</span>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value) || 25)}
            className="w-12 text-center font-bold border rounded p-1"
          />
          <span className="text-sm text-gray-500">mins</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8 max-w-7xl mx-auto w-full flex-1">
        <TeamConfig
          teamId="HOME"
          name={homeName} setName={setHomeName}
          color={homeColor} setColor={setHomeColor}
          players={homePlayers} setPlayers={setHomePlayers}
          suggestions={allPlayers}
        />
        <TeamConfig
          teamId="AWAY"
          name={awayName} setName={setAwayName}
          color={awayColor} setColor={setAwayColor}
          players={awayPlayers} setPlayers={setAwayPlayers}
          suggestions={allPlayers}
        />
      </div>

      <div className="flex justify-center pb-10">
        <button
          onClick={handleStart}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold px-12 py-4 rounded-full shadow-xl transform hover:scale-105 transition-all ring-4 ring-indigo-50"
        >
          <PlayCircle size={28} /> Start Match
        </button>
      </div>
    </div>
  );
};

export default MatchSetup;