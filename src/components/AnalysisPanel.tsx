import { useMemo, useState } from "react";
import { Sigma, TrendingUp, GitBranch, Activity } from "lucide-react";
import type { SheetData } from "../types";
import {
  correlationMatrix,
  forecast,
  getNumericValues,
  inferColumnType,
  mode,
  performRegression,
  summaryStats,
} from "../lib/analysis";
import { ChartCard } from "./ChartCard";

interface AnalysisPanelProps {
  sheet: SheetData;
}

type Tab = "descriptive" | "correlation" | "regression" | "forecast";

export function AnalysisPanel({ sheet }: AnalysisPanelProps) {
  const [tab, setTab] = useState<Tab>("descriptive");
  const numericCols = useMemo(
    () =>
      sheet.columns.filter((c) => {
        const t = inferColumnType(sheet.rows.map((r) => r[c]));
        return t === "number" || t === "mixed";
      }),
    [sheet],
  );

  const [xCol, setXCol] = useState(numericCols[0] ?? "");
  const [yCol, setYCol] = useState(numericCols[1] ?? "");
  const [forecastCol, setForecastCol] = useState(numericCols[0] ?? "");
  const [periods, setPeriods] = useState(10);

  const stats = useMemo(() => summaryStats(sheet), [sheet]);
  const corrMatrix = useMemo(() => correlationMatrix(sheet), [sheet]);
  const regression = useMemo(
    () => (xCol && yCol ? performRegression(sheet, xCol, yCol) : null),
    [sheet, xCol, yCol],
  );
  const forecastResult = useMemo(
    () => (forecastCol ? forecast(sheet, forecastCol, periods) : null),
    [sheet, forecastCol, periods],
  );

  const tabs: { id: Tab; label: string; icon: typeof Sigma }[] = [
    { id: "descriptive", label: "Descriptive", icon: Activity },
    { id: "correlation", label: "Correlation", icon: GitBranch },
    { id: "regression", label: "Regression", icon: TrendingUp },
    { id: "forecast", label: "Forecast", icon: Sigma },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                tab === t.id
                  ? "glass-strong border-blue-400/40 text-blue-300 glow-blue"
                  : "glass text-slate-400 hover:text-slate-200 hover:border-slate-500/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "descriptive" && (
        <div className="space-y-6">
          {stats.numeric.length > 0 ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="font-semibold text-slate-100">
                  Descriptive Statistics
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mean, median, mode, and dispersion measures
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/40">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                        Column
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Count
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Mean
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Median
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Mode
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Std
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Min
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Q1
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Q3
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        Max
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.numeric.map((s) => {
                      const nums = getNumericValues(sheet.rows, s.column);
                      const modes = mode(nums);
                      return (
                        <tr
                          key={s.column}
                          className="border-b border-slate-800/30 hover:bg-slate-700/20"
                        >
                          <td className="px-4 py-3 font-medium text-slate-200">
                            {s.column}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                            {s.count}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-blue-300">
                            {s.mean.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                            {s.median.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                            {modes.length > 0
                              ? modes.map((m) => m.toFixed(2)).join(", ")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                            {s.std.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                            {s.min.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                            {s.q1.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                            {s.q3.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                            {s.max.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState message="No numeric columns found for descriptive statistics." />
          )}
        </div>
      )}

      {tab === "correlation" && (
        <div className="space-y-6">
          {corrMatrix.columns.length >= 2 ? (
            <>
              <div className="glass rounded-2xl p-4">
                <ChartCard
                  chart={{
                    type: "heatmap",
                    title: "Correlation Matrix",
                    data: [
                      {
                        z: corrMatrix.matrix,
                        x: corrMatrix.columns,
                        y: corrMatrix.columns,
                        type: "heatmap",
                        colorscale: "RdBu",
                        zmin: -1,
                        zmax: 1,
                        showscale: true,
                      },
                    ],
                  }}
                  height={400}
                />
              </div>
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-700/50">
                  <h3 className="font-semibold text-slate-100">
                    Correlation Pairs
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/40">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                        Column A
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                        Column B
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                        r
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                        Strength
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {corrMatrix.columns
                      .flatMap((a, i) =>
                        corrMatrix.columns.slice(i + 1).map((b, j) => ({
                          a,
                          b,
                          r: corrMatrix.matrix[i][i + 1 + j],
                        })),
                      )
                      .sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
                      .map(({ a, b, r }) => (
                        <tr
                          key={`${a}-${b}`}
                          className="border-b border-slate-800/30 hover:bg-slate-700/20"
                        >
                          <td className="px-4 py-3 text-slate-200">{a}</td>
                          <td className="px-4 py-3 text-slate-200">{b}</td>
                          <td
                            className={`px-4 py-3 text-right tabular-nums font-medium ${r > 0 ? "text-emerald-300" : "text-red-300"}`}
                          >
                            {r.toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">
                            {strengthLabel(r)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState message="Need at least 2 numeric columns for correlation analysis." />
          )}
        </div>
      )}

      {tab === "regression" && (
        <div className="space-y-6">
          {numericCols.length >= 2 ? (
            <>
              <div className="glass rounded-2xl p-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    X (Independent)
                  </label>
                  <select
                    value={xCol}
                    onChange={(e) => setXCol(e.target.value)}
                    className="px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
                  >
                    {numericCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Y (Dependent)
                  </label>
                  <select
                    value={yCol}
                    onChange={(e) => setYCol(e.target.value)}
                    className="px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
                  >
                    {numericCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {regression && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Slope"
                      value={regression.slope.toFixed(4)}
                      color="blue"
                    />
                    <StatCard
                      label="Intercept"
                      value={regression.intercept.toFixed(4)}
                      color="cyan"
                    />
                    <StatCard
                      label="R²"
                      value={regression.rSquared.toFixed(4)}
                      color="emerald"
                    />
                    <StatCard
                      label="Fit Quality"
                      value={
                        regression.rSquared > 0.7
                          ? "Strong"
                          : regression.rSquared > 0.4
                            ? "Moderate"
                            : "Weak"
                      }
                      color="amber"
                    />
                  </div>
                  <div className="glass rounded-2xl p-4">
                    <ChartCard
                      chart={{
                        type: "scatter",
                        title: `Regression: ${yCol} ~ ${xCol}`,
                        data: [
                          {
                            x: regression.predictions.map((p) => p.x),
                            y: regression.predictions.map((p) => p.y),
                            type: "scatter",
                            mode: "markers",
                            name: "Actual",
                            marker: { color: "#3b82f6", size: 6, opacity: 0.6 },
                          },
                          {
                            x: regression.predictions.map((p) => p.x),
                            y: regression.predictions.map((p) => p.yHat),
                            type: "scatter",
                            mode: "lines",
                            name: "Regression Line",
                            line: { color: "#ef4444", width: 2 },
                          },
                        ],
                      }}
                      height={380}
                    />
                  </div>
                  <div className="glass rounded-xl p-4">
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-400">Equation:</span>{" "}
                      <code className="px-2 py-1 rounded bg-slate-800/50 text-cyan-300 text-sm">
                        {yCol} = {regression.slope.toFixed(4)} × {xCol} +{" "}
                        {regression.intercept.toFixed(4)}
                      </code>
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <EmptyState message="Need at least 2 numeric columns for regression analysis." />
          )}
        </div>
      )}

      {tab === "forecast" && (
        <div className="space-y-6">
          {numericCols.length >= 1 ? (
            <>
              <div className="glass rounded-2xl p-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Column
                  </label>
                  <select
                    value={forecastCol}
                    onChange={(e) => setForecastCol(e.target.value)}
                    className="px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
                  >
                    {numericCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Periods
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={periods}
                    onChange={(e) =>
                      setPeriods(
                        Math.max(1, Math.min(50, Number(e.target.value))),
                      )
                    }
                    className="px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50 w-24"
                  />
                </div>
              </div>

              {forecastResult && (
                <>
                  <div className="glass rounded-2xl p-4">
                    <ChartCard
                      chart={{
                        type: "line",
                        title: `Forecast: ${forecastCol}`,
                        data: [
                          {
                            x: forecastResult.historical.map((h) => h.index),
                            y: forecastResult.historical.map((h) => h.value),
                            type: "scatter",
                            mode: "lines",
                            name: "Historical",
                            line: { color: "#3b82f6", width: 2 },
                          },
                          {
                            x: forecastResult.forecast.map((f) => f.index),
                            y: forecastResult.forecast.map((f) => f.value),
                            type: "scatter",
                            mode: "lines",
                            name: "Forecast",
                            line: { color: "#f59e0b", width: 2, dash: "dash" },
                          },
                          {
                            x: [
                              ...forecastResult.forecast.map((f) => f.index),
                              ...forecastResult.forecast
                                .map((f) => f.index)
                                .reverse(),
                            ],
                            y: [
                              ...forecastResult.forecast.map((f) => f.upper),
                              ...forecastResult.forecast
                                .map((f) => f.lower)
                                .reverse(),
                            ],
                            type: "scatter",
                            mode: "lines",
                            name: "95% CI",
                            fill: "toself",
                            line: { color: "rgba(245,158,11,0.2)" },
                            fillcolor: "rgba(245,158,11,0.15)",
                          },
                        ],
                      }}
                      height={380}
                    />
                  </div>
                  <div className="glass rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50">
                      <h3 className="font-semibold text-slate-100">
                        Forecast Values ({forecastResult.method})
                      </h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-900/40">
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                            Period
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                            Forecast
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                            Lower 95%
                          </th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                            Upper 95%
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastResult.forecast.map((f) => (
                          <tr
                            key={f.index}
                            className="border-b border-slate-800/30 hover:bg-slate-700/20"
                          >
                            <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                              {f.index}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-amber-300 font-medium">
                              {f.value.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                              {f.lower.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                              {f.upper.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          ) : (
            <EmptyState message="No numeric columns available for forecasting." />
          )}
        </div>
      )}
    </div>
  );
}

function strengthLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return r > 0 ? "Strong positive" : "Strong negative";
  if (abs > 0.4) return r > 0 ? "Moderate positive" : "Moderate negative";
  if (abs > 0.2) return r > 0 ? "Weak positive" : "Weak negative";
  return "Negligible";
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-300 border-blue-400/20",
    cyan: "text-cyan-300 border-cyan-400/20",
    emerald: "text-emerald-300 border-emerald-400/20",
    amber: "text-amber-300 border-amber-400/20",
  };
  return (
    <div
      className={`glass rounded-xl p-4 border ${colors[color]} animate-slide-up`}
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 tabular-nums ${colors[color].split(" ")[0]}`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <p className="text-slate-400">{message}</p>
    </div>
  );
}
