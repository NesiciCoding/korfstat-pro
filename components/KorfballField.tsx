import React, { useRef } from 'react';
import { MatchEvent, ShotType } from '../types';

interface KorfballFieldProps {
  mode: 'input' | 'view';
  onFieldClick?: (x: number, y: number) => void;
  events?: MatchEvent[]; // For view mode
  heatmapMode?: boolean;
  showZoneEfficiency?: boolean;
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
  showZoneEfficiency = false, // New Prop
  homeColor = '#3b82f6',
  awayColor = '#ef4444'
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

  // --- Zone Efficiency Logic ---
  // Define Zones (Radius in units. 200 units = 40m => 5 units = 1m)
  // Post: < 3m = 15 units
  // Short: 3-6m = 15-30 units
  // Mid: 6-10m = 30-50 units
  // Long: > 10m = > 50 units
  const calculateZoneStats = () => {
    const zones = {
      left: { post: { s: 0, g: 0 }, short: { s: 0, g: 0 }, mid: { s: 0, g: 0 }, long: { s: 0, g: 0 } },
      right: { post: { s: 0, g: 0 }, short: { s: 0, g: 0 }, mid: { s: 0, g: 0 }, long: { s: 0, g: 0 } }
    };

    shotEvents.forEach(e => {
      if (!e.location) return;
      const x = e.location.x * 2; // Convert to 200x100 space
      const y = e.location.y;

      const isLeft = x < 100;
      const korfX = isLeft ? 33.3 : 166.7;
      const korfY = 50;
      const dist = Math.sqrt(Math.pow(x - korfX, 2) + Math.pow(y - korfY, 2));

      const side = isLeft ? zones.left : zones.right;

      let zoneKey: 'post' | 'short' | 'mid' | 'long' = 'long';
      if (dist < 15) zoneKey = 'post';
      else if (dist < 30) zoneKey = 'short';
      else if (dist < 50) zoneKey = 'mid';

      side[zoneKey].s++;
      if (e.result === 'GOAL') side[zoneKey].g++;
    });
    return zones;
  };

  const zoneStats = showZoneEfficiency ? calculateZoneStats() : null;

  const getZoneColor = (stats: { s: number, g: number }) => {
    if (stats.s === 0) return 'transparent';
    const pct = (stats.g / stats.s) * 100;
    if (pct >= 50) return '#22c55e'; // Green
    if (pct >= 25) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const getZoneOpacity = (stats: { s: number, g: number }) => {
    if (stats.s === 0) return 0;
    return 0.4 + (Math.min(stats.s, 10) / 20); // Base 0.4, scale up slightly with volume
  };

  // Helper to draw annular sector path
  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const ZoneOverlay = ({ x, y, rInner, rOuter, stats, label }: any) => {
    // Full circle for Post, Arcs/Patches for others?
    // Simplified: Just draw full concentric rings for now, Korfball is 360 gameplay

    const color = getZoneColor(stats);
    const opacity = getZoneOpacity(stats);

    if (rInner === 0) {
      // Inner Circle
      return (
        <g>
          <circle cx={x} cy={y} r={rOuter} fill={color} opacity={opacity} stroke="white" strokeWidth="0.5" />
          {stats.s > 0 && (
            <text x={x} y={y} fontSize="3" textAnchor="middle" dy="1" fill="white" fontWeight="bold">
              {Math.round((stats.g / stats.s) * 100)}%
            </text>
          )}
        </g>
      );
    } else {
      // Annulus (Ring)
      // Stroke is centered on radius. 
      // r = (rOuter + rInner) / 2. width = rOuter - rInner.
      const r = (rOuter + rInner) / 2;
      const width = rOuter - rInner;

      return (
        <g>
          <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={width} opacity={opacity} />
          <circle cx={x} cy={y} r={rOuter} fill="none" stroke="white" strokeWidth="0.2" opacity="0.5" />
          {/* Label at top of ring */}
          {stats.s > 0 && (
            <text x={x} y={y - r} fontSize="3" textAnchor="middle" dy="1" fill="white" fontWeight="bold" style={{ textShadow: '0 1px 2px black' }}>
              {Math.round((stats.g / stats.s) * 100)}%
            </text>
          )}
        </g>
      );
    }
  };


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


        {/* Center Spot */}
        <circle cx="100" cy="50" r="1" fill="#4b5563" />

        {/* Penalty Spots (2.5m in front of post) */}
        {/* Post at 33.3 (Left) and 166.7 (Right). 2.5m = 12.5 units. */}
        {/* Left Spot: 33.3 + 12.5 = 45.8 */}
        {/* Right Spot: 166.7 - 12.5 = 154.2 */}
        <circle cx="45.8" cy="50" r="0.6" fill="#4b5563" />
        <circle cx="154.2" cy="50" r="0.6" fill="#4b5563" />

        {/* Penalty Area / Free Pass Zone (Capsule Shape) */}
        {/* Left Side: Post 33.3, Spot 45.8 */}
        <path d="M 33.3 37.5 L 45.8 37.5 A 12.5 12.5 0 1 1 45.8 62.5 L 33.3 62.5 A 12.5 12.5 0 1 1 33.3 37.5 Z" fill="none" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
        {/* Left: Penalty Circle (Full) */}
        <circle cx="45.8" cy="50" r="12.5" fill="none" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />

        {/* Right Side: Spot 154.2, Post 166.7 */}
        <path d="M 166.7 37.5 L 154.2 37.5 A 12.5 12.5 0 1 0 154.2 62.5 L 166.7 62.5 A 12.5 12.5 0 1 0 166.7 37.5 Z" fill="none" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
        {/* Right: Penalty Circle (Full) */}
        <circle cx="154.2" cy="50" r="12.5" fill="none" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />

        {/* Baskets (Korfs) - On top of overlays */}
        {/* Left Korf */}
        <circle cx="33.3" cy="50" r="3" stroke="#4b5563" strokeWidth="1.5" fill="none" />
        <circle cx="33.3" cy="50" r="0.8" fill="#f59e0b" />

        {/* Right Korf */}
        <circle cx="166.7" cy="50" r="3" stroke="#4b5563" strokeWidth="1.5" fill="none" />
        <circle cx="166.7" cy="50" r="0.8" fill="#f59e0b" />

        {/* Dynamic Events Rendering (View Mode) */}
        {mode === 'view' && !showZoneEfficiency && shotEvents.map((event) => (
          <g key={event.id}>
            {heatmapMode ? (
              // DOT Heatmap Style
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