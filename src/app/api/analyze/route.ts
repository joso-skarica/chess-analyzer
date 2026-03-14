import OpenAI from "openai";
import { Chess } from "chess.js";
import { NextResponse } from "next/server";
import { findCriticalMoments } from "@/lib/critical-moments";
import { buildMoveFacts, boardSnapshotFromFen, formatMoveFacts, formatBoardSnapshot } from "@/lib/move-facts";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a practical chess coach reviewing a student's game.

DATA YOU RECEIVE
- A structured move log listing every move with full piece names, squares, and captures.
- Engine-flagged critical moments. Each includes: the move played, eval data, an interpretation, and a BOARD SNAPSHOT showing the exact pieces and their squares after that move.
- A final board snapshot at game end.
- All eval values are from White's perspective: positive = good for White, negative = good for Black.
- Each critical moment includes an "isUserMove" field when the user's color is known.

HARD ACCURACY RULES — VIOLATIONS ARE UNACCEPTABLE
- The board snapshots are machine-generated ground truth. When you mention piece counts, piece types, or piece locations, you MUST match the snapshot exactly.
- If the snapshot says White has 1 rook, do NOT say White has two rooks or "doubled rooks."
- If the snapshot says a bishop is on c4, do NOT call it a knight.
- Do NOT claim "recapture" or "trade" unless the move facts explicitly say so.
- Do NOT claim "bishop pair," "connected rooks," "passed pawn," or any positional motif unless the snapshot piece locations support it.
- If you are unsure about a detail, omit it. Never fabricate board state.

PERSPECTIVE RULES
- If the user's color is provided, address their moves as "you" and the opponent's as "your opponent."
- Focus on the user's decisions. Opponent moves are context, not the focus.
- When isUserMove is false, frame it as what the opponent did, not advice for the opponent.
- If no user color is provided, use "White" and "Black."

Return valid JSON with exactly these four keys.

summary
A 2-4 sentence overview of how the game went — opening character, when balance shifted, how it ended.

criticalMoments
An array of exactly 3 strings, one per engine-flagged moment. Each should explain:
  1. What move was played and what it did (use the piece name from the move facts)
  2. Why it mattered (material, activity, king safety, initiative)
  3. How the game changed after it
Write 2-3 sentences per moment. Vary your phrasing.

mistakes
An array of strings covering broader decision-making patterns. Do NOT restate critical moments. Identify recurring themes: positional habits, strategic misunderstandings, piece coordination issues, endgame technique gaps.

trainingTasks
An array of concrete, actionable practice suggestions tied to the mistake patterns.

