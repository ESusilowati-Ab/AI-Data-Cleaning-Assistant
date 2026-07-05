import { useEffect, useRef } from "react";
import type { ChartConfig } from "../types";

interface ChartCardProps {
  chart: ChartConfig;
  height?: number;
}

export function ChartCard({ chart, height = 320 }: ChartCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!containerRef.current) return;
      const Plotly = (await import("plotly.js-dist-min")).default;
      if (cancelled || !containerRef.current) return;
      const layout = {
        ...chart.layout,
        height,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#cbd5e1", size: 11, family: "Inter, sans-serif" },
        margin: { l: 50, r: 20, t: 30, b: 40, ...(chart.layout?.margin ?? {}) },
        showlegend: chart.type === "pie" || chart.data.length > 1,
        legend: {
          font: { color: "#cbd5e1", size: 10 },
          orientation: "h",
          y: -0.2,
        },
        xaxis: {
          gridcolor: "rgba(148,163,184,0.1)",
          zerolinecolor: "rgba(148,163,184,0.2)",
          ...(chart.layout?.xaxis ?? {}),
        },
        yaxis: {
          gridcolor: "rgba(148,163,184,0.1)",
          zerolinecolor: "rgba(148,163,184,0.2)",
          ...(chart.layout?.yaxis ?? {}),
        },
        title: {
          text: chart.title,
          font: { color: "#e2e8f0", size: 13 },
          x: 0.02,
          xanchor: "left",
        },
      };
      const config = {
        displayModeBar: false,
        responsive: true,
        staticPlot: false,
      };
      Plotly.react(
        containerRef.current,
        chart.data as any,
        layout as any,
        config,
      );
      plotRef.current = containerRef.current;
    }
    render();
    return () => {
      cancelled = true;
      if (plotRef.current) {
        import("plotly.js-dist-min").then((Plotly) => {
          if (plotRef.current) Plotly.purge(plotRef.current);
        });
      }
    };
  }, [chart, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
