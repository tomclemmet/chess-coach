import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface CoachPanelProps {
  explanation: string | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onAskCoach: () => void;
}

// Minimal markdown component map — keeps the minimalist stone aesthetic
// without needing @tailwindcss/typography
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 text-stone-700 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-stone-700">{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="text-stone-700">{children}</li>,
  h3: ({ children }) => <h3 className="font-semibold text-stone-800 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="font-medium text-stone-800 mb-1">{children}</h4>,
};

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
            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
            : 'bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white'
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
          <>Ask Coach</>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
          {error}
        </div>
      )}

      {explanation && !error && (
        <div className="border border-stone-200 rounded-lg px-3 py-3 bg-amber-50/40">
          <div className="text-amber-800 text-xs font-medium mb-2 uppercase tracking-wide">
            Coach says
          </div>
          <div className="text-sm">
            <ReactMarkdown components={markdownComponents}>
              {explanation}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
