import { Database, AlertTriangle, Copy, Hash } from "lucide-react";
import type { DatasetProfile } from "../types";

interface KPICardsProps {
  profile: DatasetProfile;
}

export function KPICards({ profile }: KPICardsProps) {
  const numericCount = profile.columns.filter(
    (c) => c.type === "number" || c.type === "mixed",
  ).length;
  const textCount = profile.columns.filter((c) => c.type === "string").length;

  const cards = [
    {
      label: "Total Rows",
      value: profile.rowCount.toLocaleString(),
      icon: Database,
      color: "blue",
      sub: `${profile.columnCount} columns`,
    },
    {
      label: "Missing Values",
      value: profile.missingCells.toLocaleString(),
      icon: AlertTriangle,
      color: profile.missingPercent > 10 ? "red" : "amber",
      sub: `${profile.missingPercent.toFixed(1)}% of data`,
    },
    {
      label: "Duplicate Rows",
      value: profile.duplicateRows.toLocaleString(),
      icon: Copy,
      color: profile.duplicateRows > 0 ? "orange" : "green",
      sub: `${profile.duplicatePercent.toFixed(1)}% of rows`,
    },
    {
      label: "Numeric Columns",
      value: String(numericCount),
      icon: Hash,
      color: "cyan",
      sub: `${textCount} text columns`,
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-400/20 text-blue-400",
    red: "from-red-500/20 to-red-600/5 border-red-400/20 text-red-400",
    amber:
      "from-amber-500/20 to-amber-600/5 border-amber-400/20 text-amber-400",
    green:
      "from-emerald-500/20 to-emerald-600/5 border-emerald-400/20 text-emerald-400",
    orange:
      "from-orange-500/20 to-orange-600/5 border-orange-400/20 text-orange-400",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-400/20 text-cyan-400",
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`glass p-5 rounded-2xl bg-gradient-to-br ${colorMap[card.color]} border animate-slide-up hover:scale-[1.02] transition-transform cursor-default`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg bg-slate-900/40`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-100 tabular-nums">
                {card.value}
              </p>
              <p className="text-sm text-slate-400 mt-1">{card.label}</p>
              <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
