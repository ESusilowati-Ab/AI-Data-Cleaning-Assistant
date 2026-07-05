import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { SheetData } from "../types";

interface DataPreviewProps {
  sheet: SheetData;
}

export function DataPreview({ sheet }: DataPreviewProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const pageSize = 25;

  const filtered = search
    ? sheet.rows.filter((r) =>
        sheet.columns.some((c) => {
          const v = r[c];
          return (
            v !== null && String(v).toLowerCase().includes(search.toLowerCase())
          );
        }),
      )
    : sheet.rows;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const start = page * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Data Preview</h3>
          <p className="text-xs text-slate-400 mt-1">
            Showing {pageRows.length} of {filtered.length.toLocaleString()} rows
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search rows..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-400/50 w-48"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/40">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 border-b border-slate-700/50 sticky left-0 bg-slate-900/40">
                #
              </th>
              {sheet.columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2.5 text-left text-xs font-medium text-slate-300 border-b border-slate-700/50 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={start + i}
                className="border-b border-slate-800/30 hover:bg-slate-700/20 transition-colors"
              >
                <td className="px-3 py-2 text-xs text-slate-500 tabular-nums sticky left-0 bg-slate-900/20">
                  {start + i + 1}
                </td>
                {sheet.columns.map((col) => {
                  const v = row[col];
                  const isMissing = v === null || v === undefined || v === "";
                  return (
                    <td
                      key={col}
                      className={`px-3 py-2 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis ${
                        isMissing ? "text-slate-600 italic" : "text-slate-300"
                      }`}
                    >
                      {isMissing
                        ? "—"
                        : typeof v === "object"
                          ? String(v)
                          : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg glass hover:bg-slate-700/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg glass hover:bg-slate-700/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
