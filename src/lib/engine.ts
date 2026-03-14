/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const StockfishFactory = require("stockfish/bin/stockfish-18-asm.js") as () => any;

type StockfishModule = {
  ccall: (fn: string, ret: null, argTypes: string[], args: string[]) => void;
  terminate: () => void;
  listener: ((line: string) => void) | null;
};

type EngineResult = {
  bestMove: string | null;
  evalCp: number | null;
};

async function createEngine(
  listener: (line: string) => void
): Promise<StockfishModule> {
  const result = StockfishFactory();

  if (typeof result === "function") {
    return await result({ listener }) as StockfishModule;
  }

  if (result && typeof result.then === "function") {
    const mod = await result;
    mod.listener = listener;
    return mod as StockfishModule;
  }

  result.listener = listener;
  return result as StockfishModule;
}

export async function analyzeFen(
  fen: string,
  depth = 12
): Promise<EngineResult> {
  return new Promise((resolve, reject) => {
    let engine: StockfishModule;
    let bestMove: string | null = null;
    let evalCp: number | null = null;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      try { engine.terminate(); } catch { /* ignore */ }
      resolve({ bestMove, evalCp });
    };

    const listener = (line: string) => {
      if (line.startsWith("info") && line.includes("score cp")) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) {
          evalCp = Number(match[1]);
        }
      }

      if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        bestMove = parts[1] || null;
        finish();
      }
    };

    createEngine(listener)
      .then((mod) => {
        engine = mod;
        engine.ccall("command", null, ["string"], ["uci"]);
        engine.ccall("command", null, ["string"], ["isready"]);
        engine.ccall("command", null, ["string"], [`position fen ${fen}`]);
        engine.ccall("command", null, ["string"], [`go depth ${depth}`]);
      })
      .catch(reject);

    setTimeout(() => {
      if (!finished) finish();
    }, 15000);
  });
}
