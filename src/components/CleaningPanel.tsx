import { useState } from "react";
import {
  Trash2,
  Droplets,
  RefreshCw,
  Scissors,
  Wand2,
  Check,
} from "lucide-react";
import type { ColumnType, SheetData } from "../types";
import {
  convertType,
  fillMissing,
  removeDuplicates,
  standardizeText,
  trimWhitespace,
} from "../lib/analysis";

interface CleaningPanelProps {
  sheet: SheetData;
  onClean: (sheet: SheetData) => void;
}

type FillStrategy = "mean" | "median" | "mode" | "zero" | "ffill" | "custom";

export function CleaningPanel({ sheet, onClean }: CleaningPanelProps) {
  const [result, setResult] = useState<{
    message: string;
    type: "success" | "info";
  } | null>(null);
  const [selectedCol, setSelectedCol] = useState(sheet.columns[0] ?? "");
  const [fillStrategy, setFillStrategy] = useState<FillStrategy>("mean");
  const [customValue, setCustomValue] = useState("");
  const [targetType, setTargetType] = useState<ColumnType>("number");
  const [textOp, setTextOp] = useState<"lower" | "upper" | "title" | "strip">(
    "lower",
  );

  const showResult = (
    message: string,
    type: "success" | "info" = "success",
  ) => {
    setResult({ message, type });
    setTimeout(() => setResult(null), 3000);
  };

  const handleRemoveDuplicates = () => {
    const before = sheet.rowCount;
    const cleaned = removeDuplicates(sheet);
    onClean(cleaned);
    showResult(
      `Removed ${before - cleaned.rowCount} duplicate rows. ${cleaned.rowCount} rows remaining.`,
    );
  };

  const handleFillMissing = () => {
    const cleaned = fillMissing(sheet, selectedCol, fillStrategy, customValue);
    onClean(cleaned);
    showResult(
      `Filled missing values in "${selectedCol}" using ${fillStrategy} strategy.`,
    );
  };

  const handleConvertType = () => {
    const cleaned = convertType(sheet, selectedCol, targetType);
    onClean(cleaned);
    showResult(`Converted "${selectedCol}" to ${targetType}.`);
  };

  const handleTrim = () => {
    const cleaned = trimWhitespace(sheet, selectedCol);
    onClean(cleaned);
    showResult(`Trimmed whitespace in "${selectedCol}".`);
  };

  const handleStandardize = () => {
    const cleaned = standardizeText(sheet, selectedCol, textOp);
    onClean(cleaned);
    showResult(`Standardized text in "${selectedCol}" (${textOp}).`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {result && (
        <div
          className={`glass rounded-xl p-4 flex items-center gap-3 animate-slide-up ${
            result.type === "success"
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-blue-400/30 bg-blue-500/10"
          }`}
        >
          <Check className="w-5 h-5 text-emerald-400" />
          <p className="text-sm text-slate-200">{result.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Remove Duplicates */}
        <CleaningCard
          icon={Trash2}
          title="Remove Duplicates"
          description="Eliminate all duplicate rows from the dataset"
          color="red"
        >
          <button
            onClick={handleRemoveDuplicates}
            className="w-full px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 transition-colors text-sm font-medium"
          >
            Remove All Duplicates
          </button>
        </CleaningCard>

        {/* Fill Missing Values */}
        <CleaningCard
          icon={Droplets}
          title="Fill Missing Values"
          description="Replace null/empty values with computed or custom values"
          color="amber"
        >
          <div className="space-y-3">
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
            >
              {sheet.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={fillStrategy}
              onChange={(e) => setFillStrategy(e.target.value as FillStrategy)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
            >
              <option value="mean">Mean</option>
              <option value="median">Median</option>
              <option value="mode">Mode</option>
              <option value="zero">Zero</option>
              <option value="ffill">Forward Fill</option>
              <option value="custom">Custom Value</option>
            </select>
            {fillStrategy === "custom" && (
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter custom value..."
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-400/50"
              />
            )}
            <button
              onClick={handleFillMissing}
              className="w-full px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/30 transition-colors text-sm font-medium"
            >
              Fill Missing Values
            </button>
          </div>
        </CleaningCard>

        {/* Convert Data Types */}
        <CleaningCard
          icon={RefreshCw}
          title="Convert Data Type"
          description="Change the data type of a column"
          color="blue"
        >
          <div className="space-y-3">
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
            >
              {sheet.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as ColumnType)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
            >
              <option value="number">Number</option>
              <option value="string">String</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
            </select>
            <button
              onClick={handleConvertType}
              className="w-full px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 transition-colors text-sm font-medium"
            >
              Convert Type
            </button>
          </div>
        </CleaningCard>

        {/* Trim Whitespace */}
        <CleaningCard
          icon={Scissors}
          title="Trim Whitespace"
          description="Remove leading and trailing whitespace from text values"
          color="cyan"
        >
          <div className="space-y-3">
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
            >
              {sheet.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={handleTrim}
              className="w-full px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors text-sm font-medium"
            >
              Trim Whitespace
            </button>
          </div>
        </CleaningCard>

        {/* Standardize Text */}
        <CleaningCard
          icon={Wand2}
          title="Standardize Text"
          description="Normalize text casing and formatting"
          color="purple"
        >
          <div className="space-y-3">
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
            >
              {sheet.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={textOp}
              onChange={(e) => setTextOp(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-400/50"
            >
              <option value="lower">Lowercase</option>
              <option value="upper">Uppercase</option>
              <option value="title">Title Case</option>
              <option value="strip">Strip Extra Spaces</option>
            </select>
            <button
              onClick={handleStandardize}
              className="w-full px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-300 hover:bg-violet-500/30 transition-colors text-sm font-medium"
            >
              Standardize Text
            </button>
          </div>
        </CleaningCard>
      </div>
    </div>
  );
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-400/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-400/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-400/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-400/20",
  },
  purple: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-400/20",
  },
};

function CleaningCard({
  icon: Icon,
  title,
  description,
  color,
  children,
}: {
  icon: typeof Trash2;
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
}) {
  const c = colorMap[color];
  return (
    <div
      className={`glass rounded-2xl p-5 border ${c.border} animate-slide-up`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
