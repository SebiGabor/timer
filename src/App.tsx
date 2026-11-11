import React, { useCallback, useEffect, useState } from 'react';
import { HistoryView } from './components/HistoryView';
import { HomeView } from './components/HomeView';
import { RecipeEditorView } from './components/RecipeEditorView';
import { RunnerView } from './components/RunnerView';
import { SettingsView } from './components/SettingsView';
import { SummaryView } from './components/SummaryView';
import { buildDefaultRecipes } from './data/defaultRecipes';
import {
  clearTursoConfig,
  loadActiveRun,
  loadPreferences,
  loadRecipes,
  loadSessions,
  loadTursoConfig,
  saveActiveRun,
  savePreferences,
  saveRecipes,
  saveSessions,
  saveTursoConfig,
} from './lib/storage';
import { syncWithTurso } from './lib/turso';
import type { ActiveRunSnapshot, AppPreferences, Recipe, SessionLog, TursoConfig } from './types';
import { generateId } from './utils/time';

type RouteView =
  | { name: 'home' }
  | { name: 'editor'; recipe: Recipe | null }
  | { name: 'runner'; recipe: Recipe; snapshot?: ActiveRunSnapshot | null }
  | { name: 'summary'; session: SessionLog }
  | { name: 'history' }
  | { name: 'settings' };

