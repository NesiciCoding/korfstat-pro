import React, { useState } from 'react';
import { Team, TeamId, Player, Gender, Position, SavedTeam } from '../types';
import { Club } from '../types/club';
import { ClubService } from '../services/clubService';
import { Plus, Trash2, PlayCircle, User, Users, Shield, Sword, Paintbrush, Save, Download, ChevronDown, Database } from 'lucide-react';

interface MatchSetupProps {
  onStartMatch: (home: Team, away: Team, durationSeconds: number, seasonId?: string) => void;
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
  <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded shadow-sm mb-2 transition-colors">
    <button
      onClick={() => toggleStarter(p.id)}
      className={`p-1.5 rounded ${p.isStarter ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-500'}`}
      title={p.isStarter ? "Move to Bench" : "Move to Starters"}
    >
      <User size={16} />
    </button>

    <input
      type="number"
      className="w-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded px-1 py-1 text-center font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
      value={p.number}
      placeholder="#"
      onChange={(e) => updatePlayer(p.id, 'number', parseInt(e.target.value) || 0)}
    />

    <input
      type="text"
      className="flex-1 min-w-[120px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
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
      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded px-1 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
    >
      <option value="M">M</option>
      <option value="F">F</option>
    </select>

    <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-0.5 transition-colors">
      <button
        onClick={() => updatePlayer(p.id, 'initialPosition', 'ATTACK')}
        className={`p-1 rounded text-xs font-bold ${p.initialPosition === 'ATTACK' ? 'bg-white dark:bg-gray-600 shadow text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}
        title="Attack"
      >
        <Sword size={14} />
      </button>
      <button
        onClick={() => updatePlayer(p.id, 'initialPosition', 'DEFENSE')}
        className={`p-1 rounded text-xs font-bold ${p.initialPosition === 'DEFENSE' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
        title="Defense"
      >
        <Shield size={14} />
      </button>
    </div>

    <button onClick={() => removePlayer(p.id)} className="text-gray-400 hover:text-red-600 p-1" aria-label="Remove Player" title="Remove Player">
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
  suggestions = [],
  savedTeams = [],
  clubs = [],
  onSaveTeam,
  onLoadTeam,
  onLoadClub,
  onDeleteTeam
}: {
  teamId: TeamId,
  name: string,
  setName: (s: string) => void,
  color: string,
  setColor: (s: string) => void,
  players: Player[],
  setPlayers: (p: Player[]) => void,
  suggestions?: Player[],
  savedTeams?: SavedTeam[],
  clubs?: Club[],
  onSaveTeam: () => void,
  onLoadTeam: (team: SavedTeam) => void,
  onLoadClub: (club: Club) => void,
  onDeleteTeam?: (team: SavedTeam) => void
}) => {
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showClubMenu, setShowClubMenu] = useState(false);

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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 min-w-[350px] flex flex-col h-full transition-colors relative">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${teamId === 'HOME' ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
          <Users size={20} />
          {teamId === 'HOME' ? 'Home Team' : 'Away Team'}
        </h3>

