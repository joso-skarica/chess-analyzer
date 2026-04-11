"use client";

import { Chessboard } from "react-chessboard";
import { useGameReplay } from "@/hooks/useGameReplay";

type CriticalMomentPly = {
  ply: number;
  label: string;
};

type GameBoardProps = {
  pgn: string;
  boardOrientation?: "white" | "black";
  criticalMomentPlies?: CriticalMomentPly[];
};

export default function GameBoard({
  pgn,
  boardOrientation = "white",
  criticalMomentPlies,
}: GameBoardProps) {
  const {
    positions,
    currentPly,
    totalPlies,
    currentMoveLabel,
    goFirst,
    goPrev,
    goNext,
    goLast,
    goToPly,
  } = useGameReplay(pgn);

  if (positions.length === 0) return null;

  const fen = positions[currentPly] ?? positions[positions.length - 1];

  return (
    <div className="space-y-3">
      <div className="mx-auto w-full max-w-[400px]">
        <Chessboard
          options={{
            position: fen,
            boardOrientation,
            allowDragging: false,
            allowDrawingArrows: false,
            animationDurationInMs: 150,
          }}
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        <NavButton onClick={goFirst} disabled={currentPly === 0} label="First move">
          ⏮
        </NavButton>
        <NavButton onClick={goPrev} disabled={currentPly === 0} label="Previous move">
          ◀
        </NavButton>
        <span className="min-w-[120px] text-center text-sm font-medium tabular-nums">
          {currentMoveLabel}
        </span>
        <NavButton onClick={goNext} disabled={currentPly === totalPlies} label="Next move">
          ▶
        </NavButton>
        <NavButton onClick={goLast} disabled={currentPly === totalPlies} label="Last move">
          ⏭
        </NavButton>
      </div>

      {criticalMomentPlies && criticalMomentPlies.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            Jump to:
          </span>
          {criticalMomentPlies.map((cm, i) => (
            <button
              key={i}
              onClick={() => goToPly(cm.ply)}
              className="rounded border border-gray-300 px-2 py-1 text-xs font-medium transition-colors hover:bg-gray-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
              title={cm.label}
            >
              Moment {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed dark:border-zinc-600 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
