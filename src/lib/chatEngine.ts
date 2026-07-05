import type { ChartConfig, DatasetProfile, SheetData } from "../types";
import {
  correlationMatrix,
  forecast,
  generateDashboard,
  getNumericValues,
  inferColumnType,
  mean,
  median,
  mode,
  performRegression,
  std,
  summaryStats,
} from "./analysis";

interface ChatContext {
  sheet: SheetData;
  profile: DatasetProfile;
}

interface ChatResult {
  text: string;
  chart?: ChartConfig;
}

/**
 * Local AI-style analysis engine.
 * Answers natural-language questions about the uploaded dataset using
 * real computed statistics — never hallucinates, always grounded in the data.
 * Mirrors the /chat endpoint behavior: summarize data, send to LLM, return answer.
 * In a deployed FastAPI setup this logic would call OpenAI with the dataset context;
 * here we implement the reasoning locally so it works without an API key.
 */
export function answerQuestion(question: string, ctx: ChatContext): ChatResult {
  const q = question.toLowerCase().trim();
  const { sheet, profile } = ctx;

  if (!q) return { text: "Please ask a question about your dataset." };

  // Greetings
  if (/^(hi|hello|hey|help|what can you do)/.test(q)) {
    return {
      text: `I can analyze your dataset "${sheet.name}" (${profile.rowCount} rows, ${profile.columnCount} columns). Ask me things like:
• "What is the average of [column]?"
• "How many missing values are there?"
• "Which columns are correlated?"
• "Show me the distribution of [column]"
• "What is the median [column]?"
• "How many duplicates exist?"
• "What are the data types?"`,
    };
  }

  // Row/column counts
  if (
    /how many (rows|records|entries|observations)/.test(q) ||
    q.includes("row count")
  ) {
    return {
      text: `The dataset has **${profile.rowCount} rows** and **${profile.columnCount} columns**.`,
    };
  }
  if (
    /how many (columns|fields|variables)/.test(q) ||
    q.includes("column count")
  ) {
    return {
      text: `The dataset has **${profile.columnCount} columns**: ${sheet.columns.map((c) => `\`${c}\``).join(", ")}.`,
    };
  }

  // Missing values
  if (
    q.includes("missing") ||
    q.includes("null") ||
    q.includes("nan") ||
    q.includes("empty")
  ) {
    if (q.includes("which") || q.includes("where") || q.includes("column")) {
      const sorted = [...profile.columns].sort(
        (a, b) => b.missingCount - a.missingCount,
      );
      const withMissing = sorted.filter((c) => c.missingCount > 0);
      if (withMissing.length === 0)
        return {
          text: `There are **no missing values** in any column. The dataset is complete.`,
        };
      const lines = withMissing.map(
        (c) =>
          `• \`${c.name}\`: ${c.missingCount} missing (${c.missingPercent.toFixed(1)}%)`,
      );
      return { text: `Columns with missing values:\n${lines.join("\n")}` };
    }
    return {
      text: `There are **${profile.missingCells} missing cells** out of ${profile.totalCells} total (${profile.missingPercent.toFixed(1)}%). ${profile.duplicateRows > 0 ? `There are also ${profile.duplicateRows} duplicate rows.` : "No duplicate rows found."}`,
    };
  }

  // Duplicates
  if (q.includes("duplicate")) {
    return {
      text: `There are **${profile.duplicateRows} duplicate rows** (${profile.duplicatePercent.toFixed(1)}% of the dataset). You can remove them in the Data Cleaning panel.`,
    };
  }

  // Data types
  if (
    q.includes("data type") ||
    q.includes("dtype") ||
    q.includes("types of")
  ) {
    const lines = profile.columns.map((c) => `• \`${c.name}\`: **${c.type}**`);
    return { text: `Column data types:\n${lines.join("\n")}` };
  }

  // Summary / describe
  if (
    q.includes("summary") ||
    q.includes("describe") ||
    q.includes("overview") ||
    q.includes("statistics")
  ) {
    const stats = summaryStats(sheet);
    let text = `**Dataset Overview**\n• Rows: ${profile.rowCount}\n• Columns: ${profile.columnCount}\n• Missing: ${profile.missingCells} (${profile.missingPercent.toFixed(1)}%)\n• Duplicates: ${profile.duplicateRows}\n\n`;
    if (stats.numeric.length > 0) {
      text += `**Numeric Columns:**\n`;
      for (const s of stats.numeric) {
        text += `• \`${s.column}\`: mean=${s.mean.toFixed(2)}, median=${s.median.toFixed(2)}, std=${s.std.toFixed(2)}, min=${s.min.toFixed(2)}, max=${s.max.toFixed(2)}\n`;
      }
    }
    if (stats.categorical.length > 0) {
      text += `\n**Categorical Columns:**\n`;
      for (const s of stats.categorical) {
        text += `• \`${s.column}\`: ${s.unique} unique, top="${s.top}" (${s.topFreq})\n`;
      }
    }
    return { text };
  }

  // Correlation
  if (
    q.includes("correlation") ||
    q.includes("correlate") ||
    q.includes("relationship")
  ) {
    const { columns, matrix } = correlationMatrix(sheet);
    if (columns.length < 2) {
      return {
        text: `Need at least 2 numeric columns to compute correlation. Found ${columns.length}.`,
      };
    }
    // find strongest correlations
    const pairs: { a: string; b: string; r: number }[] = [];
    for (let i = 0; i < columns.length; i++) {
      for (let j = i + 1; j < columns.length; j++) {
        pairs.push({ a: columns[i], b: columns[j], r: matrix[i][j] });
      }
    }
    pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    const top = pairs.slice(0, 5);
    const lines = top.map(
      (p) =>
        `• \`${p.a}\` & \`${p.b}\`: r = **${p.r.toFixed(3)}** (${strengthLabel(p.r)})`,
    );
    return {
      text: `**Correlation Analysis**\n${lines.join("\n")}\n\nSee the Correlation Heatmap in the Dashboard for the full matrix.`,
      chart: {
        type: "heatmap",
        title: "Correlation Heatmap",
        data: [
          {
            z: matrix,
            x: columns,
            y: columns,
            type: "heatmap",
            colorscale: "RdBu",
            zmin: -1,
            zmax: 1,
            showscale: true,
          },
        ],
      },
    };
  }

  // Regression
  if (
    q.includes("regression") ||
    q.includes("predict") ||
    q.includes("model")
  ) {
    const numericCols = sheet.columns.filter((c) => {
      const t = inferColumnType(sheet.rows.map((r) => r[c]));
      return t === "number" || t === "mixed";
    });
    if (numericCols.length < 2) {
      return {
        text: `Need at least 2 numeric columns for regression. Found ${numericCols.length}.`,
      };
    }
    const result = performRegression(sheet, numericCols[0], numericCols[1]);
    return {
      text: `**Linear Regression: ${result.target} ~ ${result.column}**
• Slope: ${result.slope.toFixed(4)}
• Intercept: ${result.intercept.toFixed(4)}
• R²: ${result.rSquared.toFixed(4)} (${result.rSquared > 0.7 ? "strong" : result.rSquared > 0.4 ? "moderate" : "weak"} fit)
• Equation: ${result.target} = ${result.slope.toFixed(4)} × ${result.column} + ${result.intercept.toFixed(4)}`,
      chart: {
        type: "scatter",
        title: `Regression: ${result.target} vs ${result.column}`,
        data: [
          {
            x: result.predictions.map((p) => p.x),
            y: result.predictions.map((p) => p.y),
            type: "scatter",
            mode: "markers",
            name: "Actual",
            marker: { color: "#3b82f6", size: 6, opacity: 0.6 },
          },
          {
            x: result.predictions.map((p) => p.x),
            y: result.predictions.map((p) => p.yHat),
            type: "scatter",
            mode: "lines",
            name: "Regression Line",
            line: { color: "#ef4444", width: 2 },
          },
        ],
      },
    };
  }

  // Forecast
  if (
    q.includes("forecast") ||
    q.includes("future") ||
    q.includes("trend") ||
    q.includes("project")
  ) {
    const numericCols = sheet.columns.filter((c) => {
      const t = inferColumnType(sheet.rows.map((r) => r[c]));
      return t === "number" || t === "mixed";
    });
    if (numericCols.length === 0) {
      return { text: `No numeric columns available for forecasting.` };
    }
    const col =
      numericCols.find((c) => q.includes(c.toLowerCase())) ?? numericCols[0];
    const result = forecast(sheet, col, 10);
    const lastVal = result.historical[result.historical.length - 1]?.value ?? 0;
    const lastForecast = result.forecast[result.forecast.length - 1];
    return {
      text: `**Forecast for \`${col}\`** (next 10 periods, ${result.method})
• Current value: ${lastVal.toFixed(2)}
• Projected (period +10): ${lastForecast.value.toFixed(2)}
• 95% CI: [${lastForecast.lower.toFixed(2)}, ${lastForecast.upper.toFixed(2)}]`,
      chart: {
        type: "line",
        title: `Forecast: ${col}`,
        data: [
          {
            x: result.historical.map((h) => h.index),
            y: result.historical.map((h) => h.value),
            type: "scatter",
            mode: "lines",
            name: "Historical",
            line: { color: "#3b82f6", width: 2 },
          },
          {
            x: result.forecast.map((f) => f.index),
            y: result.forecast.map((f) => f.value),
            type: "scatter",
            mode: "lines",
            name: "Forecast",
            line: { color: "#f59e0b", width: 2, dash: "dash" },
          },
          {
            x: [
              ...result.forecast.map((f) => f.index),
              ...result.forecast.map((f) => f.index).reverse(),
            ],
            y: [
              ...result.forecast.map((f) => f.upper),
              ...result.forecast.map((f) => f.lower).reverse(),
            ],
            type: "scatter",
            mode: "lines",
            name: "95% CI",
            fill: "toself",
            line: { color: "rgba(245,158,11,0.2)" },
            fillcolor: "rgba(245,158,11,0.15)",
          },
        ],
      },
    };
  }

  // Distribution / histogram
  if (
    q.includes("distribution") ||
    q.includes("histogram") ||
    q.includes("spread")
  ) {
    const col = findColumn(q, sheet.columns);
    if (col) {
      const nums = getNumericValues(sheet.rows, col);
      if (nums.length === 0)
        return { text: `Column \`${col}\` has no numeric values to plot.` };
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const binCount = Math.min(20, Math.ceil(Math.sqrt(nums.length)));
      const binSize = (max - min) / binCount || 1;
      const bins = new Array(binCount).fill(0);
      for (const n of nums) {
        let idx = Math.floor((n - min) / binSize);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        bins[idx]++;
      }
      const binLabels = bins.map((_, i) =>
        Number((min + i * binSize).toFixed(2)),
      );
      return {
        text: `**Distribution of \`${col}\`**\n• Count: ${nums.length}\n• Min: ${min.toFixed(2)}\n• Max: ${max.toFixed(2)}\n• Mean: ${mean(nums).toFixed(2)}\n• Std: ${std(nums).toFixed(2)}`,
        chart: {
          type: "histogram",
          title: `Distribution: ${col}`,
          data: [
            {
              x: binLabels,
              y: bins,
              type: "bar",
              marker: { color: "#8b5cf6" },
            },
          ],
        },
      };
    }
  }

  // Column-specific stats
  const colMatch = findColumn(q, sheet.columns);
  if (colMatch) {
    const colProfile = profile.columns.find((c) => c.name === colMatch)!;
    if (q.includes("average") || q.includes("mean") || q.includes("avg")) {
      if (colProfile.mean !== undefined)
        return {
          text: `The **mean** of \`${colMatch}\` is **${colProfile.mean.toFixed(4)}**.`,
        };
      return { text: `\`${colMatch}\` is not numeric; cannot compute mean.` };
    }
    if (q.includes("median")) {
      const nums = getNumericValues(sheet.rows, colMatch);
      if (nums.length > 0)
        return {
          text: `The **median** of \`${colMatch}\` is **${median(nums).toFixed(4)}**.`,
        };
      return { text: `\`${colMatch}\` is not numeric; cannot compute median.` };
    }
    if (q.includes("mode")) {
      const nums = getNumericValues(sheet.rows, colMatch);
      const modes = mode(nums);
      if (modes.length > 0)
        return {
          text: `The **mode** of \`${colMatch}\` is **${modes.join(", ")}**.`,
        };
      const freq = new Map<string, number>();
      sheet.rows.forEach((r) => {
        const v = r[colMatch];
        if (v !== null && v !== undefined && v !== "")
          freq.set(String(v), (freq.get(String(v)) || 0) + 1);
      });
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0)
        return {
          text: `The **mode** of \`${colMatch}\` is **${sorted[0][0]}** (appears ${sorted[0][1]} times).`,
        };
      return { text: `No mode found for \`${colMatch}\`.` };
    }
    if (
      q.includes("min") ||
      q.includes("minimum") ||
      q.includes("lowest") ||
      q.includes("smallest")
    ) {
      if (colProfile.min !== undefined)
        return {
          text: `The **minimum** of \`${colMatch}\` is **${colProfile.min}**.`,
        };
      return { text: `\`${colMatch}\` is not numeric.` };
    }
    if (
      q.includes("max") ||
      q.includes("maximum") ||
      q.includes("highest") ||
      q.includes("largest") ||
      q.includes("biggest")
    ) {
      if (colProfile.max !== undefined)
        return {
          text: `The **maximum** of \`${colMatch}\` is **${colProfile.max}**.`,
        };
      return { text: `\`${colMatch}\` is not numeric.` };
    }
    if (
      q.includes("std") ||
      q.includes("standard deviation") ||
      q.includes("variance") ||
      q.includes("spread")
    ) {
      if (colProfile.std !== undefined)
        return {
          text: `The **standard deviation** of \`${colMatch}\` is **${colProfile.std.toFixed(4)}**.`,
        };
      return { text: `\`${colMatch}\` is not numeric.` };
    }
    if (q.includes("unique") || q.includes("distinct")) {
      return {
        text: `\`${colMatch}\` has **${colProfile.uniqueCount} unique values** (${colProfile.uniquePercent.toFixed(1)}% of rows).`,
      };
    }
    if (
      q.includes("count") ||
      q.includes("how many") ||
      q.includes("frequency")
    ) {
      const freq = new Map<string, number>();
      sheet.rows.forEach((r) => {
        const v = r[colMatch];
        if (v !== null && v !== undefined && v !== "")
          freq.set(String(v), (freq.get(String(v)) || 0) + 1);
      });
      const sorted = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      const lines = sorted.map(([val, count]) => `• ${val}: ${count}`);
      return {
        text: `**Value counts for \`${colMatch}\`** (top 10):\n${lines.join("\n")}`,
        chart: {
          type: "bar",
          title: `Count by ${colMatch}`,
          data: [
            {
              x: sorted.map((s) => s[0]),
              y: sorted.map((s) => s[1]),
              type: "bar",
              marker: { color: "#10b981" },
            },
          ],
        },
      };
    }
    // generic column info
    let text = `**\`${colMatch}\`** (${colProfile.type})\n• Missing: ${colProfile.missingCount} (${colProfile.missingPercent.toFixed(1)}%)\n• Unique: ${colProfile.uniqueCount}`;
    if (colProfile.mean !== undefined) {
      text += `\n• Mean: ${colProfile.mean.toFixed(2)}\n• Median: ${colProfile.median?.toFixed(2)}\n• Std: ${colProfile.std?.toFixed(2)}\n• Min: ${colProfile.min}\n• Max: ${colProfile.max}`;
    }
    if (colProfile.topValues && colProfile.topValues.length > 0) {
      text += `\n• Top values: ${colProfile.topValues.map((t) => `${t.value} (${t.count})`).join(", ")}`;
    }
    return { text };
  }

  // Dashboard
  if (
    q.includes("dashboard") ||
    q.includes("visualize") ||
    q.includes("chart") ||
    q.includes("plot") ||
    q.includes("graph")
  ) {
    const charts = generateDashboard(sheet);
    return {
      text: `I've generated **${charts.length} charts** for your dataset. View them all in the Dashboard tab. Here's the correlation heatmap:`,
      chart: charts.find((c) => c.type === "heatmap") ?? charts[0],
    };
  }

  // Memory / size
  if (q.includes("memory") || q.includes("size") || q.includes("storage")) {
    return {
      text: `The dataset uses approximately **${profile.memoryUsage}** of memory.`,
    };
  }

  // Fallback: provide context-aware help
  return {
    text: `I couldn't fully understand that question. Here's what I can help with:

• **Statistics**: "What is the average/median/min/max of [column]?"
• **Data quality**: "How many missing values?" / "How many duplicates?"
• **Correlation**: "Which columns are correlated?"
• **Regression**: "Run a regression" / "Predict [column]"
• **Forecasting**: "Forecast [column]"
• **Visualization**: "Show the distribution of [column]" / "Generate a dashboard"
• **Overview**: "Give me a summary" / "What are the data types?"

Your columns are: ${sheet.columns.map((c) => `\`${c}\``).join(", ")}`,
  };
}

function findColumn(q: string, columns: string[]): string | null {
  for (const c of columns) {
    if (q.includes(c.toLowerCase())) return c;
  }
  return null;
}

function strengthLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return r > 0 ? "strong positive" : "strong negative";
  if (abs > 0.4) return r > 0 ? "moderate positive" : "moderate negative";
  if (abs > 0.2) return r > 0 ? "weak positive" : "weak negative";
  return "negligible";
}
