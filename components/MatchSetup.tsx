import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Team, type TeamId, Player, Gender, Position, SavedTeam } from '../types';
import { MatchProfile, DEFAULT_PROFILES } from '../types/profile';
import { Club } from '../types/club';
import { ClubService } from '../services/clubService';
import { Plus, Trash2, PlayCircle, Play, User, Users, Shield, Sword, Paintbrush, Save, Download, ChevronDown, Database } from 'lucide-react';
import AssetUploader from './AssetUploader';

interface MatchSetupProps {
  onStartMatch: (home: Team, away: Team, profile?: MatchProfile, seasonId?: string) => void;
  savedMatches: any[]; // Using any[] to avoid circular dependency import issues if simple
}

interface PlayerRowProps {
  p: Player;
  toggleStarter: (id: string) => void;
  updatePlayer: (id: string, field: keyof Player, value: any) => void;
  removePlayer: (id: string) => void;
  suggestions: Player[];
}

const PlayerRow: React.FC<PlayerRowProps> = ({ p, toggleStarter, updatePlayer, removePlayer, suggestions = [] }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded shadow-sm mb-2 transition-colors">
      <button
        onClick={() => toggleStarter(p.id)}
        className={`p-1.5 rounded ${p.isStarter ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-500'}`}
        title={p.isStarter ? t('matchSetup.moveToBench') : t('matchSetup.moveToStarters')}
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
      placeholder={t('matchSetup.placeholderName')}
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
        title={t('matchSetup.attack')}
      >
        <Sword size={14} />
      </button>
      <button
        onClick={() => updatePlayer(p.id, 'initialPosition', 'DEFENSE')}
        className={`p-1 rounded text-xs font-bold ${p.initialPosition === 'DEFENSE' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
        title={t('matchSetup.defense')}
      >
        <Shield size={14} />
      </button>
    </div>

    <button onClick={() => removePlayer(p.id)} className="text-gray-400 hover:text-red-600 p-1" aria-label={t('matchSetup.removePlayer')} title={t('matchSetup.removePlayer')}>
      <Trash2 size={16} />
    </button>
  </div>
);
}

interface TeamSetupProps {
  teamId: TeamId;
  name: string;
  setName: (s: string) => void;
  color: string;
  setColor: (s: string) => void;
  secondaryColor?: string;
  setSecondaryColor: (s: string) => void;
  logoUrl?: string;
  setLogoUrl: (s: string) => void;
  players: Player[];
  setPlayers: (p: Player[]) => void;
  suggestions?: Player[];
  savedTeams?: SavedTeam[];
  clubs?: Club[];
  onSaveTeam: () => void;
  onLoadTeam: (team: SavedTeam) => void;
  onLoadClub: (club: Club) => void;
  onDeleteTeam?: (team: SavedTeam) => void;
}

// Component for configuring a single team
const TeamSetup: React.FC<TeamSetupProps> = ({
  teamId,
  name,
  setName,
  color,
  setColor,
  secondaryColor,
  setSecondaryColor,
  logoUrl,
  setLogoUrl,
  players,
  setPlayers,
  suggestions = [],
  savedTeams = [],
  clubs = [],
  onSaveTeam,
  onLoadTeam,
  onLoadClub,
  onDeleteTeam
}) => {
  const { t } = useTranslation();
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
          {teamId === 'HOME' ? t('matchSetup.homeTeam') : t('matchSetup.awayTeam')}
        </h3>

        <div className="flex items-center gap-2">
          {/* Save / Load Controls */}
          <div className="relative">
            <button
              onClick={() => setShowLoadMenu(!showLoadMenu)}
              className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title={t('matchSetup.loadSaved')}
            >
              <Download size={18} />
            </button>
            {showLoadMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 py-1">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">{t('matchSetup.loadSnapshot')}</div>
                {savedTeams.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-400 italic">{t('matchSetup.noSavedTeams')}</div>
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
                        title={t('matchSetup.deleteTeam')}
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
              title={t('matchSetup.loadClub')}
            >
              <Database size={18} />
            </button>
            {showClubMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 py-1">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">{t('matchSetup.loadClubHeading')}</div>
                {(!clubs || clubs.length === 0) ? (
                  <div className="px-3 py-2 text-sm text-gray-400 italic">{t('matchSetup.noClubsFound')}</div>
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
            title={t('matchSetup.saveAsClub')}
          >
            <Save size={18} />
          </button>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

          <div className="flex flex-col gap-1 items-end">
              <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase leading-none">{t('matchSetup.primary')}</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 p-0 rounded cursor-pointer border-none"
                title={t('matchSetup.primaryColorTitle')}
              />
          </div>
          <div className="flex flex-col gap-1 items-end">
              <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase leading-none">{t('matchSetup.secondary')}</label>
              <input
                type="color"
                value={secondaryColor || '#000000'}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-6 h-6 p-0 rounded cursor-pointer border-none"
                title={t('matchSetup.secondaryColorTitle')}
              />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <AssetUploader 
            label={t('matchSetup.teamLogo')} 
            currentUrl={logoUrl} 
            onUploadSuccess={setLogoUrl} 
        />
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('matchSetup.teamName')}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
          placeholder={t('matchSetup.enterTeamName')}
          aria-label={`${teamId === 'HOME' ? t('matchSetup.homeTeam') : t('matchSetup.awayTeam')} ${t('matchSetup.teamName')}`}
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Starters Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('matchSetup.starters')}
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
          {starters.length === 0 && <div className="text-sm text-gray-400 italic mb-2">{t('matchSetup.noStarters')}</div>}
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
            {t('matchSetup.reserves')}
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
          aria-label={`${t('matchSetup.addPlayer')} ${teamId === 'HOME' ? t('matchSetup.homeTeam') : t('matchSetup.awayTeam')}`}
        >
          <Plus size={18} /> {t('matchSetup.addPlayer')}
        </button>
      </div>
    </div>
  );
};

const MatchSetup: React.FC<MatchSetupProps> = ({ onStartMatch, savedMatches = [] }) => {
  const { t } = useTranslation();
  console.log('[MatchSetup] Rendering. SavedMatches length:', savedMatches?.length);
  const [homeName, setHomeName] = useState(t('matchSetup.homeTeam'));
  const [homeColor, setHomeColor] = useState('#2563eb'); // Blue-600
  const [homeSecondaryColor, setHomeSecondaryColor] = useState<string>('#1e40af'); // Blue-800
  const [homeLogoUrl, setHomeLogoUrl] = useState<string | undefined>();
  
  const [awayName, setAwayName] = useState(t('matchSetup.awayTeam'));
  const [awayColor, setAwayColor] = useState('#dc2626'); // Red-600
  const [awaySecondaryColor, setAwaySecondaryColor] = useState<string>('#991b1b'); // Red-800
  const [awayLogoUrl, setAwayLogoUrl] = useState<string | undefined>();

  const [selectedProfile, setSelectedProfile] = useState<MatchProfile>(DEFAULT_PROFILES[0]);

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
    name: `${t('matchTracker.substitution')} ${i + 1}`, // Reusing substitution key for "Player" placeholder as it's often similar or just use static number
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

  const handleSaveTeam = (name: string, color: string, secondaryColor: string, players: Player[]) => {
    const newTeam: SavedTeam = {
      id: crypto.randomUUID(),
      name,
      color,
      secondaryColor,
      players
    };

    // Check if team with same name exists, if so update it
    const existingIndex = savedTeams.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
    let newSavedTeams;

    if (existingIndex >= 0) {
      if (!confirm(t('matchSetup.overwriteConfirm', { name }))) return;
      newSavedTeams = [...savedTeams];
      newSavedTeams[existingIndex] = { ...newSavedTeams[existingIndex], color, secondaryColor, players };
    } else {
      newSavedTeams = [...savedTeams, newTeam];
    }

    setSavedTeams(newSavedTeams);
    localStorage.setItem('korfstat_saved_teams', JSON.stringify(newSavedTeams));
    alert(t('matchSetup.teamSaved', { name }));
  };

  const handleLoadTeam = (team: SavedTeam, setTeamName: (s: string) => void, setTeamColor: (s: string) => void, setTeamSecondaryColor: (s: string) => void, setTeamPlayers: (p: Player[]) => void, prefix: string) => {
    setTeamName(team.name);
    setTeamColor(team.color);
    if (team.secondaryColor) setTeamSecondaryColor(team.secondaryColor);
    // Regenerate IDs to prevent conflicts if loaded multiple times or mixed
    const playersWithFreshIds = team.players.map((p, i) => ({
      ...p,
      id: `${prefix}${Date.now()}_${i}` // Ensure unique prefix/suffix
    }));
    setTeamPlayers(playersWithFreshIds);
  };

  const handleStart = () => {
    const prepareTeam = (id: TeamId, name: string, players: Player[], color: string, secondaryColor: string, logoUrl?: string): Team => ({
      id,
      name,
      color,
      secondaryColor,
      logoUrl,
      substitutionCount: 0,
      players: players.map(p => ({ ...p, onField: p.isStarter }))
    });

    onStartMatch(
      prepareTeam('HOME', homeName, homePlayers, homeColor, homeSecondaryColor, homeLogoUrl),
      prepareTeam('AWAY', awayName, awayPlayers, awayColor, awaySecondaryColor, awayLogoUrl),
      selectedProfile,
      selectedSeasonId || undefined
    );
  };

  const handleDeleteTeam = (teamToDelete: SavedTeam) => {
    if (!confirm(t('matchSetup.deleteConfirm', { name: teamToDelete.name }))) return;

    const newSavedTeams = savedTeams.filter(t => t.id !== teamToDelete.id);
    setSavedTeams(newSavedTeams);
    localStorage.setItem('korfstat_saved_teams', JSON.stringify(newSavedTeams));
  };

  const [clubs, setClubs] = useState<Club[]>([]);

  React.useEffect(() => {
    setClubs(ClubService.getAllClubs());
  }, []);

  const handleLoadClub = (club: Club, setTeamName: (s: string) => void, setTeamColor: (s: string) => void, setTeamSecondaryColor: (s: string) => void, setTeamLogo: (s: string | undefined) => void, setTeamPlayers: (p: Player[]) => void) => {
    console.log('Loading club:', club.name);
    setTeamName(club.name);
    setTeamColor(club.primaryColor);
    if (club.secondaryColor) setTeamSecondaryColor(club.secondaryColor);
    setTeamLogo(club.logoUrl);

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
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">{t('matchSetup.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('matchSetup.subtitle')}</p>
        
        {/* Profile Selection */}
        <div className="max-w-4xl mx-auto mb-8">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 text-left pl-2">{t('matchSetup.step1')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {DEFAULT_PROFILES.map(profile => (
              <button
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
                className={`p-4 rounded-xl border-2 transition-all ${selectedProfile?.id === profile.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold ${selectedProfile?.id === profile.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'}`}>{profile.name}</h3>
                  {selectedProfile?.id === profile.id && <span className="text-indigo-600"><Plus size={18} /></span>}
                </div>
                <p className="text-xs text-gray-500 mb-3">{profile.description}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{profile.periods}x{profile.periodDurationSeconds / 60}m</span>
                    {profile.hasShotClock ? (
                      <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">{t('matchSetup.shotClock', { count: profile.shotClockDurationSeconds })}</span>
                    ) : (
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded">{t('matchSetup.noClock')}</span>
                    )}
                  </div>
              </button>
            ))}
          </div>
        </div>

        {seasons.length > 0 && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('matchSetup.seasonOptional')}</span>
              <select
                className="bg-transparent font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
              >
                <option value="">{t('matchSetup.none')}</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto w-full mb-4 pl-2">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('matchSetup.step2')}</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8 max-w-7xl mx-auto w-full flex-1">
        <TeamSetup
          teamId="HOME"
          name={homeName} setName={setHomeName}
          color={homeColor} setColor={setHomeColor}
          secondaryColor={homeSecondaryColor} setSecondaryColor={setHomeSecondaryColor}
          logoUrl={homeLogoUrl} setLogoUrl={setHomeLogoUrl}
          players={homePlayers} setPlayers={setHomePlayers}
          suggestions={allPlayers}
          savedTeams={savedTeams}
          clubs={clubs}
          onSaveTeam={() => handleSaveTeam(homeName, homeColor, homeSecondaryColor, homePlayers)}
          onLoadTeam={(team) => handleLoadTeam(team, setHomeName, setHomeColor, setHomeSecondaryColor, setHomePlayers, 'h')}
          onLoadClub={(club) => handleLoadClub(club, setHomeName, setHomeColor, setHomeSecondaryColor, setHomeLogoUrl, setHomePlayers)}
          onDeleteTeam={handleDeleteTeam}
        />

        <TeamSetup
          teamId="AWAY"
          name={awayName} setName={setAwayName}
          color={awayColor} setColor={setAwayColor}
          secondaryColor={awaySecondaryColor} setSecondaryColor={setAwaySecondaryColor}
          logoUrl={awayLogoUrl} setLogoUrl={setAwayLogoUrl}
          players={awayPlayers} setPlayers={setAwayPlayers}
          suggestions={allPlayers}
          savedTeams={savedTeams}
          clubs={clubs}
          onSaveTeam={() => handleSaveTeam(awayName, awayColor, awaySecondaryColor, awayPlayers)}
          onLoadTeam={(team) => handleLoadTeam(team, setAwayName, setAwayColor, setAwaySecondaryColor, setAwayPlayers, 'a')}
          onLoadClub={(club) => handleLoadClub(club, setAwayName, setAwayColor, setAwaySecondaryColor, setAwayLogoUrl, setAwayPlayers)}
          onDeleteTeam={handleDeleteTeam}
        />
      </div>

      <div className="max-w-7xl mx-auto w-full flex justify-end pb-12 pr-2">
        <button
          onClick={handleStart}
          className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 transition-all text-xl font-bold"
        >
          <Play size={24} fill="currentColor" />
          {t('matchSetup.startMatch')}
        </button>
      </div>
    </div>
  );
};

export default MatchSetup;