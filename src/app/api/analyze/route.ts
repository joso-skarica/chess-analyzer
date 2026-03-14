import OpenAI from "openai";
import { Chess } from "chess.js";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a practical chess coach for adult improvers.

Analyze the PGN in plain English using only what can be reasonably inferred from the moves. Do not pretend to have engine-level certainty. Do not invent tactical refutations unless they are strongly supported by the PGN flow.

You will receive the raw PGN and structured metadata extracted from it (headers, move count, final FEN, game-over flags, side to move). Use the metadata to ground your analysis.

Important rules:
- Do not assume which side the user played.
- Refer to White and Black unless the user explicitly says which side they were.
- Be concrete, concise, and useful.
- Focus on practical turning points, piece activity, king safety, simplification decisions, and endgame technique.
- If something is uncertain, phrase it cautiously.
- Return valid JSON with exactly these keys: summary, mistakes, trainingTasks.
- mistakes must be an array of strings.
- trainingTasks must be an array of strings.
- Keep mistakes and trainingTasks specific and actionable.
- Do not include markdown fences.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pgn = body.pgn;

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

    const metadata = {
      headers: chess.getHeaders(),
      moveCount: chess.history().length,
      finalFen: chess.fen(),
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
      isStalemate: chess.isStalemate(),
      turn: chess.turn(),
    };

    const response = await client.responses.create({
      model: "gpt-4.1",
      instructions: SYSTEM_PROMPT,
      input: `Analyze this chess game.\n\nMetadata:\n${JSON.stringify(metadata, null, 2)}\n\nPGN:\n${pgn}`,
    });

    const text = response.output_text;
    const clean = text
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: text },
        { status: 500 }
      );
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
