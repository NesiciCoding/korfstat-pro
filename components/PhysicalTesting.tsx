import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Settings, Users, ArrowLeft, Download, Plus, X, Activity } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { useTranslation } from 'react-i18next';
import { generateExcel } from '../services/excelGenerator'; // For exporting results
import { generateUUID } from '../utils/uuid';

// Standard 20m Beep Test (Leger) Levels
// Level 1: 8.5 km/h, Level 2: 9.0 km/h... (+0.5 km/h per level)
const BEEP_TEST_LEVELS = [
  { level: 1, speedKmh: 8.5, shuttles: 7, shuttleDuration: 8.47 },
  { level: 2, speedKmh: 9.0, shuttles: 8, shuttleDuration: 8.00 },
  { level: 3, speedKmh: 9.5, shuttles: 8, shuttleDuration: 7.58 },
  { level: 4, speedKmh: 10.0, shuttles: 9, shuttleDuration: 7.20 },
  { level: 5, speedKmh: 10.5, shuttles: 9, shuttleDuration: 6.86 },
  { level: 6, speedKmh: 11.0, shuttles: 10, shuttleDuration: 6.55 },
  { level: 7, speedKmh: 11.5, shuttles: 10, shuttleDuration: 6.26 },
  { level: 8, speedKmh: 12.0, shuttles: 11, shuttleDuration: 6.00 },
  { level: 9, speedKmh: 12.5, shuttles: 11, shuttleDuration: 5.76 },
  { level: 10, speedKmh: 13.0, shuttles: 11, shuttleDuration: 5.54 },
  { level: 11, speedKmh: 13.5, shuttles: 12, shuttleDuration: 5.33 },
  { level: 12, speedKmh: 14.0, shuttles: 12, shuttleDuration: 5.14 },
  { level: 13, speedKmh: 14.5, shuttles: 13, shuttleDuration: 4.97 },
  { level: 14, speedKmh: 15.0, shuttles: 13, shuttleDuration: 4.80 },
  { level: 15, speedKmh: 15.5, shuttles: 13, shuttleDuration: 4.65 },
  { level: 16, speedKmh: 16.0, shuttles: 14, shuttleDuration: 4.50 },
  { level: 17, speedKmh: 16.5, shuttles: 14, shuttleDuration: 4.36 },
  { level: 18, speedKmh: 17.0, shuttles: 15, shuttleDuration: 4.24 },
  { level: 19, speedKmh: 17.5, shuttles: 15, shuttleDuration: 4.11 },
  { level: 20, speedKmh: 18.0, shuttles: 16, shuttleDuration: 4.00 },
  { level: 21, speedKmh: 18.5, shuttles: 16, shuttleDuration: 3.89 },
];

export interface TestParticipant {
    id: string;
    number?: number | string;
    name: string;
    warnings: number; // 0 = good, 1 = warning, 2 = out
    finalScore: string; // e.g., "12.4" (Level 12, Stage 4)
    active: boolean;    
}

