import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Table2,
  BarChart3,
  Sparkles,
  Wand2,
  Calculator,
  MessageSquare,
  Download,
  FileSpreadsheet,
  X,
} from "lucide-react";
import type { SheetData, ViewType } from "./types";
import { profileSheet } from "./lib/analysis";
import { UploadZone } from "./components/UploadZone";
import { DataPreview } from "./components/DataPreview";
import { ColumnProfileTable } from "./components/ColumnProfileTable";
import { Dashboard } from "./components/Dashboard";
import { ChatPanel } from "./components/ChatPanel";
import { CleaningPanel } from "./components/CleaningPanel";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { ExportPanel } from "./components/ExportPanel";

function App() {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [fileName, setFileName] = useState("");
  const [view, setView] = useState<ViewType>("upload");
  const [cleanedSheet, setCleanedSheet] = useState<SheetData | null>(null);

  const sheet = cleanedSheet ?? sheets[activeSheet];
  const profile = useMemo(() => (sheet ? profileSheet(sheet) : null), [sheet]);

  const handleLoaded = (newSheets: SheetData[], name: string) => {
    setSheets(newSheets);
    setActiveSheet(0);
    setFileName(name);
    setCleanedSheet(null);
    setView("preview");
  };

  const handleClean = (newSheet: SheetData) => {
    setCleanedSheet(newSheet);
  };

  const handleReset = () => {
    setSheets([]);
    setCleanedSheet(null);
    setFileName("");
    setView("upload");
  };

  const navItems: { id: ViewType; label: string; icon: typeof Table2 }[] = [
    { id: "preview", label: "Data Preview", icon: Table2 },
    { id: "profile", label: "Data Profile", icon: BarChart3 },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "cleaning", label: "Data Cleaning", icon: Wand2 },
    { id: "analysis", label: "Statistical Analysis", icon: Calculator },
    { id: "chat", label: "AI Chat", icon: MessageSquare },
    { id: "export", label: "Export", icon: Download },
  ];

  if (!sheet || !profile) {
    return (
      <div className="min-h-screen bg-grid bg-radial-glow">
        <Header fileName={null} onReset={handleReset} />
        <UploadZone onLoaded={handleLoaded} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid bg-radial-glow">
      <Header fileName={fileName} onReset={handleReset} />

      {sheets.length > 1 && (
        <div className="px-6 pt-4 flex gap-2 flex-wrap">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => {
                setActiveSheet(i);
                setCleanedSheet(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeSheet === i && !cleanedSheet
                  ? "glass-strong border-blue-400/40 text-blue-300"
                  : "glass text-slate-400 hover:text-slate-200"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-6 p-6">
        {/* Sidebar */}
        <aside className="w-16 lg:w-56 flex-shrink-0">
          <nav className="glass rounded-2xl p-2 lg:p-3 sticky top-6 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? "bg-blue-500/20 text-blue-300 border border-blue-400/30 glow-blue"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                  }`}
                  title={item.label}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-blue-400" : ""}`}
                  />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {view === "preview" && (
            <div className="space-y-6">
              <SectionHeader
                title="Data Preview"
                subtitle={`${sheet.rowCount.toLocaleString()} rows × ${sheet.columnCount} columns`}
              />
              <DataPreview sheet={sheet} />
            </div>
          )}

          {view === "profile" && (
            <div className="space-y-6">
              <SectionHeader
                title="Data Profile"
                subtitle="Column-level statistics and data quality metrics"
              />
              <ColumnProfileTable columns={profile.columns} />
            </div>
          )}

          {view === "dashboard" && (
            <div className="space-y-6">
              <SectionHeader
                title="Analytics Dashboard"
                subtitle="Auto-generated visualizations from your dataset"
              />
              <Dashboard sheet={sheet} profile={profile} />
            </div>
          )}

          {view === "cleaning" && (
            <div className="space-y-6">
              <SectionHeader
                title="Data Cleaning"
                subtitle="Remove duplicates, fill missing values, and standardize data"
              />
              <CleaningPanel sheet={sheet} onClean={handleClean} />
            </div>
          )}

          {view === "analysis" && (
            <div className="space-y-6">
              <SectionHeader
                title="Statistical Analysis"
                subtitle="Descriptive statistics, correlation, regression, and forecasting"
              />
              <AnalysisPanel sheet={sheet} />
            </div>
          )}

          {view === "chat" && (
            <div className="space-y-6">
              <SectionHeader
                title="AI Data Assistant"
                subtitle="Ask natural language questions about your dataset"
              />
              <ChatPanel sheet={sheet} profile={profile} />
            </div>
          )}

          {view === "export" && (
            <div className="space-y-6">
              <SectionHeader
                title="Export"
                subtitle="Download reports, cleaned data, and chart images"
              />
              <ExportPanel sheet={sheet} profile={profile} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Header({
  fileName,
  onReset,
}: {
  fileName: string | null;
  onReset: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 px-6 py-4 border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-lg" />
            <div className="relative w-10 h-10 rounded-xl glass-strong flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient">DataMind AI</h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Excel Analysis Agent
            </p>
          </div>
        </div>

        {fileName && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm text-slate-300">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span className="max-w-[200px] truncate">{fileName}</span>
            </div>
            <button
              onClick={onReset}
              className="p-2 rounded-lg glass hover:bg-red-500/10 hover:border-red-400/30 text-slate-400 hover:text-red-400 transition-colors"
              title="Upload new file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
      <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

export default App;
