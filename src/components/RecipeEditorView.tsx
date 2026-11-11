import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CopyPlus,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Recipe, RecipeSection, SectionCategory } from '../types';
import { CATEGORIES, CATEGORY_LIST } from '../utils/categories';
import { formatDurationHuman, generateId, sumRecipeSeconds } from '../utils/time';

interface RecipeEditorViewProps {
  initialRecipe: Recipe | null;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}

const QUICK_BLOCKS: { label: string; minutes: number; category: SectionCategory }[] = [
  { label: 'Deschidere & Recap', minutes: 5, category: 'intro' },
  { label: 'Concept Teoretic', minutes: 15, category: 'theory' },
  { label: 'Demo / Exemplu Live', minutes: 10, category: 'demo' },
  { label: 'Exercițiu Practic', minutes: 15, category: 'exercise' },
  { label: 'Pauză scurtă', minutes: 5, category: 'break' },
  { label: 'Q&A / Buffer final', minutes: 10, category: 'qa' },
];

export const RecipeEditorView: React.FC<RecipeEditorViewProps> = ({
  initialRecipe,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [tag, setTag] = useState(initialRecipe?.tag ?? '');
  const [targetMinutesStr, setTargetMinutesStr] = useState(
    initialRecipe?.targetMinutes !== undefined ? String(initialRecipe.targetMinutes) : '',
  );
  const [autoAdvance, setAutoAdvance] = useState(initialRecipe?.autoAdvance ?? false);
  const [sections, setSections] = useState<RecipeSection[]>(() => {
    if (initialRecipe && initialRecipe.sections.length > 0) {
      return initialRecipe.sections.map((s) => ({ ...s }));
    }
    return [
      {
        id: generateId(),
        title: 'Introducere & Obiective',
        durationSeconds: 5 * 60,
        category: 'intro',
        cueNote: '',
      },
      {
        id: generateId(),
        title: 'Partea Principală',
        durationSeconds: 20 * 60,
        category: 'theory',
        cueNote: '',
      },
      {
        id: generateId(),
        title: 'Concluzii & Întrebări',
        durationSeconds: 5 * 60,
        category: 'qa',
        cueNote: '',
      },
    ];
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalSeconds = useMemo(() => sumRecipeSeconds(sections), [sections]);
  const targetMinutesNum = useMemo(() => {
    const n = parseInt(targetMinutesStr, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [targetMinutesStr]);

  const budgetDiffSeconds =
    targetMinutesNum !== undefined ? totalSeconds - targetMinutesNum * 60 : null;

  const updateSection = (id: string, patch: Partial<RecipeSection>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const setSectionMinutesAndSeconds = (id: string, mins: number, secs: number) => {
    const safeMins = Math.max(0, Math.min(300, mins));
    const safeSecs = Math.max(0, Math.min(59, secs));
    const total = Math.max(5, safeMins * 60 + safeSecs); // minim 5 secunde pentru testare rapidă
    updateSection(id, { durationSeconds: total });
  };

  const moveSection = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const duplicateSection = (idx: number) => {
    setSections((prev) => {
      const src = prev[idx];
      const copy: RecipeSection = {
        ...src,
        id: generateId(),
        title: `${src.title} (copie)`,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const removeSection = (id: string) => {
    if (sections.length <= 1) {
      setErrorMsg('O rețetă trebuie să conțină cel puțin o secțiune.');
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const addQuickBlock = (blockTitle: string, minutes: number, category: SectionCategory) => {
    setSections((prev) => [
      ...prev,
      {
        id: generateId(),
        title: blockTitle,
        durationSeconds: minutes * 60,
        category,
        cueNote: '',
      },
    ]);
    setErrorMsg(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('Te rog introdu un titlu pentru rețetă.');
      return;
    }
    const cleanSections = sections.map((s, idx) => ({
      ...s,
      title: s.title.trim() || `Secțiunea ${idx + 1}`,
      durationSeconds: Math.max(5, s.durationSeconds),
      cueNote: s.cueNote?.trim() || undefined,
    }));

    if (cleanSections.length === 0) {
      setErrorMsg('Adaugă cel puțin o secțiune de timp.');
      return;
    }

    const now = new Date().toISOString();
    const saved: Recipe = {
      id: initialRecipe?.id ?? generateId(),
      title: cleanTitle,
      tag: tag.trim() || undefined,
      targetMinutes: targetMinutesNum,
      autoAdvance,
      sections: cleanSections,
      createdAt: initialRecipe?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };

    onSave(saved);
  };

  return (
    <form onSubmit={handleSave} className="mx-auto flex min-h-screen w-full max-w-2xl flex-col pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3.5 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi
        </button>

        <h1 className="text-sm font-semibold text-zinc-100">
          {initialRecipe ? 'Editează rețeta' : 'Rețetă nouă'}
        </h1>

        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-emerald-400"
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
          Salvează
        </button>
      </header>

      <div className="space-y-6 px-4 pt-5 sm:px-6">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* General Recipe Settings */}
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Titlu rețetă (curs / prezentare) *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="ex: Curs 4 — Arbori de decizie"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Etichetă (opțional)
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="ex: Statistică, Lab, Pitch"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Buget maxim curs (minute, opțional)
              </label>
              <input
                type="number"
                min={1}
                max={600}
                value={targetMinutesStr}
                onChange={(e) => setTargetMinutesStr(e.target.value)}
                placeholder="ex: 90 sau 50"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>
          </div>

          {/* Transition Mode */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-zinc-200">
                  Mod tranziție între secțiuni
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {autoAdvance
                    ? 'Trece automat la următoarea etapă când ajunge la 00:00.'
                    : 'Manual (recomandat): intră în depășire (+MM:SS) cu puls roșu până apeși „Următoarea”.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoAdvance((v) => !v)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  autoAdvance
                    ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                    : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                }`}
              >
                {autoAdvance ? 'Automat' : 'Manual'}
              </button>
            </div>
          </div>
        </section>

        {/* Live Total Duration Telemetry */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Durată totală rețetă
              </p>
              <p className="mt-0.5 font-mono text-2xl font-bold text-zinc-100 tabular-nums">
                {formatDurationHuman(totalSeconds)}
              </p>
            </div>

            {budgetDiffSeconds !== null && (
              <div
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                  budgetDiffSeconds > 0
                    ? 'border-red-500/40 bg-red-500/15 text-red-300'
                    : budgetDiffSeconds === 0
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                }`}
              >
                {budgetDiffSeconds > 0
                  ? `+${formatDurationHuman(budgetDiffSeconds)} peste buget!`
                  : budgetDiffSeconds === 0
                    ? 'Exact în buget!'
                    : `${formatDurationHuman(Math.abs(budgetDiffSeconds))} rezervă`}
              </div>
            )}
          </div>

          {/* Visual proportional preview bar */}
          <div className="mt-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-zinc-800">
            {sections.map((sec) => {
              const meta = CATEGORIES[sec.category] ?? CATEGORIES.theory;
              return (
                <div
                  key={sec.id}
                  style={{
                    flexGrow: Math.max(1, sec.durationSeconds),
                    backgroundColor: meta.hex,
                  }}
                  className="h-full"
                />
              );
            })}
          </div>
        </section>

        {/* Ordered Sections List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">
              Porțiuni de timp ({sections.length} în ordine)
            </h2>
            <span className="text-[11px] text-zinc-500">Folosește săgețile pentru ordine</span>
          </div>

          {sections.map((sec, idx) => {
            const mins = Math.floor(sec.durationSeconds / 60);
            const secs = sec.durationSeconds % 60;
            const meta = CATEGORIES[sec.category] ?? CATEGORIES.theory;

            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition focus-within:border-zinc-700"
              >
                {/* Section Header: Index + Controls */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-zinc-950"
                      style={{ backgroundColor: meta.hex }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-zinc-400">
                      {formatDurationHuman(sec.durationSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, -1)}
                      title="Mută mai sus"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sections.length - 1}
                      onClick={() => moveSection(idx, 1)}
                      title="Mută mai jos"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateSection(idx)}
                      title="Duplică secțiunea"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
                    >
                      <CopyPlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(sec.id)}
                      title="Șterge secțiunea"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                  placeholder="Titlul porțiunii (ex: Demonstrație algoritm)"
                  className="mb-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
                />

                {/* Category Chips */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {CATEGORY_LIST.map((c) => {
                    const active = sec.category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateSection(sec.id, { category: c.id })}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                          active
                            ? c.badgeClass
                            : 'border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${c.dotClass}`} />
                        {c.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Duration Inputs */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5">
                    <input
                      type="number"
                      min={0}
                      max={300}
                      value={mins}
                      onChange={(e) =>
                        setSectionMinutesAndSeconds(
                          sec.id,
                          parseInt(e.target.value || '0', 10),
                          secs,
                        )
                      }
                      className="w-12 bg-transparent text-center font-mono text-sm font-bold text-zinc-100 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-500">min</span>
                    <span className="text-zinc-700">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={secs}
                      onChange={(e) =>
                        setSectionMinutesAndSeconds(
                          sec.id,
                          mins,
                          parseInt(e.target.value || '0', 10),
                        )
                      }
                      className="w-10 bg-transparent text-center font-mono text-sm text-zinc-300 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-500">s</span>
                  </div>

                  {/* Quick minute presets */}
                  <div className="flex flex-wrap gap-1">
                    {[1, 5, 10, 15, 20].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSectionMinutesAndSeconds(sec.id, m, 0)}
                        className={`rounded-lg border px-2 py-1 text-xs font-mono transition ${
                          mins === m && secs === 0
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Cue Note */}
                <input
                  type="text"
                  value={sec.cueNote ?? ''}
                  onChange={(e) => updateSection(sec.id, { cueNote: e.target.value })}
                  placeholder="Memento discret (opțional, ex: „Nu intra în detalii la formula 3!”)"
                  className="w-full rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
              </div>
            );
          })}
        </section>

        {/* Quick Add Section Blocks */}
        <section className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-4">
          <p className="mb-2.5 text-xs font-semibold text-zinc-400">
            Adaugă rapid o porțiune nouă:
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_BLOCKS.map((b) => {
              const meta = CATEGORIES[b.category];
              return (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => addQuickBlock(b.label, b.minutes, b.category)}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
                >
                  <Plus className="h-3 w-3 text-emerald-400" />
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                  {b.label} ({b.minutes}m)
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </form>
  );
};
