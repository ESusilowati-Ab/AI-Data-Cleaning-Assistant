import type {
  CellValue,
  ColumnProfile,
  ColumnType,
  DataRow,
  DatasetProfile,
  SheetData,
  SummaryStats,
  RegressionResult,
  ForecastResult,
  ChartConfig,
} from "../types";

export function parseWorkbook(file: File): Promise<SheetData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX: any = await import("xlsx");
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheets: SheetData[] = workbook.SheetNames.map((name: string) => {
          const sheet = workbook.Sheets[name];
          const json: Record<string, CellValue>[] = XLSX.utils.sheet_to_json(
            sheet,
            {
              defval: null,
              raw: true,
            },
          );
          const columns = json.length > 0 ? Object.keys(json[0]) : [];
          return {
            name,
            columns,
            rows: json,
            rowCount: json.length,
            columnCount: columns.length,
          };
        });
        resolve(sheets);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export function inferColumnType(values: CellValue[]): ColumnType {
  let numCount = 0;
  let strCount = 0;
  let boolCount = 0;
  let dateCount = 0;
  let nonNull = 0;
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    nonNull++;
    if (typeof v === "number" && !Number.isNaN(v)) numCount++;
    else if (typeof v === "boolean") boolCount++;
    else if (typeof v === "string") {
      const trimmed = v.trim();
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) numCount++;
      else if (/^(true|false)$/i.test(trimmed)) boolCount++;
      else if (isDateString(trimmed)) dateCount++;
      else strCount++;
    } else if (v instanceof Date) {
      dateCount++;
    }
  }
  if (nonNull === 0) return "string";
  if (numCount / nonNull > 0.8) return "number";
  if (boolCount / nonNull > 0.8) return "boolean";
  if (dateCount / nonNull > 0.8) return "date";
  if (strCount > 0 && numCount > 0) return "mixed";
  return "string";
}

function isDateString(s: string): boolean {
  if (!/\d{4}|\d{1,2}[/-]\d{1,2}/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime()) && s.length >= 6;
}

