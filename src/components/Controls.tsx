
interface ControlsProps {
  playerSide: 'white' | 'black';
  skillLevel: number;
  gameOver: string | null;
  onNewGame: () => void;
  onSideChange: (side: 'white' | 'black') => void;
  onSkillChange: (level: number) => void;
}

const SKILL_LABELS: Record<number, string> = {
  0: 'Beginner',
  5: 'Casual',
  10: 'Intermediate',
  15: 'Advanced',
  20: 'Master',
};

function getSkillLabel(level: number): string {
  const keys = Object.keys(SKILL_LABELS).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((prev, curr) =>
    Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev
  );
  return SKILL_LABELS[closest];
}

export default function Controls({
  playerSide,
  skillLevel,
  gameOver,
  onNewGame,
  onSideChange,
  onSkillChange,
}: ControlsProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {gameOver && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 text-sm font-medium text-center">
          {gameOver}
        </div>
      )}

      <button
        onClick={onNewGame}
        className="w-full bg-stone-800 hover:bg-stone-900 active:bg-stone-950 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
      >
        New Game
      </button>

      <div className="flex gap-2 items-center">
        <span className="text-stone-500 text-xs w-12 shrink-0">Play as</span>
        <div className="flex gap-1 flex-1">
          {(['white', 'black'] as const).map((side) => (
            <button
              key={side}
              onClick={() => onSideChange(side)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${
                playerSide === side
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              {side === 'white' ? '♔ White' : '♚ Black'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-stone-500 text-xs w-12 shrink-0">Level</span>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={20}
            value={skillLevel}
            onChange={(e) => onSkillChange(Number(e.target.value))}
            className="w-full accent-amber-700"
          />
          <div className="flex justify-between text-xs text-stone-400 mt-0.5">
            <span>Easy</span>
            <span className="text-stone-600">{getSkillLabel(skillLevel)} ({skillLevel})</span>
            <span>Hard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
