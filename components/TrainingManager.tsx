import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, CheckCircle, Plus, ChevronRight, ChevronLeft, 
  Save, Trash2, Calendar, MapPin, Activity, Award, UserCheck, Search, Filter
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { TrainingSession, Drill, PlayerDrillResult } from '../types/training';
import { DRILL_LIBRARY } from '../data/DrillLibrary';
import { Team, Player } from '../types';
import { generateUUID } from '../utils/uuid';

interface TrainingManagerProps {
  onBack: () => void;
}

const TrainingManager: React.FC<TrainingManagerProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  
  const [step, setStep] = useState<'LIST' | 'SETUP' | 'ATTENDANCE' | 'DRILLS' | 'ENTRY' | 'SUMMARY'>('LIST');
  const [sessions, setSessions] = useState<TrainingSession[]>(() => {
    const saved = localStorage.getItem('korfstat_training_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeSession, setActiveSession] = useState<Partial<TrainingSession>>({});
  const [selectedDrills, setSelectedDrills] = useState<Drill[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Storage Effect
  useEffect(() => {
    localStorage.setItem('korfstat_training_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const startNewSession = () => {
    setActiveSession({
      id: generateUUID(),
      date: Date.now(),
      attendees: [],
      drillResults: []
    });
    setStep('SETUP');
  };

  const handleSaveSession = () => {
    if (!activeSession.id) return;
    const sessionToSave = activeSession as TrainingSession;
    setSessions(prev => {
      const exists = prev.find(s => s.id === sessionToSave.id);
      if (exists) return prev.map(s => s.id === sessionToSave.id ? sessionToSave : s);
      return [sessionToSave, ...prev];
    });
    setStep('LIST');
  };

  const deleteSession = (id: string) => {
    if (confirm(t('common.confirmDelete', 'Are you sure you want to delete this session?'))) {
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  // --- Sub-Components for Steps ---

  const renderSessionList = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">Training <span className="text-indigo-600 italic">Tracker</span></h2>
          <p className="text-sm text-gray-500">{t('training.listDesc', 'Manage athlete attendance and drill performance.')}</p>
        </div>
        <button 
          onClick={startNewSession}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus size={20} />
          {t('training.newSession', 'New Session')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map(session => (
          <div key={session.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl">
                <Calendar className="text-indigo-600 dark:text-indigo-400" size={20} />
              </div>
              <button 
                onClick={() => deleteSession(session.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 uppercase font-bold tracking-widest">
              <MapPin size={12} className="text-gray-400" /> {session.location || t('training.noLocation', 'No Location')}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 font-medium">
              <Users size={12} /> {session.attendees.length} {t('training.athletes', 'Athletes')}
              <span className="mx-1 opacity-30">•</span>
              <Activity size={12} /> {new Set(session.drillResults.map(r => r.drillId)).size} {t('training.drills', 'Drills')}
            </div>
            <button 
              onClick={() => { setActiveSession(session); setStep('SUMMARY'); }}
              className="w-full py-2 flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-650 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 transition-all"
            >
              View Summary <ChevronRight size={16} />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl opacity-50">
            <Users size={48} className="text-gray-400 mb-4" />
            <p className="font-bold text-gray-500 uppercase tracking-widest">{t('training.noSessions', 'No training sessions yet')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-600/30">
          <Calendar className="text-white" size={32} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('training.setupTitle', 'Start Session')}</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl space-y-6 overflow-hidden relative">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <MapPin size={12} /> {t('training.location', 'Location')}
          </label>
          <input 
            type="text" 
            value={activeSession.location || ''}
            onChange={e => setActiveSession({...activeSession, location: e.target.value})}
            placeholder="e.g. Training Hall A, Outdoor Pitch..."
            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-medium focus:border-indigo-600 outline-none transition-all shadow-inner"
          />
        </div>

        {/* Team Selection Placeholder - In KorfStat normally we use Home/Away from settings or a Club Manager */}
        <div className="pt-4">
          <button 
            onClick={() => setStep('ATTENDANCE')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
          >
            {t('common.nextStep', 'Continue to Attendance')}
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => {
    // For demo/simplicity, we'll use the players from the "Home Team" in settings or active match
    // Real implementation would link to a Club
    const players = settings.defaultHomePlayers || []; 
    
    const toggleAttendee = (id: string) => {
      const attendees = activeSession.attendees || [];
      if (attendees.includes(id)) {
        setActiveSession({...activeSession, attendees: attendees.filter(a => a !== id)});
      } else {
        setActiveSession({...activeSession, attendees: [...attendees, id]});
      }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setStep('SETUP')} className="p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm hover:bg-gray-50 transition-all"><ChevronLeft /></button>
           <div>
             <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('training.attendance', 'Attendance')}</h2>
             <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">
               {activeSession.attendees?.length || 0} / {players.length} {t('training.present', 'Present')}
             </span>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map(player => {
            const isPresent = activeSession.attendees?.includes(player.id);
            return (
              <button
                key={player.id}
                onClick={() => toggleAttendee(player.id)}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 relative overflow-hidden group ${
                  isPresent 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95' 
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                }`}
              >
                {isPresent && (
                  <div className="absolute top-2 right-2 bg-white/20 p-1 rounded-full text-white">
                    <UserCheck size={14} />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isPresent ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-indigo-600'}`}>
                  {player.number}
                </div>
                <span className="font-bold text-sm text-center line-clamp-1">{player.name}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-8">
          <button 
            onClick={() => setStep('DRILLS')}
            disabled={(activeSession.attendees?.length || 0) === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white py-5 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
          >
            {t('common.nextStep', 'Select Drills')}
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  };

  const renderDrillSelection = () => {
    const toggleDrill = (drill: Drill) => {
      if (selectedDrills.find(d => d.id === drill.id)) {
        setSelectedDrills(selectedDrills.filter(d => d.id !== drill.id));
      } else {
        setSelectedDrills([...selectedDrills, drill]);
      }
    };

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setStep('ATTENDANCE')} className="p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm hover:bg-gray-50 transition-all"><ChevronLeft /></button>
           <div>
             <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('training.drillLibrary', 'Drill Library')}</h2>
             <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">
               {selectedDrills.length} {t('training.selected', 'Selected')}
             </span>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DRILL_LIBRARY.map(drill => {
            const isSelected = !!selectedDrills.find(d => d.id === drill.id);
            return (
              <button
                key={drill.id}
                onClick={() => toggleDrill(drill)}
                className={`p-6 rounded-3xl border-2 transition-all flex items-start gap-5 text-left relative group ${
                  isSelected 
                  ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20 dark:border-indigo-400' 
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200'
                }`}
              >
                <div className={`p-4 rounded-2xl flex-shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-indigo-600'}`}>
                   {drill.category === 'SHOOTING' ? <Award size={24} /> : <Activity size={24} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight italic">{drill.name}</h3>
                    {isSelected && <CheckCircle size={20} className="text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{drill.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                      {drill.category}
                    </span>
                    <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      Target: {drill.target}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-8">
          <button 
            onClick={() => setStep('ENTRY')}
            disabled={selectedDrills.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white py-5 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
          >
            {t('common.nextStep', 'Enter Results')}
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  };

  const renderDataEntry = () => {
    const players = settings.defaultHomePlayers?.filter(p => activeSession.attendees?.includes(p.id)) || [];
    
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setStep('DRILLS')} className="p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm hover:bg-gray-50 transition-all"><ChevronLeft /></button>
           <div>
             <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('training.dataEntry', 'Results Entry')}</h2>
             <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">{activeSession.attendees?.length} {t('training.entries', 'Entries')} / {selectedDrills.length} {t('training.drills', 'Drills')}</span>
           </div>
        </div>

        <div className="space-y-12">
          {selectedDrills.map(drill => (
            <div key={drill.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
               <div className="bg-indigo-600 p-6 flex justify-between items-center">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-wider">{drill.name}</h3>
                  <div className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold text-white uppercase tracking-widest">{drill.metricType}</div>
               </div>
               
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players.map(player => {
                    const result = activeSession.drillResults?.find(r => r.playerId === player.id && r.drillId === drill.id);
                    return (
                      <div key={player.id} className="flex items-center gap-4 border-b dark:border-gray-700 pb-4 last:border-0 md:border-b-0">
                         <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-indigo-600 text-lg">
                           {player.number}
                         </div>
                         <div className="flex-1 space-y-1">
                           <div className="font-bold text-sm text-gray-900 dark:text-white">{player.name}</div>
                           <input 
                             type="number"
                             value={result?.value || ''}
                             onChange={e => {
                               const val = parseInt(e.target.value);
                               const newResults = [...(activeSession.drillResults || [])].filter(r => !(r.playerId === player.id && r.drillId === drill.id));
                               if (!isNaN(val)) {
                                 newResults.push({ playerId: player.id, drillId: drill.id, value: val, timestamp: Date.now() });
                               }
                               setActiveSession({...activeSession, drillResults: newResults});
                             }}
                             placeholder={drill.target?.toString() || '0'}
                             className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm focus:border-indigo-600 outline-none transition-all font-mono font-bold"
                           />
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          ))}
        </div>

        <div className="pt-8 pb-20">
          <button 
            onClick={() => setStep('SUMMARY')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
          >
            {t('common.finish', 'View Summary & Save')}
            <CheckCircle className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    const players = settings.defaultHomePlayers || [];
    
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
         <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-emerald-500/30">
               <CheckCircle size={40} />
            </div>
            <div>
               <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('training.sessionComplete', 'Session Complete')}</h2>
               <p className="text-gray-500 mt-2 font-medium">{new Date(activeSession.date || 0).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-100 dark:border-gray-700">
               <div>
                  <div className="text-3xl font-black text-indigo-600">{activeSession.attendees?.length}</div>
                  <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Athletes</div>
               </div>
               <div>
                  <div className="text-3xl font-black text-indigo-600">{activeSession.drillResults?.length}</div>
                  <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Data Points</div>
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <button 
                 onClick={handleSaveSession}
                 className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
               >
                 <Save size={20} /> {t('training.saveSession', 'Save to Local Storage')}
               </button>
               <button 
                 onClick={() => setStep('LIST')}
                 className="w-full py-4 text-gray-500 font-bold uppercase text-xs tracking-widest hover:text-indigo-600 transition-colors"
               >
                 {t('common.cancel', 'Cancel')}
               </button>
            </div>
         </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-12">
        <button 
          onClick={step === 'LIST' ? onBack : () => setStep('LIST')}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
        >
          <ChevronLeft size={20} /> {t('common.back', 'Back')}
        </button>
        <div className="flex items-center gap-4">
           {/* Cloud Sync Status */}
           <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border dark:border-gray-700 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cloud Sync Ready</span>
           </div>
        </div>
      </div>

      {step === 'LIST' && renderSessionList()}
      {step === 'SETUP' && renderSetup()}
      {step === 'ATTENDANCE' && renderAttendance()}
      {step === 'DRILLS' && renderDrillSelection()}
      {step === 'ENTRY' && renderDataEntry()}
      {step === 'SUMMARY' && renderSummary()}

      {/* Progress Footer for Wizard */}
      {['SETUP', 'ATTENDANCE', 'DRILLS', 'ENTRY'].includes(step) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t dark:border-gray-800 z-50">
           <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <span className={step === 'SETUP' ? 'text-indigo-600' : 'text-gray-400'}>1. Setup</span>
              <div className="h-px flex-1 mx-4 bg-gray-200 dark:bg-gray-800"></div>
              <span className={step === 'ATTENDANCE' ? 'text-indigo-600' : 'text-gray-400'}>2. Attendance</span>
              <div className="h-px flex-1 mx-4 bg-gray-200 dark:bg-gray-800"></div>
              <span className={step === 'DRILLS' ? 'text-indigo-600' : 'text-gray-400'}>3. Drills</span>
              <div className="h-px flex-1 mx-4 bg-gray-200 dark:bg-gray-800"></div>
              <span className={step === 'ENTRY' ? 'text-indigo-600' : 'text-gray-400'}>4. Results</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default TrainingManager;
