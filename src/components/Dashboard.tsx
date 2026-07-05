import { useMemo } from "react";
import type { ChartConfig, DatasetProfile, SheetData } from "../types";
import { generateDashboard } from "../lib/analysis";
import { ChartCard } from "./ChartCard";
import { KPICards } from "./KPICards";

interface DashboardProps {
  sheet: SheetData;
  profile: DatasetProfile;
}

export function Dashboard({ sheet, profile }: DashboardProps) {
  const charts = useMemo(() => generateDashboard(sheet), [sheet]);

  return (
    <div className="space-y-6 animate-fade-in">
      <KPICards profile={profile} />

      {charts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-slate-400">
            No charts could be generated from this dataset.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((chart, i) => (
            <ChartContainer key={i} chart={chart} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChartContainer({
  chart,
  index,
}: {
  chart: ChartConfig;
  index: number;
}) {
  const isWide = chart.type === "heatmap";
  return (
    <div
      className={`glass rounded-2xl p-4 animate-slide-up hover:border-blue-400/20 transition-colors ${
        isWide ? "lg:col-span-2" : ""
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <ChartCard chart={chart} height={isWide ? 400 : 320} />
    </div>
  );
}
