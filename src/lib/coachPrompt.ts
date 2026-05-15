import type { EngineMove } from '../engine/stockfish';

export function buildCoachPrompt(
  fen: string,
  pgn: string,
  playerSide: 'white' | 'black',
  toMove: 'white' | 'black',
  engineLines: EngineMove[]
): string {
  const linesText = engineLines
    .map((line, i) => {
      const evalStr = line.mate !== null
        ? `mate in ${Math.abs(line.mate)}${line.mate < 0 ? ' (for opponent)' : ''}`
        : `${(line.eval / 100).toFixed(2)} pawns ${line.eval >= 0 ? 'for white' : 'for black'}`;
      return `${i + 1}. Best move: ${line.move}  (eval: ${evalStr})\n   Line: ${line.pv}`;
    })
    .join('\n');

  return `You are a friendly, encouraging chess coach helping a club-level player improve.

The player is playing as ${playerSide}. It is currently ${toMove}'s turn.

Position (FEN): ${fen}

Move history (PGN):
${pgn || '(game just started)'}

Stockfish engine analysis (top candidate moves):
${linesText || '(no analysis available)'}

Please explain this position in 4-6 sentences. Cover:
1. The key feature or tension in the current position
2. The best plan for ${toMove} (reference the engine's top move if helpful, but explain *why*)
3. Any immediate threats or tactical ideas to watch out for

Be concrete — name specific pieces and squares (e.g. "the knight on f3", "pushing e5"). Avoid heavy jargon. Keep it encouraging and clear enough for a casual player.`;
}
