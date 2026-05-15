export interface EngineMove {
  move: string;       // e.g. "e2e4"
  san?: string;       // SAN form filled in by App
  eval: number;       // centipawns (positive = white advantage)
  mate: number | null; // moves to mate, null if not forced
  pv: string;         // principal variation
}

export interface AnalysisResult {
  bestMove: string;
  lines: EngineMove[];
}

class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private pendingResolve: ((r: AnalysisResult) => void) | null = null;
  private pendingLines: Map<number, EngineMove> = new Map();
  private skillLevel = 10;
  private onReadyCallbacks: (() => void)[] = [];

  init() {
    // Use single-threaded stockfish to avoid COEP issues
    this.worker = new Worker('/stockfish/stockfish.js');
    this.worker.onmessage = (e: MessageEvent) => this.handleMessage(e.data);
    this.worker.postMessage('uci');
  }

  private handleMessage(msg: string) {
    if (msg === 'uciok') {
      this.worker!.postMessage('isready');
    } else if (msg === 'readyok') {
      this.ready = true;
      this.onReadyCallbacks.forEach(cb => cb());
      this.onReadyCallbacks = [];
    } else if (msg.startsWith('info') && this.pendingResolve) {
      this.parseInfo(msg);
    } else if (msg.startsWith('bestmove') && this.pendingResolve) {
      const parts = msg.split(' ');
      const bestMove = parts[1];
      const lines = Array.from(this.pendingLines.values()).sort((a, b) => b.eval - a.eval);
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      this.pendingLines.clear();
      resolve({ bestMove, lines });
    }
  }

  private parseInfo(msg: string) {
    // Only capture lines with pv (principal variation)
    if (!msg.includes(' pv ')) return;

    const multipvMatch = msg.match(/multipv (\d+)/);
    const multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1;

    const cpMatch = msg.match(/score cp (-?\d+)/);
    const mateMatch = msg.match(/score mate (-?\d+)/);
    const pvMatch = msg.match(/ pv (.+)/);

    if (!pvMatch) return;

    const pv = pvMatch[1].trim();
    const evalCp = cpMatch ? parseInt(cpMatch[1]) : (mateMatch ? (parseInt(mateMatch[1]) > 0 ? 99999 : -99999) : 0);
    const mate = mateMatch ? parseInt(mateMatch[1]) : null;

    this.pendingLines.set(multipv, {
      move: pv.split(' ')[0],
      eval: evalCp,
      mate,
      pv,
    });
  }

  setSkillLevel(level: number) {
    this.skillLevel = level;
    if (this.ready && this.worker) {
      this.worker.postMessage(`setoption name Skill Level value ${level}`);
    }
  }

  onReady(cb: () => void) {
    if (this.ready) {
      cb();
    } else {
      this.onReadyCallbacks.push(cb);
    }
  }

  /** Shared UCI search helper. */
  private runSearch(fen: string, multiPv: number, goCmd: string): Promise<AnalysisResult> {
    return new Promise((resolve) => {
      if (!this.ready || !this.worker) {
        resolve({ bestMove: '', lines: [] });
        return;
      }
      this.pendingResolve = resolve;
      this.pendingLines.clear();
      this.worker.postMessage('stop');
      this.worker.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
      this.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(goCmd);
    });
  }

  /**
   * Deep analysis for the Coach button — uses depth 15 + MultiPV 3.
   * Called infrequently, so latency is acceptable.
   */
  analyze(fen: string, multiPv = 3): Promise<AnalysisResult> {
    return this.runSearch(fen, multiPv, 'go depth 15');
  }

  /**
   * Fast move selection for playing — uses movetime scaled to skill level.
   * Skill 0 → ~200ms, Skill 10 → ~900ms, Skill 20 → ~1600ms.
   * MultiPV=1 so Stockfish focuses on a single best line.
   */
  getBestMove(fen: string): Promise<string> {
    const movetime = 200 + this.skillLevel * 70;
    return this.runSearch(fen, 1, `go movetime ${movetime}`).then(r => r.bestMove);
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}

// Singleton
export const engine = new StockfishEngine();
