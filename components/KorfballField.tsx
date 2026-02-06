import React, { useRef } from 'react';
import { MatchEvent, ShotType } from '../types';

interface KorfballFieldProps {
  mode: 'input' | 'view';
  onFieldClick?: (x: number, y: number) => void;
  events?: MatchEvent[]; // For view mode
  heatmapMode?: boolean;
  homeColor?: string;
  awayColor?: string;
}

export const getShotDistanceType = (xPercentage: number, yPercentage: number): ShotType => {
  // Input coordinates are 0-100 (percentage)
  // Field SVG coordinate space is 200x100 relative units
  const x = xPercentage * 2;
  const y = yPercentage;

  // Left Korf: 33.3, 50
  // Right Korf: 166.7, 50
  
  // Determine nearest korf based on field side (0-100 is left, 100-200 is right)
  const korfX = x < 100 ? 33.3 : 166.7;
  const korfY = 50;
  
  // Distance in relative units
  const dist = Math.sqrt(Math.pow(x - korfX, 2) + Math.pow(y - korfY, 2));
  
  // Approximate scale: Field length 40m = 200 units. 1 unit = 0.2m.
  // Near < 3m (15 units)
  // Medium < 8m (40 units)
  if (dist < 15) return 'NEAR';
  if (dist < 40) return 'MEDIUM';
  return 'FAR';
};

const KorfballField: React.FC<KorfballFieldProps> = ({ 
  mode, 
  onFieldClick, 
  events = [], 
  heatmapMode = false,
  homeColor = '#3b82f6', // Default Blue
  awayColor = '#ef4444'  // Default Red
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'input' || !onFieldClick || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    onFieldClick(x, y);
  };

  // Filter only shots for the view mode
  const shotEvents = events.filter(e => e.type === 'SHOT' && e.location);

  return (
    <div className="relative w-full aspect-[2/1] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-400 shadow-inner select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 200 100"
        className={`w-full h-full ${mode === 'input' ? 'cursor-crosshair' : 'cursor-default'}`}
        onClick={handleClick}
      >
        {/* Home Side (Left) Background */}
        <rect x="0" y="0" width="100" height="100" fill={homeColor} opacity="0.15" />
        
        {/* Away Side (Right) Background */}
        <rect x="100" y="0" width="100" height="100" fill={awayColor} opacity="0.15" />

        {/* Outer Lines */}
        <rect x="0" y="0" width="200" height="100" fill="none" stroke="#4b5563" strokeWidth="2" />
        
        {/* Center Line */}
        <line x1="100" y1="0" x2="100" y2="100" stroke="#4b5563" strokeWidth="2" />
        
        {/* Distance Zones (Subtle) */}
        {/* Left Side Zones */}
        <circle cx="33.3" cy="50" r="15" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 2" />
        <circle cx="33.3" cy="50" r="40" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 2" />

        {/* Right Side Zones */}
        <circle cx="166.7" cy="50" r="15" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 2" />
        <circle cx="166.7" cy="50" r="40" fill="none" stroke="#000" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 2" />

        {/* Center Spot */}
        <circle cx="100" cy="50" r="1" fill="#4b5563" />
        
        {/* Penalty Spots */}
        <circle cx="33.3" cy="50" r="0.8" fill="#4b5563" />
        <circle cx="166.7" cy="50" r="0.8" fill="#4b5563" />
        
        {/* Baskets (Korfs) */}
        {/* Left Korf */}
        <circle cx="33.3" cy="50" r="3" stroke="#4b5563" strokeWidth="1.5" fill="none" />
        <circle cx="33.3" cy="50" r="0.8" fill="#f59e0b" />
        
        {/* Right Korf */}
        <circle cx="166.7" cy="50" r="3" stroke="#4b5563" strokeWidth="1.5" fill="none" />
        <circle cx="166.7" cy="50" r="0.8" fill="#f59e0b" />

        {/* Dynamic Events Rendering (View Mode) */}
        {mode === 'view' && shotEvents.map((event) => (
          <g key={event.id}>
            {heatmapMode ? (
              // Heatmap Style
              <circle 
                cx={event.location!.x * 2} 
                cy={event.location!.y} 
                r={6} 
                fill={event.result === 'GOAL' ? '#10b981' : '#f87171'}
                opacity={0.3}
                className="mix-blend-multiply" 
              />
            ) : (
              // Precise Style
              <circle 
                cx={event.location!.x * 2} 
                cy={event.location!.y} 
                r={2} 
                fill={event.result === 'GOAL' ? '#10b981' : '#ef4444'}
                opacity={0.9}
                stroke="white"
                strokeWidth="0.5"
              />
            )}
          </g>
        ))}
        
        {mode === 'input' && (
             <text x="5" y="5" fontSize="3" fill="#000" opacity="0.4">HOME SIDE</text>
        )}
         {mode === 'input' && (
             <text x="175" y="5" fontSize="3" fill="#000" opacity="0.4">AWAY SIDE</text>
        )}
      </svg>
    </div>
  );
};

export default KorfballField;