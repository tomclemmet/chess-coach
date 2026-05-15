import { Chessboard } from 'react-chessboard';
import type { Square } from 'chess.js';
import type { PieceDropHandlerArgs } from 'react-chessboard';

interface BoardProps {
  fen: string;
  playerSide: 'white' | 'black';
  gameOver: boolean;
  onMove: (from: Square, to: Square, promotion?: string) => boolean;
}

export default function Board({ fen, playerSide, gameOver, onMove }: BoardProps) {
  function handleDrop({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    // Detect pawn promotion
    const isPromotion =
      piece.pieceType[1] === 'P' &&
      ((targetSquare[1] === '8' && playerSide === 'white') ||
        (targetSquare[1] === '1' && playerSide === 'black'));
    return onMove(sourceSquare as Square, targetSquare as Square, isPromotion ? 'q' : undefined);
  }

  return (
    // w-full + aspect-square means the board fills its container and stays square.
    // react-chessboard v4 sizes itself to 100% of its parent via CSS.
    <div className="w-full aspect-square">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: playerSide,
          onPieceDrop: handleDrop,
          allowDragging: !gameOver,
          boardStyle: {
            borderRadius: '8px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            width: '100%',
            height: '100%',
          },
          darkSquareStyle: { backgroundColor: '#4a5568' },
          lightSquareStyle: { backgroundColor: '#e2e8f0' },
        }}
      />
    </div>
  );
}
