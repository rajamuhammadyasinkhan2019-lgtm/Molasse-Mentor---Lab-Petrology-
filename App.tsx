
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
  Microscope, BarChart3, Globe, FlaskConical, Plus, Fingerprint, Send, 
  ThermometerSnowflake, Wind, CloudRain, History, Activity, Upload, Camera, 
  FileSearch, Paperclip, X, FileText, Image as ImageIcon, Database, Layers, 
  MapPin, Info, Search, SortAsc, Filter, CheckSquare, Square, Columns, Flame, 
  TrendingDown, TrendingUp, FileJson, Clock, ChevronRight, Palette, Tag, 
  Atom, Beaker, Zap, FileSpreadsheet, Eye, Settings2, Check, Sun, Compass,
  Activity as WaveIcon, Loader2, AlertCircle, FileType, BookOpen, Mountain,
  Trash2, Cpu, ShieldCheck, ListPlus, Type as TypeIcon, Ruler, Table as TableIcon,
  Sparkles, Layers as LayersIcon, ScanSearch
} from 'lucide-react';
import TernaryDiagram from './components/TernaryDiagram';
import GeochemicalChart from './components/GeochemicalChart';
import { 
  MineralComposition, AnalysisResult, ChatMessage, SampleRecord, 
  ReferenceMolasse, DtaPoint, ColorPalette, DtaPeak, XrdPeak, XrfData, IcpMsData, PetrographyData,
  NotebookEntry, MeasurementRow, SectionMeasurement
} from './types';
import { 
  analyzeSample, chatWithMentor, interpretDtaPeaks, interpretXrd, 
  interpretXrf, interpretIcpMs, interpretPetrography, ChatAttachment 
} from './services/gemini';

const PALETTES: ColorPalette[] = [
  { id: 'deepsea', name: 'Orogenic Blue', primary: '#3b82f6', secondary: '#eab308', accent: '#2563eb', bgSecondary: '#1b263b', border: '#415a77', text: '#3b82f6' },
  { id: 'viridis', name: 'Scientific Viridis', primary: '#21918c', secondary: '#fde725', accent: '#440154', bgSecondary: '#1a1a1a', border: '#333333', text: '#21918c' },
  { id: 'plasma', name: 'Perceptual Plasma', primary: '#cc4778', secondary: '#f89540', accent: '#7e03a8', bgSecondary: '#21112e', border: '#4c2b66', text: '#cc4778' },
  { id: 'inferno', name: 'Thermal Inferno', primary: '#f1605d', secondary: '#fcfdbf', accent: '#781c6d', bgSecondary: '#1b0c0c', border: '#4c1e1e', text: '#f1605d' },
  { id: 'cividis', name: 'Cividis (A11y)', primary: '#ffd700', secondary: '#00224e', accent: '#4b4b4b', bgSecondary: '#001a35', border: '#1e3a5f', text: '#ffd700' },
  { id: 'magma', name: 'Magmatic Crimson', primary: '#dc2626', secondary: '#f97316', accent: '#991b1b', bgSecondary: '#2d1b1b', border: '#5a4141', text: '#ef4444' },
  { id: 'emerald', name: 'Petrographic Emerald', primary: '#059669', secondary: '#84cc16', accent: '#065f46', bgSecondary: '#1b3b2a', border: '#41775a', text: '#10b981' }
];

const GLOBAL_REFERENCES: ReferenceMolasse[] = [
  {
    id: 'siwalik',
    name: 'Siwalik Group',
    region: 'Himalayan Foreland',
    age: 'Miocene–Pleistocene',
    tectonicSetting: 'Collisional Orogen',
    typicalQFL: { q: 65, f: 15, l: 20 },
    typicalCIA: '65–75',
    description: 'Extensive syn-orogenic debris from the Himalayan orogeny.'
  },
  {
    id: 'alpine',
    name: 'Alpine Molasse',
    region: 'European Alps',
    age: 'Oligocene–Miocene',
    tectonicSetting: 'Foreland Basin',
    typicalQFL: { q: 55, f: 20, l: 25 },
    typicalCIA: '60–70',
    description: 'Debris from the rising Alpine ranges.'
  },
  {
    id: 'appalachian',
    name: 'Catskill Delta',
    region: 'Appalachians',
    age: 'Devonian',
    tectonicSetting: 'Acadian Orogeny',
    typicalQFL: { q: 75, f: 10, l: 15 },
    typicalCIA: '70–80',
    description: 'Mature quartz-rich molasse sediments.'
  }
];

