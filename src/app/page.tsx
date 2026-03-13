"use client";

import { useState } from "react";

type AnalysisResult = {
  summary: string;
  mistakes: string[];
  trainingTasks: string[];
};

export default function Home() {
  const [pgn, setPgn] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!pgn.trim()) {
      setError("Please paste a PGN first.");
      setAnalysis(null);
      return;
    }

    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn: pgn.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed.");
        setAnalysis(null);
        return;
      }

      setAnalysis(data);
    } catch {
      setError("Request failed.");
      setAnalysis(null);
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
        className="px-4 py-2 rounded-lg border"
      >
        Analyze Game
      </button>

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