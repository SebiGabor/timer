import React, { useState } from 'react';
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, History, Trash2 } from 'lucide-react';
import type { SessionLog } from '../types';
import { formatDeltaCompact, formatDurationHuman } from '../utils/time';

interface HistoryViewProps {
  sessions: SessionLog[];
  onBack: () => void;
  onDeleteSession: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onBack,
  onDeleteSession,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(sessions[0]?.id ?? null);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-16 pt-5 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi
        </button>
        <h1 className="text-sm font-bold text-zinc-100">Istoric cursuri</h1>
        <div className="w-16" />
      </header>

      {sessions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
          <History className="mb-3 h-9 w-9 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-300">Nu ai încă sesiuni finalizate.</p>
          <p className="mt-1 max-w-xs text-xs text-zinc-500">
            După fiecare curs, Tact salvează diferența dintre timpul planificat și cel real ca să îți calibrezi rețetele.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const delta = s.actualSeconds - s.plannedSeconds;
            const isExpanded = expandedId === s.id;
            const dateStr = new Date(s.startedAt).toLocaleString('ro-RO', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={s.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold text-zinc-100">{s.recipeTitle}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDurationHuman(s.actualSeconds)} / {formatDurationHuman(s.plannedSeconds)}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 font-mono text-xs font-semibold ${
                        delta > 30
                          ? 'bg-red-500/15 text-red-300'
                          : delta < -30
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {formatDeltaCompact(delta)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
                    {s.sectionsResult.map((sec, idx) => {
                      const secDelta = sec.actualSeconds - sec.plannedSeconds;
                      return (
                        <div
                          key={`${sec.sectionId}-${idx}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="truncate pr-3 text-zinc-300">
                            {idx + 1}. {sec.title}
                          </span>
                          <div className="flex shrink-0 items-center gap-2 font-mono">
                            <span className="text-zinc-500">
                              {formatDurationHuman(sec.actualSeconds)}
                            </span>
                            <span
                              className={
                                secDelta > 20
                                  ? 'text-red-400'
                                  : secDelta < -20
                                    ? 'text-emerald-400'
                                    : 'text-zinc-400'
                              }
                            >
                              ({formatDeltaCompact(secDelta)})
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => onDeleteSession(s.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Șterge din istoric
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
