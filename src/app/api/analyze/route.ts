import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a practical chess coach for adult improvers. Analyze the user's PGN in plain English. Be concrete, concise, and useful. Return valid JSON with exactly these keys: summary, mistakes, trainingTasks. mistakes and trainingTasks must each be arrays of strings.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this chess PGN:\n\n${pgn}`,
            },
          ],
        },
      ],
    });

    const text = response.output_text;

    let parsed;
    try {
      parsed = JSON.parse(text);
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