export const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>(() => loadRecipes());
  const [sessions, setSessions] = useState<SessionLog[]>(() => loadSessions());
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences());
  const [tursoConfig, setTursoConfig] = useState<TursoConfig>(() => loadTursoConfig());
  const [activeRunSnapshot, setActiveRunSnapshot] = useState<ActiveRunSnapshot | null>(() =>
    loadActiveRun(),
  );

  const [view, setView] = useState<RouteView>({ name: 'home' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const performSync = useCallback(
    async (
      cfg: TursoConfig,
      currentRecipes: Recipe[],
      currentSessions: SessionLog[],
    ): Promise<void> => {
      if (!cfg.url.trim() || !cfg.authToken.trim()) return;
      setIsSyncing(true);
      setSyncError(null);
      try {
        const res = await syncWithTurso(cfg, currentRecipes, currentSessions);
        setRecipes(res.recipes);
        saveRecipes(res.recipes);
        setSessions(res.sessions);
        saveSessions(res.sessions);

        const nextCfg: TursoConfig = { ...cfg, lastSyncedAt: res.syncedAt };
        setTursoConfig(nextCfg);
        saveTursoConfig(nextCfg);
        setSyncStatusMsg(
          `Sincronizat (${res.pushedRecipes} trimise, ${res.pulledRecipes} descărcate).`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Eroare necunoscută la Turso.';
        setSyncError(msg);
      } finally {
        setIsSyncing(false);
      }
    },
    [],
  );

  // Auto-sync silențios la deschiderea aplicației dacă Turso este configurat și există internet
  useEffect(() => {
    if (tursoConfig.url && tursoConfig.authToken && navigator.onLine) {
      void performSync(tursoConfig, recipes, sessions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistRecipes = (next: Recipe[]) => {
    setRecipes(next);
    saveRecipes(next);
    if (tursoConfig.url && tursoConfig.authToken && navigator.onLine) {
      void performSync(tursoConfig, next, sessions);
    }
  };

  const persistSessions = (next: SessionLog[]) => {
    setSessions(next);
    saveSessions(next);
    if (tursoConfig.url && tursoConfig.authToken && navigator.onLine) {
      void performSync(tursoConfig, recipes, next);
    }
  };

  const handleSaveRecipe = (saved: Recipe) => {
    const exists = recipes.some((r) => r.id === saved.id);
    const next = exists
      ? recipes.map((r) => (r.id === saved.id ? saved : r))
      : [saved, ...recipes];
    persistRecipes(next);
    setView({ name: 'home' });
  };

  const handleDuplicateRecipe = (recipe: Recipe) => {
    const now = new Date().toISOString();
    const copy: Recipe = {
      ...recipe,
      id: generateId(),
      title: `${recipe.title} (Copie)`,
      sections: recipe.sections.map((s) => ({ ...s, id: generateId() })),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    persistRecipes([copy, ...recipes]);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    const now = new Date().toISOString();
    const next = recipes.map((r) =>
      r.id === recipeId ? { ...r, deletedAt: now, updatedAt: now } : r,
    );
    persistRecipes(next);
  };

  const handleStartRecipe = (recipe: Recipe) => {
    saveActiveRun(null);
    setActiveRunSnapshot(null);
    setView({ name: 'runner', recipe });
  };

  const handleResumeActiveRun = () => {
    if (!activeRunSnapshot) return;
    const matched = recipes.find((r) => r.id === activeRunSnapshot.recipeId) ?? {
      id: activeRunSnapshot.recipeId,
      title: activeRunSnapshot.recipeTitle,
      autoAdvance: activeRunSnapshot.autoAdvance,
      sections: activeRunSnapshot.liveSections,
      createdAt: activeRunSnapshot.sessionStartedAt,
      updatedAt: activeRunSnapshot.sessionStartedAt,
    };
    setView({ name: 'runner', recipe: matched, snapshot: activeRunSnapshot });
  };

  const handleCompleteSession = (log: SessionLog) => {
    setActiveRunSnapshot(null);
    const next = [log, ...sessions];
    persistSessions(next);
    setView({ name: 'summary', session: log });
  };

  const handleExportJson = () => {
    const active = recipes.filter((r) => !r.deletedAt);
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tact-retete-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (imported: Recipe[]) => {
    const now = new Date().toISOString();
    const normalized: Recipe[] = imported.map((r) => ({
      ...r,
      id: r.id || generateId(),
      title: r.title || 'Rețetă importată',
      autoAdvance: Boolean(r.autoAdvance),
      sections: Array.isArray(r.sections) ? r.sections : [],
      createdAt: r.createdAt || now,
      updatedAt: now,
      deletedAt: null,
    }));
    const existingIds = new Set(recipes.map((r) => r.id));
    const merged = [
      ...recipes.map((r) => normalized.find((imp) => imp.id === r.id) ?? r),
      ...normalized.filter((imp) => !existingIds.has(imp.id)),
    ];
    persistRecipes(merged);
  };

  const handleRestoreStarterRecipes = () => {
    const starters = buildDefaultRecipes();
    const existingIds = new Set(recipes.map((r) => r.id));
    const merged = [
      ...recipes.map((r) => {
        const starter = starters.find((s) => s.id === r.id);
        return starter && r.deletedAt ? { ...starter, updatedAt: new Date().toISOString() } : r;
      }),
      ...starters.filter((s) => !existingIds.has(s.id)),
    ];
    persistRecipes(merged);
  };

  switch (view.name) {
    case 'editor':
      return (
        <RecipeEditorView
          initialRecipe={view.recipe}
          onSave={handleSaveRecipe}
          onCancel={() => setView({ name: 'home' })}
        />
      );

    case 'runner':
      return (
        <RunnerView
          recipe={view.recipe}
          initialSnapshot={view.snapshot}
          preferences={preferences}
          onCompleteSession={handleCompleteSession}
          onExit={() => {
            setActiveRunSnapshot(loadActiveRun());
            setView({ name: 'home' });
          }}
        />
      );

    case 'summary':
      return (
        <SummaryView
          session={view.session}
          onBackHome={() => setView({ name: 'home' })}
          onRunAgain={(recipeId) => {
            const target = recipes.find((r) => r.id === recipeId && !r.deletedAt);
            if (target) {
              handleStartRecipe(target);
            } else {
              setView({ name: 'home' });
            }
          }}
        />
      );

    case 'history':
      return (
        <HistoryView
          sessions={sessions}
          onBack={() => setView({ name: 'home' })}
          onDeleteSession={(id) => {
            const next = sessions.filter((s) => s.id !== id);
            setSessions(next);
            saveSessions(next);
          }}
        />
      );

    case 'settings':
      return (
        <SettingsView
          preferences={preferences}
          tursoConfig={tursoConfig}
          isSyncing={isSyncing}
          syncStatusMsg={syncStatusMsg}
          syncError={syncError}
          onUpdatePreferences={(nextPrefs) => {
            setPreferences(nextPrefs);
            savePreferences(nextPrefs);
          }}
          onSaveAndSyncTurso={async (cfg) => {
            setTursoConfig(cfg);
            saveTursoConfig(cfg);
            await performSync(cfg, recipes, sessions);
          }}
          onDisconnectTurso={() => {
            clearTursoConfig();
            setTursoConfig({ url: '', authToken: '' });
            setSyncError(null);
            setSyncStatusMsg(null);
          }}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onRestoreStarterRecipes={handleRestoreStarterRecipes}
          onBack={() => setView({ name: 'home' })}
        />
      );

    case 'home':
    default:
      return (
        <HomeView
          recipes={recipes}
          tursoConfig={tursoConfig}
          isSyncing={isSyncing}
          syncError={syncError}
          activeRunSnapshot={activeRunSnapshot}
          onStartRecipe={handleStartRecipe}
          onResumeActiveRun={handleResumeActiveRun}
          onDiscardActiveRun={() => {
            saveActiveRun(null);
            setActiveRunSnapshot(null);
          }}
          onCreateRecipe={() => setView({ name: 'editor', recipe: null })}
          onEditRecipe={(r) => setView({ name: 'editor', recipe: r })}
          onDuplicateRecipe={handleDuplicateRecipe}
          onDeleteRecipe={handleDeleteRecipe}
          onOpenSettings={() => setView({ name: 'settings' })}
          onOpenHistory={() => setView({ name: 'history' })}
          onSyncNow={() => void performSync(tursoConfig, recipes, sessions)}
        />
      );
  }
};

export default App;
