import { Chess } from "chess.js";
import { analyzeFen } from "@/lib/engine";

export type CriticalMoment = {
  ply: number;
  moveLabel: string;
  moveText: string;
  side: "White" | "Black";
  fen: string;
  evalBefore: number | null;
  evalAfter: number | null;
  delta: number;
  bestMove: string | null;
};

export async function findCriticalMoments(
  history: string[],
  topN: number,
  depth = 10
): Promise<CriticalMoment[]> {
  const replay = new Chess();
  const evals: { ply: number; moveLabel: string; moveText: string; side: "White" | "Black"; fen: string; evalCp: number | null; bestMove: string | null }[] = [];

  for (let i = 0; i < history.length; i++) {
    replay.move(history[i]);

    const ply = i + 1;
    const moveNumber = Math.ceil(ply / 2);
    const side: "White" | "Black" = ply % 2 === 1 ? "White" : "Black";
    const moveLabel = `${moveNumber}${side === "White" ? ". White" : "... Black"}`;

    const result = await analyzeFen(replay.fen(), depth);

    evals.push({
      ply,
      moveLabel,
      moveText: history[i],
      side,
      fen: replay.fen(),
      evalCp: result.evalCp,
      bestMove: result.bestMove,
    });
  }

  const swings: CriticalMoment[] = [];

  for (let i = 1; i < evals.length; i++) {
    const before = evals[i - 1].evalCp;
    const after = evals[i].evalCp;

    if (before === null || after === null) continue;

    swings.push({
      ply: evals[i].ply,
      moveLabel: evals[i].moveLabel,
      moveText: evals[i].moveText,
      side: evals[i].side,
      fen: evals[i].fen,
      evalBefore: before,
      evalAfter: after,
      delta: Math.abs(after - before),
      bestMove: evals[i].bestMove,
    });
  }

  swings.sort((a, b) => b.delta - a.delta);
  return swings.slice(0, topN);
}
