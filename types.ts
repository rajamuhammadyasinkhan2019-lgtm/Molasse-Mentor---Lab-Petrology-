
export interface MineralComposition {
  q: number;
  f: number;
  l: number;
}

export interface DtaPoint {
  temperature: number;
  value: number;
}

export interface DtaPeak {
  temperature: number;
  value: number;
  type: 'endothermic' | 'exothermic';
  mineralInterpretation?: string;
}

export interface XrdPeak {
  twoTheta: number;
  intensity: number;
  mineral?: string;
}

export interface XrfData {
  elements: Record<string, number>; // e.g., { "SiO2": 65.4, "Al2O3": 14.2 }
  interpretation?: string;
}

export interface IcpMsData {
  traceElements: Record<string, number>; // e.g., { "La": 30, "Ce": 60 }
  reePattern?: string;
  interpretation?: string;
}

export interface PetrographyData {
  grainSize: string;
  sorting: string;
  rounding: string;
  matrixPercent: number;
  cementType: string;
  description: string;
}

export interface AnalysisResult {
  provenance: string;
  paleoclimate: string;
  geochemicalIndices: {
    cia: number;
    thSc: number;
  };
  interpretation: string;
}

export interface MeasurementRow {
  station: string;
  formation: string;
  lithology: string;
  bearing: string;
  slopeAngle: string;
  slopeDistance: string;
}

export interface SectionMeasurement {
  typeLocality: string;
  rows: MeasurementRow[];
}

export interface NotebookEntry {
  id: string;
  type: 'field' | 'lab' | 'measurement';
  content: string; // Can be raw text or JSON string for structured data
  timestamp: number;
}

export interface SampleRecord extends AnalysisResult {
  id: string;
  name: string;
  composition: MineralComposition;
  timestamp: number;
  dtaCurve?: DtaPoint[];
  dtaPeaks?: DtaPeak[];
  xrdPeaks?: XrdPeak[];
  xrf?: XrfData;
  icpMs?: IcpMsData;
  petrography?: PetrographyData;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ReferenceMolasse {
  id: string;
  name: string;
  region: string;
  age: string;
  tectonicSetting: string;
  typicalQFL: MineralComposition;
  typicalCIA: string;
  description: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bgSecondary: string;
  border: string;
  text: string;
}
