import type { Move } from "chess.js";

const PIECE_NAMES: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

export type PieceCounts = {
  pawn: number;
  knight: number;
  bishop: number;
  rook: number;
  queen: number;
};

export type BoardSnapshot = {
  white: PieceCounts;
  black: PieceCounts;
  whiteLocations: Record<string, string[]>;
  blackLocations: Record<string, string[]>;
};

export type MoveFacts = {
  ply: number;
  side: "White" | "Black";
  movedPiece: string;
  from: string;
  to: string;
  captured: string | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isPromotion: boolean;
  promotedTo: string | null;
  isRecapture: boolean;
  isTrade: boolean;
  boardAfter: BoardSnapshot;
};

export function boardSnapshotFromFen(fen: string): BoardSnapshot {
  const placement = fen.split(" ")[0];
  const white: PieceCounts = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 };
  const black: PieceCounts = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 };
  const whiteLocs: Record<string, string[]> = {};
  const blackLocs: Record<string, string[]> = {};

  const rows = placement.split("/");
  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const ch of rows[rank]) {
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
      } else {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const lower = ch.toLowerCase();
        const pieceName = PIECE_NAMES[lower];
        if (pieceName && pieceName !== "king") {
          const isWhite = ch === ch.toUpperCase();
          const counts = isWhite ? white : black;
          const locs = isWhite ? whiteLocs : blackLocs;
          counts[pieceName as keyof PieceCounts]++;
          if (!locs[pieceName]) locs[pieceName] = [];
          locs[pieceName].push(square);
        }
        file++;
      }
    }
  }

  return { white, black, whiteLocations: whiteLocs, blackLocations: blackLocs };
}

export function buildMoveFacts(
  verboseHistory: Move[],
  plyIndex: number,
  fenAfter: string
): MoveFacts {
  const move = verboseHistory[plyIndex];
  const ply = plyIndex + 1;
  const side: "White" | "Black" = ply % 2 === 1 ? "White" : "Black";

  const captured = move.captured ? PIECE_NAMES[move.captured] ?? null : null;
  const movedPiece = PIECE_NAMES[move.piece] ?? move.piece;

  let isRecapture = false;
  if (captured && plyIndex > 0) {
    const prev = verboseHistory[plyIndex - 1];
    if (prev.captured && prev.to === move.to) {
      isRecapture = true;
    }
  }

  let isTrade = false;
  if (captured && move.captured) {
    const capturedValue = PIECE_VALUES[move.captured] ?? 0;
    const movedValue = PIECE_VALUES[move.piece] ?? 0;
    if (Math.abs(capturedValue - movedValue) <= 1 && capturedValue > 0) {
      isTrade = true;
    }
  }

  return {
    ply,
    side,
    movedPiece,
    from: move.from,
    to: move.to,
    captured,
    isCheck: move.san.includes("+") || move.san.includes("#"),
    isCheckmate: move.san.includes("#"),
    isPromotion: !!move.promotion,
    promotedTo: move.promotion ? (PIECE_NAMES[move.promotion] ?? null) : null,
    isRecapture,
    isTrade,
    boardAfter: boardSnapshotFromFen(fenAfter),
  };
}

export function formatBoardSnapshot(snap: BoardSnapshot): string {
  const lines: string[] = [];
  const formatSide = (name: string, counts: PieceCounts, locs: Record<string, string[]>) => {
    const parts: string[] = [];
    for (const [piece, count] of Object.entries(counts)) {
      if (count > 0) {
        const squares = locs[piece] ?? [];
        parts.push(`${count} ${piece}${count > 1 ? "s" : ""} (${squares.join(", ")})`);
      }
    }
    lines.push(`${name}: ${parts.join(", ")}`);
  };
  formatSide("White", snap.white, snap.whiteLocations);
  formatSide("Black", snap.black, snap.blackLocations);
  return lines.join("\n");
}

export function formatMoveFacts(facts: MoveFacts): string {
  const parts: string[] = [];
  parts.push(`${facts.side} played ${facts.movedPiece} ${facts.from}-${facts.to}`);
  if (facts.captured) {
    parts.push(`captures ${facts.captured}`);
    if (facts.isRecapture) parts.push("(recapture)");
    if (facts.isTrade) parts.push("(trade)");
  }
  if (facts.isPromotion && facts.promotedTo) parts.push(`promotes to ${facts.promotedTo}`);
  if (facts.isCheckmate) parts.push("checkmate");
  else if (facts.isCheck) parts.push("check");

  const lines = [parts.join(", ")];
  lines.push("Board after this move:");
  lines.push(formatBoardSnapshot(facts.boardAfter));
  return lines.join("\n");
}
