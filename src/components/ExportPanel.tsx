import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Image,
  Download,
  Loader2,
  Check,
} from "lucide-react";
import type { ChartConfig, DatasetProfile, SheetData } from "../types";
import { exportToExcel } from "../lib/analysis";
import { chartToImage, downloadBlob, exportPDF } from "../lib/export";
import { generateDashboard } from "../lib/analysis";

interface ExportPanelProps {
  sheet: SheetData;
  profile: DatasetProfile;
}

export function ExportPanel({ sheet, profile }: ExportPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const charts = generateDashboard(sheet);

  const handlePDF = async () => {
    setLoading("pdf");
    try {
      const blob = await exportPDF(sheet, profile, charts);
      downloadBlob(blob, `${sheet.name}_report.pdf`);
      setDone("pdf");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
      setTimeout(() => setDone(null), 2000);
    }
  };

  const handleExcel = async () => {
    setLoading("excel");
    try {
      const blob = await exportToExcel(sheet);
      downloadBlob(blob, `${sheet.name}_cleaned.xlsx`);
      setDone("excel");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
      setTimeout(() => setDone(null), 2000);
    }
  };

  const handleChartPNG = async (chart: ChartConfig, index: number) => {
    setLoading(`chart-${index}`);
    try {
      const imgData = await chartToImage(chart, 1200, 700);
      if (imgData) {
        const res = await fetch(imgData);
        const blob = await res.blob();
        downloadBlob(
          blob,
          `${sheet.name}_${chart.title.replace(/\s+/g, "_")}.png`,
        );
      }
      setDone(`chart-${index}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
      setTimeout(() => setDone(null), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Report */}
        <ExportCard
          icon={FileText}
          title="PDF Report"
          description="Complete analysis report with KPIs, statistics, and charts"
          color="red"
          loading={loading === "pdf"}
          done={done === "pdf"}
          onClick={handlePDF}
        />

        {/* Excel Export */}
        <ExportCard
          icon={FileSpreadsheet}
          title="Excel Export"
          description="Export the current (cleaned) dataset as .xlsx"
          color="green"
          loading={loading === "excel"}
          done={done === "excel"}
          onClick={handleExcel}
        />
      </div>

      {/* Chart PNGs */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10">
            <Image className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">
              Export Charts as PNG
            </h3>
            <p className="text-xs text-slate-400">
              Download individual charts as high-resolution images
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {charts.map((chart, i) => (
            <button
              key={i}
              onClick={() => handleChartPNG(chart, i)}
              disabled={loading === `chart-${i}`}
              className="glass rounded-xl p-4 text-left hover:border-blue-400/30 transition-colors group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300 capitalize">
                  {chart.type}
                </span>
                {loading === `chart-${i}` ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : done === `chart-${i}` ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                )}
              </div>
              <p className="text-sm text-slate-200 truncate">{chart.title}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const colorMap: Record<
  string,
  { bg: string; text: string; border: string; hover: string }
> = {
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-400/20",
    hover: "hover:bg-red-500/20 hover:border-red-400/40",
  },
  green: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-400/20",
    hover: "hover:bg-emerald-500/20 hover:border-emerald-400/40",
  },
};

function ExportCard({
  icon: Icon,
  title,
  description,
  color,
  loading,
  done,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  color: string;
  loading: boolean;
  done: boolean;
  onClick: () => void;
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
      <button
        onClick={onClick}
        disabled={loading}
        className={`w-full px-4 py-2.5 rounded-xl border ${c.border} ${c.hover} ${c.text} transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : done ? (
          <>
            <Check className="w-4 h-4" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export
          </>
        )}
      </button>
    </div>
  );
}