export default function PhysicalTesting({ onBack }: { onBack: () => void }) {
    const { t } = useTranslation();

    // Testing State
    const [isRunning, setIsRunning] = useState(false);
    const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
    const [currentShuttle, setCurrentShuttle] = useState(1);
    
    // Timer State
    const [shuttleTimeLeft, setShuttleTimeLeft] = useState(0);
    const [totalElapsed, setTotalElapsed] = useState(0);
    const lastUpdateRef = useRef<number>(0);
    const rafRef = useRef<number | null>(null);

    // Audio Context for the beep
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Roster / Participants
    const [participants, setParticipants] = useState<TestParticipant[]>([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerNumber, setNewPlayerNumber] = useState('');

    const currentLevelData = BEEP_TEST_LEVELS[currentLevelIndex] || BEEP_TEST_LEVELS[BEEP_TEST_LEVELS.length - 1];

    const playBeep = useCallback((frequency = 800, durationMs = 200, type: OscillatorType = 'sine') => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.start();
            
            // Fade out to prevent popping
            gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + durationMs / 1000);
            
            setTimeout(() => {
                oscillator.stop();
                oscillator.disconnect();
                gainNode.disconnect();
            }, durationMs + 50);
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    }, []);

    // Speech announcement for levels
    const announceLevel = useCallback((level: number) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(`Level ${level}`);
            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    const handleAddPlayer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlayerName.trim()) return;
        
        const newPlayer: TestParticipant = {
            id: generateUUID(),
            number: newPlayerNumber || '-',
            name: newPlayerName.trim(),
            warnings: 0,
            finalScore: '-',
            active: true
        };
        
        setParticipants([...participants, newPlayer]);
        setNewPlayerName('');
        setNewPlayerNumber('');
    };

    const handleToggleWarning = (id: string) => {
        setParticipants(prev => prev.map(p => {
            if (p.id !== id || !p.active) return p;
            
            const newWarnings = p.warnings + 1;
            
            if (newWarnings >= 2) {
                // Eliminate player
                return {
                    ...p,
                    warnings: 2,
                    active: false,
                    finalScore: `${currentLevelData.level}.${currentShuttle}`
                };
            }
            
            return {
                ...p,
                warnings: newWarnings
            };
        }));
    };

    const handleUndoWarning = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setParticipants(prev => prev.map(p => {
            if (p.id !== id) return p;
            return {
                ...p,
                warnings: Math.max(0, p.warnings - 1),
                active: p.warnings - 1 < 2,
                finalScore: p.warnings - 1 < 2 ? '-' : p.finalScore
            };
        }));
    };

    const startTest = () => {
        // Reset state
        setCurrentLevelIndex(0);
        setCurrentShuttle(1);
        setTotalElapsed(0);
        setShuttleTimeLeft(BEEP_TEST_LEVELS[0].shuttleDuration);
        
        // Reset active players
        setParticipants(prev => prev.map(p => ({ ...p, warnings: 0, finalScore: '-', active: true })));

        // Initialize audio
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        audioCtxRef.current?.resume();

        // Triple beep countdown
        let count = 3;
        const countdownInterval = setInterval(() => {
            if (count > 0) {
                playBeep(440, 150);
                count--;
            } else {
                clearInterval(countdownInterval);
                playBeep(880, 500, 'square'); // START BEEP
                announceLevel(1);
                lastUpdateRef.current = performance.now();
                setIsRunning(true);
            }
        }, 1000);
    };

    const stopTest = () => {
        setIsRunning(false);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const handleNextShuttle = useCallback(async () => {
        playBeep(800, 200, 'square');

        if (currentShuttle + 1 > currentLevelData.shuttles && currentLevelIndex + 1 >= BEEP_TEST_LEVELS.length) {
            stopTest();
            await alert("Test Complete - Reached maximum level!");
            return;
        }
        
        setCurrentShuttle(prevShuttle => {
            let nextShuttle = prevShuttle + 1;
            let nextLevelIndex = currentLevelIndex;
            
            if (nextShuttle > currentLevelData.shuttles) {
                nextShuttle = 1;
                nextLevelIndex++;
                
                setCurrentLevelIndex(nextLevelIndex);
                announceLevel(BEEP_TEST_LEVELS[nextLevelIndex].level);
            }
            
            // Set next countdown
            const nextDuration = BEEP_TEST_LEVELS[nextLevelIndex].shuttleDuration;
            setShuttleTimeLeft(nextDuration);
            lastUpdateRef.current = performance.now(); // Reset drift
            
            return nextShuttle;
        });
    }, [currentLevelIndex, currentShuttle, currentLevelData.shuttles, stopTest, alert, announceLevel, playBeep]);

    const updateTimer = useCallback(() => {
        if (!isRunning) return;
        
        const now = performance.now();
        const delta = (now - lastUpdateRef.current) / 1000;
        lastUpdateRef.current = now;

        setTotalElapsed(prev => prev + delta);
        
        setShuttleTimeLeft(prev => {
            const next = prev - delta;
            if (next <= 0) {
                // Beep and go to next shuttle!
                // We don't call handleNextShuttle directly here to avoid React state batching race conditions,
                // but since it uses functional updates, we actually can.
                // However, doing it here inside the RAF loop is safer if wrapped in a microtask or setTimeout.
                setTimeout(handleNextShuttle, 0); 
                return 0; // Return 0 temporarily, handleNextShuttle will reset it
            }
            return next;
        });
        
        rafRef.current = requestAnimationFrame(updateTimer);
    }, [isRunning, handleNextShuttle]);

    useEffect(() => {
        if (isRunning) {
            lastUpdateRef.current = performance.now();
            rafRef.current = requestAnimationFrame(updateTimer);
        }
        return () => {
             if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isRunning, updateTimer]);

    // Active count
    const activeCount = participants.filter(p => p.active).length;

    return (
        <div className="min-h-screen bg-[var(--surface-2)] dark:bg-[var(--surface-1)] text-slate-900 dark:text-slate-100 p-6 flex flex-col font-sans transition-colors duration-300">
            {/* Header */}
            <header className="flex items-center justify-between bg-white dark:bg-[var(--surface-2)] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)] rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Activity className="text-indigo-600" />
                            Physical Testing (Beep Test)
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">Standard 20m Multi-Stage Fitness Test</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button disabled={participants.length === 0} onClick={() => { /* Export Results logic */ }} className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-2)] dark:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)] rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50">
                        <Download size={16} /> Export
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left Panel: Controls & Timer */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Master Control */}
                    <div className="bg-white dark:bg-[var(--surface-2)] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 text-center relative overflow-hidden">
                        
                        {/* Status Backing */}
                        <div className={`absolute inset-0 opacity-10 transition-colors ${isRunning ? 'bg-indigo-500' : 'bg-transparent'}`} />

                        <div className="relative z-10">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Current Test</h2>
                            
                            <div className="flex items-baseline justify-center gap-2 mt-4">
                                <span className="text-6xl font-black font-mono tracking-tighter text-indigo-600 dark:text-indigo-400">
                                    {currentLevelData.level}
                                </span>
                                <span className="text-2xl font-bold text-slate-500">.{currentShuttle}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 mb-6 font-mono">
                                {currentLevelData.speedKmh.toFixed(1)} km/h • {currentLevelData.shuttles} Shuttles
                            </p>

                            <div className="bg-[var(--surface-2)] dark:bg-[var(--surface-1)] rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Next Beep In</div>
                                <div className={`text-4xl font-mono font-bold mt-1 ${shuttleTimeLeft < 2 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {Math.max(0, shuttleTimeLeft).toFixed(1)}s
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full h-2 bg-[var(--surface-2)] dark:bg-[var(--surface-2)] rounded-full mt-3 overflow-hidden">
                                     <div 
                                        className="h-full bg-indigo-500 transition-all ease-linear"
                                        style={{ width: `${(shuttleTimeLeft / currentLevelData.shuttleDuration) * 100}%` }}
                                     />
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm font-medium mb-6 px-2">
                                <span className="text-slate-500">Remaining:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">{activeCount} Players</span>
                            </div>

                            {!isRunning ? (
                                <button 
                                    onClick={startTest} 
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    <Play size={20} /> {totalElapsed > 0 ? "Resume Test" : "Start Beep Test"}
                                </button>
                            ) : (
                                <button 
                                    onClick={stopTest} 
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
                                >
                                    <Square size={20} /> Pause / Stop Test
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Add Player Form */}
                    <div className="bg-white dark:bg-[var(--surface-2)] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Users size={16} /> Add Participant</h3>
                        <form onSubmit={handleAddPlayer} className="space-y-4">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="#" 
                                    value={newPlayerNumber} 
                                    onChange={e => setNewPlayerNumber(e.target.value)}
                                    className="w-16 px-3 py-2 bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <input 
                                    type="text" 
                                    placeholder="Player Name" 
                                    value={newPlayerName} 
                                    onChange={e => setNewPlayerName(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={!newPlayerName.trim()}
                                className="w-full py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-2)] dark:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)] text-slate-800 dark:text-slate-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Plus size={16} /> Add to Roster
                            </button>
                        </form>
                    </div>

                </div>

                {/* Right Panel: Player Grid */}
                <div className="lg:col-span-3 bg-white dark:bg-[var(--surface-2)] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Test Roster</h2>
                        {participants.length > 0 && (
                            <button 
                                onClick={() => { setParticipants([]); }} 
                                className="text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {participants.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                            <Users size={48} className="opacity-20 mb-4" />
                            <p>No participants added yet.</p>
                            <p className="text-sm mt-1">Add players to start tracking their performance.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
                            {participants.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => handleToggleWarning(player.id)}
                                    disabled={!player.active}
                                    className={`relative text-left p-4 rounded-xl border-2 transition-all overflow-hidden group ${
                                        !player.active 
                                            ? 'bg-[var(--surface-2)] dark:bg-[var(--surface-1)] border-slate-200 dark:border-slate-800 opacity-60' 
                                            : player.warnings === 1 
                                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/40' 
                                                : 'bg-white dark:bg-[var(--surface-2)] border-slate-200 dark:border-slate-700 hover:border-indigo-400 shadow-sm hover:shadow-md cursor-pointer'
                                    }`}
                                >
                                    {/* Edit / Undo Button */}
                                    {player.warnings > 0 && (
                                        <div 
                                            onClick={(e) => handleUndoWarning(player.id, e)}
                                            title="Undo Warning/Elimination"
                                            className="absolute top-2 right-2 p-1.5 bg-[var(--surface-2)] dark:bg-[var(--surface-2)] hover:bg-[var(--surface-2)] dark:hover:bg-[var(--surface-2)] rounded-md text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                                        >
                                            <X size={12} />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center text-xs font-bold ${
                                            !player.active ? 'bg-[var(--surface-2)] dark:bg-[var(--surface-2)] text-slate-500' : 
                                            player.warnings === 1 ? 'bg-orange-200 dark:bg-orange-700 text-orange-800 dark:text-orange-200' : 'bg-[var(--surface-2)] dark:bg-[var(--surface-2)] text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {player.number}
                                        </div>
                                        <div className="font-bold text-sm truncate pr-4 text-slate-800 dark:text-slate-200">{player.name}</div>
                                    </div>
                                    
                                    <div className="flex justify-between items-end mt-4">
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Status</div>
                                            {player.active ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-3 h-3 rounded-full ${player.warnings === 0 ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                                                    <span className={`text-xs font-bold ${player.warnings === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                                        {player.warnings === 0 ? 'Running' : '1 Warning'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">Eliminated</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {!player.active && (
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Score</div>
                                                <div className="text-lg font-black font-mono text-slate-700 dark:text-slate-300">{player.finalScore}</div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
