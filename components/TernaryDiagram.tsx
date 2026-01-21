
import React, { useMemo, useState, useRef } from 'react';
import { MineralComposition, ColorPalette } from '../types';

interface TernaryDiagramProps {
  composition: MineralComposition;
  onChange?: (comp: MineralComposition) => void;
  size?: number;
  palette: ColorPalette;
}

interface ProvenanceRegion {
  name: string;
  points: { q: number; f: number; l: number }[];
  color: string;
  ranges: string;
  description: string;
  labelPos: { q: number; f: number; l: number };
}

const TernaryDiagram: React.FC<TernaryDiagramProps> = ({ composition, onChange, size = 300, palette }) => {
  const [showDataTooltip, setShowDataTooltip] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<ProvenanceRegion | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const h = size * Math.sin(Math.PI / 3);
  
  // Fixed syntax: used commas instead of semicolons in function parameter list
  const getCoords = (q: number, f: number, l: number) => {
    const total = q + f + l || 1;
    const nQ = q / total;
    const nL = l / total;
    const x = (size * nL) + ((size / 2) * nQ);
    const y = h * (1 - nQ);
    return { x, y };
  };

  const getPointsString = (points: { q: number; f: number; l: number }[]) => {
    return points.map(p => {
      const { x, y } = getCoords(p.q, p.f, p.l);
      return `${x},${y}`;
    }).join(' ');
  };

  const regions: ProvenanceRegion[] = useMemo(() => [
    {
      name: 'Stable Craton',
      points: [
        { q: 100, f: 0, l: 0 },
        { q: 90, f: 10, l: 0 },
        { q: 90, f: 0, l: 10 }
      ],
      color: `${palette.primary}33`,
      ranges: 'Q: 90–100 | F: 0–10 | L: 0–10',
      description: 'Craton interior provenance with mature, quartz-rich sands.',
      labelPos: { q: 95, f: 2.5, l: 2.5 }
    },
    {
      name: 'Basement Uplift',
      points: [
        { q: 0, f: 100, l: 0 },
        { q: 65, f: 35, l: 0 },
        { q: 40, f: 30, l: 30 },
        { q: 0, f: 65, l: 35 }
      ],
      color: `${palette.secondary}26`,
      ranges: 'Q: 0–65 | F: 35–100 | L: 0–35',
      description: 'Feldspathic sands derived from deeply eroded orogenic belts.',
      labelPos: { q: 20, f: 60, l: 20 }
    },
    {
      name: 'Typical Molasse (Recycled Orogen)',
      points: [
        { q: 90, f: 0, l: 10 },
        { q: 90, f: 10, l: 0 },
        { q: 40, f: 30, l: 30 },
        { q: 0, f: 65, l: 35 },
        { q: 0, f: 0, l: 100 }
      ],
      color: `${palette.accent}26`,
      ranges: 'Q: 0–90 | F: 0–65 | L: 10–100',
      description: 'Classic syn-orogenic debris from colliding continental blocks.',
      labelPos: { q: 35, f: 15, l: 50 }
    },
    {
      name: 'Magmatic Arc',
      points: [
        { q: 0, f: 100, l: 0 },
        { q: 40, f: 30, l: 30 },
        { q: 0, f: 0, l: 100 }
      ],
      color: `${palette.text}1a`,
      ranges: 'Q: 0–40 | F: 0–100 | L: 0–100',
      description: 'Volcaniclastic sands from active plate margins and arcs.',
      labelPos: { q: 10, f: 45, l: 45 }
    }
  ], [palette]);

  const getCompositionFromCoords = (x: number, y: number): MineralComposition => {
    const cy = Math.max(0, Math.min(h, y));
    const nQ = 1 - (cy / h);
    const minXAtY = (size / 2) * nQ;
    const maxXAtY = size - minXAtY;
    const cx = Math.max(minXAtY, Math.min(maxXAtY, x));
    const nL = (cx - ((size / 2) * nQ)) / size;
    const q = Math.round(nQ * 100);
    const l = Math.round(nL * 100);
    const f = 100 - q - l;
    return { q, f, l };
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent | MouseEvent) => {
    if (!onChange || !svgRef.current) return;
    const svg = svgRef.current;
    const CTM = svg.getScreenCTM();
    if (!CTM) return;
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPoint = pt.matrixTransform(CTM.inverse());
    const newComp = getCompositionFromCoords(svgPoint.x, svgPoint.y);
    onChange(newComp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e);
    const moveHandler = (me: MouseEvent) => handleInteraction(me);
    const upHandler = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
  };

  const currentPoint = useMemo(() => getCoords(composition.q, composition.f, composition.l), [composition, size, h]);

  return (
    <div className="relative flex flex-col items-center group/ternary select-none" onMouseMove={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }}>
      <div className="relative">
        <svg 
          ref={svgRef}
          width={size + 80} 
          height={h + 80} 
          viewBox={`-40 -40 ${size + 80} ${h + 80}`} 
          className={`overflow-visible touch-none transition-opacity duration-300 ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
          onMouseDown={handleMouseDown}
          onTouchStart={(e) => { setIsDragging(true); handleInteraction(e); }}
          onTouchMove={handleInteraction}
          onTouchEnd={() => setIsDragging(false)}
        >
          {/* Main Triangle */}
          <polygon points={`${size / 2},0 0,${h} ${size},${h}`} className="fill-[#0d1b2a] stroke-[#415a77] stroke-2 shadow-inner" />

          {/* Provenance Regions */}
          {regions.map((region) => (
            <polygon
              key={region.name}
              points={getPointsString(region.points)}
              fill={hoveredRegion?.name === region.name ? `${region.color.slice(0, 7)}59` : region.color}
              className="transition-all duration-300 stroke-[#415a77]/10 cursor-help"
              onMouseEnter={() => !isDragging && setHoveredRegion(region)}
              onMouseLeave={() => setHoveredRegion(null)}
            />
          ))}
          
          {/* Grid Lines */}
          {[0.2, 0.4, 0.6, 0.8].map(v => (
            <React.Fragment key={v}>
              <line x1={size/2 * v} y1={h * (1 - v)} x2={size - (size/2 * v)} y2={h * (1 - v)} className="stroke-[#415a77]/10 stroke-1 pointer-events-none" />
              <line x1={size * v} y1={h} x2={size/2 * v} y2={h * (1 - v)} className="stroke-[#415a77]/10 stroke-1 pointer-events-none" />
              <line x1={size * (1 - v)} y1={h} x2={size - (size/2 * v)} y2={h * (1 - v)} className="stroke-[#415a77]/10 stroke-1 pointer-events-none" />
            </React.Fragment>
          ))}

          {/* Persistent Labels */}
          <g className="pointer-events-none select-none">
            {regions.map((region) => {
              const { x, y } = getCoords(region.labelPos.q, region.labelPos.f, region.labelPos.l);
              const isHovered = hoveredRegion?.name === region.name;
              return (
                <text
                  key={region.name}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  className={`text-[8px] font-bold transition-all duration-300 pointer-events-none ${isHovered ? 'scale-110' : 'opacity-25'}`}
                  fill={isHovered ? palette.primary : '#64748b'}
                >
                  {region.name.split(' (')[0]}
                </text>
              );
            })}
          </g>

          {/* Corner Labels */}
          <g className="select-none pointer-events-none font-sans">
            <text x={size / 2} y={-20} textAnchor="middle" className="font-extrabold text-[10px] uppercase tracking-[0.2em]" fill={palette.primary}>Quartz (Q)</text>
            <text x={-15} y={h + 25} textAnchor="end" className="font-extrabold text-[10px] uppercase tracking-[0.2em]" fill={palette.primary}>Feldspar (F)</text>
            <text x={size + 15} y={h + 25} textAnchor="start" className="font-extrabold text-[10px] uppercase tracking-[0.2em]" fill={palette.primary}>Lithics (L)</text>
          </g>

          {/* Data Point */}
          <g onMouseEnter={() => !isDragging && setShowDataTooltip(true)} onMouseLeave={() => setShowDataTooltip(false)}>
            <circle cx={currentPoint.x} cy={currentPoint.y} r={isDragging ? "22" : "14"} fill={`${palette.primary}1a`} className="animate-pulse" />
            <circle cx={currentPoint.x} cy={currentPoint.y} r={isDragging ? "10" : "8"} fill={isDragging ? palette.secondary : palette.accent} stroke="white" strokeWidth="2" />
          </g>
        </svg>

        {/* Current Composition Tooltip */}
        {(showDataTooltip || isDragging) && (
          <div className="absolute pointer-events-none bg-[#1b263b]/95 backdrop-blur-md border p-4 rounded-xl shadow-2xl z-[60] min-w-[180px] border-[#415a77]/40" style={{ left: `${currentPoint.x + 50}px`, top: `${currentPoint.y - 20}px` }}>
            <div className="font-bold mb-3 border-b border-[#415a77]/20 pb-2 tracking-[0.1em] text-[10px] uppercase text-white">Analysis Fingerprint</div>
            <div className="space-y-3">
              {[{ label: 'Quartz', val: composition.q, color: palette.primary }, { label: 'Feldspar', val: composition.f, color: palette.secondary }, { label: 'Lithics', val: composition.l, color: palette.accent }].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold"><span className="text-slate-400 uppercase tracking-tighter">{item.label}</span><span className="text-white mono">{item.val}%</span></div>
                  <div className="h-1 w-full bg-[#0d1b2a] rounded-full overflow-hidden"><div className="h-full transition-all duration-300" style={{ width: `${item.val}%`, backgroundColor: item.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provenance Region Tooltip */}
        {hoveredRegion && !isDragging && (
          <div 
            className="absolute pointer-events-none bg-[#0d1b2a]/95 backdrop-blur-xl border border-[#415a77]/50 p-4 rounded-2xl shadow-2xl z-50 min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              left: `${mousePos.x + 20}px`, 
              top: `${mousePos.y + 20}px`
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredRegion.color.slice(0, 7) }} />
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-white">
                {hoveredRegion.name}
              </div>
            </div>
            
            <div className="bg-[#1b263b]/50 rounded-lg p-2 mb-3 border border-[#415a77]/20">
              <div className="text-[8px] font-bold uppercase text-slate-500 tracking-tighter mb-1">QFL Range (Dickinson)</div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold leading-none">
                {hoveredRegion.ranges}
              </div>
            </div>

            <div className="text-[9px] text-slate-300 leading-relaxed italic border-t border-[#415a77]/20 pt-2">
              {hoveredRegion.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TernaryDiagram;
