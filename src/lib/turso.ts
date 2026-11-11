import { createClient, type Client, type Value } from '@libsql/client/web';
import type { Recipe, RecipeSection, SectionRunResult, SessionLog, TursoConfig } from '../types';

export interface SyncResult {
  recipes: Recipe[];
  sessions: SessionLog[];
  pushedRecipes: number;
  pulledRecipes: number;
  pushedSessions: number;
  pulledSessions: number;
  syncedAt: string;
}

/**
 * Convertește libsql:// -> https:// pentru a folosi transportul HTTP (fetch)
 * al Turso Hrana API, evitând blocajele WebSocket din rețelele universitare.
 */
export function normalizeTursoUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('libsql://')) {
    return trimmed.replace(/^libsql:\/\//, 'https://');
  }
  return trimmed;
}

function buildClient(config: TursoConfig): Client {
  const url = normalizeTursoUrl(config.url);
  if (!url) {
    throw new Error('Lipsește URL-ul bazei de date Turso.');
  }
  if (!config.authToken.trim()) {
    throw new Error('Lipsește Auth Token-ul Turso.');
  }
  return createClient({
    url,
    authToken: config.authToken.trim(),
  });
}

function asString(val: Value | undefined, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  return String(val);
}

function asNullableString(val: Value | undefined): string | null {
  if (val === null || val === undefined) return null;
  return String(val);
}

