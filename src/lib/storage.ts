import { buildDefaultRecipes } from '../data/defaultRecipes';
import type { ActiveRunSnapshot, AppPreferences, Recipe, SessionLog, TursoConfig } from '../types';

const KEYS = {
  INITIALIZED: 'tact_initialized_v1',
  RECIPES: 'tact_recipes_v1',
  SESSIONS: 'tact_sessions_v1',
  TURSO: 'tact_turso_config_v1',
  PREFS: 'tact_preferences_v1',
  ACTIVE_RUN: 'tact_active_run_v1',
} as const;

export const DEFAULT_PREFERENCES: AppPreferences = {
  enableHaptics: false,
  keepScreenAwake: true,
  warningThresholdPct: 25,
  criticalSeconds: 30,
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadRecipes(): Recipe[] {
  const isInitialized = localStorage.getItem(KEYS.INITIALIZED);
  const raw = localStorage.getItem(KEYS.RECIPES);
  if (!isInitialized && !raw) {
    const defaults = buildDefaultRecipes();
    localStorage.setItem(KEYS.INITIALIZED, '1');
    localStorage.setItem(KEYS.RECIPES, JSON.stringify(defaults));
    return defaults;
  }
  return safeParse<Recipe[]>(raw, []);
}

export function saveRecipes(recipes: Recipe[]): void {
  localStorage.setItem(KEYS.INITIALIZED, '1');
  localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
}

export function loadSessions(): SessionLog[] {
  return safeParse<SessionLog[]>(localStorage.getItem(KEYS.SESSIONS), []);
}

export function saveSessions(sessions: SessionLog[]): void {
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
}

export function loadPreferences(): AppPreferences {
  const parsed = safeParse<Partial<AppPreferences>>(localStorage.getItem(KEYS.PREFS), {});
  return { ...DEFAULT_PREFERENCES, ...parsed };
}

export function savePreferences(prefs: AppPreferences): void {
  localStorage.setItem(KEYS.PREFS, JSON.stringify(prefs));
}

export function loadTursoConfig(): TursoConfig {
  const stored = safeParse<Partial<TursoConfig>>(localStorage.getItem(KEYS.TURSO), {});
  const envUrl = (import.meta.env.VITE_TURSO_DATABASE_URL as string | undefined) || '';
  const envToken = (import.meta.env.VITE_TURSO_AUTH_TOKEN as string | undefined) || '';
  return {
    url: stored.url || envUrl || '',
    authToken: stored.authToken || envToken || '',
    lastSyncedAt: stored.lastSyncedAt,
  };
}

export function saveTursoConfig(config: TursoConfig): void {
  localStorage.setItem(KEYS.TURSO, JSON.stringify(config));
}

export function clearTursoConfig(): void {
  localStorage.removeItem(KEYS.TURSO);
}

export function loadActiveRun(): ActiveRunSnapshot | null {
  return safeParse<ActiveRunSnapshot | null>(localStorage.getItem(KEYS.ACTIVE_RUN), null);
}

export function saveActiveRun(snapshot: ActiveRunSnapshot | null): void {
  if (!snapshot) {
    localStorage.removeItem(KEYS.ACTIVE_RUN);
  } else {
    localStorage.setItem(KEYS.ACTIVE_RUN, JSON.stringify(snapshot));
  }
}
