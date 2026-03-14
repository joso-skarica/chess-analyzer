import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a practical chess coach reviewing a student's recent game history to identify recurring patterns.

You will receive an array of past analysis summaries. Each entry includes the game result, the student's color, the summary, mistakes, critical moments, and training tasks from that game.

Step back from individual games and find themes that keep showing up. Focus on:
- Recurring strategic or tactical weaknesses
- Opening tendencies (good or bad)
- Endgame patterns
- Decision-making habits under pressure
- What the student is already doing well (briefly)

Return valid JSON with exactly these three keys.

recurringWeaknesses
An array of 3-5 strings. Each is a concise description of a pattern across multiple games. Be specific — "Leaves pieces undefended on the queenside after castling long" is useful; "Needs to improve tactics" is not.

strengths
An array of 1-3 strings highlighting what the student does consistently well. If nothing stands out, return an empty array.

studyPlan
An array of 3-5 strings with prioritized, concrete practice recommendations. Each should connect to a recurring weakness. Order from most impactful to least.

Style: be direct and specific. Ground everything in the data provided. If fewer than 3 games are provided, keep conclusions tentative.`;

type AnalysisSummary = {
  result: string;
  userColor: string;
  summary: string;
  mistakes: string[];
  trainingTasks: string[];
  criticalMoments: string[];
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analyses: AnalysisSummary[] = body.analyses;

    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      return NextResponse.json(
        { error: "No analysis history provided." },
        { status: 400 }
      );
    }

    const condensed = analyses.slice(0, 20).map((a, i) => ({
      game: i + 1,
      result: a.result,
      playedAs: a.userColor === "w" ? "White" : a.userColor === "b" ? "Black" : "unknown",
      summary: a.summary,
      mistakes: a.mistakes,
      criticalMoments: a.criticalMoments ?? [],
      trainingTasks: a.trainingTasks,
    }));

    const response = await client.responses.create({
      model: "gpt-4.1",
      instructions: SYSTEM_PROMPT,
      input: `Here are the student's recent game analyses. Respond in JSON.\n\n${JSON.stringify(condensed, null, 2)}`,
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
          console.error("Patterns model raw output:", text);
          return NextResponse.json(
            { error: "Model returned invalid JSON. Please try again." },
            { status: 500 }
          );
        }
      } else {
        console.error("Patterns model raw output:", text);
        return NextResponse.json(
          { error: "Model returned invalid JSON. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Patterns route error:", error);
    return NextResponse.json(
      { error: "Something went wrong generating patterns." },
      { status: 500 }
    );
  }
}
