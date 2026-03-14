# Chess PGN Analyzer

Paste a PGN and get a coach-level review grounded in engine analysis — not just the best moves, but what went wrong and what to practice.

The app replays every position through Stockfish to detect the biggest evaluation swings, then builds machine-verified board snapshots at each critical moment and sends them to GPT-4.1 for a plain-English breakdown of the game's turning points, recurring mistakes, and concrete training tasks.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS)
- **chess.js** for PGN parsing, move replay, and board-state extraction
- **Stockfish** (ASM.js, single-threaded) for position evaluation
- **OpenAI Responses API** (gpt-4.1) for natural language analysis

## Setup

```bash
npm install
```

Create `.env.local` in the project root:

```
OPENAI_API_KEY=your-key-here
```

## Development

```bash
npm run dev
```

Open http://127.0.0.1:3000 in your browser.

## Testing

```bash
npm test
```

## How it works

1. User pastes a PGN and optionally selects which side they played
2. chess.js validates and parses the game into a verbose move history
3. Stockfish evaluates every position (depth 10) to find the top 3 eval swings
4. For each critical moment, a board snapshot is built with exact piece counts, locations, capture/recapture/trade detection
5. The structured move log, board snapshots, and engine data are sent to OpenAI
6. The model returns a structured analysis: summary, critical moments explained, mistakes, and training tasks
7. The analysis is automatically saved to localStorage

## Your Patterns (v2)

After analyzing 3 or more games, the **Your Patterns** section appears below the analysis results.

- **Auto-save**: Every successful analysis is saved automatically (up to 50 games)
- **Find Patterns**: Sends your analysis history to GPT-4.1 to identify recurring weaknesses, strengths, and a prioritized study plan
- **Game history**: View and manage all saved analyses
- **Clear history**: Reset your saved games at any time

This turns the analyzer from a single-use tool into a personal improvement tracker that gets more valuable with every game.