const App: React.FC = () => {
  const [palette, setPalette] = useState<ColorPalette>(PALETTES[0]);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const [composition, setComposition] = useState<MineralComposition>({ q: 33, f: 33, l: 34 });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sampleHistory, setSampleHistory] = useState<SampleRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [inputMsg, setInputMsg] = useState("");
  
  // Notebook Mode & States
  const [notebookMode, setNotebookMode] = useState<'text' | 'field' | 'measurement' | 'lab'>('text');
  
  // 1. Structured Field Form State
  const [fieldForm, setFieldForm] = useState({
    lithology: '', colour: '', texture: '', structures: '', fossils: '', contacts: '', thickness: '', age: ''
  });

  // 2. Section Measurements State
  const [typeLocality, setTypeLocality] = useState('');
  const [measurementRows, setMeasurementRows] = useState<MeasurementRow[]>([
    { station: '', formation: '', lithology: '', bearing: '', slopeAngle: '', slopeDistance: '' }
  ]);

  // 3. Expanded Structured Lab Form State (Petrography Focused)
  const [labForm, setLabForm] = useState({
    photomicrograph: '',
    quartz: '', // Monocrystalline, Polycrystalline
    feldspar: '', // Orthoclase, microcline, albite, Anorthite, perthite, microcline-perthite etc
    igneousLF: '', // Basalt, basaltic andesite, andesitic, Rhyolitic, granite
    metamorphicLF: '', // slates, phyllites, schists, gneisses, marble, granite gneisses, Hornfel etc
    sedimentaryLF: '', // bioclasts, fossils, chert, reworked sandstone, siltstone, limestone, dolomite, etc.
    accessoryMinerals: '',
    cements: '',
    matrix: ''
  });

  const [currentDtaCurve, setCurrentDtaCurve] = useState<DtaPoint[]>([]);
  const [currentDtaPeaks, setCurrentDtaPeaks] = useState<DtaPeak[]>([]);
  const [currentXrdPeaks, setCurrentXrdPeaks] = useState<XrdPeak[]>([]);
  const [currentXrf, setCurrentXrf] = useState<XrfData | null>(null);
  const [currentIcpMs, setCurrentIcpMs] = useState<IcpMsData | null>(null);
  const [currentPetro, setCurrentPetro] = useState<PetrographyData | null>(null);
  const [analyticalLoading, setAnalyticalLoading] = useState<Record<string, boolean>>({});

  const [chatFiles, setChatFiles] = useState<ChatAttachment[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const dtaFileInputRef = useRef<HTMLInputElement>(null);
  const xrdFileInputRef = useRef<HTMLInputElement>(null);
  const xrfFileInputRef = useRef<HTMLInputElement>(null);
  const icpMsFileInputRef = useRef<HTMLInputElement>(null);
  const petroFileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const toggleLoading = (key: string, val: boolean) => {
    setAnalyticalLoading(prev => ({ ...prev, [key]: val }));
  };

  const handleTernaryChange = (newComp: MineralComposition) => setComposition(newComp);

  const handleManualCompositionChange = (key: keyof MineralComposition, value: number) => {
    const newVal = Math.max(0, Math.min(100, value));
    const others = (Object.keys(composition) as Array<keyof MineralComposition>).filter(k => k !== key);
    
    const [key0, key1] = others;
    if (!key0 || !key1) return;

    const val0 = composition[key0] as number;
    const val1 = composition[key1] as number;
    const currentSumOthers = val0 + val1;
    const remaining = 100 - newVal;

    let nextComp = { ...composition, [key]: newVal };
    if (currentSumOthers > 0) {
      nextComp[key0] = Math.round((val0 / currentSumOthers) * remaining);
      nextComp[key1] = remaining - nextComp[key0];
    } else {
      nextComp[key0] = Math.floor(remaining / 2);
      nextComp[key1] = remaining - nextComp[key0];
    }
    setComposition(nextComp);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      let contextLines: string[] = [];
      
      // 1. XRD Context
      if (currentXrdPeaks.length > 0) {
        const minerals = Array.from(new Set(currentXrdPeaks.map(p => p.mineral).filter(Boolean)));
        contextLines.push(`[XRD MINERALOGY]: Identified phases include ${minerals.join(", ")}.`);
      }
      
      // 2. XRF Context
      if (currentXrf) {
        const oxides = Object.entries(currentXrf.elements)
          .map(([k, v]) => `${k}:${v}%`)
          .join(", ");
        contextLines.push(`[XRF GEOCHEMISTRY]: Major oxides profile: ${oxides}. AI Interpretation: ${currentXrf.interpretation}`);
      }
      
      // 3. ICP-MS Context
      if (currentIcpMs) {
        contextLines.push(`[ICP-MS TRACE ELEMENTS]: REE Patterns: ${currentIcpMs.reePattern}. Provenance Indicators: ${currentIcpMs.interpretation}`);
      }
      
      // 4. Petrography Context
      if (currentPetro) {
        contextLines.push(`[PETROGRAPHY]: ${currentPetro.grainSize} grains, ${currentPetro.sorting} sorting, ${currentPetro.rounding} rounding. Matrix: ${currentPetro.matrixPercent}%. Cement: ${currentPetro.cementType}. Description: ${currentPetro.description}`);
      }

      // 5. DTA Thermal Context
      if (currentDtaPeaks.length > 0) {
        const dtaSummary = currentDtaPeaks.map(p => `${p.temperature}°C(${p.mineralInterpretation})`).join(", ");
        contextLines.push(`[DTA THERMAL ANALYSIS]: Detected peaks at ${dtaSummary}.`);
      }

      const context = contextLines.join("\n");

      const res = await analyzeSample(composition, context);
      setAnalysis(res);
      
      const newRecord: SampleRecord = {
        ...res,
        id: crypto.randomUUID(),
        name: `S-${sampleHistory.length + 1}`,
        composition: { ...composition },
        timestamp: Date.now(),
        dtaCurve: currentDtaCurve.length > 0 ? [...currentDtaCurve] : undefined,
        dtaPeaks: currentDtaPeaks.length > 0 ? [...currentDtaPeaks] : undefined,
        xrdPeaks: currentXrdPeaks.length > 0 ? [...currentXrdPeaks] : undefined,
        xrf: currentXrf || undefined,
        icpMs: currentIcpMs || undefined,
        petrography: currentPetro || undefined
      };
      setSampleHistory(prev => [...prev, newRecord]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addMeasurementRow = () => {
    setMeasurementRows(prev => [...prev, { station: '', formation: '', lithology: '', bearing: '', slopeAngle: '', slopeDistance: '' }]);
  };

  const updateMeasurementRow = (index: number, field: keyof MeasurementRow, value: string) => {
    setMeasurementRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeMeasurementRow = (index: number) => {
    if (measurementRows.length <= 1) return;
    setMeasurementRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNote = (type: 'field' | 'lab' | 'measurement') => {
    let content = "";
    let finalType = type;

    if (notebookMode === 'field') {
      const { lithology, colour, texture, structures, fossils, contacts, thickness, age } = fieldForm;
      content = `Lithology: ${lithology || 'N/A'}\n` +
                `Colour: ${colour || 'N/A'}\n` +
                `Texture: ${texture || 'N/A'}\n` +
                `Structures: ${structures || 'N/A'}\n` +
                `Fossils: ${fossils || 'N/A'}\n` +
                `Contacts: ${contacts || 'N/A'}\n` +
                `Thickness: ${thickness || 'N/A'}\n` +
                `Age: ${age || 'N/A'}`;
      finalType = 'field';
    } else if (notebookMode === 'measurement') {
      const sectionData: SectionMeasurement = {
        typeLocality,
        rows: measurementRows
      };
      content = JSON.stringify(sectionData);
      finalType = 'measurement';
    } else if (notebookMode === 'lab') {
      const { quartz, feldspar, igneousLF, metamorphicLF, sedimentaryLF, accessoryMinerals, cements, matrix, photomicrograph } = labForm;
      content = `Quartz (Mono/Poly): ${quartz || 'N/A'}\n` +
                `Feldspar (Or/Mc/Ab/An/Per): ${feldspar || 'N/A'}\n` +
                `Igneous Lithics: ${igneousLF || 'N/A'}\n` +
                `Metamorphic Lithics: ${metamorphicLF || 'N/A'}\n` +
                `Sedimentary Lithics: ${sedimentaryLF || 'N/A'}\n` +
                `Accessory Minerals: ${accessoryMinerals || 'N/A'}\n` +
                `Cement: ${cements || 'N/A'}\n` +
                `Matrix: ${matrix || 'N/A'}\n` +
                `Photomicrograph Notes: ${photomicrograph || 'N/A'}`;
      finalType = 'lab';
    } else {
      if (!noteInput.trim()) return;
      content = noteInput;
    }

    const entry: NotebookEntry = {
      id: crypto.randomUUID(),
      type: finalType,
      content,
      timestamp: Date.now()
    };

    setNotebookEntries(prev => [entry, ...prev]);
    
    // Reset inputs
    setNoteInput("");
    setFieldForm({ lithology: '', colour: '', texture: '', structures: '', fossils: '', contacts: '', thickness: '', age: '' });
    setLabForm({ 
      quartz: '', feldspar: '', igneousLF: '', metamorphicLF: '', sedimentaryLF: '', 
      accessoryMinerals: '', cements: '', matrix: '', photomicrograph: '' 
    });
    setTypeLocality('');
    setMeasurementRows([{ station: '', formation: '', lithology: '', bearing: '', slopeAngle: '', slopeDistance: '' }]);
    setNotebookMode('text');
  };

  const deleteNote = (id: string) => {
    setNotebookEntries(prev => prev.filter(n => n.id !== id));
  };

  const handleXrdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      toggleLoading('xrd', true);
      const rows = content.split('\n').filter(l => l.trim()).slice(1);
      const peaks: XrdPeak[] = rows.map(r => {
        const parts = r.split(',');
        return { twoTheta: Number(parts[0]), intensity: Number(parts[1]) };
      }).filter(p => !isNaN(p.twoTheta));
      try {
        const interpreted = await interpretXrd(peaks);
        setCurrentXrdPeaks(interpreted);
      } catch (e) { console.error(e); } finally { toggleLoading('xrd', false); }
    };
    reader.readAsText(file);
  };

  const handleXrfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      toggleLoading('xrf', true);
      try {
        let data: Record<string, number> = {};
        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else {
          content.split('\n').forEach(line => {
            const [el, val] = line.split(',');
            if (el && !isNaN(Number(val))) data[el.trim()] = Number(val);
          });
        }
        const res = await interpretXrf(data);
        setCurrentXrf(res);
      } catch (e) { console.error(e); } finally { toggleLoading('xrf', false); }
    };
    reader.readAsText(file);
  };

  const handleIcpMsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      toggleLoading('icpms', true);
      try {
        let data: Record<string, number> = {};
        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else {
          content.split('\n').forEach(line => {
            const [el, val] = line.split(',');
            if (el && !isNaN(Number(val))) data[el.trim()] = Number(val);
          });
        }
        const res = await interpretIcpMs(data);
        setCurrentIcpMs(res);
      } catch (e) { console.error(e); } finally { toggleLoading('icpms', false); }
    };
    reader.readAsText(file);
  };

  const handlePetroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      toggleLoading('petro', true);
      const res = await interpretPetrography(content);
      setCurrentPetro(res);
      toggleLoading('petro', false);
    };
    reader.readAsText(file);
  };

  const handleDtaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      toggleLoading('dta', true);
      const rows = content.split('\n').filter(l => l.trim()).slice(1);
      const curve = rows.map(r => {
        const [temp, val] = r.split(',').map(Number);
        return { temperature: temp, value: val };
      }).filter(p => !isNaN(p.temperature));
      setCurrentDtaCurve(curve);
      const interpreted = await interpretDtaPeaks([{ temperature: 573, value: -0.5, type: 'endothermic' }]);
      setCurrentDtaPeaks(interpreted);
      toggleLoading('dta', false);
    };
    reader.readAsText(file);
  };

  const handleChat = async () => {
    if (!inputMsg.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', content: inputMsg }]);
    const msg = inputMsg;
    setInputMsg("");
    try {
      const res = await chatWithMentor(chatHistory, msg, chatFiles);
      setChatHistory(prev => [...prev, { role: 'assistant', content: res }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Processing Error." }]);
    }
  };

  const majorOxides = useMemo(() => {
    if (!currentXrf) return [];
    return Object.entries(currentXrf.elements).sort((a, b) => (b[1] as number) - (a[1] as number));
  }, [currentXrf]);

  const icpMsSummary = useMemo(() => {
    if (!currentIcpMs) return null;
    const elements = currentIcpMs.traceElements;
    const reeList = ['La', 'Ce', 'Pr', 'Nd', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu'];
    const reeFound = Object.entries(elements).filter(([k]) => reeList.includes(k));
    const thValue = elements['Th'];
    const scValue = elements['Sc'];
    const laValue = elements['La'];
    const ybValue = elements['Yb'];
    const ratios = {
      ThSc: (thValue !== undefined && scValue !== undefined && scValue !== 0) ? (thValue / scValue).toFixed(2) : 'N/A',
      LaYb: (laValue !== undefined && ybValue !== undefined && ybValue !== 0) ? (laValue / ybValue).toFixed(2) : 'N/A'
    };
    return { reeFound, ratios };
  }, [currentIcpMs]);

  const renderNotebookEntry = (entry: NotebookEntry) => {
    if (entry.type === 'measurement') {
      try {
        const data: SectionMeasurement = JSON.parse(entry.content);
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400/80">
              <MapPin className="w-3 h-3" /> {data.typeLocality || 'Undefined Locality'}
            </div>
            <div className="overflow-x-auto border border-[#415a77]/20 rounded-lg">
              <table className="w-full text-[9px] border-collapse">
                <thead className="bg-[#1b263b]">
                  <tr className="text-slate-500 uppercase tracking-tighter">
                    <th className="p-1.5 border-b border-[#415a77]/20 text-left">St.</th>
                    <th className="p-1.5 border-b border-[#415a77]/20 text-left">Fm.</th>
                    <th className="p-1.5 border-b border-[#415a77]/20 text-left">Lith.</th>
                    <th className="p-1.5 border-b border-[#415a77]/20 text-left">Brg.</th>
                    <th className="p-1.5 border-b border-[#415a77]/20 text-left">∠</th>
                    <th className="p-1.5 border-b border-[#415a77]/20 text-left">Dist.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-1.5 border-b border-[#415a77]/10 text-white font-mono">{row.station}</td>
                      <td className="p-1.5 border-b border-[#415a77]/10 text-slate-400">{row.formation}</td>
                      <td className="p-1.5 border-b border-[#415a77]/10 text-slate-300">{row.lithology}</td>
                      <td className="p-1.5 border-b border-[#415a77]/10 text-blue-400 font-mono">{row.bearing}</td>
                      <td className="p-1.5 border-b border-[#415a77]/10 text-orange-400 font-mono">{row.slopeAngle}</td>
                      <td className="p-1.5 border-b border-[#415a77]/10 text-emerald-400 font-mono">{row.slopeDistance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      } catch (e) {
        return <pre className="text-[10px] text-red-400">Error parsing measurement data.</pre>;
      }
    }
    return <pre className="text-[10px] text-slate-300 leading-relaxed break-words font-sans whitespace-pre-wrap">{entry.content}</pre>;
  };

  const LoadingOverlay = ({ section }: { section: string }) => (
    <div className="absolute inset-0 bg-[#0d1b2a]/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-xl animate-in fade-in duration-300">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-white">Analysing {section}...</span>
      <span className="text-[8px] text-slate-400 mt-1 uppercase tracking-tighter">Querying Orogenic Database</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-slate-200 flex flex-col relative overflow-x-hidden">
      <header className="px-8 py-6 border-b border-[#1b263b] bg-[#0d1b2a]/80 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Microscope className="w-10 h-10" style={{ color: palette.primary }} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Molasse Mentor</h1>
            <p className="text-sm font-medium uppercase tracking-[0.2em]" style={{ color: palette.primary }}>Advanced Analytical Suite</p>
          </div>
        </div>
        <button onClick={() => setShowPaletteMenu(!showPaletteMenu)} className="flex items-center gap-2 px-4 py-2 bg-[#1b263b] border border-[#415a77]/30 rounded-xl hover:border-white transition-all text-xs font-bold uppercase tracking-widest">
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">Viz Settings</span>
        </button>
        {showPaletteMenu && (
          <div className="absolute right-8 mt-3 w-64 bg-[#1b263b] border border-[#415a77]/50 rounded-2xl shadow-2xl p-4 z-[100] animate-in fade-in slide-in-from-top-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Scientific Schemes</div>
            <div className="grid grid-cols-1 gap-2">
              {PALETTES.map(p => (
                <button key={p.id} onClick={() => { setPalette(p); setShowPaletteMenu(false); }} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${palette.id === p.id ? 'bg-white/5 border border-white/20' : 'hover:bg-white/5 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.primary }} />
                    <span className="text-[11px] font-medium text-slate-200">{p.name}</span>
                  </div>
                  {palette.id === p.id && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 lg:p-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-[#1b263b]/40 border border-[#415a77]/30 rounded-2xl p-6 shadow-xl flex flex-col items-center">
            <h2 className="text-xs font-bold self-start mb-6 flex items-center gap-2 uppercase tracking-widest" style={{ color: palette.primary }}><BarChart3 className="w-4 h-4" /> Petrographic Plotter</h2>
            <TernaryDiagram composition={composition} onChange={handleTernaryChange} palette={palette} />
            <div className="w-full mt-8 space-y-4">
              {(['q', 'f', 'l'] as const).map((key) => (
                <div key={key} className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0d1b2a]/60 border border-[#415a77]/20">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-slate-300">{key === 'q' ? 'Quartz' : key === 'f' ? 'Feldspar' : 'Lithics'} (%)</span>
                    <input type="number" value={composition[key]} onChange={(e) => handleManualCompositionChange(key, parseInt(e.target.value) || 0)} className="w-14 bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-center text-[11px] font-bold focus:outline-none focus:border-white transition-colors" />
                  </div>
                  <input type="range" min="0" max="100" value={composition[key]} onChange={(e) => handleManualCompositionChange(key, parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-current" style={{ color: key === 'q' ? palette.primary : key === 'f' ? palette.secondary : palette.accent }} />
                </div>
              ))}
            </div>
            <button onClick={handleAnalyze} disabled={loading} className="mt-8 w-full py-4 rounded-xl font-extrabold text-white text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2" style={{ backgroundColor: palette.primary }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              {loading ? "Fingerprinting..." : "Analyze & Fingerprint Sample"}
            </button>
          </section>

          <section className="bg-[#1b263b]/40 border border-[#415a77]/30 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xs font-bold mb-6 flex items-center gap-2 uppercase tracking-widest" style={{ color: palette.primary }}><Globe className="w-4 h-4" /> Global Comparison</h2>
            <div className="space-y-4">
              {GLOBAL_REFERENCES.map(ref => (
                <div key={ref.id} className="p-3 bg-[#0d1b2a]/60 border border-[#415a77]/20 rounded-xl hover:border-white/20 transition-all cursor-default group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-[11px] font-bold text-white group-hover:text-blue-400 transition-colors">{ref.name}</h3>
                      <p className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">{ref.region}</p>
                    </div>
                    <div className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">CIA: {ref.typicalCIA}</div>
                  </div>
                  <div className="flex-grow grid grid-cols-3 gap-2">
                    {Object.entries(ref.typicalQFL).map(([key, val]) => (
                      <div key={key} className="text-center bg-[#1b263b]/50 p-1 rounded border border-[#415a77]/10">
                        <div className="text-[8px] text-slate-500 uppercase font-bold">{key}</div>
                        <div className="text-[10px] text-white font-bold">{(val as number)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#1b263b]/40 border border-[#415a77]/30 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xs font-bold mb-6 flex items-center gap-2 uppercase tracking-widest" style={{ color: palette.primary }}><Layers className="w-4 h-4" /> Laboratory Analytical Suite</h2>
            <div className="space-y-6">
              <div className="bg-[#0d1b2a]/60 rounded-xl border border-[#415a77]/20 overflow-hidden relative">
                {analyticalLoading.xrd && <LoadingOverlay section="XRD Diffraction" />}
                <div className="p-4 flex justify-between items-center border-b border-[#415a77]/20">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-blue-400"><Atom className="w-4 h-4" /> XRD Diffraction</h3>
                  <button onClick={() => xrdFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded-lg transition-all uppercase tracking-widest border border-blue-500/20">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Data
                  </button>
                  <input ref={xrdFileInputRef} type="file" className="hidden" onChange={handleXrdUpload} />
                </div>
                <div className="p-4">
                  {currentXrdPeaks.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {currentXrdPeaks.slice(0, 6).map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-[#1b263b]/50 rounded border border-[#415a77]/10 text-[10px]">
                          <span className="font-bold text-white">{p.mineral || 'Unidentified'}</span>
                          <span className="text-slate-500 font-mono">{p.twoTheta.toFixed(2)}°</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center py-4">Awaiting diffraction pattern analysis...</p>
                  )}
                </div>
              </div>

              <div className="bg-[#0d1b2a]/60 rounded-xl border border-[#415a77]/20 overflow-hidden relative">
                {analyticalLoading.xrf && <LoadingOverlay section="XRF Major Oxides" />}
                <div className="p-4 flex justify-between items-center border-b border-[#415a77]/20">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-yellow-400"><Beaker className="w-4 h-4" /> XRF Major Oxides</h3>
                  <button onClick={() => xrfFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-[9px] font-bold rounded-lg transition-all uppercase tracking-widest border border-yellow-500/20">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Oxides
                  </button>
                  <input ref={xrfFileInputRef} type="file" className="hidden" onChange={handleXrfUpload} />
                </div>
                <div className="p-4">
                  {majorOxides.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {majorOxides.slice(0, 6).map(([el, val]) => (
                          <div key={el} className="p-2 bg-[#1b263b]/50 rounded border border-[#415a77]/10 text-center">
                            <div className="text-[8px] text-slate-500 font-bold">{el}</div>
                            <div className="text-[11px] text-white font-mono font-bold">{(val as number).toFixed(2)}%</div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-yellow-400/5 rounded-lg border border-yellow-400/10 text-[10px] text-yellow-100/70 italic leading-relaxed">
                        {currentXrf?.interpretation}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center py-4">Awaiting major oxide concentrations...</p>
                  )}
                </div>
              </div>

              <div className="bg-[#0d1b2a]/60 rounded-xl border border-[#415a77]/20 overflow-hidden relative">
                {analyticalLoading.icpms && <LoadingOverlay section="ICP-MS Trace Elements" />}
                <div className="p-4 flex justify-between items-center border-b border-[#415a77]/20">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-emerald-400"><WaveIcon className="w-4 h-4" /> ICP-MS Trace Elements</h3>
                  <button onClick={() => icpMsFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-lg transition-all uppercase tracking-widest border border-emerald-500/20">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Traces
                  </button>
                  <input ref={icpMsFileInputRef} type="file" className="hidden" onChange={handleIcpMsUpload} />
                </div>
                <div className="p-4">
                  {icpMsSummary ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-[#1b263b]/50 rounded border border-[#415a77]/10">
                          <div className="text-[9px] text-slate-500 font-bold uppercase mb-2">Key Ratios</div>
                          <div className="flex justify-between mb-1 text-[10px]"><span className="text-slate-400">Th/Sc:</span><span className="text-white font-mono font-bold">{icpMsSummary.ratios.ThSc}</span></div>
                          <div className="flex justify-between text-[10px]"><span className="text-slate-400">La/Yb:</span><span className="text-white font-mono font-bold">{icpMsSummary.ratios.LaYb}</span></div>
                        </div>
                        <div className="p-3 bg-[#1b263b]/50 rounded border border-[#415a77]/10 overflow-hidden">
                          <div className="text-[9px] text-slate-500 font-bold uppercase mb-2">REE Detected</div>
                          <div className="flex flex-wrap gap-1">
                            {icpMsSummary.reeFound.map(([el]) => <span key={el} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] rounded border border-emerald-500/20">{el}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-400/5 rounded-lg border border-emerald-400/10 text-[10px] text-emerald-100/70 italic leading-relaxed">
                        {currentIcpMs?.reePattern}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center py-4">Awaiting trace element and REE data...</p>
                  )}
                </div>
              </div>

              <div className="bg-[#0d1b2a]/60 rounded-xl border border-[#415a77]/20 overflow-hidden relative">
                {analyticalLoading.petro && <LoadingOverlay section="Petrographic Microscopy" />}
                <div className="p-4 flex justify-between items-center border-b border-[#415a77]/20">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-orange-400"><Microscope className="w-4 h-4" /> Petrographic Microscopy</h3>
                  <button onClick={() => petroFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[9px] font-bold rounded-lg transition-all uppercase tracking-widest border border-orange-500/20">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Thin Section
                  </button>
                  <input ref={petroFileInputRef} type="file" className="hidden" onChange={handlePetroUpload} />
                </div>
                <div className="p-4">
                  {currentPetro ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-[#1b263b]/50 rounded border border-[#415a77]/10">
                          <div className="text-[8px] text-slate-500 font-bold">Grain Size</div>
                          <div className="text-[10px] text-white font-bold">{currentPetro.grainSize}</div>
                        </div>
                        <div className="p-2 bg-[#1b263b]/50 rounded border border-[#415a77]/10">
                          <div className="text-[8px] text-slate-500 font-bold">Cement</div>
                          <div className="text-[10px] text-white font-bold">{currentPetro.cementType}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-orange-400/5 rounded-lg border border-orange-400/10 text-[10px] text-orange-100/70 italic leading-relaxed">
                        {currentPetro.description}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic text-center py-4">Awaiting microscopic petrography data...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <section className="bg-[#1b263b]/40 border border-[#415a77]/30 rounded-2xl p-6 shadow-xl h-[500px] flex flex-col relative">
            {analyticalLoading.dta && <LoadingOverlay section="Thermal DTA Analysis" />}
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest" style={{ color: palette.primary }}><TrendingUp className="w-4 h-4" /> Stratigraphic Trends</h2>
               <div className="flex gap-2">
                 <button onClick={() => dtaFileInputRef.current?.click()} className="px-2 py-1.5 bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg text-[9px] font-bold flex items-center gap-1.5 hover:border-orange-500/50 transition-colors uppercase tracking-wider">
                   <Zap className="w-3 h-3 text-orange-400" />
                   DTA Scan
                 </button>
                 <input ref={dtaFileInputRef} type="file" className="hidden" onChange={handleDtaUpload} />
               </div>
            </div>
            <div className="flex-grow">
               <GeochemicalChart data={sampleHistory} currentDtaCurve={currentDtaCurve} currentDtaPeaks={currentDtaPeaks} palette={palette} />
            </div>
          </section>
        </div>

        <aside className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <div className="h-[400px] bg-[#162a3d] border border-[#415a77]/30 rounded-2xl flex flex-col overflow-hidden shadow-2xl shrink-0">
            <div className="p-4 border-b border-[#415a77]/20 bg-[#1b263b] flex items-center gap-2">
              <FlaskConical className="w-4 h-4" style={{ color: palette.primary }} />
              <h2 className="text-[10px] font-bold uppercase tracking-widest">AI Analytical Mentor</h2>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4 no-scrollbar">
              {chatHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30">
                  <Send className="w-8 h-8 mb-4" />
                  <p className="text-[10px] uppercase font-bold tracking-widest leading-loose">Awaiting analytical inquiries regarding basin evolution...</p>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-white' : 'bg-[#1b263b] border border-[#415a77]/30 text-slate-200 shadow-lg'}`} style={{ backgroundColor: msg.role === 'user' ? palette.primary : undefined }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 bg-[#1b263b]/50 border-t border-[#415a77]/20">
              <div className="relative flex items-center gap-2">
                <button onClick={() => chatFileInputRef.current?.click()} className="p-2.5 bg-[#0d1b2a] border border-[#415a77]/30 rounded-xl hover:border-white transition-colors">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                </button>
                <input ref={chatFileInputRef} type="file" multiple className="hidden" />
                <div className="relative flex-grow">
                  <input type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChat()} placeholder="Inquire about orogeny..." className="w-full bg-[#0d1b2a] border border-[#415a77]/30 rounded-xl px-4 py-3 text-[11px] focus:outline-none focus:border-white transition-colors placeholder:text-slate-600" />
                  <button onClick={handleChat} className="absolute right-2 top-2 p-1.5 rounded-lg transition-transform active:scale-90" style={{ backgroundColor: palette.primary }}>
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <section className="flex-grow bg-[#1b263b]/40 border border-[#415a77]/30 rounded-2xl flex flex-col overflow-hidden shadow-xl min-h-[550px]">
            <div className="p-4 border-b border-[#415a77]/20 bg-[#1b263b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Research Notebook</h2>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setNotebookMode(notebookMode === 'field' ? 'text' : 'field')} className={`p-1.5 rounded-lg border transition-all ${notebookMode === 'field' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-[#415a77]/30 text-slate-500'}`} title="Field Log"><ListPlus className="w-3 h-3" /></button>
                <button onClick={() => setNotebookMode(notebookMode === 'measurement' ? 'text' : 'measurement')} className={`p-1.5 rounded-lg border transition-all ${notebookMode === 'measurement' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-[#415a77]/30 text-slate-500'}`} title="Section Measurement"><TableIcon className="w-3 h-3" /></button>
                <button onClick={() => setNotebookMode(notebookMode === 'lab' ? 'text' : 'lab')} className={`p-1.5 rounded-lg border transition-all ${notebookMode === 'lab' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'border-[#415a77]/30 text-slate-500'}`} title="Lab Setup"><LayersIcon className="w-3 h-3" /></button>
              </div>
            </div>
            
            <div className="p-4 border-b border-[#415a77]/10 bg-[#0d1b2a]/30">
              {notebookMode === 'field' && (
                <div className="grid grid-cols-2 gap-2 mb-3 animate-in fade-in slide-in-from-top-2">
                  {[
                    { id: 'lithology', label: 'Lithology', placeholder: 'Arkose' },
                    { id: 'colour', label: 'Colour', placeholder: 'Red' },
                    { id: 'texture', label: 'Texture', placeholder: 'Coarse' },
                    { id: 'structures', label: 'Sed. Structures', placeholder: 'X-Bed' },
                    { id: 'fossils', label: 'Fossils', placeholder: 'Plants' },
                    { id: 'contacts', label: 'Contacts', placeholder: 'Sharp' },
                    { id: 'thickness', label: 'Thickness', placeholder: '1.2m' },
                    { id: 'age', label: 'Age', placeholder: 'Miocene' }
                  ].map(field => (
                    <div key={field.id} className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase tracking-tighter text-emerald-500/80">{field.label}</label>
                      <input type="text" value={(fieldForm as any)[field.id]} onChange={(e) => setFieldForm(prev => ({ ...prev, [field.id]: e.target.value }))} placeholder={field.placeholder} className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-[9px] focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-slate-700" />
                    </div>
                  ))}
                </div>
              )}

              {notebookMode === 'measurement' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold uppercase tracking-tighter text-blue-500/80">Type Locality</label>
                    <input type="text" value={typeLocality} onChange={(e) => setTypeLocality(e.target.value)} placeholder="e.g. Swat Valley Basin" className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-2 text-[9px] focus:outline-none focus:border-blue-500/50 transition-colors" />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 no-scrollbar border-y border-[#415a77]/10 py-2">
                    {measurementRows.map((row, idx) => (
                      <div key={idx} className="bg-[#0d1b2a]/50 p-2 rounded-lg border border-[#415a77]/10 relative group/row">
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.keys(row) as (keyof MeasurementRow)[]).map(key => (
                            <div key={key} className="flex flex-col gap-0.5">
                              <label className="text-[7px] uppercase font-bold text-slate-600">{key}</label>
                              <input type="text" value={row[key]} onChange={(e) => updateMeasurementRow(idx, key, e.target.value)} className="bg-transparent border-b border-[#415a77]/20 text-[9px] focus:border-blue-500/50 focus:outline-none py-0.5 text-slate-300" />
                            </div>
                          ))}
                        </div>
                        {measurementRows.length > 1 && (
                          <button onClick={() => removeMeasurementRow(idx)} className="absolute -right-1 -top-1 p-0.5 bg-red-500/20 text-red-400 rounded-md opacity-0 group-hover/row:opacity-100 transition-all"><X className="w-2.5 h-2.5" /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={addMeasurementRow} className="w-full py-1.5 border border-dashed border-blue-500/30 rounded-lg text-[8px] font-bold text-blue-400/60 hover:text-blue-400 hover:border-blue-500/50 transition-all flex items-center justify-center gap-1.5"><Plus className="w-3 h-3" /> Add Row</button>
                  </div>
                </div>
              )}

              {notebookMode === 'lab' && (
                <div className="space-y-4 mb-3 animate-in fade-in slide-in-from-top-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase tracking-tighter text-blue-400">Quartz Variety</label>
                      <input type="text" value={labForm.quartz} onChange={(e) => setLabForm(prev => ({ ...prev, quartz: e.target.value }))} placeholder="Mono, Poly..." className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-[9px] focus:border-blue-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase tracking-tighter text-yellow-400">Feldspar Group</label>
                      <input type="text" value={labForm.feldspar} onChange={(e) => setLabForm(prev => ({ ...prev, feldspar: e.target.value }))} placeholder="Or/Mc/Ab/An/Per..." className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-[9px] focus:border-yellow-400" />
                    </div>
                  </div>

                  <div className="space-y-2 p-2 bg-slate-900/40 rounded-lg border border-[#415a77]/20">
                    <div className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">Rock Fragments (Lithics)</div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[7px] font-bold uppercase text-red-400/80">Igneous</label>
                        <input type="text" value={labForm.igneousLF} onChange={(e) => setLabForm(prev => ({ ...prev, igneousLF: e.target.value }))} placeholder="Basalt, Rhyolite, Granite..." className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-[9px]" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[7px] font-bold uppercase text-emerald-400/80">Metamorphic</label>
                        <input type="text" value={labForm.metamorphicLF} onChange={(e) => setLabForm(prev => ({ ...prev, metamorphicLF: e.target.value }))} placeholder="Slate, Schist, Gneiss, Marble..." className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-[9px]" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[7px] font-bold uppercase text-orange-400/80">Sedimentary</label>
                        <input type="text" value={labForm.sedimentaryLF} onChange={(e) => setLabForm(prev => ({ ...prev, sedimentaryLF: e.target.value }))} placeholder="Bioclasts, Chert, Lst, Dol..." className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-[9px]" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">Accessory</label>
                      <input type="text" value={labForm.accessoryMinerals} onChange={(e) => setLabForm(prev => ({ ...prev, accessoryMinerals: e.target.value }))} placeholder="Zircon, Tourmaline..." className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-[9px]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">Cement/Matrix</label>
                      <input type="text" value={labForm.cements} onChange={(e) => setLabForm(prev => ({ ...prev, cements: e.target.value }))} placeholder="Calcite, Silt..." className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-1.5 text-[9px]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold uppercase tracking-tighter text-orange-500/80">Microscopy Notes</label>
                    <textarea value={labForm.photomicrograph} onChange={(e) => setLabForm(prev => ({ ...prev, photomicrograph: e.target.value }))} placeholder="General thin section description..." className="bg-[#0d1b2a] border border-[#415a77]/30 rounded-lg p-2 text-[9px] focus:outline-none focus:border-orange-500/50 transition-colors h-16 resize-none" />
                  </div>
                </div>
              )}

              {notebookMode === 'text' && (
                <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Log quick observation..." className="w-full h-20 bg-[#0d1b2a] border border-[#415a77]/30 rounded-xl p-3 text-[11px] focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-slate-600 resize-none" />
              )}
              
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleAddNote(notebookMode === 'text' ? 'field' : notebookMode)} className={`flex-1 py-2 text-[9px] font-bold rounded-lg transition-all uppercase tracking-widest border flex items-center justify-center gap-1.5 ${notebookMode === 'measurement' ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20' : notebookMode === 'lab' ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'}`}>
                  {notebookMode === 'measurement' ? <TableIcon className="w-3 h-3" /> : notebookMode === 'lab' ? <Sparkles className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  Save {notebookMode === 'measurement' ? 'Section' : notebookMode === 'lab' ? 'Lab Insight' : notebookMode === 'field' ? 'Field Log' : 'Note'}
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3 no-scrollbar">
              {notebookEntries.length === 0 ? (
                <div className="text-[9px] text-slate-600 text-center italic py-12 px-6">Awaiting stratigraphic and lab logs. Document your analysis.</div>
              ) : (
                notebookEntries.map(entry => (
                  <div key={entry.id} className="bg-[#0d1b2a]/60 border border-[#415a77]/20 rounded-xl p-3 relative group">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-tighter ${entry.type === 'field' ? 'text-emerald-400' : entry.type === 'measurement' ? 'text-blue-400' : entry.type === 'lab' ? 'text-orange-400' : 'text-slate-400'}`}>
                        {entry.type === 'field' ? <Mountain className="w-2.5 h-2.5" /> : entry.type === 'measurement' ? <Ruler className="w-2.5 h-2.5" /> : entry.type === 'lab' ? <Beaker className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                        {entry.type === 'field' ? 'Field Obs' : entry.type === 'measurement' ? 'Section' : entry.type === 'lab' ? 'Lab Insight' : 'Note'}
                      </div>
                      <span className="text-[8px] text-slate-500 font-mono">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {renderNotebookEntry(entry)}
                    <button onClick={() => deleteNote(entry.id)} className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-[#1b263b]/40 border border-[#415a77]/30 rounded-2xl p-6 shadow-xl shrink-0">
            <h2 className="text-xs font-bold mb-4 flex items-center gap-2 uppercase tracking-widest" style={{ color: palette.primary }}><Sun className="w-4 h-4" /> Climate Indicators</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center" title="Feldspar loss / Clay formation">
                <CloudRain className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <div className="text-[8px] font-bold text-blue-300 uppercase">Humid</div>
              </div>
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center" title="Mineral preservation">
                <Wind className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <div className="text-[8px] font-bold text-yellow-300 uppercase">Arid</div>
              </div>
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center" title="Balanced composition">
                <ThermometerSnowflake className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <div className="text-[8px] font-bold text-emerald-300 uppercase">Temp</div>
              </div>
            </div>
          </section>
        </aside>
      </main>

      <footer className="px-8 py-4 border-t border-[#1b263b] bg-[#0d1b2a] flex flex-col md:flex-row justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest font-bold gap-4 w-full">
        <div className="flex items-center gap-3">
          <Database className="w-3.5 h-3.5 text-[#415a77]" />
          <span className="text-slate-400">Molasse Mentor Analytical Suite <span className="text-[7px] bg-[#1b263b] px-1 rounded ml-1">v2.8.5</span></span>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-slate-300">Expert App Developer: <span className="text-white font-extrabold">Muhammad Yasin Khan</span></span>
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
            <span className="text-[8px] tracking-[0.2em] font-medium text-slate-500">Powered by: <span className="text-emerald-400">Google Gemini 3 Flash Preview</span></span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"><FileText className="w-2.5 h-2.5" /> Protocols</span>
          <span className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"><Info className="w-2.5 h-2.5" /> Data Ethics</span>
          <span className="text-slate-700 font-mono">© 2025 Geoscience Analytics</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
