"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";

export type GameReplay = {
  positions: string[];
  moves: string[];
  currentPly: number;
  totalPlies: number;
  currentMoveLabel: string;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;
  goToPly: (ply: number) => void;
};

function replayPgn(pgn: string): { positions: string[]; moves: string[] } {
  const game = new Chess();
  try {
    game.loadPgn(pgn);
  } catch {
    return { positions: [], moves: [] };
  }

  const moves = game.history();
  if (moves.length === 0) return { positions: [], moves: [] };

  const replay = new Chess();
  const positions: string[] = [replay.fen()];

  for (const move of moves) {
    replay.move(move);
    positions.push(replay.fen());
  }

  return { positions, moves };
}

export function useGameReplay(pgn: string): GameReplay {
  const { positions, moves } = useMemo(() => replayPgn(pgn), [pgn]);
  const totalPlies = moves.length;

  const [plyState, setPlyState] = useState({ pgn, ply: totalPlies });

  const currentPly =
    plyState.pgn === pgn
      ? Math.max(0, Math.min(plyState.ply, totalPlies))
      : totalPlies;

  const setPly = useCallback(
    (plyOrUpdater: number | ((prev: number) => number)) => {
      setPlyState((prev) => {
        const next =
          typeof plyOrUpdater === "function"
            ? plyOrUpdater(prev.ply)
            : plyOrUpdater;
        return { pgn: prev.pgn, ply: next };
      });
    },
    [],
  );

  const goFirst = useCallback(() => setPly(0), [setPly]);
  const goLast = useCallback(() => setPly(totalPlies), [setPly, totalPlies]);
  const goPrev = useCallback(
    () => setPly((p) => Math.max(0, p - 1)),
    [setPly],
  );
  const goNext = useCallback(
    () => setPly((p) => Math.min(totalPlies, p + 1)),
    [setPly, totalPlies],
  );
  const goToPly = useCallback(
    (ply: number) => setPly(Math.max(0, Math.min(ply, totalPlies))),
    [setPly, totalPlies],
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPly((p) => Math.max(0, p - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPly((p) => Math.min(totalPlies, p + 1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setPly, totalPlies]);

  const currentMoveLabel =
    currentPly === 0
      ? "Start position"
      : (() => {
          const moveNum = Math.ceil(currentPly / 2);
          const side = currentPly % 2 === 1 ? "." : "...";
          return `${moveNum}${side} ${moves[currentPly - 1]}`;
        })();

  return {
    positions,
    moves,
    currentPly,
    totalPlies,
    currentMoveLabel,
    goFirst,
    goPrev,
    goNext,
    goLast,
    goToPly,
  };
}
