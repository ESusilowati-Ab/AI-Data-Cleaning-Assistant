export type CellValue = string | number | boolean | Date | null;

export type DataRow = Record<string, CellValue>;

export type ColumnType = "number" | "string" | "boolean" | "date" | "mixed";

export interface SheetData {
  name: string;
  columns: string[];
  rows: DataRow[];
  rowCount: number;
  columnCount: number;
}

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  uniquePercent: number;
  duplicateCount: number;
  // numeric stats
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q1?: number;
  q3?: number;
  // categorical stats
  topValues?: { value: CellValue; count: number }[];
  // sample values
  sample: CellValue[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  totalCells: number;
  missingCells: number;
  missingPercent: number;
  duplicateRows: number;
  duplicatePercent: number;
  memoryUsage: string;
  columns: ColumnProfile[];
}

export interface SummaryStats {
  numeric: {
    column: string;
    count: number;
    mean: number;
    std: number;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  }[];
  categorical: {
    column: string;
    count: number;
    unique: number;
    top: string;
    topFreq: number;
  }[];
}

export interface ChartConfig {
  type: "line" | "bar" | "pie" | "histogram" | "scatter" | "heatmap";
  title: string;
  data: PlotlyData[];
  layout?: Partial<PlotlyLayout>;
}

export interface PlotlyData {
  x?: any[];
  y?: any[];
  z?: any[][];
  type?: string;
  mode?: string;
  name?: string;
  marker?: any;
  line?: any;
  text?: any[];
  values?: any[];
  labels?: any[];
  hovertemplate?: string;
  colorscale?: string;
  showscale?: boolean;
  zmin?: number;
  zmax?: number;
  fill?: string;
  fillcolor?: string;
  [key: string]: any;
}

export interface PlotlyLayout {
  title?: any;
  xaxis?: any;
  yaxis?: any;
  margin?: any;
  paper_bgcolor?: string;
  plot_bgcolor?: string;
  font?: any;
  showlegend?: boolean;
  legend?: any;
  annotations?: any[];
  width?: number;
  height?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  chart?: ChartConfig;
}

export interface CleaningOperation {
  id: string;
  type:
    | "removeDuplicates"
    | "fillMissing"
    | "convertType"
    | "trimWhitespace"
    | "standardizeText";
  column?: string;
  value?: string;
  targetType?: ColumnType;
  label: string;
}

export interface RegressionResult {
  column: string;
  target: string;
  slope: number;
  intercept: number;
  rSquared: number;
  predictions: { x: number; y: number; yHat: number }[];
}

export interface ForecastResult {
  column: string;
  historical: { index: number; value: number }[];
  forecast: { index: number; value: number; lower: number; upper: number }[];
  method: string;
}

export type ViewType =
  | "upload"
  | "preview"
  | "profile"
  | "dashboard"
  | "cleaning"
  | "analysis"
  | "chat"
  | "export";
