import { Hash, Type, Calendar, ToggleLeft } from "lucide-react";
import type { ColumnProfile as ColumnProfileType } from "../types";

interface ColumnProfileTableProps {
  columns: ColumnProfileType[];
}

const typeIcons: Record<string, typeof Hash> = {
  number: Hash,
  string: Type,
  date: Calendar,
  boolean: ToggleLeft,
  mixed: Type,
};

const typeColors: Record<string, string> = {
  number: "text-cyan-400 bg-cyan-500/10",
  string: "text-blue-400 bg-blue-500/10",
  date: "text-amber-400 bg-amber-500/10",
  boolean: "text-emerald-400 bg-emerald-500/10",
  mixed: "text-orange-400 bg-orange-500/10",
};

export function ColumnProfileTable({ columns }: ColumnProfileTableProps) {
  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-100">
          Column Profiles
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Detailed statistics for each column
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                Column
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                Type
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                Missing
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                Unique
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                Mean
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                Median
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                Std
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                Min
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                Max
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                Top Values
              </th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col, i) => {
              const Icon = typeIcons[col.type] ?? Type;
              const isNumeric = col.type === "number" || col.type === "mixed";
              return (
                <tr
                  key={col.name}
                  className="border-b border-slate-800/30 hover:bg-slate-700/20 transition-colors animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">
                    {col.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${typeColors[col.type]}`}
                    >
                      <Icon className="w-3 h-3" />
                      {col.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {col.missingCount > 0 ? (
                      <span className="text-amber-400">
                        {col.missingCount}{" "}
                        <span className="text-xs text-slate-500">
                          ({col.missingPercent.toFixed(1)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {col.uniqueCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {isNumeric && col.mean !== undefined
                      ? col.mean.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {isNumeric && col.median !== undefined
                      ? col.median.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {isNumeric && col.std !== undefined
                      ? col.std.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {isNumeric && col.min !== undefined
                      ? col.min.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {isNumeric && col.max !== undefined
                      ? col.max.toFixed(2)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {col.topValues && col.topValues.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {col.topValues.slice(0, 3).map((tv, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-xs bg-slate-700/40 text-slate-400"
                          >
                            {String(tv.value).slice(0, 15)}: {tv.count}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
