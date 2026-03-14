import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import {
  boardSnapshotFromFen,
  buildMoveFacts,
  formatBoardSnapshot,
  formatMoveFacts,
} from "@/lib/move-facts";

describe("boardSnapshotFromFen", () => {
  it("counts pieces correctly in the starting position", () => {
    const snap = boardSnapshotFromFen(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
    expect(snap.white).toEqual({ pawn: 8, knight: 2, bishop: 2, rook: 2, queen: 1 });
    expect(snap.black).toEqual({ pawn: 8, knight: 2, bishop: 2, rook: 2, queen: 1 });
  });

  it("counts correctly after material is traded off", () => {
    // Position where White has 1 rook, 5 pawns; Black has 1 rook, 5 pawns
    const snap = boardSnapshotFromFen(
      "4k3/5ppp/8/8/8/8/5PPP/4K2R w K - 0 30"
    );
    expect(snap.white.rook).toBe(1);
    expect(snap.white.pawn).toBe(3);
    expect(snap.white.queen).toBe(0);
    expect(snap.white.bishop).toBe(0);
    expect(snap.white.knight).toBe(0);
    expect(snap.black.rook).toBe(0);
    expect(snap.black.pawn).toBe(3);
  });

  it("identifies correct square locations for pieces", () => {
    const snap = boardSnapshotFromFen(
      "r3k2r/ppp2ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPP2PPP/R3K2R w KQkq - 0 10"
    );
    expect(snap.white.bishop).toBe(1);
    expect(snap.whiteLocations["bishop"]).toEqual(["c4"]);
    expect(snap.black.bishop).toBe(1);
    expect(snap.blackLocations["bishop"]).toEqual(["c5"]);
    expect(snap.white.knight).toBe(2);
    expect(snap.whiteLocations["knight"]).toContain("c3");
    expect(snap.whiteLocations["knight"]).toContain("f3");
  });

  it("does not confuse bishops and knights", () => {
    // Only bishops, no knights
    const snap = boardSnapshotFromFen(
      "4k3/8/8/8/2B2B2/8/8/4K3 w - - 0 1"
    );
    expect(snap.white.bishop).toBe(2);
    expect(snap.white.knight).toBe(0);
    expect(snap.whiteLocations["bishop"]).toContain("c4");
    expect(snap.whiteLocations["bishop"]).toContain("f4");
    expect(snap.whiteLocations["knight"]).toBeUndefined();
  });

  it("handles promoted queen correctly", () => {
    // White has 2 queens (original + promoted)
    const snap = boardSnapshotFromFen(
      "4k3/8/8/8/8/8/8/Q3KQ2 w - - 0 1"
    );
    expect(snap.white.queen).toBe(2);
    expect(snap.whiteLocations["queen"]).toContain("a1");
    expect(snap.whiteLocations["queen"]).toContain("f1");
  });

  it("counts single rook correctly — not two", () => {
    const snap = boardSnapshotFromFen(
      "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1"
    );
    expect(snap.white.rook).toBe(1);
    expect(snap.whiteLocations["rook"]).toEqual(["a1"]);
  });
});

describe("buildMoveFacts", () => {
  function replayGame(pgn: string) {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const verbose = chess.history({ verbose: true });
    const fens: string[] = [];
    const replay = new Chess();
    for (const m of verbose) {
      replay.move(m.san);
      fens.push(replay.fen());
    }
    return { verbose, fens };
  }

  it("detects a simple capture correctly", () => {
    const { verbose, fens } = replayGame("1. e4 d5 2. exd5");
    // Move index 2 = exd5 (ply 3, White's second move)
    const facts = buildMoveFacts(verbose, 2, fens[2]);
    expect(facts.movedPiece).toBe("pawn");
    expect(facts.captured).toBe("pawn");
    expect(facts.isRecapture).toBe(false);
    expect(facts.isTrade).toBe(true);
    expect(facts.boardAfter.black.pawn).toBe(7);
  });

  it("detects a recapture", () => {
    const { verbose, fens } = replayGame("1. e4 d5 2. exd5 Qxd5");
    // Qxd5 is ply 4, index 3
    const facts = buildMoveFacts(verbose, 3, fens[3]);
    expect(facts.movedPiece).toBe("queen");
    expect(facts.captured).toBe("pawn");
    expect(facts.isRecapture).toBe(true);
    expect(facts.to).toBe("d5");
  });

  it("detects a knight-for-bishop trade", () => {
    const { verbose, fens } = replayGame(
      "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. Bxc6 dxc6"
    );
    // Bxc6 is ply 7, index 6
    const facts7 = buildMoveFacts(verbose, 6, fens[6]);
    expect(facts7.movedPiece).toBe("bishop");
    expect(facts7.captured).toBe("knight");
    expect(facts7.isTrade).toBe(true);

    // dxc6 is ply 8, index 7 — recapture
    const facts8 = buildMoveFacts(verbose, 7, fens[7]);
    expect(facts8.movedPiece).toBe("pawn");
    expect(facts8.captured).toBe("bishop");
    expect(facts8.isRecapture).toBe(true);
  });

  it("tracks piece counts after exchanges", () => {
    const { verbose, fens } = replayGame(
      "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. Bxc6 dxc6"
    );
    const factsEnd = buildMoveFacts(verbose, 7, fens[7]);
    // After Bxc6 dxc6: White lost bishop, Black lost knight
    expect(factsEnd.boardAfter.white.bishop).toBe(1); // only dark-squared bishop left
    expect(factsEnd.boardAfter.black.knight).toBe(1); // only Nf6 left
  });

  it("detects promotion", () => {
    const { verbose, fens } = replayGame(
      "1. d4 e5 2. d5 e4 3. d6 e3 4. dxc7 exf2+ 5. Kxf2 d5 6. cxd8=Q+"
    );
    const lastIdx = verbose.length - 1;
    const facts = buildMoveFacts(verbose, lastIdx, fens[lastIdx]);
    expect(facts.isPromotion).toBe(true);
    expect(facts.promotedTo).toBe("queen");
    expect(facts.isCheck).toBe(true);
  });

  it("detects check and checkmate", () => {
    // Scholar's mate
    const { verbose, fens } = replayGame(
      "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#"
    );
    const lastIdx = verbose.length - 1;
    const facts = buildMoveFacts(verbose, lastIdx, fens[lastIdx]);
    expect(facts.isCheck).toBe(true);
    expect(facts.isCheckmate).toBe(true);
    expect(facts.captured).toBe("pawn");
  });
});

describe("formatBoardSnapshot", () => {
  it("produces readable output with correct counts", () => {
    const snap = boardSnapshotFromFen(
      "4k3/8/8/8/2B5/8/8/R3K3 w Q - 0 1"
    );
    const text = formatBoardSnapshot(snap);
    expect(text).toContain("White: 1 bishop (c4), 1 rook (a1)");
    expect(text).toContain("Black:");
    expect(text).not.toContain("2 rooks");
    expect(text).not.toContain("knight");
  });
});

describe("formatMoveFacts", () => {
  function replayGame(pgn: string) {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const verbose = chess.history({ verbose: true });
    const fens: string[] = [];
    const replay = new Chess();
    for (const m of verbose) {
      replay.move(m.san);
      fens.push(replay.fen());
    }
    return { verbose, fens };
  }

  it("includes recapture and trade labels when appropriate", () => {
    const { verbose, fens } = replayGame(
      "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. Bxc6 dxc6"
    );
    const facts = buildMoveFacts(verbose, 7, fens[7]);
    const text = formatMoveFacts(facts);
    expect(text).toContain("captures bishop");
    expect(text).toContain("(recapture)");
  });

  it("does not say recapture when there is none", () => {
    const { verbose, fens } = replayGame("1. e4 d5 2. exd5");
    const facts = buildMoveFacts(verbose, 2, fens[2]);
    const text = formatMoveFacts(facts);
    expect(text).toContain("captures pawn");
    expect(text).not.toContain("(recapture)");
  });
});
