"use client";

import { useState, useEffect } from "react";
import {
  loadHistory,
  saveAnalysis,
  clearHistory,
  type AnalysisEntry,
} from "@/lib/history";
import {
  SCREENSHOT_DEMO,
  SCREENSHOT_DEMO_ANALYSIS,
  SCREENSHOT_DEMO_HISTORY,
  SCREENSHOT_DEMO_PATTERNS,
  SCREENSHOT_DEMO_PGN,
} from "@/lib/screenshot-demo";
import GameBoard from "@/components/GameBoard";

type CriticalMoment = {
  text: string;
  ply: number | null;
};

type AnalysisResult = {
  summary: string;
  mistakes: string[];
  trainingTasks: string[];
  criticalMoments?: CriticalMoment[];
  meta?: { white?: string; black?: string; result?: string };
};

type PatternsResult = {
  recurringWeaknesses: string[];
  strengths: string[];
  studyPlan: string[];
};

const dateFormatterUtc = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

function formatDateUtc(isoDate: string): string {
  return dateFormatterUtc.format(new Date(isoDate));
}

function LoadingDots() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(id);
  }, []);

  return <span>{dots}</span>;
}

function SectionCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
        {label}
      </h3>
      {children}
    </div>
  );
}

export default function Home() {
  const [pgn, setPgn] = useState(SCREENSHOT_DEMO ? SCREENSHOT_DEMO_PGN : "");
  const [userColor, setUserColor] = useState<"w" | "b" | "">("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<AnalysisEntry[]>([]);
  const [patterns, setPatterns] = useState<PatternsResult | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsError, setPatternsError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const displayAnalysis = SCREENSHOT_DEMO ? SCREENSHOT_DEMO_ANALYSIS : analysis;
  const displayHistory = SCREENSHOT_DEMO ? SCREENSHOT_DEMO_HISTORY : history;
  const displayPatterns = SCREENSHOT_DEMO ? SCREENSHOT_DEMO_PATTERNS : patterns;

  async function handleAnalyze() {
    if (SCREENSHOT_DEMO) return;
    if (!pgn.trim()) {
      setError("Please paste a PGN first.");
      setAnalysis(null);
      return;
    }

    setError("");
    setAnalysis(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: pgn.trim(), userColor: userColor || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed.");
        return;
      }

      setAnalysis(data);
      saveAnalysis(
        pgn.trim(),
        userColor,
        {
          ...data,
          criticalMoments: data.criticalMoments?.map((cm: CriticalMoment) => cm.text) ?? [],
        },
        data.meta ?? {},
      );
      setHistory(loadHistory());
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePatterns() {
    if (SCREENSHOT_DEMO) return;
    if (history.length < 3) return;
    setPatternsError("");
    setPatterns(null);
    setPatternsLoading(true);
    try {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyses: history.map((h) => ({
            result: h.result,
            userColor: h.userColor,
            summary: h.summary,
            mistakes: h.mistakes,
            trainingTasks: h.trainingTasks,
            criticalMoments: h.criticalMoments,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPatternsError(data.error || "Pattern analysis failed.");
        return;
      }
      setPatterns(data);
    } catch {
      setPatternsError("Request failed.");
    } finally {
      setPatternsLoading(false);
    }
  }

  function handleClearHistory() {
    if (SCREENSHOT_DEMO) return;
    clearHistory();
    setHistory([]);
    setPatterns(null);
  }

  const dateRange =
    displayHistory.length >= 2
      ? `${formatDateUtc(displayHistory[displayHistory.length - 1].date)} - ${formatDateUtc(displayHistory[0].date)}`
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 sm:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {SCREENSHOT_DEMO ? "♞ Kibitz — Chess PGN Analyzer" : "Chess PGN Analyzer"}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
            {SCREENSHOT_DEMO ? "Paste a PGN and get a coach-level review grounded in engine analysis — critical moments, recurring patterns, and practical training advice." : "Paste a PGN. Get a coach-level review grounded in engine analysis — not just the best moves, but what went wrong and what to practice."}
          </p>
          {SCREENSHOT_DEMO && (
            <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
              Demo mode — sample review shown
            </p>
          )}
        </header>

        <textarea
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          placeholder="Paste your PGN here..."
          className="w-full h-64 rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-300"
        />

        <fieldset className="mt-4 flex items-center gap-5">
          <legend className="sr-only">Which side did you play?</legend>
          {[
            { value: "", label: "Either side" },
            { value: "w", label: "I played White" },
            { value: "b", label: "I played Black" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400 cursor-pointer"
            >
              <input
                type="radio"
                name="userColor"
                value={opt.value}
                checked={userColor === opt.value}
                onChange={() => setUserColor(opt.value as "w" | "b" | "")}
                className="accent-gray-900 dark:accent-zinc-300"
              />
              {opt.label}
            </label>
          ))}
        </fieldset>

        <div className="mt-4">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? "Analyzing..." : "Analyze Game"}
          </button>
        </div>

        {loading && (
          <div className="mt-5 animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Running engine analysis and generating insights
              <LoadingDots />
            </p>
          </div>
        )}

        {!SCREENSHOT_DEMO && error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {displayAnalysis && (
          <div className="mt-8 space-y-4">
            <GameBoard
              pgn={pgn.trim()}
              boardOrientation={userColor === "b" ? "black" : "white"}
              criticalMomentPlies={
                displayAnalysis.criticalMoments
                  ?.filter((cm): cm is CriticalMoment & { ply: number } => cm.ply !== null)
                  .map((cm) => ({ ply: cm.ply, label: cm.text }))
              }
            />

            <SectionCard label="Summary">
              <p className="text-sm leading-relaxed">{displayAnalysis.summary}</p>
            </SectionCard>

            {displayAnalysis.criticalMoments &&
              displayAnalysis.criticalMoments.length > 0 && (
                <SectionCard label="Critical Moments">
                  <ul className="space-y-3">
                    {displayAnalysis.criticalMoments.map((m, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-gray-300 pl-3 text-sm leading-relaxed dark:border-zinc-600"
                      >
                        {m.text}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

            <SectionCard label="Mistakes">
              <ul className="space-y-2">
                {displayAnalysis.mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-0.5 text-gray-400 dark:text-zinc-500">
                      &bull;
                    </span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard label="Training Tasks">
              <ul className="space-y-2">
                {displayAnalysis.trainingTasks.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-0.5 text-gray-400 dark:text-zinc-500">
                      &bull;
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        )}

        {/* Your Patterns */}
        {displayHistory.length > 0 && (
          <section className="mt-16 border-t border-gray-200 pt-10 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold tracking-tight">
                Your Patterns
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowHistory((s) => !s)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  {showHistory ? "Hide History" : "Show History"}
                </button>
                <button
                  onClick={handlePatterns}
                  disabled={patternsLoading || displayHistory.length < 3}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {patternsLoading ? "Analyzing..." : "Find Patterns"}
                </button>
              </div>
            </div>
            <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400">
              Based on {displayHistory.length} game{displayHistory.length !== 1 ? "s" : ""} analyzed
              {dateRange ? ` (${dateRange})` : ""}
              {displayHistory.length < 3 && " — analyze at least 3 games to unlock pattern detection"}
            </p>

            {showHistory && (
              <div className="mb-6 space-y-2">
                {displayHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {entry.white} vs {entry.black}
                      </span>
                      <span className="text-gray-400 dark:text-zinc-500">
                        {entry.result}
                      </span>
                      {entry.userColor && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">
                          {entry.userColor === "w" ? "White" : "Black"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-zinc-500">
                      {formatDateUtc(entry.date)}
                    </span>
                  </div>
                ))}
                <button
                  onClick={handleClearHistory}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Clear all history
                </button>
              </div>
            )}

            {patternsLoading && (
              <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  Finding recurring patterns across your games
                  <LoadingDots />
                </p>
              </div>
            )}

            {!SCREENSHOT_DEMO && patternsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {patternsError}
                </p>
              </div>
            )}

            {displayPatterns && (
              <div className="space-y-4">
                {displayPatterns.recurringWeaknesses.length > 0 && (
                  <SectionCard label="Recurring Weaknesses">
                    <ul className="space-y-2">
                      {displayPatterns.recurringWeaknesses.map((w, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm leading-relaxed"
                        >
                          <span className="mt-0.5 text-red-400 dark:text-red-500">
                            &bull;
                          </span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {displayPatterns.strengths.length > 0 && (
                  <SectionCard label="Strengths">
                    <ul className="space-y-2">
                      {displayPatterns.strengths.map((s, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm leading-relaxed"
                        >
                          <span className="mt-0.5 text-green-500 dark:text-green-400">
                            &bull;
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {displayPatterns.studyPlan.length > 0 && (
                  <SectionCard label="Study Plan">
                    <ol className="space-y-2">
                      {displayPatterns.studyPlan.map((t, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm leading-relaxed"
                        >
                          <span className="mt-0.5 min-w-[1.25rem] text-gray-400 dark:text-zinc-500">
                            {i + 1}.
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ol>
                  </SectionCard>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="w-full max-w-3xl mx-auto px-6 pb-8 sm:px-8">
        <p className="text-xs text-gray-400 dark:text-zinc-600">
          Engine analysis powered by Stockfish. Explanations by OpenAI.
        </p>
      </footer>
    </div>
  );
}
