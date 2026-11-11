export type SectionCategory = 'intro' | 'theory' | 'demo' | 'exercise' | 'break' | 'qa';

export interface RecipeSection {
  id: string;
  title: string;
  durationSeconds: number;
  category: SectionCategory;
  cueNote?: string;
}

export interface Recipe {
  id: string;
  title: string;
  tag?: string;
  targetMinutes?: number;
  autoAdvance: boolean;
  sections: RecipeSection[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SectionRunResult {
  sectionId: string;
  title: string;
  category: SectionCategory;
  plannedSeconds: number;
  actualSeconds: number;
}

export interface SessionLog {
  id: string;
  recipeId: string;
  recipeTitle: string;
  startedAt: string;
  finishedAt: string;
  plannedSeconds: number;
  actualSeconds: number;
  sectionsResult: SectionRunResult[];
  updatedAt: string;
}

export interface TursoConfig {
  url: string;
  authToken: string;
  lastSyncedAt?: string;
}

export interface AppPreferences {
  enableHaptics: boolean;
  keepScreenAwake: boolean;
  warningThresholdPct: number;
  criticalSeconds: number;
}

export interface ActiveRunSnapshot {
  recipeId: string;
  recipeTitle: string;
  autoAdvance: boolean;
  originalPlannedSeconds: number;
  originalSections: RecipeSection[];
  liveSections: RecipeSection[];
  currentIndex: number;
  isRunning: boolean;
  sectionElapsedMs: number;
  runSliceStartedAt: number | null;
  completedActuals: Record<number, number>;
  sessionStartedAt: string;
}
