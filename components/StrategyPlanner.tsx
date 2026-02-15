import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { MatchState, TeamId } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { ArrowLeft, Save, Trash2, Undo, Circle, Hexagon, Eraser, Pen, MousePointer2, Move, Download, Upload, RefreshCw, X, Play, Square } from 'lucide-react';

interface StrategyPlannerProps {
  matches: MatchState[];
  onBack: () => void;
}

// Data Structures
type TokenType = 'ATTACK' | 'DEFENSE';
type Gender = 'MALE' | 'FEMALE';

interface Token {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  type: TokenType;
  gender: Gender;
  label?: string;
  color: string; // Hex
}

interface DrawingPath {
  id: string;
  type: 'PEN' | 'ARROW';
  points: { x: number; y: number }[]; // Canvas coordinates
  color: string;
  width: number;
}

interface Frame {
  id: string;
  tokens: Token[];
  drawings: DrawingPath[];
  duration: number; // ms, default 1000?
  note?: string;
}

interface SavedPlay {
  id: string;
  name: string;
  frames: Frame[]; // New structure
  date: number;
}


const KORFBALL_FIELD_RATIO = 2; // 40m / 20m = 2

const StrategyPlanner: React.FC<StrategyPlannerProps> = ({ matches, onBack }) => {
  const { settings } = useSettings();
  // ----- State -----
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  // Current Frame State (Visual)
  const [tokens, setTokens] = useState<Token[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);

  const [activeTool, setActiveTool] = useState<'SELECT' | 'PEN' | 'ARROW' | 'ERASER'>('SELECT');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync current state to frames whenever it changes (auto-save to frame)
  useEffect(() => {
    if (frames.length > 0 && !isPlaying) {
      // Debounce or just update?
      // Direct update might cause cycles if we depend on frames.
      // Better: Only update frames on specific actions (MouseUp, ToolChange) or use a "Save Frame" specific trigger?
      // For smoothness, let's update `frames` immediately but ensure we don't re-render `tokens` from `frames` constantly.
      // Actually, let's explicit save. "Auto-save" to frame state needs care.

      const updatedFrames = [...frames];
      updatedFrames[currentFrameIndex] = {
        ...updatedFrames[currentFrameIndex],
        tokens,
        drawings
      };
      // Avoid setting frames if identical to prevent loop
      // setFrames(updatedFrames); 
      // This is dangerous. Let's use a Ref for "IsLoadingFrame" to skip, or just update Frames on interactions.
    }
  }, [tokens, drawings]); // This is tricky. Let's rely on explicit "commit" or update frames on interaction end.

  const updateCurrentFrame = () => {
    if (isPlaying) return;
    setFrames(prev => {
      const newFrames = [...prev];
      newFrames[currentFrameIndex] = { ...newFrames[currentFrameIndex], tokens, drawings };
      return newFrames;
    });
  };

  // ----- Initialization -----
  useEffect(() => {
    resetBoard();
    loadSavedPlays();
  }, []);

  const loadSavedPlays = () => {
    const saved = localStorage.getItem('korfstat_strategies');
    if (saved) {
      try {
        setSavedPlays(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load plays", e);
      }
    }
  };

  const savePlay = () => {
    const name = prompt("Enter a name for this play:");
    if (!name) return;

    // Ensure current state is saved to frame
    const finalFrames = [...frames];
    finalFrames[currentFrameIndex] = { ...finalFrames[currentFrameIndex], tokens, drawings };

    const newPlay: SavedPlay = {
      id: Date.now().toString(),
      name,
      frames: finalFrames,
      date: Date.now()
    };

    const newSaved = [...savedPlays, newPlay];
    setSavedPlays(newSaved);
    localStorage.setItem('korfstat_strategies', JSON.stringify(newSaved));
  };

  const loadPlay = (play: SavedPlay) => {
    if (window.confirm(`Load play "${play.name}"? Unsaved changes will be lost.`)) {
      // Handle migration if needed (old plays had logic?)
      // Assuming interface works.
      // If play.frames is undefined (legacy), wrap it?
      // Let's assume typescript checks hold or we migrate in loadSavedPlays.
      if (!play.frames && (play as any).tokens) {
        // Migration for legacy
        const legacyFrame: Frame = {
          id: 'legacy',
          tokens: (play as any).tokens,
          drawings: (play as any).drawings || [],
          duration: 1000
        };
        setFrames([legacyFrame]);
        setCurrentFrameIndex(0);
        setTokens(legacyFrame.tokens);
        setDrawings(legacyFrame.drawings);
      } else {
        setFrames(play.frames);
        setCurrentFrameIndex(0);
        if (play.frames.length > 0) {
          setTokens(play.frames[0].tokens);
          setDrawings(play.frames[0].drawings);
        }
      }
    }
  };

  const deletePlay = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this play?")) {
      const newSaved = savedPlays.filter(p => p.id !== id);
      setSavedPlays(newSaved);
      localStorage.setItem('korfstat_strategies', JSON.stringify(newSaved));
    }
  };

  const resetBoard = () => {
    // Initial Setup: 4 Attackers (Home), 4 Defenders (Away)
    const initialTokens: Token[] = [
      // Home Attack (Left Zone)
      { id: 'h1', x: 20, y: 30, type: 'ATTACK', gender: 'FEMALE', label: 'H1', color: '#3b82f6' },
      { id: 'h2', x: 20, y: 70, type: 'ATTACK', gender: 'FEMALE', label: 'H2', color: '#3b82f6' },
      { id: 'h3', x: 35, y: 40, type: 'ATTACK', gender: 'MALE', label: 'H3', color: '#3b82f6' },
      { id: 'h4', x: 35, y: 60, type: 'ATTACK', gender: 'MALE', label: 'H4', color: '#3b82f6' },

      // Away Defense (Left Zone)
      { id: 'a1', x: 25, y: 35, type: 'DEFENSE', gender: 'FEMALE', label: 'A1', color: '#ef4444' },
      { id: 'a2', x: 25, y: 65, type: 'DEFENSE', gender: 'FEMALE', label: 'A2', color: '#ef4444' },
      { id: 'a3', x: 30, y: 45, type: 'DEFENSE', gender: 'MALE', label: 'A3', color: '#ef4444' },
      { id: 'a4', x: 30, y: 55, type: 'DEFENSE', gender: 'MALE', label: 'A4', color: '#ef4444' },
    ];

    // Create initial frame
    const startFrame: Frame = {
      id: crypto.randomUUID(),
      tokens: initialTokens,
      drawings: [],
      duration: 1000
    };

    setFrames([startFrame]);
    setCurrentFrameIndex(0);
    setTokens(initialTokens);
    setDrawings([]);
    setIsPlaying(false);
  };

  // ----- Animation Logic -----
  const addFrame = () => {
    // Duplicate current state
    const newFrame: Frame = {
      id: crypto.randomUUID(),
      tokens: JSON.parse(JSON.stringify(tokens)), // Deep copy positions
      drawings: JSON.parse(JSON.stringify(drawings)), // Copy drawings? Usually next frame starts with drawings? 
      // Option: Clear drawings for next movement, or keep them? 
      // Strategy: Keep them, user can clear if they want new movement arrows.
      duration: 1000
    };

    // Update current frame first
    updateCurrentFrame();

    const newFrames = [...frames];
    // Insert after current
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);

    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
    // Load new frame
    setTokens(newFrame.tokens);
    setDrawings(newFrame.drawings);
  };

  const deleteFrame = (index: number) => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, i) => i !== index);
    setFrames(newFrames);

    // Adjust index
    if (index === currentFrameIndex) {
      const newIndex = Math.max(0, index - 1);
      setCurrentFrameIndex(newIndex);
      setTokens(newFrames[newIndex].tokens);
      setDrawings(newFrames[newIndex].drawings);
    } else if (index < currentFrameIndex) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    }
  };

  const selectFrame = (index: number) => {
    updateCurrentFrame(); // Save current before switching
    setCurrentFrameIndex(index);
    setTokens(frames[index].tokens);
    setDrawings(frames[index].drawings);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playbackRef.current) clearInterval(playbackRef.current);
    } else {
      setIsPlaying(true);
      // Start loop
      let idx = currentFrameIndex;

      playbackRef.current = setInterval(() => {
        idx++;
        if (idx >= frames.length) {
          idx = 0; // Loop? Or stop?
          // clearInterval(playbackRef.current!);
          // setIsPlaying(false);
          // return;
        }
        // We need to access latest frames state?
        // Use functional update or ref?
        // Simple: just render.
        // Logic check: SetState in interval will trigger re-render
        setCurrentFrameIndex(idx);
        setTokens(framesRef.current[idx].tokens);
        setDrawings(framesRef.current[idx].drawings);
      }, 1000); // Fixed 1s for now, or use frame.duration
    }
  };

  // Ref for playback to access latest frames without closure staleness
  const framesRef = useRef(frames);
  useEffect(() => { framesRef.current = frames; }, [frames]);

  // Cleanup
  useEffect(() => {
    return () => { if (playbackRef.current) clearInterval(playbackRef.current); };
  }, []);

  // Update current frame on token/drawing release
  // (Replaces addToHistory)
  const commitChange = () => {
    updateCurrentFrame();
  };

  // Old History Functions Removed in favor of Frame logic
  /*
  const addToHistory = (newTokens: Token[], newDrawings: DrawingPath[]) => {
    setHistory(prev => [...prev.slice(-10), { tokens: newTokens, drawings: newDrawings }]);
  };
  const undo = () => { ... };
  */

  // ----- Drawing Logic (Canvas) -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    // Resize Canvas
    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientWidth / KORFBALL_FIELD_RATIO;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Draw Field ---
    const w = canvas.width;
    const h = canvas.height;

    // Check for dark mode
    const isDark = document.documentElement.classList.contains('dark');

    // Background color roughly matching image
    ctx.fillStyle = isDark ? '#1e293b' : '#e0f2fe'; // Slate 800 vs Light blue
    ctx.fillRect(0, 0, w, h);

    // Lines
    ctx.strokeStyle = isDark ? '#94a3b8' : '#0369a1'; // Slate 400 vs Darker blue lines
    ctx.lineWidth = 2;

    // Border
    ctx.strokeRect(0, 0, w, h);

    // Center Line
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Scale helpers (Field is 40m x 20m)
    // 1m = w / 40
    const m = w / 40;

    // Function to draw zone details
    const drawZone = (messageX: number, isRight: boolean) => {
      // Post Position (6.67m from end line)
      // Left Post x: 6.67 * m
      // Right Post x: w - (6.67 * m)
      const postX = isRight ? w - (6.67 * m) : 6.67 * m;
      const postY = h / 2;

      // Penalty Spot (2.5m in front of post towards center)
      // Left Spot: postX + 2.5m
      // Right Spot: postX - 2.5m
      const penaltyX = isRight ? postX - (2.5 * m) : postX + (2.5 * m);

      // --- Penalty Area / Free Pass Circle (Visual Guide) ---
      // Typically a circle around the post? Or oval?
      // User image showed an ORANGE area.
      // Let's draw a 2.5m radius circle around post (standard free pass distance)
      ctx.beginPath();
      ctx.arc(postX, postY, 2.5 * m, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 146, 60, 0.3)'; // Orange transparent
      ctx.fill();
      ctx.strokeStyle = '#fb923c';
      ctx.stroke();

      // --- Post ---
      ctx.beginPath();
      ctx.arc(postX, postY, 0.3 * m, 0, Math.PI * 2); // Korf size approx
      ctx.fillStyle = '#f59e0b'; // Amber/Yellow
      ctx.fill();
      ctx.stroke();

      // --- Penalty Spot ---
      ctx.beginPath();
      ctx.fillRect(penaltyX - (0.2 * m), postY - (0.1 * m), 0.4 * m, 0.2 * m);
      ctx.fillStyle = isDark ? '#38bdf8' : '#0369a1';
      ctx.fill();
    };

    drawZone(0, false); // Left Zone
    drawZone(0, true);  // Right Zone

    // --- Draw Saved Drawings ---
    drawings.forEach(d => drawPath(ctx, d));

    // --- Draw Current Path ---
    if (currentPath) {
      drawPath(ctx, currentPath);
    }

  }, [drawings, currentPath, containerRef.current?.clientWidth, settings.theme]); // Re-render on resize or data change or theme change

  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();

    // Arrow Head?
    if (path.type === 'ARROW') {
      const last = path.points[path.points.length - 1];
      const prev = path.points[path.points.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - 15 * Math.cos(angle - Math.PI / 6), last.y - 15 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(last.x - 15 * Math.cos(angle + Math.PI / 6), last.y - 15 * Math.sin(angle + Math.PI / 6));
      ctx.lineTo(last.x, last.y);
      ctx.fillStyle = path.color;
      ctx.fill();
    }
  };


  // ----- Event Handlers (Mouse/Touch) -----
  const getPos = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    if (activeTool === 'SELECT') {
      // Check if clicked on token? (Handled by token's own event)
      // Background click -> deselect or stop editing
      if (editingId) setEditingId(null);
    } else if (activeTool === 'PEN' || activeTool === 'ARROW') {
      if (editingId) setEditingId(null);
      setCurrentPath({
        id: Date.now().toString(),
        type: activeTool,
        points: [pos],
        color: selectedColor,
        width: 3
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (currentPath) {
      const pos = getPos(e);
      setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
    }

    if (isDragging && containerRef.current) {
      // Move Token logic
      // We need to convert pixel pos to percentage
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as React.MouseEvent).clientY;

      let xPct = ((clientX - rect.left) / rect.width) * 100;
      let yPct = ((clientY - rect.top) / rect.height) * 100;

      // Clamp
      xPct = Math.max(0, Math.min(100, xPct));
      yPct = Math.max(0, Math.min(100, yPct));

      setTokens(prev => prev.map(t => t.id === isDragging ? { ...t, x: xPct, y: yPct } : t));
    }
  };

  const handleMouseUp = () => {
    if (currentPath) {
      setDrawings(prev => {
        const next = [...prev, currentPath];
        // We need to commit this.
        // Since setState is async, we can't commit immediately with 'next'.
        // Let's use useEffect change detection or just pass it.
        // Better: setDrawings is enough, the commitChange relies on state?
        // No, commitChange duplicates state.
        // Let's rely on a helper that does both.
        return next;
      });
      setCurrentPath(null);
      // Timeout to allow state update? Or just use useEffect on drawings?
      // With the refactor, we need to explicitly save frame.
      setTimeout(commitChange, 0);
    }
    if (isDragging) {
      setIsDragging(null);
      commitChange();
    }
  };

  // ----- UI Component -----
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col h-screen overflow-hidden transition-colors duration-300">

      {/* Header */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900 z-10 transition-colors">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg"><ArrowLeft /></button>
          <h1 className="font-bold text-xl">Strategy Whiteboard</h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={resetBoard} className="p-2 hover:bg-gray-800 rounded text-sm flex items-center gap-2"><RefreshCw size={16} /> Reset</button>
          <button onClick={savePlay} className="p-2 hover:bg-gray-800 rounded text-sm flex items-center gap-2"><Save size={16} /> Save Play</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar: Saved Plays */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 hidden md:flex flex-col gap-4 transition-colors">
          <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">Saved Plays</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {savedPlays.length === 0 && <div className="text-gray-500 text-sm text-center italic mt-4">No saved plays yet.</div>}
            {savedPlays.map(play => (
              <div key={play.id} onClick={() => loadPlay(play)} className="group p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-indigo-500 cursor-pointer transition-colors flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{play.name}</div>
                  <div className="text-xs text-gray-400">{new Date(play.date).toLocaleDateString()}</div>
                </div>
                <button onClick={(e) => deletePlay(e, play.id)} className="p-1 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Field */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center overflow-hidden transition-colors">
          <div
            ref={containerRef}
            className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-gray-800 select-none touch-none transition-colors"
            style={{ aspectRatio: `${KORFBALL_FIELD_RATIO}/1`, maxWidth: '1200px' }} // 2:1 Ratio
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 block" />

            {/* Tokens Layer */}
            {tokens.map(token => (
              <div
                key={token.id}
                className={`absolute w-[5%] aspect-square flex items-center justify-center font-bold text-xs select-none cursor-move hover:scale-110 transition-transform z-10
                                     ${activeTool !== 'SELECT' ? 'pointer-events-none opacity-50' : ''}`}
                style={{
                  left: `${token.x}%`,
                  top: `${token.y}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: token.color,
                  // Shape based on Gender
                  borderRadius: token.gender === 'FEMALE' ? '12%' : '50%', // Circle vs Rounded Box (Hexagon hard in CSS, rounded box is distinct enough?)
                  // Or we can use clip-path for true shapes
                  clipPath: token.gender === 'FEMALE' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}
                onMouseDown={(e) => {
                  if (activeTool !== 'SELECT') return;
                  e.stopPropagation(); // Don't draw
                  setIsDragging(token.id);
                }}
                onTouchStart={(e) => {
                  if (activeTool !== 'SELECT') return;
                  e.stopPropagation();
                  setIsDragging(token.id);
                }}
                onDoubleClick={(e) => {
                  if (activeTool !== 'SELECT') return;
                  e.stopPropagation();
                  setEditingId(token.id);
                }}
              >
                {/* Editable Input or Label */}
                {editingId === token.id ? (
                  <input
                    autoFocus
                    className="w-full h-full bg-transparent text-white text-center font-bold outline-none"
                    style={{ textShadow: '0 1px 2px black' }}
                    value={token.label}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 3); // Limit length
                      setTokens(prev => prev.map(t => t.id === token.id ? { ...t, label: val } : t));
                    }}
                    onBlur={() => {
                      setEditingId(null);
                      commitChange();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingId(null);
                        commitChange();
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-white drop-shadow-md select-none">{token.label}</span>
                )}
              </div>
            ))}

          </div>
        </div>

        {/* Right Sidebar: Tools */}
        <div className="w-20 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-2 flex flex-col items-center gap-4 py-6 z-20 transition-colors">

          <ToolButton
            active={activeTool === 'SELECT'}
            onClick={() => setActiveTool('SELECT')}
            icon={<MousePointer2 size={24} />}
            label="Move"
          />

          <ToolButton
            active={activeTool === 'PEN'}
            onClick={() => setActiveTool('PEN')}
            icon={<Pen size={24} />}
            label="Pen"
          />

          <ToolButton
            active={activeTool === 'ARROW'}
            onClick={() => setActiveTool('ARROW')}
            icon={<Move size={24} />}
            label="Arrow"
          />

          <div className="w-full h-px bg-gray-700 my-2"></div>

          {/* Color Picker */}
          <div className="flex flex-col gap-2">
            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(c => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${selectedColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-full h-px bg-gray-700 my-2"></div>

          <div className="w-full h-px bg-gray-700 my-2"></div>

          <ToolButton
            active={false}
            onClick={() => {
              // Clear drawings for this frame
              setDrawings([]);
              commitChange();
            }}
            icon={<Eraser size={24} />}
            label="Clear"
          />

        </div>

      </div>

      {/* Timeline / Animation Controls */}
      <div className="h-24 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 z-30 transition-colors">

        {/* Controls */}
        <div className="flex items-center gap-2 mr-4">
          <button onClick={() => selectFrame(0)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300">
            <span className="text-xl font-bold">|&lt;</span>
          </button>
          <button
            onClick={togglePlay}
            className={`p-3 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          >
            {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button onClick={addFrame} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex flex-col items-center gap-1 text-gray-600 dark:text-gray-300">
            <div className="text-xl font-bold leading-none">+</div>
            <span className="text-[9px] uppercase font-bold">Add Frame</span>
          </button>
        </div>

        {/* Frames List */}
        <div className="flex-1 overflow-x-auto flex items-center gap-2 py-2 no-scrollbar">
          {frames.map((frame, idx) => (
            <div
              key={frame.id}
              onClick={() => selectFrame(idx)}
              className={`relative min-w-[80px] h-16 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all group
                        ${idx === currentFrameIndex ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}
                    `}
            >
              <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>

              {/* Delete Frame Button */}
              {frames.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFrame(idx); }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="text-xs font-bold text-gray-400 w-16 text-right">
          {frames.length} Frame(s)
        </div>

      </div>
    </div>
  );
};

// Helper Component for Tools
const ToolButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-xl flex flex-col items-center gap-1 w-full transition-all
                  ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
  >
    {icon}
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default StrategyPlanner;