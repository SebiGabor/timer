import React, { useMemo, useState } from 'react';
import {
  Clock,
  Cloud,
  CloudOff,
  Copy,
  History,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Zap,
} from 'lucide-react';
import type { ActiveRunSnapshot, Recipe, TursoConfig } from '../types';
import { CATEGORIES } from '../utils/categories';
import { formatDurationHuman, sumRecipeSeconds } from '../utils/time';

interface HomeViewProps {
  recipes: Recipe[];
  tursoConfig: TursoConfig;
  isSyncing: boolean;
  syncError: string | null;
  activeRunSnapshot: ActiveRunSnapshot | null;
  onStartRecipe: (recipe: Recipe) => void;
  onResumeActiveRun: () => void;
  onDiscardActiveRun: () => void;
  onCreateRecipe: () => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDuplicateRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onSyncNow: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  recipes,
  tursoConfig,
  isSyncing,
  syncError,
  activeRunSnapshot,
  onStartRecipe,
  onResumeActiveRun,
  onDiscardActiveRun,
  onCreateRecipe,
  onEditRecipe,
  onDuplicateRecipe,
  onDeleteRecipe,
  onOpenSettings,
  onOpenHistory,
  onSyncNow,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const visibleRecipes = useMemo(() => {
    const active = recipes.filter((r) => !r.deletedAt);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.tag && r.tag.toLowerCase().includes(q)) ||
        r.sections.some((s) => s.title.toLowerCase().includes(q)),
    );
  }, [recipes, searchQuery]);

  const hasTurso = Boolean(tursoConfig.url.trim() && tursoConfig.authToken.trim());

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
      {/* Top Bar */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 shadow-inner">
            <Clock className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-100">Tact</h1>
            <p className="text-xs text-zinc-400">Cronometru silențios pentru cursuri</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTurso ? (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              title={syncError ? `Eroare: ${syncError}` : 'Sincronizează cu Turso'}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                syncError
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : 'border-zinc-800 bg-zinc-900 text-emerald-300 hover:bg-zinc-800'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sincronizare...' : 'Turso'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Configurează sincronizarea Turso (opțional)"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
            >
              <CloudOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Local</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenHistory}
            title="Istoric cursuri"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <History className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Setări"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Sync error banner */}
      {syncError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 shrink-0 text-red-400" />
            <span>Sincronizare Turso eșuată: {syncError}</span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="shrink-0 font-semibold text-red-300 underline"
          >
            Verifică
          </button>
        </div>
      )}

      {/* Active interrupted session banner */}
      {activeRunSnapshot && (
        <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Sesiune întreruptă
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-100">
                {activeRunSnapshot.recipeTitle} - Etapa {activeRunSnapshot.currentIndex + 1}/
                {activeRunSnapshot.liveSections.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDiscardActiveRun}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Renunță
              </button>
              <button
                type="button"
                onClick={onResumeActiveRun}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Continuă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + New CTA */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută rețetă sau secțiune..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/60 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onCreateRecipe}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-400 active:scale-[0.99]"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Rețetă nouă
        </button>
      </div>

      {/* Recipes List */}
      {visibleRecipes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
          <Clock className="mb-3 h-9 w-9 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-300">
            {searchQuery ? 'Nicio rețetă nu corespunde căutării.' : 'Nu ai încă nicio rețetă salvată.'}
          </p>
          <p className="mt-1 max-w-xs text-xs text-zinc-500">
            Creează o rețetă cu etapele cursului tău ca să controlezi ritmul fără alarme sonore.
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={onCreateRecipe}
              className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" />
              Creează prima rețetă
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleRecipes.map((recipe) => {
            const totalSeconds = sumRecipeSeconds(recipe.sections);
            const totalMinutesRounded = Math.round((totalSeconds / 60) * 10) / 10;
            const isOverTarget =
              recipe.targetMinutes !== undefined && totalSeconds > recipe.targetMinutes * 60;
            const isConfirmingDelete = confirmDeleteId === recipe.id;

            return (
              <article
                key={recipe.id}
                className="group rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-4 transition hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {recipe.tag && (
                        <span className="rounded-md border border-zinc-700/80 bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                          {recipe.tag}
                        </span>
                      )}
                      {recipe.autoAdvance && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                          <Zap className="h-3 w-3" />
                          Auto
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1.5 truncate text-base font-semibold text-zinc-100">
                      {recipe.title}
                    </h2>
                  </div>

                  {/* Total duration badge */}
                  <div className="shrink-0 text-right">
                    <div
                      className={`inline-flex items-baseline gap-1 rounded-xl border px-2.5 py-1 tabular-nums ${
                        isOverTarget
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      <span className="text-base font-bold">{totalMinutesRounded}</span>
                      <span className="text-[11px] font-medium opacity-85">min</span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {recipe.sections.length}{' '}
                      {recipe.sections.length === 1 ? 'secțiune' : 'secțiuni'}
                    </p>
                  </div>
                </div>

                {/* Proportional Visual Structure Strip */}
                {recipe.sections.length > 0 && (
                  <div className="mt-3 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-zinc-800">
                    {recipe.sections.map((sec) => {
                      const meta = CATEGORIES[sec.category] ?? CATEGORIES.theory;
                      return (
                        <div
                          key={sec.id}
                          title={`${sec.title} (${formatDurationHuman(sec.durationSeconds)})`}
                          style={{
                            flexGrow: Math.max(1, sec.durationSeconds),
                            backgroundColor: meta.hex,
                          }}
                          className="h-full opacity-85"
                        />
                      );
                    })}
                  </div>
                )}

                {/* Compact preview of ordered sections */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {recipe.sections.slice(0, 4).map((sec, idx) => (
                    <span
                      key={sec.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-400"
                    >
                      <span className="font-mono text-zinc-500">{idx + 1}.</span>
                      <span className="max-w-[130px] truncate text-zinc-300">{sec.title}</span>
                      <span className="font-mono text-zinc-500">
                        {formatDurationHuman(sec.durationSeconds)}
                      </span>
                    </span>
                  ))}
                  {recipe.sections.length > 4 && (
                    <span className="inline-flex items-center rounded-lg bg-zinc-950/70 px-2 py-1 text-[11px] text-zinc-500">
                      +{recipe.sections.length - 4} altele
                    </span>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditRecipe(recipe)}
                      title="Editează rețeta"
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editează
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicateRecipe(recipe)}
                      title="Duplică rețeta"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteRecipe(recipe.id);
                            setConfirmDeleteId(null);
                          }}
                          className="text-xs font-semibold text-red-300 hover:text-red-200"
                        >
                          Șterge
                        </button>
                        <span className="text-zinc-600">|</span>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          Nu
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(recipe.id)}
                        title="Șterge rețeta"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={recipe.sections.length === 0}
                    onClick={() => onStartRecipe(recipe)}
                    className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Rulează
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