export function toNumber(v: CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function getNumericValues(rows: DataRow[], col: string): number[] {
  const vals: number[] = [];
  for (const r of rows) {
    const n = toNumber(r[col]);
    if (n !== null) vals.push(n);
  }
  return vals;
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function mode(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const freq = new Map<number, number>();
  for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
  let maxFreq = 0;
  freq.forEach((f) => (maxFreq = Math.max(maxFreq, f)));
  if (maxFreq <= 1) return [];
  const modes: number[] = [];
  freq.forEach((f, v) => {
    if (f === maxFreq) modes.push(v);
  });
  return modes;
}

export function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance =
    arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

export function linearRegression(
  x: number[],
  y: number[],
): { slope: number; intercept: number; rSquared: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const rSquared = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, rSquared };
}

export function profileSheet(sheet: SheetData): DatasetProfile {
  const { rows, columns } = sheet;
  const totalCells = rows.length * columns.length;
  let missingCells = 0;
  const columnProfiles: ColumnProfile[] = columns.map((col) => {
    const values = rows.map((r) => r[col]);
    const missing = values.filter(
      (v) => v === null || v === undefined || v === "",
    ).length;
    missingCells += missing;
    const nonNull = values.filter(
      (v) => v !== null && v !== undefined && v !== "",
    );
    const uniqueSet = new Set(nonNull.map((v) => String(v)));
    const type = inferColumnType(values);
    const profile: ColumnProfile = {
      name: col,
      type,
      missingCount: missing,
      missingPercent: (missing / rows.length) * 100,
      uniqueCount: uniqueSet.size,
      uniquePercent: (uniqueSet.size / rows.length) * 100,
      duplicateCount: rows.length - uniqueSet.size - missing,
      sample: nonNull.slice(0, 5),
    };
    if (type === "number" || type === "mixed") {
      const nums = getNumericValues(rows, col);
      if (nums.length > 0) {
        profile.min = Math.min(...nums);
        profile.max = Math.max(...nums);
        profile.mean = mean(nums);
        profile.median = median(nums);
        profile.std = std(nums);
        profile.q1 = quantile(nums, 0.25);
        profile.q3 = quantile(nums, 0.75);
      }
    } else {
      const freq = new Map<string, number>();
      nonNull.forEach((v) => {
        const k = String(v);
        freq.set(k, (freq.get(k) || 0) + 1);
      });
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      profile.topValues = sorted.slice(0, 5).map(([value, count]) => ({
        value,
        count,
      }));
    }
    return profile;
  });

  // duplicate rows
  const seen = new Set<string>();
  let dupRows = 0;
  for (const r of rows) {
    const key = JSON.stringify(columns.map((c) => r[c]));
    if (seen.has(key)) dupRows++;
    else seen.add(key);
  }

  return {
    rowCount: rows.length,
    columnCount: columns.length,
    totalCells,
    missingCells,
    missingPercent: totalCells > 0 ? (missingCells / totalCells) * 100 : 0,
    duplicateRows: dupRows,
    duplicatePercent: rows.length > 0 ? (dupRows / rows.length) * 100 : 0,
    memoryUsage: formatBytes(estimateMemory(sheet)),
    columns: columnProfiles,
  };
}

function estimateMemory(sheet: SheetData): number {
  let bytes = 0;
  for (const row of sheet.rows) {
    for (const col of sheet.columns) {
      const v = row[col];
      if (typeof v === "string") bytes += v.length * 2;
      else if (typeof v === "number") bytes += 8;
      else bytes += 4;
    }
  }
  return bytes;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function summaryStats(sheet: SheetData): SummaryStats {
  const numeric: SummaryStats["numeric"] = [];
  const categorical: SummaryStats["categorical"] = [];
  for (const col of sheet.columns) {
    const values = sheet.rows.map((r) => r[col]);
    const type = inferColumnType(values);
    if (type === "number" || type === "mixed") {
      const nums = getNumericValues(sheet.rows, col);
      if (nums.length > 0) {
        numeric.push({
          column: col,
          count: nums.length,
          mean: mean(nums),
          std: std(nums),
          min: Math.min(...nums),
          q1: quantile(nums, 0.25),
          median: median(nums),
          q3: quantile(nums, 0.75),
          max: Math.max(...nums),
        });
      }
    } else {
      const nonNull = values.filter(
        (v) => v !== null && v !== undefined && v !== "",
      );
      const freq = new Map<string, number>();
      nonNull.forEach((v) =>
        freq.set(String(v), (freq.get(String(v)) || 0) + 1),
      );
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      categorical.push({
        column: col,
        count: nonNull.length,
        unique: freq.size,
        top: sorted[0]?.[0] ?? "N/A",
        topFreq: sorted[0]?.[1] ?? 0,
      });
    }
  }
  return { numeric, categorical };
}

export function removeDuplicates(sheet: SheetData): SheetData {
  const seen = new Set<string>();
  const rows: DataRow[] = [];
  for (const r of sheet.rows) {
    const key = JSON.stringify(sheet.columns.map((c) => r[c]));
    if (!seen.has(key)) {
      seen.add(key);
      rows.push(r);
    }
  }
  return { ...sheet, rows, rowCount: rows.length };
}

export function fillMissing(
  sheet: SheetData,
  column: string,
  strategy: "mean" | "median" | "mode" | "zero" | "ffill" | "custom",
  customValue?: string,
): SheetData {
  const rows = sheet.rows.map((r) => ({ ...r }));
  let fillValue: CellValue = null;
  if (strategy === "mean") {
    const nums = getNumericValues(sheet.rows, column);
    fillValue = nums.length > 0 ? Number(mean(nums).toFixed(4)) : 0;
  } else if (strategy === "median") {
    const nums = getNumericValues(sheet.rows, column);
    fillValue = nums.length > 0 ? Number(median(nums).toFixed(4)) : 0;
  } else if (strategy === "mode") {
    const nums = getNumericValues(sheet.rows, column);
    const modes = mode(nums);
    fillValue = modes.length > 0 ? modes[0] : 0;
  } else if (strategy === "zero") {
    fillValue = 0;
  } else if (strategy === "custom") {
    fillValue = customValue ?? "";
  }
  if (strategy === "ffill") {
    let last: CellValue = null;
    for (const r of rows) {
      const v = r[column];
      if (v === null || v === undefined || v === "") {
        r[column] = last;
      } else {
        last = v;
      }
    }
  } else {
    for (const r of rows) {
      if (r[column] === null || r[column] === undefined || r[column] === "") {
        r[column] = fillValue;
      }
    }
  }
  return { ...sheet, rows };
}

export function convertType(
  sheet: SheetData,
  column: string,
  targetType: ColumnType,
): SheetData {
  const rows = sheet.rows.map((r) => {
    const newRow = { ...r };
    const v = r[column];
    if (v === null || v === undefined || v === "") return newRow;
    if (targetType === "number") {
      const n = Number(v);
      newRow[column] = isNaN(n) ? v : n;
    } else if (targetType === "string") {
      newRow[column] = String(v);
    } else if (targetType === "boolean") {
      if (typeof v === "string") {
        newRow[column] = /^(true|yes|1)$/i.test(v.trim());
      } else if (typeof v === "number") {
        newRow[column] = v !== 0;
      }
    } else if (targetType === "date") {
      const d = new Date(String(v));
      newRow[column] = isNaN(d.getTime()) ? v : d;
    }
    return newRow;
  });
  return { ...sheet, rows };
}

export function trimWhitespace(sheet: SheetData, column?: string): SheetData {
  const rows = sheet.rows.map((r) => {
    const newRow = { ...r };
    const cols = column ? [column] : sheet.columns;
    for (const c of cols) {
      if (typeof newRow[c] === "string") {
        newRow[c] = (newRow[c] as string).trim();
      }
    }
    return newRow;
  });
  return { ...sheet, rows };
}

export function standardizeText(
  sheet: SheetData,
  column: string,
  operation: "lower" | "upper" | "title" | "strip",
): SheetData {
  const rows = sheet.rows.map((r) => {
    const newRow = { ...r };
    const v = r[column];
    if (typeof v === "string") {
      if (operation === "lower") newRow[column] = v.toLowerCase();
      else if (operation === "upper") newRow[column] = v.toUpperCase();
      else if (operation === "title")
        newRow[column] = v.replace(
          /\w\S*/g,
          (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(),
        );
      else if (operation === "strip")
        newRow[column] = v.replace(/\s+/g, " ").trim();
    }
    return newRow;
  });
  return { ...sheet, rows };
}

export function correlationMatrix(sheet: SheetData): {
  columns: string[];
  matrix: number[][];
} {
  const numericCols = sheet.columns.filter((c) => {
    const vals = sheet.rows.map((r) => r[c]);
    return (
      inferColumnType(vals) === "number" || inferColumnType(vals) === "mixed"
    );
  });
  const colData: Record<string, number[]> = {};
  for (const c of numericCols) colData[c] = getNumericValues(sheet.rows, c);
  // align lengths
  const minLen = Math.min(...numericCols.map((c) => colData[c].length));
  const matrix: number[][] = [];
  for (let i = 0; i < numericCols.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < numericCols.length; j++) {
      if (i === j) row.push(1);
      else {
        const xi = colData[numericCols[i]].slice(0, minLen);
        const xj = colData[numericCols[j]].slice(0, minLen);
        row.push(Number(correlation(xi, xj).toFixed(4)));
      }
    }
    matrix.push(row);
  }
  return { columns: numericCols, matrix };
}

export function performRegression(
  sheet: SheetData,
  xCol: string,
  yCol: string,
): RegressionResult {
  const x = getNumericValues(sheet.rows, xCol);
  const y = getNumericValues(sheet.rows, yCol);
  const n = Math.min(x.length, y.length);
  const { slope, intercept, rSquared } = linearRegression(x, y);
  const predictions = [];
  for (let i = 0; i < n; i++) {
    predictions.push({
      x: x[i],
      y: y[i],
      yHat: slope * x[i] + intercept,
    });
  }
  return {
    column: xCol,
    target: yCol,
    slope,
    intercept,
    rSquared,
    predictions,
  };
}

export function forecast(
  sheet: SheetData,
  column: string,
  periods: number = 5,
): ForecastResult {
  const nums = getNumericValues(sheet.rows, column);
  const historical = nums.map((v, i) => ({ index: i, value: v }));
  // simple linear trend forecast
  const x = nums.map((_, i) => i);
  const { slope, intercept } = linearRegression(x, nums);
  const residuals = nums.map((v, i) => v - (slope * i + intercept));
  const residStd = std(residuals);
  const forecast = [];
  const startIdx = nums.length;
  for (let i = 0; i < periods; i++) {
    const idx = startIdx + i;
    const value = slope * idx + intercept;
    forecast.push({
      index: idx,
      value: Number(value.toFixed(4)),
      lower: Number((value - 1.96 * residStd).toFixed(4)),
      upper: Number((value + 1.96 * residStd).toFixed(4)),
    });
  }
  return {
    column,
    historical,
    forecast,
    method: "Linear Trend (OLS)",
  };
}

export function generateDashboard(sheet: SheetData): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const numericCols = sheet.columns.filter((c) => {
    const vals = sheet.rows.map((r) => r[c]);
    return (
      inferColumnType(vals) === "number" || inferColumnType(vals) === "mixed"
    );
  });
  const categoricalCols = sheet.columns.filter((c) => {
    const vals = sheet.rows.map((r) => r[c]);
    const t = inferColumnType(vals);
    return t === "string" || t === "boolean";
  });

  // Correlation heatmap
  if (numericCols.length >= 2) {
    const { columns, matrix } = correlationMatrix(sheet);
    if (columns.length >= 2) {
      charts.push({
        type: "heatmap",
        title: "Correlation Heatmap",
        data: [
          {
            z: matrix,
            x: columns,
            y: columns,
            type: "heatmap",
            colorscale: "RdBu",
            zmin: -1,
            zmax: 1,
            showscale: true,
          },
        ],
      });
    }
  }

  // Histograms for numeric columns (up to 3)
  for (const col of numericCols.slice(0, 3)) {
    const nums = getNumericValues(sheet.rows, col);
    if (nums.length === 0) continue;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const binCount = Math.min(20, Math.ceil(Math.sqrt(nums.length)));
    const binSize = (max - min) / binCount || 1;
    const bins = new Array(binCount).fill(0);
    for (const n of nums) {
      let idx = Math.floor((n - min) / binSize);
      if (idx >= binCount) idx = binCount - 1;
      if (idx < 0) idx = 0;
      bins[idx]++;
    }
    const binLabels = bins.map((_, i) =>
      Number((min + i * binSize).toFixed(2)),
    );
    charts.push({
      type: "histogram",
      title: `Distribution: ${col}`,
      data: [
        {
          x: binLabels,
          y: bins,
          type: "bar",
          marker: { color: "#3b82f6" },
        },
      ],
    });
  }

  // Bar charts for categorical columns (up to 2)
  for (const col of categoricalCols.slice(0, 2)) {
    const freq = new Map<string, number>();
    for (const r of sheet.rows) {
      const v = r[col];
      if (v === null || v === undefined || v === "") continue;
      const k = String(v);
      freq.set(k, (freq.get(k) || 0) + 1);
    }
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    charts.push({
      type: "bar",
      title: `Count by ${col}`,
      data: [
        {
          x: sorted.map((s) => s[0]),
          y: sorted.map((s) => s[1]),
          type: "bar",
          marker: { color: "#10b981" },
        },
      ],
    });
  }

  // Pie chart for a categorical column (top 1)
  if (categoricalCols.length > 0) {
    const col = categoricalCols[0];
    const freq = new Map<string, number>();
    for (const r of sheet.rows) {
      const v = r[col];
      if (v === null || v === undefined || v === "") continue;
      const k = String(v);
      freq.set(k, (freq.get(k) || 0) + 1);
    }
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    charts.push({
      type: "pie",
      title: `Share of ${col}`,
      data: [
        {
          labels: sorted.map((s) => s[0]),
          values: sorted.map((s) => s[1]),
          type: "pie",
        },
      ],
    });
  }

  // Line chart for first numeric column (trend)
  if (numericCols.length > 0) {
    const col = numericCols[0];
    const nums = getNumericValues(sheet.rows, col);
    charts.push({
      type: "line",
      title: `Trend: ${col}`,
      data: [
        {
          x: nums.map((_, i) => i),
          y: nums,
          type: "scatter",
          mode: "lines",
          line: { color: "#f59e0b", width: 2 },
        },
      ],
    });
  }

  // Scatter plot if 2+ numeric columns
  if (numericCols.length >= 2) {
    const x = getNumericValues(sheet.rows, numericCols[0]);
    const y = getNumericValues(sheet.rows, numericCols[1]);
    const n = Math.min(x.length, y.length);
    charts.push({
      type: "scatter",
      title: `${numericCols[0]} vs ${numericCols[1]}`,
      data: [
        {
          x: x.slice(0, n),
          y: y.slice(0, n),
          type: "scatter",
          mode: "markers",
          marker: { color: "#ef4444", size: 5, opacity: 0.6 },
        },
      ],
    });
  }

  return charts;
}

export function buildDatasetContext(
  sheet: SheetData,
  profile: DatasetProfile,
): string {
  const stats = summaryStats(sheet);
  let context = `Dataset Summary:\n`;
  context += `- Rows: ${profile.rowCount}\n`;
  context += `- Columns: ${profile.columnCount}\n`;
  context += `- Missing cells: ${profile.missingCells} (${profile.missingPercent.toFixed(1)}%)\n`;
  context += `- Duplicate rows: ${profile.duplicateRows} (${profile.duplicatePercent.toFixed(1)}%)\n\n`;
  context += `Columns:\n`;
  for (const c of profile.columns) {
    context += `- ${c.name} (${c.type}): ${c.uniqueCount} unique, ${c.missingCount} missing`;
    if (c.type === "number" || c.type === "mixed") {
      if (c.mean !== undefined)
        context += `, mean=${c.mean.toFixed(2)}, min=${c.min?.toFixed(2)}, max=${c.max?.toFixed(2)}`;
    } else if (c.topValues && c.topValues.length > 0) {
      context += `, top: ${c.topValues[0].value} (${c.topValues[0].count})`;
    }
    context += `\n`;
  }
  context += `\nNumeric Summary:\n`;
  for (const s of stats.numeric) {
    context += `- ${s.column}: mean=${s.mean.toFixed(2)}, median=${s.median.toFixed(2)}, std=${s.std.toFixed(2)}\n`;
  }
  if (stats.categorical.length > 0) {
    context += `\nCategorical Summary:\n`;
    for (const s of stats.categorical) {
      context += `- ${s.column}: ${s.unique} unique, top="${s.top}" (${s.topFreq})\n`;
    }
  }
  // include a data sample (first 10 rows) for context
  context += `\nData Sample (first 10 rows):\n`;
  context += JSON.stringify(sheet.rows.slice(0, 10), null, 2);
  return context;
}

export function exportToExcel(sheet: SheetData): Promise<Blob> {
  return import("xlsx").then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    return new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  });
}