Style: speak plainly like a strong club player. Be direct, concise, vary your sentence openings. Never pad with generic chess wisdom.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pgn = body.pgn;
    const userColor: string | undefined = body.userColor;

    if (!pgn || typeof pgn !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid PGN" },
        { status: 400 }
      );
    }

    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch {
      return NextResponse.json(
        { error: "Invalid PGN. Could not parse the game." },
        { status: 400 }
      );
    }

    const PIECE_NAMES: Record<string, string> = {
      p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
    };

    const sanHistory = chess.history();
    if (sanHistory.length === 0) {
      return NextResponse.json(
        { error: "PGN contains no moves." },
        { status: 400 }
      );
    }

    const verboseHistory = chess.history({ verbose: true });

    const moveLog = verboseHistory.map((m, i) => {
      const ply = i + 1;
      const moveNum = Math.ceil(ply / 2);
      const side = ply % 2 === 1 ? "White" : "Black";
      const piece = PIECE_NAMES[m.piece] ?? m.piece;
      let desc = `${piece} ${m.from}-${m.to}`;
      if (m.captured) {
        desc += `, captures ${PIECE_NAMES[m.captured] ?? m.captured}`;
      }
      if (m.flags.includes("e")) desc += " (en passant)";
      if (m.flags.includes("k")) desc += " (kingside castle)";
      if (m.flags.includes("q")) desc += " (queenside castle)";
      if (m.san.includes("+")) desc += ", check";
      if (m.san.includes("#")) desc += ", checkmate";
      if (m.promotion) desc += `, promotes to ${PIECE_NAMES[m.promotion] ?? m.promotion}`;
      return `${moveNum}${side === "White" ? "." : "..."} ${side}: ${desc}`;
    });

    const metadata = {
      white: chess.getHeaders().White ?? "Unknown",
      black: chess.getHeaders().Black ?? "Unknown",
      result: chess.getHeaders().Result ?? "*",
      moveCount: sanHistory.length,
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
      isStalemate: chess.isStalemate(),
    };

    const criticalMoments = await findCriticalMoments(sanHistory, 3, 10);

    const engineContextBlocks = criticalMoments.map((m) => {
      const evalBeforePawn = m.evalBefore !== null ? (m.evalBefore / 100).toFixed(2) : "?";
      const evalAfterPawn = m.evalAfter !== null ? (m.evalAfter / 100).toFixed(2) : "?";

      let interpretation: string;
      if (m.evalBefore !== null && m.evalAfter !== null) {
        const shift = m.evalAfter - m.evalBefore;
        if (shift > 0) {
          interpretation = `Eval shifted toward White (+${(shift / 100).toFixed(1)}). ${m.side === "White" ? "Good move by White." : "Black made a mistake."}`;
        } else {
          interpretation = `Eval shifted toward Black (${(shift / 100).toFixed(1)}). ${m.side === "Black" ? "Good move by Black." : "White made a mistake."}`;
        }
      } else {
        interpretation = "Evaluation unclear.";
      }

      const facts = buildMoveFacts(verboseHistory, m.ply - 1, m.fen);
      const isUserMove = userColor
        ? (userColor === "w" && m.side === "White") || (userColor === "b" && m.side === "Black")
        : undefined;

      const lines = [
        `--- Critical Moment: ${m.moveLabel} (${m.moveText}) ---`,
        `Side: ${m.side}${isUserMove !== undefined ? (isUserMove ? " (YOUR move)" : " (OPPONENT's move)") : ""}`,
        `Eval before: ${evalBeforePawn} | Eval after: ${evalAfterPawn} | Delta: ${m.delta}cp`,
        `Engine best move: ${m.bestMove ?? "unknown"}`,
        `Interpretation: ${interpretation}`,
        `Move facts: ${formatMoveFacts(facts)}`,
      ];
      return lines.join("\n");
    });

    const finalSnapshot = boardSnapshotFromFen(chess.fen());

    const inputParts = [
      `Analyze this chess game. Respond in JSON.`,
      `\nGame info: ${metadata.white} (White) vs ${metadata.black} (Black), result: ${metadata.result}, ${metadata.moveCount} half-moves.`,
      `\nStructured move log:\n${moveLog.join("\n")}`,
      `\nEngine-detected critical moments (evals from White's perspective: positive = good for White, negative = good for Black):\n\n${engineContextBlocks.join("\n\n")}`,
      `\nFinal board state:\n${formatBoardSnapshot(finalSnapshot)}`,
    ];

    if (userColor === "w") {
      inputParts.push(`\nThe user played White. Focus on White's decisions. Refer to White as "you" and Black as "your opponent".`);
    } else if (userColor === "b") {
      inputParts.push(`\nThe user played Black. Focus on Black's decisions. Refer to Black as "you" and White as "your opponent".`);
    }

    const response = await client.responses.create({
      model: "gpt-4.1",
      instructions: SYSTEM_PROMPT,
      input: inputParts.join("\n"),
      text: { format: { type: "json_object" } },
    });

    const text = response.output_text;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const braceStart = text.indexOf("{");
      const braceEnd = text.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd > braceStart) {
        try {
          parsed = JSON.parse(text.slice(braceStart, braceEnd + 1));
        } catch {
          console.error("Model raw output:", text);
          return NextResponse.json(
            { error: "Model returned invalid JSON. Please try again." },
            { status: 500 }
          );
        }
      } else {
        console.error("Model raw output:", text);
        return NextResponse.json(
          { error: "Model returned invalid JSON. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Analyze route error:", error);
    return NextResponse.json(
      { error: "Something went wrong during analysis." },
      { status: 500 }
    );
  }
}
