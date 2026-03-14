"use client";

import { useState, useEffect } from "react";

type AnalysisResult = {
  summary: string;
  mistakes: string[];
  trainingTasks: string[];
};

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

export default function Home() {
  const [pgn, setPgn] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
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
        body: JSON.stringify({ pgn: pgn.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed.");
        return;
      }

      setAnalysis(data);
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Chess PGN Analyzer</h1>

      <p className="mb-4 text-sm text-gray-600">
        Paste a chess PGN below and click Analyze Game.
      </p>

      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        placeholder="Paste your PGN here..."
        className="w-full h-80 p-4 border rounded-lg mb-4 font-mono text-sm"
      />

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="px-4 py-2 rounded-lg border disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Analyze Game"}
      </button>

      {loading && (
        <p className="mt-3 text-sm text-gray-500">
          Analyzing game, please wait a few moments<LoadingDots />
        </p>
      )}

      {error && (
        <div className="mt-6 p-4 border rounded-lg">
          <h2 className="font-semibold mb-2">Result</h2>
          <p>{error}</p>
        </div>
      )}

      {analysis && (
        <div className="mt-6 p-4 border rounded-lg">
          <h2 className="font-semibold mb-2">Result</h2>
          <p>{analysis.summary}</p>
          <p>Mistakes: {analysis.mistakes.join(", ")}</p>
          <p>Training tasks: {analysis.trainingTasks.join(", ")}</p>
        </div>
      )}
    </main>
  );
}
