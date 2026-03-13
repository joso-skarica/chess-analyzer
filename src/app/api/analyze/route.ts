import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const pgn = body.pgn;

  if (!pgn || typeof pgn !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid PGN" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    summary: "This is a placeholder analysis.",
    mistakes: ["Mistake 1", "Mistake 2"],
    trainingTasks: ["Task 1", "Task 2"],
  });
}
