import React, { useState } from 'react';
import { MatchState, TeamId, CardType, MatchEvent } from '../types';
import { Clock, Play, Pause, AlertTriangle, AlertOctagon, Repeat, ArrowLeft, Timer, RotateCcw, Edit, X } from 'lucide-react';

interface JuryViewProps {
  matchState: MatchState;
  onUpdateMatch: (newState: MatchState) => void;
  onBack: () => void;
}

const JuryView: React.FC<JuryViewProps> = ({ matchState, onUpdateMatch, onBack }) => {
  const [showShotClockEdit, setShowShotClockEdit] = useState(false);
  const [newShotClockTime, setNewShotClockTime] = useState(25);
  
  // Discipline State
  const [disciplinaryFlow, setDisciplinaryFlow] = useState<{
      step: 'TEAM' | 'PLAYER' | 'CLOSED';
      cardType?: CardType;
      selectedTeam?: TeamId;
  }>({ step: 'CLOSED' });

  const toggleTimer = () => {
    onUpdateMatch({
      ...matchState,
      timer: { ...matchState.timer, isRunning: !matchState.timer.isRunning }
    });
  };

  const toggleShotClock = () => {
    onUpdateMatch({
      ...matchState,
      shotClock: { ...matchState.shotClock, isRunning: !matchState.shotClock.isRunning }
    });
  };

  const resetShotClock = (seconds: number = 25) => {
    // If running, stay running. If stopped, stay stopped.
    onUpdateMatch({
      ...matchState,
      shotClock: { 
        ...matchState.shotClock,
        seconds, 
        isRunning: matchState.shotClock.isRunning 
      }
    });
  };

  const updateShotClockTime = () => {
      onUpdateMatch({
          ...matchState,
          shotClock: { ...matchState.shotClock, seconds: newShotClockTime }
      });
      setShowShotClockEdit(false);
  };

  const initiateCard = (type: CardType) => {
      setDisciplinaryFlow({ step: 'TEAM', cardType: type });
  };

  const handleCard = (playerId: string) => {
      if (!disciplinaryFlow.cardType || !disciplinaryFlow.selectedTeam) return;

      const event: MatchEvent = {
          id: crypto.randomUUID(),
          timestamp: Math.floor(matchState.timer.elapsedSeconds),
          realTime: Date.now(),
          half: matchState.currentHalf,
          teamId: disciplinaryFlow.selectedTeam,
          playerId: playerId,
          type: 'CARD',
          cardType: disciplinaryFlow.cardType
      };

      onUpdateMatch({
          ...matchState,
          events: [...matchState.events, event]
      });
      setDisciplinaryFlow({ step: 'CLOSED' });
  };

  const startTimeout = () => {
      onUpdateMatch({
          ...matchState,
          timeout: { 
            isActive: true, 
            startTime: Date.now(), 
            remainingSeconds: 60,
            teamId: matchState.possession || 'HOME' 
          },
          events: [...matchState.events, {
              id: crypto.randomUUID(),
              timestamp: Math.floor(matchState.timer.elapsedSeconds),
              realTime: Date.now(),
              half: matchState.currentHalf,
              teamId: matchState.possession || 'HOME', 
              type: 'TIMEOUT'
          }]
      });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
       <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8 border-b border-slate-700 pb-4">
              <button onClick={onBack} className="p-2 bg-slate-800 rounded hover:bg-slate-700"><ArrowLeft /></button>
              <h1 className="text-2xl font-bold">Jury / Table Officials Interface</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="space-y-6">
                  {/* Game Clock */}
                  <div className="bg-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center border border-slate-700">
                      <div className="text-slate-400 font-bold uppercase tracking-widest mb-2">Game Clock</div>
                      <div className={`text-7xl font-black font-mono mb-6 ${matchState.timer.isRunning ? 'text-green-500' : 'text-red-500'}`}>
                          {formatTime(matchState.timer.elapsedSeconds)}
                      </div>
                      <button 
                        onClick={toggleTimer}
                        className={`w-full py-4 rounded-xl text-xl font-bold shadow-lg flex items-center justify-center gap-4 transition-all ${matchState.timer.isRunning ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      >
                          {matchState.timer.isRunning ? <><Pause size={24} /> PAUSE</> : <><Play size={24} /> START</>}
                      </button>
                  </div>

                  {/* Shot Clock */}
                  <div className="bg-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center border border-slate-700 relative">
                       <div className="text-slate-400 font-bold uppercase tracking-widest mb-2">Shot Clock</div>
                       <div className={`text-7xl font-black font-mono mb-6 ${matchState.shotClock.seconds <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                           {Math.ceil(matchState.shotClock.seconds)}
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 w-full">
                           <button 
                             onClick={toggleShotClock}
                             className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${matchState.shotClock.isRunning ? 'bg-yellow-600' : 'bg-green-600'}`}
                           >
                              {matchState.shotClock.isRunning ? <Pause size={20} /> : <Play size={20} />} 
                              {matchState.shotClock.isRunning ? 'STOP' : 'START'}
                           </button>
                           <button onClick={() => resetShotClock(25)} className="py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold flex items-center justify-center gap-2">
                               <RotateCcw size={20} /> RESET 25
                           </button>
                           <button onClick={() => setShowShotClockEdit(true)} className="col-span-2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                               <Edit size={16} /> CHANGE TIME
                           </button>
                       </div>

                       {showShotClockEdit && (
                           <div className="absolute inset-0 bg-slate-800 rounded-2xl flex flex-col items-center justify-center p-4 z-10">
                               <h4 className="mb-4 font-bold">Set Shot Clock</h4>
                               <div className="flex gap-4 mb-4">
                                   <button onClick={() => setNewShotClockTime(Math.max(0, newShotClockTime - 1))} className="p-3 bg-slate-700 rounded">-</button>
                                   <span className="text-4xl font-mono">{newShotClockTime}</span>
                                   <button onClick={() => setNewShotClockTime(newShotClockTime + 1)} className="p-3 bg-slate-700 rounded">+</button>
                               </div>
                               <div className="flex gap-2">
                                    <button onClick={updateShotClockTime} className="px-4 py-2 bg-green-600 rounded font-bold">Save</button>
                                    <button onClick={() => setShowShotClockEdit(false)} className="px-4 py-2 bg-slate-600 rounded font-bold">Cancel</button>
                               </div>
                           </div>
                       )}
                  </div>
              </div>

              {/* Administrative Actions */}
              <div className="space-y-6">
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                      <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><AlertOctagon /> Disciplinary</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => initiateCard('YELLOW')}
                            className="p-4 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-lg hover:bg-yellow-500/30 font-bold"
                          >
                              Add Yellow Card
                          </button>
                          <button 
                            onClick={() => initiateCard('RED')}
                            className="p-4 bg-red-600/20 text-red-500 border border-red-600/50 rounded-lg hover:bg-red-600/30 font-bold"
                          >
                              Add Red Card
                          </button>
                      </div>
                  </div>

                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                      <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><Repeat /> Match Status</h3>
                      <div className="flex justify-between text-sm mb-4 text-slate-400">
                          <span>{matchState.homeTeam.name}: {matchState.homeTeam.substitutionCount}/8 Subs</span>
                          <span>{matchState.awayTeam.name}: {matchState.awayTeam.substitutionCount}/8 Subs</span>
                      </div>
                      <div className="flex gap-2 text-xs uppercase font-bold text-slate-500 mb-2">Current Possession</div>
                      <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => onUpdateMatch({ ...matchState, possession: 'HOME' })}
                            className={`p-2 rounded font-bold border transition-all ${matchState.possession === 'HOME' ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-slate-700 bg-slate-900/50 text-slate-500'}`}
                          >
                              {matchState.homeTeam.name}
                          </button>
                          <button 
                            onClick={() => onUpdateMatch({ ...matchState, possession: 'AWAY' })}
                            className={`p-2 rounded font-bold border transition-all ${matchState.possession === 'AWAY' ? 'border-red-500 bg-red-500/20 text-red-400' : 'border-slate-700 bg-slate-900/50 text-slate-500'}`}
                          >
                              {matchState.awayTeam.name}
                          </button>
                      </div>
                  </div>
                  
                  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                       <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><Clock /> Time-out</h3>
                       {matchState.timeout.isActive ? (
                           <div className="flex flex-col items-center">
                               <div className="text-4xl font-mono text-purple-400 font-bold mb-4">{Math.ceil(matchState.timeout.remainingSeconds)}s</div>
                               <button 
                                onClick={() => onUpdateMatch({ ...matchState, timeout: { ...matchState.timeout, isActive: false }})}
                                className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white"
                               >
                                   RESUME MATCH
                               </button>
                           </div>
                       ) : (
                           <button 
                            onClick={startTimeout}
                            className="w-full p-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-white"
                           >
                               Start 60s Time-out
                           </button>
                       )}
                  </div>
              </div>
          </div>
       </div>

       {/* Disciplinary Modal */}
       {disciplinaryFlow.step !== 'CLOSED' && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {disciplinaryFlow.cardType === 'YELLOW' ? <AlertTriangle className="text-yellow-500" /> : <AlertOctagon className="text-red-500" />}
                            Assign {disciplinaryFlow.cardType} Card
                        </h2>
                        <button onClick={() => setDisciplinaryFlow({ step: 'CLOSED' })} className="text-slate-500 hover:text-slate-300"><X /></button>
                    </div>

                    {disciplinaryFlow.step === 'TEAM' && (
                        <div className="space-y-4">
                            <p className="text-slate-400 text-sm">Select target team:</p>
                            <div className="grid grid-cols-1 gap-3">
                                <button 
                                    onClick={() => setDisciplinaryFlow({ ...disciplinaryFlow, step: 'PLAYER', selectedTeam: 'HOME' })}
                                    className="p-4 rounded-xl font-bold text-white shadow transition-all hover:brightness-110"
                                    style={{ backgroundColor: matchState.homeTeam.color }}
                                >
                                    {matchState.homeTeam.name}
                                </button>
                                <button 
                                    onClick={() => setDisciplinaryFlow({ ...disciplinaryFlow, step: 'PLAYER', selectedTeam: 'AWAY' })}
                                    className="p-4 rounded-xl font-bold text-white shadow transition-all hover:brightness-110"
                                    style={{ backgroundColor: matchState.awayTeam.color }}
                                >
                                    {matchState.awayTeam.name}
                                </button>
                            </div>
                        </div>
                    )}

                    {disciplinaryFlow.step === 'PLAYER' && (
                        <div className="space-y-4">
                             <p className="text-slate-400 text-sm">Select player from {(disciplinaryFlow.selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam).name}:</p>
                             <div className="grid grid-cols-4 gap-2">
                                {(disciplinaryFlow.selectedTeam === 'HOME' ? matchState.homeTeam : matchState.awayTeam).players.filter(p => p.onField).map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleCard(p.id)}
                                        className="aspect-square bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full flex flex-col items-center justify-center font-bold text-white transition-all"
                                    >
                                        <span className="text-lg">{p.number}</span>
                                        <span className="text-[10px] opacity-50">{p.gender}</span>
                                    </button>
                                ))}
                             </div>
                             <button 
                                onClick={() => setDisciplinaryFlow({ ...disciplinaryFlow, step: 'TEAM' })}
                                className="w-full py-2 text-slate-400 text-sm hover:text-slate-200"
                             >
                                 &larr; Back to team selection
                             </button>
                        </div>
                    )}
               </div>
           </div>
       )}
    </div>
  );
};

export default JuryView;