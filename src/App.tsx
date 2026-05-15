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

  function syncState(g: Chess) {
    setGame(g);
    setFen(g.fen());
    setMoves(g.history());
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
        updated.move({
          from: bestMove.slice(0, 2) as Square,
          to: bestMove.slice(2, 4) as Square,
          promotion: bestMove[4] ?? 'q',
        });
        syncState(updated);
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
      syncState(updated);
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
    <div className="min-h-svh bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          ♟️ Chess Coach
        </h1>
      </header>

      {/* Main layout: stacked on mobile, side-by-side on md+ */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-5xl mx-auto w-full">
        {/* Board */}
        <div className="flex-1 min-w-0">
          <Board
            fen={fen}
            playerSide={playerSide}
            gameOver={!!gameOver}
            onMove={handleMove}
          />
          {engineThinking && (
            <p className="text-center text-slate-400 text-xs mt-2 animate-pulse">
              Stockfish is thinking…
            </p>
          )}
        </div>

        {/* Sidebar */}
        <div className="md:w-64 lg:w-72 flex flex-col gap-4">
          <Controls
            playerSide={playerSide}
            skillLevel={skillLevel}
            gameOver={gameOver}
            onNewGame={handleNewGame}
            onSideChange={handleSideChange}
            onSkillChange={setSkillLevel}
          />

          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
              Moves
            </p>
            <MoveList moves={moves} />
          </div>

          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
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
