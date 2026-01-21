
import React from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
  Label
} from 'recharts';
import { Flame, TrendingUp } from 'lucide-react';
import { SampleRecord, DtaPoint, ColorPalette, DtaPeak } from '../types';

interface GeochemicalChartProps {
  data: SampleRecord[];
  currentDtaCurve?: DtaPoint[];
  currentDtaPeaks?: DtaPeak[];
  palette: ColorPalette;
}

const GeochemicalChart: React.FC<GeochemicalChartProps> = ({ data, currentDtaCurve = [], currentDtaPeaks = [], palette }) => {
  // Map sample records into a format suitable for Recharts, sorted by timestamp to reflect history
  const chartData = [...data]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((item, index) => ({
      name: item.name || `S-${index + 1}`,
      cia: item.geochemicalIndices.cia,
      thSc: item.geochemicalIndices.thSc,
      q: item.composition.q,
      f: item.composition.f,
      l: item.composition.l,
      timestamp: item.timestamp,
    }));

  if (data.length === 0 && currentDtaCurve.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#415a77]/20 rounded-2xl bg-[#0d1b2a]/30 p-8 text-center">
        <TrendingUp className="w-12 h-12 text-slate-700 mb-4 opacity-20" />
        <div className="text-slate-500 text-xs uppercase tracking-widest font-bold">No Stratigraphic History Available</div>
        <p className="text-[10px] text-slate-600 mt-2 max-w-[200px]">Analyze samples to generate geochemical and mineralogical trend lines.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 h-full">
      {chartData.length > 0 && (
        <div className="flex-1 min-h-[300px] w-full bg-[#0d1b2a]/40 p-5 rounded-2xl border border-[#415a77]/20 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: palette.primary }}>
              <TrendingUp className="w-3.5 h-3.5" /> 
              Stratigraphic Geochemistry & Mineralogy
            </h3>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorCia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.primary} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={palette.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#415a77" opacity={0.15} vertical={false} />
              
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                label={{ value: 'Sample Sequence', position: 'insideBottom', offset: -10, fontSize: 9, fill: '#415a77', fontWeight: 600 }}
              />
              
              {/* Left Y-Axis 1: CIA Index (0-100) */}
              <YAxis 
                yAxisId="left-cia" 
                orientation="left"
                stroke={palette.primary} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                domain={[0, 100]}
                width={35}
                label={{ value: 'CIA Index', angle: -90, position: 'insideLeft', fontSize: 9, fill: palette.primary, offset: 10 }}
              />

              {/* Left Y-Axis 2: Th/Sc Ratio */}
              <YAxis 
                yAxisId="left-ratio" 
                orientation="left"
                stroke={palette.secondary} 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                domain={['auto', 'auto']}
                width={35}
                dx={-40}
                label={{ value: 'Th/Sc', angle: -90, position: 'left', fontSize: 9, fill: palette.secondary, offset: 0 }}
              />
              
              {/* Right Y-Axis: Mineralogy (QFL %) */}
              <YAxis 
                yAxisId="right-qfl" 
                orientation="right" 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                domain={[0, 100]}
                width={35}
                label={{ value: 'Mineralogy %', angle: 90, position: 'insideRight', fontSize: 9, fill: '#94a3b8', offset: 10 }}
              />

              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1b263b', 
                  border: `1px solid ${palette.primary}44`, 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  color: '#fff' 
                }}
                itemStyle={{ padding: '2px 0' }}
                cursor={{ stroke: '#415a77', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              
              <Legend 
                verticalAlign="top" 
                height={40} 
                iconType="circle" 
                wrapperStyle={{ 
                  fontSize: '9px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em', 
                  paddingBottom: '10px',
                  fontWeight: 600
                }} 
              />

              {/* CIA Data Representation (Left Axis) */}
              <Area 
                yAxisId="left-cia" 
                name="CIA Index" 
                type="monotone" 
                dataKey="cia" 
                stroke={palette.primary} 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorCia)" 
                animationDuration={1500}
              />

              {/* Th/Sc Data Representation (Left-Ratio Axis) */}
              <Line 
                yAxisId="left-ratio" 
                name="Th/Sc Ratio" 
                type="monotone" 
                dataKey="thSc" 
                stroke={palette.secondary} 
                strokeWidth={2.5} 
                dot={{ r: 5, fill: palette.secondary, stroke: '#0d1b2a', strokeWidth: 2 }} 
                activeDot={{ r: 7, strokeWidth: 0 }}
                animationDuration={1500}
              />

              {/* Mineralogy Trends (Right Axis) */}
              <Line 
                yAxisId="right-qfl" 
                name="Quartz (Q%)" 
                type="monotone" 
                dataKey="q" 
                stroke={palette.accent} 
                strokeWidth={1.5} 
                strokeDasharray="4 4"
                dot={{ r: 3, fill: palette.accent }} 
              />
              <Line 
                yAxisId="right-qfl" 
                name="Feldspar (F%)" 
                type="monotone" 
                dataKey="f" 
                stroke="#60a5fa" 
                strokeWidth={1.5} 
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#60a5fa' }} 
              />
              <Line 
                yAxisId="right-qfl" 
                name="Lithics (L%)" 
                type="monotone" 
                dataKey="l" 
                stroke="#f87171" 
                strokeWidth={1.5} 
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#f87171' }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {currentDtaCurve.length > 0 && (
        <div className="h-64 w-full p-5 bg-[#0d1b2a]/40 border border-[#415a77]/20 rounded-2xl relative shadow-inner overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-4 flex justify-between items-center" style={{ color: palette.primary }}>
            <span className="flex items-center gap-2"><Flame className="w-3.5 h-3.5" /> Thermal Scan Profile</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1 text-[8px] text-blue-400 uppercase"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/> Endothermic</span>
              <span className="flex items-center gap-1 text-[8px] text-red-400 uppercase"><div className="w-1.5 h-1.5 rounded-full bg-red-500"/> Exothermic</span>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={currentDtaCurve} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#415a77" opacity={0.1} />
              <XAxis 
                dataKey="temperature" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -10, fontSize: 8, fill: '#64748b', fontWeight: 600 }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                label={{ value: 'Δ Heat Flow', angle: -90, position: 'insideLeft', fontSize: 8, fill: '#64748b', fontWeight: 600 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1b263b', border: `1px solid ${palette.primary}33`, borderRadius: '8px', fontSize: '10px' }}
                formatter={(value: any) => [`${Number(value).toFixed(4)}`, 'Heat Flow']}
              />
              
              {currentDtaPeaks.map((peak, idx) => (
                <ReferenceLine 
                  key={idx} 
                  x={peak.temperature} 
                  stroke={peak.type === 'endothermic' ? '#3b82f6' : '#ef4444'} 
                  strokeDasharray="3 3" 
                  strokeWidth={1}
                >
                  <Label 
                    value={peak.mineralInterpretation} 
                    position="top" 
                    fill={peak.type === 'endothermic' ? '#3b82f6' : '#ef4444'} 
                    fontSize={8} 
                    fontWeight="bold"
                    offset={10}
                  />
                </ReferenceLine>
              ))}

              <Line 
                type="basis" 
                dataKey="value" 
                stroke={palette.primary} 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={true} 
                animationDuration={2000}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default GeochemicalChart;
