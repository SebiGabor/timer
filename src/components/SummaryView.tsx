import React from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import type { SessionLog } from '../types';
import { CATEGORIES } from '../utils/categories';
import { formatDeltaCompact, formatDurationHuman } from '../utils/time';

interface SummaryViewProps {
  session: SessionLog;
  onBackHome: () => void;
  onRunAgain: (recipeId: string) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  session,
  onBackHome,
  onRunAgain,
}) => {
  const totalDelta = session.actualSeconds - session.plannedSeconds;
  const maxSectionSeconds = Math.max(
    1,
    ...session.sectionsResult.flatMap((s) => [s.plannedSeconds, s.actualSeconds]),
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-16 pt-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackHome}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Rețete
        </button>
        <span className="text-xs text-zinc-500">Rezumat salvat</span>
      </div>

      {/* Hero Summary Card */}
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
        <h1 className="text-xl font-bold text-zinc-100">{session.recipeTitle}</h1>
        <p className="mt-1 text-xs text-zinc-400">Analiză ritm real vs. planificat</p>

        <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div>
            <p className="text-[11px] text-zinc-500">Planificat</p>
            <p className="mt-0.5 font-mono text-base font-bold text-zinc-200">
              {formatDurationHuman(session.plannedSeconds)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Real</p>
            <p className="mt-0.5 font-mono text-base font-bold text-zinc-100">
              {formatDurationHuman(session.actualSeconds)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">Diferență</p>
            <p
              className={`mt-0.5 font-mono text-base font-bold ${
                totalDelta > 30
                  ? 'text-red-400'
                  : totalDelta < -30
                    ? 'text-emerald-400'
                    : 'text-zinc-200'
              }`}
            >
              {formatDeltaCompact(totalDelta)}
            </p>
          </div>
        </div>
      </section>

      {/* Per-Section Breakdown */}
      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">Detaliere pe secțiuni</h2>
        {session.sectionsResult.map((sec, idx) => {
          const delta = sec.actualSeconds - sec.plannedSeconds;
          const meta = CATEGORIES[sec.category] ?? CATEGORIES.theory;
          const plannedPct = Math.round((sec.plannedSeconds / maxSectionSeconds) * 100);
          const actualPct = Math.round((sec.actualSeconds / maxSectionSeconds) * 100);

          return (
            <div
              key={`${sec.sectionId}-${idx}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClass}`} />
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {idx + 1}. {sec.title}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-0.5 font-mono text-xs font-semibold ${
                    delta > 20
                      ? 'bg-red-500/15 text-red-300'
                      : delta < -20
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {formatDeltaCompact(delta)}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0">Plan:</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-500"
                      style={{ width: `${plannedPct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono">
                    {formatDurationHuman(sec.plannedSeconds)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0">Real:</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${
                        delta > 20 ? 'bg-red-500' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${actualPct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono text-zinc-200">
                    {formatDurationHuman(sec.actualSeconds)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onRunAgain(session.recipeId)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
        >
          <RotateCcw className="h-4 w-4" />
          Rulează din nou
        </button>
        <button
          type="button"
          onClick={onBackHome}
          className="flex flex-1 items-center justify-center rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400"
        >
          Înapoi la rețete
        </button>
      </div>
    </div>
  );
};