function asNullableNumber(val: Value | undefined): number | undefined {
  if (val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function asNumber(val: Value | undefined, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export async function initTursoSchema(config: TursoConfig): Promise<void> {
  const client = buildClient(config);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      tag TEXT,
      target_minutes INTEGER,
      auto_advance INTEGER NOT NULL DEFAULT 0,
      sections_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS session_logs (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      recipe_title TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      planned_seconds INTEGER NOT NULL,
      actual_seconds INTEGER NOT NULL,
      sections_result_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

export async function syncWithTurso(
  config: TursoConfig,
  localRecipes: Recipe[],
  localSessions: SessionLog[],
): Promise<SyncResult> {
  const client = buildClient(config);

  await initTursoSchema(config);

  // 1. Citește toate rețetele remote
  const remoteRecipesRes = await client.execute(
    'SELECT id, title, tag, target_minutes, auto_advance, sections_json, created_at, updated_at, deleted_at FROM recipes',
  );

  const remoteRecipeMap = new Map<string, Recipe>();
  for (const row of remoteRecipesRes.rows) {
    const id = asString(row.id);
    if (!id) continue;
    let sections: RecipeSection[] = [];
    try {
      sections = JSON.parse(asString(row.sections_json, '[]')) as RecipeSection[];
    } catch {
      sections = [];
    }
    remoteRecipeMap.set(id, {
      id,
      title: asString(row.title, 'Rețetă fără titlu'),
      tag: asNullableString(row.tag) || undefined,
      targetMinutes: asNullableNumber(row.target_minutes),
      autoAdvance: asNumber(row.auto_advance, 0) === 1,
      sections,
      createdAt: asString(row.created_at, new Date().toISOString()),
      updatedAt: asString(row.updated_at, new Date().toISOString()),
      deletedAt: asNullableString(row.deleted_at),
    });
  }

  const localRecipeMap = new Map<string, Recipe>(localRecipes.map((r) => [r.id, r]));
  const allRecipeIds = new Set<string>([...localRecipeMap.keys(), ...remoteRecipeMap.keys()]);

  const mergedRecipes: Recipe[] = [];
  const recipesToPush: Recipe[] = [];
  let pulledRecipes = 0;

  for (const id of allRecipeIds) {
    const local = localRecipeMap.get(id);
    const remote = remoteRecipeMap.get(id);

    if (local && !remote) {
      mergedRecipes.push(local);
      recipesToPush.push(local);
    } else if (!local && remote) {
      mergedRecipes.push(remote);
      pulledRecipes++;
    } else if (local && remote) {
      const localTs = Date.parse(local.updatedAt) || 0;
      const remoteTs = Date.parse(remote.updatedAt) || 0;
      if (remoteTs > localTs) {
        mergedRecipes.push(remote);
        pulledRecipes++;
      } else if (localTs > remoteTs) {
        mergedRecipes.push(local);
        recipesToPush.push(local);
      } else {
        mergedRecipes.push(local);
      }
    }
  }

  if (recipesToPush.length > 0) {
    await client.batch(
      recipesToPush.map((r) => ({
        sql: `
          INSERT INTO recipes (id, title, tag, target_minutes, auto_advance, sections_json, created_at, updated_at, deleted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            tag = excluded.tag,
            target_minutes = excluded.target_minutes,
            auto_advance = excluded.auto_advance,
            sections_json = excluded.sections_json,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at
        `,
        args: [
          r.id,
          r.title,
          r.tag ?? null,
          r.targetMinutes ?? null,
          r.autoAdvance ? 1 : 0,
          JSON.stringify(r.sections),
          r.createdAt,
          r.updatedAt,
          r.deletedAt ?? null,
        ],
      })),
      'write',
    );
  }

  // 2. Citește istoricul de sesiuni remote
  const remoteSessionsRes = await client.execute(
    'SELECT id, recipe_id, recipe_title, started_at, finished_at, planned_seconds, actual_seconds, sections_result_json, updated_at FROM session_logs',
  );

  const remoteSessionMap = new Map<string, SessionLog>();
  for (const row of remoteSessionsRes.rows) {
    const id = asString(row.id);
    if (!id) continue;
    let sectionsResult: SectionRunResult[] = [];
    try {
      sectionsResult = JSON.parse(asString(row.sections_result_json, '[]')) as SectionRunResult[];
    } catch {
      sectionsResult = [];
    }
    remoteSessionMap.set(id, {
      id,
      recipeId: asString(row.recipe_id),
      recipeTitle: asString(row.recipe_title),
      startedAt: asString(row.started_at),
      finishedAt: asString(row.finished_at),
      plannedSeconds: asNumber(row.planned_seconds),
      actualSeconds: asNumber(row.actual_seconds),
      sectionsResult,
      updatedAt: asString(row.updated_at),
    });
  }

  const localSessionMap = new Map<string, SessionLog>(localSessions.map((s) => [s.id, s]));
  const allSessionIds = new Set<string>([...localSessionMap.keys(), ...remoteSessionMap.keys()]);

  const mergedSessions: SessionLog[] = [];
  const sessionsToPush: SessionLog[] = [];
  let pulledSessions = 0;

  for (const id of allSessionIds) {
    const local = localSessionMap.get(id);
    const remote = remoteSessionMap.get(id);

    if (local && !remote) {
      mergedSessions.push(local);
      sessionsToPush.push(local);
    } else if (!local && remote) {
      mergedSessions.push(remote);
      pulledSessions++;
    } else if (local && remote) {
      const localTs = Date.parse(local.updatedAt) || 0;
      const remoteTs = Date.parse(remote.updatedAt) || 0;
      if (remoteTs > localTs) {
        mergedSessions.push(remote);
        pulledSessions++;
      } else if (localTs > remoteTs) {
        mergedSessions.push(local);
        sessionsToPush.push(local);
      } else {
        mergedSessions.push(local);
      }
    }
  }

  if (sessionsToPush.length > 0) {
    await client.batch(
      sessionsToPush.map((s) => ({
        sql: `
          INSERT INTO session_logs (id, recipe_id, recipe_title, started_at, finished_at, planned_seconds, actual_seconds, sections_result_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            recipe_title = excluded.recipe_title,
            planned_seconds = excluded.planned_seconds,
            actual_seconds = excluded.actual_seconds,
            sections_result_json = excluded.sections_result_json,
            updated_at = excluded.updated_at
        `,
        args: [
          s.id,
          s.recipeId,
          s.recipeTitle,
          s.startedAt,
          s.finishedAt,
          s.plannedSeconds,
          s.actualSeconds,
          JSON.stringify(s.sectionsResult),
          s.updatedAt,
        ],
      })),
      'write',
    );
  }

  mergedSessions.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  return {
    recipes: mergedRecipes,
    sessions: mergedSessions,
    pushedRecipes: recipesToPush.length,
    pulledRecipes,
    pushedSessions: sessionsToPush.length,
    pulledSessions,
    syncedAt: new Date().toISOString(),
  };
}
