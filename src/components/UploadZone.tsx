import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import type { SheetData } from "../types";
import { parseWorkbook } from "../lib/analysis";

interface UploadZoneProps {
  onLoaded: (sheets: SheetData[], fileName: string) => void;
}

export function UploadZone({ onLoaded }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext !== "xlsx" && ext !== "csv" && ext !== "xls") {
        setError("Please upload an .xlsx or .csv file.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const sheets = await parseWorkbook(file);
        if (sheets.length === 0 || sheets[0].rows.length === 0) {
          setError("The file appears to be empty.");
          setLoading(false);
          return;
        }
        onLoaded(sheets, file.name);
      } catch (err) {
        setError(
          "Failed to parse the file. Please ensure it is a valid Excel or CSV file.",
        );
      } finally {
        setLoading(false);
      }
    },
    [onLoaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative w-full max-w-2xl glass-strong p-12 rounded-3xl cursor-pointer transition-all duration-300 ${
          dragging
            ? "scale-105 glow-blue border-blue-400/50"
            : "hover:border-blue-400/30 hover:glow-blue"
        } ${loading ? "pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="flex flex-col items-center text-center gap-6">
          {loading ? (
            <>
              <Loader2 className="w-16 h-16 text-blue-400 animate-spin" />
              <div>
                <p className="text-xl font-semibold text-slate-100">
                  Analyzing your data...
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Parsing workbook and profiling columns
                </p>
              </div>
            </>
          ) : (
            <>
              <div className={`relative ${dragging ? "animate-float" : ""}`}>
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse-glow" />
                <div className="relative w-20 h-20 rounded-2xl glass flex items-center justify-center">
                  <Upload className="w-10 h-10 text-blue-400" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {dragging ? "Drop your file here" : "Upload your Excel file"}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Drag & drop or click to browse. Supports .xlsx and .csv
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  Securely processed in your browser — data never leaves your
                  device
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span>
          AI-powered analysis with automatic dashboards, statistical insights,
          and natural language Q&A
        </span>
      </div>
    </div>
  );
}
