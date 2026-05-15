
interface CoachPanelProps {
  explanation: string | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onAskCoach: () => void;
}

export default function CoachPanel({
  explanation,
  loading,
  error,
  disabled,
  onAskCoach,
}: CoachPanelProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        onClick={onAskCoach}
        disabled={disabled || loading}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
          disabled || loading
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white'
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Asking coach…
          </>
        ) : (
          <>💡 Ask Coach</>
        )}
      </button>

      {error && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-2 text-red-400 text-xs">
          {error}
        </div>
      )}

      {explanation && !error && (
        <div className="bg-slate-700/50 border border-slate-600/40 rounded-lg px-3 py-3 text-slate-200 text-sm leading-relaxed">
          <div className="text-emerald-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
            Coach says
          </div>
          {explanation}
        </div>
      )}
    </div>
  );
}