        <div className="flex items-center gap-2">
          {/* Save / Load Controls */}
          <div className="relative">
            <button
              onClick={() => setShowLoadMenu(!showLoadMenu)}
              className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Load Saved Team"
            >
              <Download size={18} />
            </button>
            {showLoadMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 py-1">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">Load Snapshot</div>
                {savedTeams.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400 italic">No saved teams</div>
                ) : (
                  savedTeams.map(team => (
                    <div key={team.id} className="flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/40 px-3 py-2 group">
                      <button
                        onClick={() => { onLoadTeam(team); setShowLoadMenu(false); }}
                        className="flex-1 text-left text-sm text-gray-700 dark:text-gray-200 font-medium"
                      >
                        {team.name}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteTeam && onDeleteTeam(team); }}
                        className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 p-1"
                        title="Delete Team"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Load from Club */}
          <div className="relative">
            <button
              onClick={() => setShowClubMenu(!showClubMenu)}
              className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Load from Club Database"
            >
              <Database size={18} />
            </button>
            {showClubMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 py-1">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">Load Club</div>
                {(!clubs || clubs.length === 0) ? (
                  <div className="px-3 py-2 text-sm text-gray-400 italic">No clubs found</div>
                ) : (
                  clubs.map(club => (
                    <div key={club.id} className="flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/40 px-3 py-2 group">
                      <button
                        onClick={() => { onLoadClub(club); setShowClubMenu(false); }}
                        className="flex-1 text-left text-sm text-gray-700 dark:text-gray-200 font-medium"
                      >
                        {club.name}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={onSaveTeam}
            className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Save Team As Club"
          >
            <Save size={18} />
          </button>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Jersey</label>
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
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Team Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
          placeholder="Enter team name..."
          aria-label={`${teamId === 'HOME' ? 'Home' : 'Away'} Team Name`}
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Starters Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Starters (8)
            </label>
            <div className="flex gap-2 text-xs">
              <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                {starters.filter(p => p.gender === 'M').length} M
              </span>
              <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                {starters.filter(p => p.gender === 'F').length} F
              </span>
              <span className={`px-2 py-0.5 rounded font-bold ${starters.length === 8 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
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
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
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

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={addPlayer}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-medium"
          aria-label={`Add Player to ${teamId === 'HOME' ? 'Home' : 'Away'} Team`}
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

  // Season State
  const [seasons] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('korfstat_seasons');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

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

  // Saved Teams State
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>(() => {
    try {
      const saved = localStorage.getItem('korfstat_saved_teams');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load saved teams", e);
      return [];
    }
  });

  const handleSaveTeam = (name: string, color: string, players: Player[]) => {
    const newTeam: SavedTeam = {
      id: crypto.randomUUID(),
      name,
      color,
      players
    };

    // Check if team with same name exists, if so update it
    const existingIndex = savedTeams.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
    let newSavedTeams;

    if (existingIndex >= 0) {
      if (!confirm(`Team "${name}" already exists. Overwrite?`)) return;
      newSavedTeams = [...savedTeams];
      newSavedTeams[existingIndex] = { ...newSavedTeams[existingIndex], color, players };
    } else {
      newSavedTeams = [...savedTeams, newTeam];
    }

    setSavedTeams(newSavedTeams);
    localStorage.setItem('korfstat_saved_teams', JSON.stringify(newSavedTeams));
    alert(`Team "${name}" saved!`);
  };

  const handleLoadTeam = (team: SavedTeam, setTeamName: (s: string) => void, setTeamColor: (s: string) => void, setTeamPlayers: (p: Player[]) => void, prefix: string) => {
    setTeamName(team.name);
    setTeamColor(team.color);
    // Regenerate IDs to prevent conflicts if loaded multiple times or mixed
    const playersWithFreshIds = team.players.map((p, i) => ({
      ...p,
      id: `${prefix}${Date.now()}_${i}` // Ensure unique prefix/suffix
    }));
    setTeamPlayers(playersWithFreshIds);
  };

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
      duration * 60,
      selectedSeasonId || undefined
    );
  };

  const handleDeleteTeam = (teamToDelete: SavedTeam) => {
    if (!confirm(`Are you sure you want to delete "${teamToDelete.name}"?`)) return;

    const newSavedTeams = savedTeams.filter(t => t.id !== teamToDelete.id);
    setSavedTeams(newSavedTeams);
    localStorage.setItem('korfstat_saved_teams', JSON.stringify(newSavedTeams));
  };

  const [clubs, setClubs] = useState<Club[]>([]);

  React.useEffect(() => {
    setClubs(ClubService.getAllClubs());
  }, []);

  const handleLoadClub = (club: Club, setTeamName: (s: string) => void, setTeamColor: (s: string) => void, setTeamPlayers: (p: Player[]) => void) => {
    console.log('Loading club:', club.name);
    setTeamName(club.name);
    setTeamColor(club.primaryColor);

    const mappedPlayers: Player[] = club.players.map((p) => ({
      id: p.id, // Use persistent ID
      number: p.shirtNumber || 0,
      name: `${p.firstName} ${p.lastName}`.trim(),
      gender: p.gender,
      initialPosition: p.positions?.[0] || 'ATTACK',
      isStarter: false
    }));

    // Auto-select 8 starters if possible
    mappedPlayers.slice(0, 8).forEach(p => p.isStarter = true);

    setTeamPlayers(mappedPlayers);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex flex-col transition-colors duration-300">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">KorfStat Pro</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Match Configuration</p>
        <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Half Duration:</span>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value) || 25)}
            className="w-12 text-center font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded p-1"
            aria-label="Half Duration"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">mins</span>
        </div>

        {seasons.length > 0 && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Season:</span>
              <select
                className="bg-transparent font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
              >
                <option value="">-- None --</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8 max-w-7xl mx-auto w-full flex-1">
        <TeamConfig
          teamId="HOME"
          name={homeName} setName={setHomeName}
          color={homeColor} setColor={setHomeColor}
          players={homePlayers} setPlayers={setHomePlayers}
          suggestions={allPlayers}
          savedTeams={savedTeams}
          clubs={clubs}
          onSaveTeam={() => handleSaveTeam(homeName, homeColor, homePlayers)}
          onLoadTeam={(team) => handleLoadTeam(team, setHomeName, setHomeColor, setHomePlayers, 'h')}
          onLoadClub={(club) => handleLoadClub(club, setHomeName, setHomeColor, setHomePlayers)}
          onDeleteTeam={handleDeleteTeam}
        />
        <TeamConfig
          teamId="AWAY"
          name={awayName} setName={setAwayName}
          color={awayColor} setColor={setAwayColor}
          players={awayPlayers} setPlayers={setAwayPlayers}
          suggestions={allPlayers}
          savedTeams={savedTeams}
          clubs={clubs}
          onSaveTeam={() => handleSaveTeam(awayName, awayColor, awayPlayers)}
          onLoadTeam={(team) => handleLoadTeam(team, setAwayName, setAwayColor, setAwayPlayers, 'a')}
          onLoadClub={(club) => handleLoadClub(club, setAwayName, setAwayColor, setAwayPlayers)}
          onDeleteTeam={handleDeleteTeam}
        />
      </div>

      <div className="flex justify-center pb-10">
        <button
          onClick={handleStart}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold px-12 py-4 rounded-full shadow-xl transform hover:scale-105 transition-all ring-4 ring-indigo-50 dark:ring-indigo-900"
        >
          <PlayCircle size={28} /> Start Match
        </button>
      </div>
    </div>
  );
};

export default MatchSetup;