import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import type { ChatMessage, DatasetProfile, SheetData } from "../types";
import { answerQuestion } from "../lib/chatEngine";
import { ChartCard } from "./ChartCard";

interface ChatPanelProps {
  sheet: SheetData;
  profile: DatasetProfile;
}

const suggestedQuestions = [
  "Give me a summary of the dataset",
  "How many missing values are there?",
  "Which columns are correlated?",
  "What are the data types?",
  "How many duplicate rows exist?",
];

export function ChatPanel({ sheet, profile }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `I've analyzed your dataset **${sheet.name}** with ${profile.rowCount} rows and ${profile.columnCount} columns. Ask me anything about your data!`,
        timestamp: Date.now(),
      },
    ]);
  }, [sheet, profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const ask = (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: ChatMessage = {
      role: "user",
      content: question,
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate AI thinking time for better UX
    setTimeout(
      () => {
        const result = answerQuestion(question, { sheet, profile });
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: result.text,
          timestamp: Date.now(),
          chart: result.chart,
        };
        setMessages((m) => [...m, assistantMsg]);
        setLoading(false);
      },
      400 + Math.random() * 400,
    );
  };

  return (
    <div className="glass rounded-2xl flex flex-col h-[calc(100vh-180px)] animate-fade-in">
      <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-md animate-pulse-glow" />
          <div className="relative w-10 h-10 rounded-xl glass flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-400" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">AI Data Assistant</h3>
          <p className="text-xs text-slate-400">
            Grounded in your dataset — no hallucination
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-slide-up ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                msg.role === "user"
                  ? "bg-blue-500/20 text-blue-400"
                  : "glass text-slate-300"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-500/20 border border-blue-400/20 text-slate-100"
                  : "glass text-slate-200"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {formatContent(msg.content)}
              </div>
              {msg.chart && (
                <div className="mt-3 glass rounded-xl p-2 overflow-hidden">
                  <ChartCard chart={msg.chart} height={260} />
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg glass flex items-center justify-center">
              <Bot className="w-4 h-4 text-slate-300" />
            </div>
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-sm text-slate-400">Analyzing data...</span>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="text-xs px-3 py-1.5 rounded-full glass hover:bg-blue-500/10 hover:border-blue-400/30 text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-blue-400" />
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-slate-700/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder="Ask a question about your data..."
            className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30"
          />
          <button
            onClick={() => ask(input)}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatContent(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-700/50 text-cyan-300 text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
