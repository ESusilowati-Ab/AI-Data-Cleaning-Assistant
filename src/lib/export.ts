import type { ChartConfig, DatasetProfile, SheetData } from "../types";
import { summaryStats } from "./analysis";

export async function exportPDF(
  sheet: SheetData,
  profile: DatasetProfile,
  charts: ChartConfig[],
): Promise<Blob> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable =
    (autoTableMod as any).default || (autoTableMod as any).autoTable;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text("Data Analysis Report", 40, y);
  y += 10;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(2);
  doc.line(40, y, pageWidth - 40, y);
  y += 25;

  // Dataset info
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(`Dataset: ${sheet.name}`, 40, y);
  y += 18;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, y);
  y += 20;

  // Overview table
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Overview", 40, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Rows", String(profile.rowCount)],
      ["Columns", String(profile.columnCount)],
      ["Total Cells", String(profile.totalCells)],
      [
        "Missing Cells",
        `${profile.missingCells} (${profile.missingPercent.toFixed(1)}%)`,
      ],
      [
        "Duplicate Rows",
        `${profile.duplicateRows} (${profile.duplicatePercent.toFixed(1)}%)`,
      ],
      ["Memory Usage", profile.memoryUsage],
    ],
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 25;

  // Column profiles
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Column Profiles", 40, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    head: [["Column", "Type", "Missing", "Unique", "Mean", "Min", "Max"]],
    body: profile.columns.map((c) => [
      c.name,
      c.type,
      `${c.missingCount} (${c.missingPercent.toFixed(1)}%)`,
      String(c.uniqueCount),
      c.mean !== undefined ? c.mean.toFixed(2) : "-",
      c.min !== undefined ? String(c.min) : "-",
      c.max !== undefined ? String(c.max) : "-",
    ]),
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
  });
  y = (doc as any).lastAutoTable.finalY + 25;

  // Summary statistics
  const stats = summaryStats(sheet);
  if (stats.numeric.length > 0) {
    if (y > 700) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("Summary Statistics (Numeric)", 40, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Column", "Count", "Mean", "Std", "Min", "Median", "Max"]],
      body: stats.numeric.map((s) => [
        s.column,
        String(s.count),
        s.mean.toFixed(2),
        s.std.toFixed(2),
        s.min.toFixed(2),
        s.median.toFixed(2),
        s.max.toFixed(2),
      ]),
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 },
    });
    y = (doc as any).lastAutoTable.finalY + 25;
  }

  // Charts as images
  for (const chart of charts.slice(0, 6)) {
    if (y > 650) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(chart.title, 40, y);
    y += 10;
    try {
      const imgData = await chartToImage(chart, 500, 280);
      if (imgData) {
        doc.addImage(imgData, "PNG", 40, y, 500, 280);
        y += 300;
      }
    } catch {
      doc.text("[Chart rendering failed]", 40, y);
      y += 20;
    }
  }

  return doc.output("blob");
}

export async function chartToImage(
  chart: ChartConfig,
  width: number = 600,
  height: number = 400,
): Promise<string | null> {
  const Plotly = (await import("plotly.js-dist-min")).default;
  const div = document.createElement("div");
  div.style.width = `${width}px`;
  div.style.height = `${height}px`;
  div.style.position = "absolute";
  div.style.left = "-9999px";
  document.body.appendChild(div);
  try {
    const layout = {
      ...chart.layout,
      width,
      height,
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      font: { color: "#1e293b", size: 11 },
      margin: { l: 50, r: 30, t: 40, b: 50 },
    };
    await Plotly.newPlot(div, chart.data as any, layout as any, {
      displayModeBar: false,
      responsive: false,
    });
    const result = await Plotly.toImage(div, {
      format: "png",
      width,
      height,
    });
    return result;
  } finally {
    Plotly.purge(div);
    document.body.removeChild(div);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
