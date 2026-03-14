import { describe, it, expect, beforeEach } from "vitest";
import { loadHistory, saveAnalysis, clearHistory } from "../history";

const fakeStorage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(fakeStorage)) delete fakeStorage[key];

  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => fakeStorage[k] ?? null,
      setItem: (k: string, v: string) => { fakeStorage[k] = v; },
      removeItem: (k: string) => { delete fakeStorage[k]; },
    },
    writable: true,
    configurable: true,
  });
});

const sampleAnalysis = {
  summary: "A solid game.",
  mistakes: ["Missed a tactic on move 12"],
  trainingTasks: ["Practice knight forks"],
  criticalMoments: ["Move 12 was key"],
};

const sampleMeta = { white: "Alice", black: "Bob", result: "1-0" };

describe("history helpers", () => {
  it("returns empty array when no history exists", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("saves and loads a single entry", () => {
    saveAnalysis("1. e4 e5", "w", sampleAnalysis, sampleMeta);
    const entries = loadHistory();
    expect(entries).toHaveLength(1);
    expect(entries[0].white).toBe("Alice");
    expect(entries[0].black).toBe("Bob");
    expect(entries[0].result).toBe("1-0");
    expect(entries[0].userColor).toBe("w");
    expect(entries[0].summary).toBe("A solid game.");
    expect(entries[0].mistakes).toEqual(["Missed a tactic on move 12"]);
    expect(entries[0].criticalMoments).toEqual(["Move 12 was key"]);
  });

  it("newest entries are first", () => {
    saveAnalysis("1. e4 e5", "w", sampleAnalysis, { ...sampleMeta, white: "First" });
    saveAnalysis("1. d4 d5", "b", sampleAnalysis, { ...sampleMeta, white: "Second" });
    const entries = loadHistory();
    expect(entries).toHaveLength(2);
    expect(entries[0].white).toBe("Second");
    expect(entries[1].white).toBe("First");
  });

  it("caps at 50 entries", () => {
    for (let i = 0; i < 55; i++) {
      saveAnalysis(`game ${i}`, "", sampleAnalysis, sampleMeta);
    }
    expect(loadHistory()).toHaveLength(50);
  });

  it("clearHistory removes all entries", () => {
    saveAnalysis("1. e4 e5", "w", sampleAnalysis, sampleMeta);
    expect(loadHistory()).toHaveLength(1);
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it("handles missing criticalMoments gracefully", () => {
    const noCritical = { summary: "ok", mistakes: [], trainingTasks: [] };
    saveAnalysis("1. e4", "", noCritical, {});
    const entries = loadHistory();
    expect(entries[0].criticalMoments).toEqual([]);
    expect(entries[0].white).toBe("?");
    expect(entries[0].black).toBe("?");
    expect(entries[0].result).toBe("*");
  });

  it("roundtrip: save, load, clear, load returns empty", () => {
    saveAnalysis("1. e4 e5", "w", sampleAnalysis, sampleMeta);
    saveAnalysis("1. d4 d5", "b", sampleAnalysis, sampleMeta);
    expect(loadHistory()).toHaveLength(2);
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});
