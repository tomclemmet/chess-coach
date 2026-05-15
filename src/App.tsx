import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import Board from './components/Board';
import Controls from './components/Controls';
import MoveList from './components/MoveList';
import CoachPanel from './components/CoachPanel';
import { engine } from './engine/stockfish';
import type { EngineMove } from './engine/stockfish';
import { buildCoachPrompt } from './lib/coachPrompt';

type Side = 'white' | 'black';

function App() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(new Chess().fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [playerSide, setPlayerSide] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState(10);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [engineThinking, setEngineThinking] = useState(false);

  // Coach state
  const [explanation, setExplanation] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Keep a ref to game so async callbacks don't capture stale state
  const gameRef = useRef(game);
  gameRef.current = game;

  // Init engine once
  useEffect(() => {
    engine.init();
    return () => engine.destroy();
  }, []);

  // When skill changes, update engine
  useEffect(() => {
    engine.setSkillLevel(skillLevel);
  }, [skillLevel]);

  // Sync React state after a move.
  // sanMove is appended to moves — we don't call g.history() because
  // new Chess(fen) resets history, so history() would only return the
  // single move just played.
  function syncState(g: Chess, sanMove?: string) {
    setGame(g);
    setFen(g.fen());
    if (sanMove) {
      setMoves(prev => [...prev, sanMove]);
    }
    if (g.isGameOver()) {
      if (g.isCheckmate()) {
        const winner = g.turn() === 'w' ? 'Black' : 'White';
        setGameOver(`Checkmate! ${winner} wins.`);
      } else if (g.isDraw()) {
        setGameOver('Draw!');
      } else {
        setGameOver('Game over.');
      }
    }
  }

  const makeEngineMove = useCallback(async (g: Chess) => {
    if (g.isGameOver()) return;
    setEngineThinking(true);
    engine.onReady(async () => {
      try {
        const bestMove = await engine.getBestMove(g.fen());
        if (!bestMove || bestMove === '(none)') {
          setEngineThinking(false);
          return;
        }
        const updated = new Chess(g.fen());
        const result = updated.move({
          from: bestMove.slice(0, 2) as Square,
          to: bestMove.slice(2, 4) as Square,
          promotion: bestMove[4] ?? 'q',
        });
        if (result) syncState(updated, result.san);
      } catch {
        // ignore
      } finally {
        setEngineThinking(false);
      }
    });
  }, []);

  // When it's engine's turn, make a move
  useEffect(() => {
    const isEnginesTurn =
      (game.turn() === 'w' && playerSide === 'black') ||
      (game.turn() === 'b' && playerSide === 'white');

    if (isEnginesTurn && !game.isGameOver() && !engineThinking) {
      makeEngineMove(game);
    }
  }, [fen, playerSide]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMove(from: Square, to: Square, promotion?: string): boolean {
    const isPlayersTurn =
      (game.turn() === 'w' && playerSide === 'white') ||
      (game.turn() === 'b' && playerSide === 'black');

    if (!isPlayersTurn || game.isGameOver()) return false;

    try {
      const updated = new Chess(game.fen());
      const result = updated.move({ from, to, promotion: promotion ?? 'q' });
      if (!result) return false;
      syncState(updated, result.san);
      setExplanation(null);
      setCoachError(null);
      return true;
    } catch {
      return false;
    }
  }

  function startNewGame(side: Side) {
    const g = new Chess();
    setGame(g);
    setFen(g.fen());
    setMoves([]);
    setGameOver(null);
    setExplanation(null);
    setCoachError(null);
    setEngineThinking(false);
    if (side === 'black') {
      setTimeout(() => makeEngineMove(g), 300);
    }
  }

  function handleNewGame() {
    startNewGame(playerSide);
  }

  function handleSideChange(side: Side) {
    setPlayerSide(side);
    startNewGame(side);
  }

  async function handleAskCoach() {
    setCoachLoading(true);
    setCoachError(null);
    setExplanation(null);

    try {
      // Get engine analysis for coaching context
      let engineLines: EngineMove[] = [];
      try {
        const result = await engine.analyze(game.fen(), 3);
        engineLines = result.lines;
      } catch {
        // Continue without engine lines — coach still works
      }

      const toMove = game.turn() === 'w' ? 'white' : 'black';
      const prompt = buildCoachPrompt(game.fen(), game.pgn(), playerSide, toMove, engineLines);

      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: game.fen(), pgn: game.pgn(), side: playerSide, toMove, engineLines, prompt }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reach coach';
      setCoachError(`Coach unavailable: ${msg}`);
    } finally {
      setCoachLoading(false);
    }
  }

  return (
    <div className="min-h-svh bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-stone-800 tracking-tight">
          Chess Coach
        </h1>
      </header>

      {/* Main layout: stacked on mobile, side-by-side on md+ */}
      <main className="flex-1 flex flex-col md:flex-row gap-3 p-3 max-w-5xl mx-auto w-full">
        {/* Board — capped to viewport height so it never causes scrolling */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-start">
          <div className="w-full" style={{ maxWidth: 'min(100%, calc(100svh - 10rem))' }}>
            <Board
              fen={fen}
              playerSide={playerSide}
              gameOver={!!gameOver}
              onMove={handleMove}
            />
          </div>
          {engineThinking && (
            <p className="text-center text-stone-400 text-xs mt-2 animate-pulse">
              Stockfish is thinking…
            </p>
          )}
        </div>

        {/* Sidebar */}
        <div className="md:w-64 lg:w-72 flex flex-col gap-3">
          <div className="bg-white rounded-lg p-3 border border-stone-200">
            <Controls
              playerSide={playerSide}
              skillLevel={skillLevel}
              gameOver={gameOver}
              onNewGame={handleNewGame}
              onSideChange={handleSideChange}
              onSkillChange={setSkillLevel}
            />
          </div>

          <div className="bg-white rounded-lg p-3 border border-stone-200">
            <p className="text-stone-500 text-xs font-medium uppercase tracking-wide mb-2">
              Moves
            </p>
            <MoveList moves={moves} />
          </div>

          <div className="bg-white rounded-lg p-3 border border-stone-200">
            <CoachPanel
              explanation={explanation}
              loading={coachLoading}
              error={coachError}
              disabled={moves.length === 0}
              onAskCoach={handleAskCoach}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
