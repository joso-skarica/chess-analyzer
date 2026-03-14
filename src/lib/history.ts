const STORAGE_KEY = "chess-analyzer-history";
const MAX_ENTRIES = 50;

export type AnalysisEntry = {
  id: string;
  date: string;
  pgn: string;
  userColor: "w" | "b" | "";
  white: string;
  black: string;
  result: string;
  summary: string;
  mistakes: string[];
  trainingTasks: string[];
  criticalMoments: string[];
};

export function loadHistory(): AnalysisEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalysisEntry[];
  } catch {
    return [];
  }
}

export function saveAnalysis(
  pgn: string,
  userColor: "w" | "b" | "",
  analysis: {
    summary: string;
    mistakes: string[];
    trainingTasks: string[];
    criticalMoments?: string[];
  },
  meta: { white?: string; black?: string; result?: string }
): AnalysisEntry {
  const entry: AnalysisEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    pgn,
    userColor,
    white: meta.white ?? "?",
    black: meta.black ?? "?",
    result: meta.result ?? "*",
    summary: analysis.summary,
    mistakes: analysis.mistakes,
    trainingTasks: analysis.trainingTasks,
    criticalMoments: analysis.criticalMoments ?? [],
  };

  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return entry;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
