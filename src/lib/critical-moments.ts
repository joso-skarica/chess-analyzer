import { Chess } from "chess.js";
import { analyzeFen } from "@/lib/engine";

const MIN_DELTA_CP = 50;
const MIN_PLY_DISTANCE = 4;

export type CriticalMoment = {
  ply: number;
  moveLabel: string;
  playedMove: string;
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
  const evals: {
    ply: number;
    moveLabel: string;
    playedMove: string;
    side: "White" | "Black";
    fen: string;
    evalCp: number | null;
    bestMove: string | null;
  }[] = [];

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
      playedMove: history[i],
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

    const delta = Math.abs(after - before);
    if (delta < MIN_DELTA_CP) continue;

    swings.push({
      ply: evals[i].ply,
      moveLabel: evals[i].moveLabel,
      playedMove: evals[i].playedMove,
      side: evals[i].side,
      fen: evals[i].fen,
      evalBefore: before,
      evalAfter: after,
      delta,
      bestMove: evals[i].bestMove,
    });
  }

  swings.sort((a, b) => b.delta - a.delta);

  const selected: CriticalMoment[] = [];
  for (const swing of swings) {
    if (selected.length >= topN) break;
    const tooClose = selected.some(
      (s) => Math.abs(s.ply - swing.ply) < MIN_PLY_DISTANCE
    );
    if (tooClose) continue;
    selected.push(swing);
  }

  selected.sort((a, b) => a.ply - b.ply);
  return selected;
}
