import type { AnalysisEntry } from "@/lib/history";

/** Set to `false` to use live analysis, history, and patterns. */
export const SCREENSHOT_DEMO = true;

const DEMO_DATE = "2026-03-27T12:00:00.000Z";

/**
 * Hardcoded payloads for screenshot mode.
 * Types mirror `src/app/page.tsx` (`AnalysisResult`, `PatternsResult`) and `AnalysisEntry`.
 */
export const SCREENSHOT_DEMO_ANALYSIS: {
  summary: string;
  mistakes: string[];
  trainingTasks: string[];
  criticalMoments?: string[];
  meta?: { white?: string; black?: string; result?: string };
} = {
  summary:
    "White used rapid development, central control, and active piece play to seize the initiative early. Black fell behind in development and left the king stuck in the center, which gave White strong attacking chances. The turning point came when White opened lines and sacrificed material to keep the attack going. The game finished with a classic mating pattern driven by coordination and tempo.",
  criticalMoments: [
    "10.Nxb5 — White begins a tactical operation to open lines on the queenside and punish Black's loose coordination.",
    "13.Rxd7 — A decisive exchange sacrifice. White gives material to keep Black's king in danger and prevent the defenders from organizing.",
    "14.Rd1 — White brings the last rook into the attack and increases pressure on the d-file, setting up the final mating sequence.",
  ],
  mistakes: [
    "Black lost too much time with piece moves while failing to complete development.",
    "The king remained in the center while White's pieces became more active and better coordinated.",
    "Defensive resources were too passive once White's attack gained momentum.",
    "White's play shows the value of initiative: material mattered less than activity, open lines, and king safety.",
  ],
  trainingTasks: [
    "Practice positions where one side is ahead in development and the opponent's king is still in the center.",
    "Solve tactical puzzles involving exchange sacrifices to maintain initiative.",
    "Study attacking patterns based on open files, rook activity, and exposed kings.",
    "Review model games where development and coordination outweigh material.",
  ],
  meta: {},
};

/** Must be non-empty for the “Your Patterns” block to render; use 3+ rows to unlock “Find Patterns”. */
export const SCREENSHOT_DEMO_HISTORY: AnalysisEntry[] = [
  {
    id: "demo-anderssen-dufresne",
    date: DEMO_DATE,
    pgn: "[Event \"Demo\"]\n[White \"Adolf Anderssen\"]\n[Black \"Jean Dufresne\"]\n[Result \"1-0\"]\n\n1. e4 e5",
    userColor: "",
    white: "Adolf Anderssen",
    black: "Jean Dufresne",
    result: "1-0",
    summary: "",
    mistakes: [],
    trainingTasks: [],
    criticalMoments: [],
  },
  {
    id: "demo-morphy-opera",
    date: DEMO_DATE,
    pgn: "[Event \"Demo\"]\n[White \"Paul Morphy\"]\n[Black \"Duke Karl / Count Isouard\"]\n[Result \"1-0\"]\n\n1. e4 e5",
    userColor: "",
    white: "Paul Morphy",
    black: "Duke Karl / Count Isouard",
    result: "1-0",
    summary: "",
    mistakes: [],
    trainingTasks: [],
    criticalMoments: [],
  },
  {
    id: "demo-paulsen-morphy",
    date: DEMO_DATE,
    pgn: "[Event \"Demo\"]\n[White \"Louis Paulsen\"]\n[Black \"Paul Morphy\"]\n[Result \"0-1\"]\n\n1. e4 e5",
    userColor: "",
    white: "Louis Paulsen",
    black: "Paul Morphy",
    result: "0-1",
    summary: "",
    mistakes: [],
    trainingTasks: [],
    criticalMoments: [],
  },
];

export const SCREENSHOT_DEMO_PATTERNS: {
  recurringWeaknesses: string[];
  strengths: string[];
  studyPlan: string[];
} = {
  recurringWeaknesses: [
    "Recurring problems with piece coordination, especially in defense — rooks, queen, and bishops frequently block each other or fail to protect key squares.",
    "King safety is often neglected when under pressure; open files and diagonals around the king are repeatedly left vulnerable to attacks and mating patterns.",
    "Tendency to focus on material gain at the expense of recognizing or preventing the opponent's tactical threats and initiative.",
    "Frequently misses or hesitates to exploit tactical opportunities and sometimes defaults to safe, automatic moves instead of seeking forcing continuations.",
    "Delayed or inefficient activation of heavy pieces (notably rooks and bishops), often leading to a passive or disorganized defense during critical moments.",
  ],
  strengths: [
    "Shows resourcefulness and the potential to create or recognize fierce attacking ideas, especially when material is imbalanced.",
    "Consistently demonstrates the ability to apply pressure and identify checkmating patterns once the opponent's king is exposed.",
  ],
  studyPlan: [
    "Prioritize solving exercises on defensive coordination, focusing on scenarios where all pieces must work together to shield the king and cover critical squares, especially on open files and near the back rank.",
    "Complete king safety drills: practice recognizing and neutralizing sacrificial attacks, escape routes, and building defensive setups when lines around the king open up.",
    "Work systematically on calculation and tactical vision using puzzles that require finding forcing moves and intermediate tactics, especially under pressure.",
    "Practice openings with a focus on rapid, harmonious development and ensuring that all pieces, particularly rooks and bishops, contribute to both attack and defense before the middlegame starts.",
    "Replay and annotate critical moments from personal games, specifically examining missed tactical chances and identifying how better calculation or less automatic play could have converted advantages or improved defense.",
  ],
};
