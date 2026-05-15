import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { PieceDropHandlerArgs } from 'react-chessboard';

interface BoardProps {
  fen: string;
  playerSide: 'white' | 'black';
  gameOver: boolean;
  onMove: (from: Square, to: Square, promotion?: string) => boolean;
}

const SELECTED_STYLE: React.CSSProperties = { backgroundColor: 'rgba(255, 217, 102, 0.65)' };
const LEGAL_DOT_STYLE: React.CSSProperties = {
  background: 'radial-gradient(circle, rgba(0,0,0,0.18) 22%, transparent 24%)',
};

export default function Board({ fen, playerSide, gameOver, onMove }: BoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);

  // Clear selection whenever the position changes (e.g. after engine plays)
  useEffect(() => {
    setSelectedSquare(null);
    setLegalTargets([]);
  }, [fen]);

  function getLegalTargets(square: Square): Square[] {
    const chess = new Chess(fen);
    return chess
      .moves({ square, verbose: true })
      .map(m => m.to as Square);
  }

  function isPawnPromotion(from: Square, to: Square): boolean {
    const chess = new Chess(fen);
    const piece = chess.get(from);
    if (!piece || piece.type !== 'p') return false;
    return (to[1] === '8' && piece.color === 'w') || (to[1] === '1' && piece.color === 'b');
  }

  function handleSquareClick({ square: sq }: { square: string }) {
    const square = sq as Square;
    if (gameOver) return;

    // If we have a selection and clicked a legal target → move
    if (selectedSquare && legalTargets.includes(square)) {
      const promotion = isPawnPromotion(selectedSquare, square) ? 'q' : undefined;
      onMove(selectedSquare, square, promotion);
      // selection is cleared by the fen-change useEffect
      return;
    }

    // Check if the clicked square has a player piece
    const chess = new Chess(fen);
    const piece = chess.get(square);
    const pieceColor = piece ? (piece.color === 'w' ? 'white' : 'black') : null;

    if (pieceColor === playerSide) {
      // Select this piece (or switch selection)
      const targets = getLegalTargets(square);
      setSelectedSquare(square);
      setLegalTargets(targets);
      return;
    }

    // Deselect
    setSelectedSquare(null);
    setLegalTargets([]);
  }

  function handleDrop({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    const isPromotion =
      piece.pieceType[1] === 'P' &&
      ((targetSquare[1] === '8' && playerSide === 'white') ||
        (targetSquare[1] === '1' && playerSide === 'black'));
    return onMove(sourceSquare as Square, targetSquare as Square, isPromotion ? 'q' : undefined);
  }

  // Build square highlight styles
  const squareStyles: Record<string, React.CSSProperties> = {};
  if (selectedSquare) {
    squareStyles[selectedSquare] = SELECTED_STYLE;
    for (const sq of legalTargets) {
      squareStyles[sq] = LEGAL_DOT_STYLE;
    }
  }

  return (
    <div className="w-full aspect-square">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: playerSide,
          onPieceDrop: handleDrop,
          onSquareClick: handleSquareClick,
          allowDragging: !gameOver,
          squareStyles,
          boardStyle: {
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            width: '100%',
            height: '100%',
          },
          darkSquareStyle: { backgroundColor: '#b58863' },
          lightSquareStyle: { backgroundColor: '#f0d9b5' },
        }}
      />
    </div>
  );
}
