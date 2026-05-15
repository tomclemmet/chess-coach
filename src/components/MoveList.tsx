import { useEffect, useRef } from 'react';

interface MoveListProps {
  moves: string[]; // SAN moves in order
}

export default function MoveList({ moves }: MoveListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves]);

  if (moves.length === 0) {
    return (
      <div className="text-stone-400 text-xs text-center py-3 italic">
        No moves yet
      </div>
    );
  }

  // Group into pairs: [[white, black?], ...]
  const pairs: [string, string | null][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1] ?? null]);
  }

  return (
    <div className="overflow-y-auto max-h-36 md:max-h-48 text-sm font-mono">
      <table className="w-full border-collapse">
        <tbody>
          {pairs.map(([white, black], i) => (
            <tr key={i} className="hover:bg-stone-50">
              <td className="text-stone-400 pr-2 pl-1 py-0.5 text-xs w-6 select-none">
                {i + 1}.
              </td>
              <td className="pr-3 py-0.5 text-stone-700 w-1/2">{white}</td>
              <td className="py-0.5 text-stone-700 w-1/2">{black ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={endRef} />
    </div>
  );
}
