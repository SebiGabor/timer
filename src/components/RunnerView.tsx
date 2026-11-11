import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eye,
  ListOrdered,
  Lock,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scissors,
  Smartphone,
  Unlock,
  X,
} from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';
import { saveActiveRun } from '../lib/storage';
import type {
  ActiveRunSnapshot,
  AppPreferences,
  Recipe,
  RecipeSection,
  SectionRunResult,
  SessionLog,
} from '../types';
import { CATEGORIES } from '../utils/categories';
import { triggerHaptic } from '../utils/haptics';
import {
  formatClockHHMM,
  formatCountdown,
  formatDeltaCompact,
  formatDurationHuman,
  generateId,
  sumRecipeSeconds,
} from '../utils/time';
import { SegmentedTimeline } from './SegmentedTimeline';

interface RunnerViewProps {
  recipe: Recipe;
  initialSnapshot?: ActiveRunSnapshot | null;
  preferences: AppPreferences;
  onCompleteSession: (log: SessionLog) => void;
  onExit: () => void;
}

export const RunnerView: React.FC<RunnerViewProps> = ({
  recipe,
  initialSnapshot,
  preferences,
  onCompleteSession,
  onExit,
}) => {
  const [originalSections] = useState<RecipeSection[]>(() =>
    initialSnapshot?.originalSections
      ? initialSnapshot.originalSections.map((s) => ({ ...s }))
      : recipe.sections.map((s) => ({ ...s })),
  );
  const [liveSections, setLiveSections] = useState<RecipeSection[]>(() =>
    initialSnapshot?.liveSections
      ? initialSnapshot.liveSections.map((s) => ({ ...s }))
      : recipe.sections.map((s) => ({ ...s })),
  );
  const [currentIndex, setCurrentIndex] = useState<number>(
    initialSnapshot?.currentIndex ?? 0,
  );
  const [isRunning, setIsRunning] = useState<boolean>(
    initialSnapshot?.isRunning ?? false,
  );
  const [sectionElapsedMs, setSectionElapsedMs] = useState<number>(
    initialSnapshot?.sectionElapsedMs ?? 0,
  );
  const [runSliceStartedAt, setRunSliceStartedAt] = useState<number | null>(
    initialSnapshot?.runSliceStartedAt ?? null,
  );
  const [completedActuals, setCompletedActuals] = useState<Record<number, number>>(
    initialSnapshot?.completedActuals ?? {},
  );
  const [sessionStartedAt] = useState<string>(
    initialSnapshot?.sessionStartedAt ?? new Date().toISOString(),
  );

  const [now, setNow] = useState<number>(() => Date.now());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(preferences.enableHaptics);
  const [isTouchLocked, setIsTouchLocked] = useState<boolean>(false);
  const [unlockProgress, setUnlockProgress] = useState<number>(0);
  const [showSectionDrawer, setShowSectionDrawer] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const firedCuesRef = useRef<{ index: number; warn: boolean; crit: boolean; zero: boolean }>({
    index: currentIndex,
    warn: false,
    crit: false,
    zero: false,
  });

  const { isActive: wakeLockActive } = useWakeLock(preferences.keepScreenAwake);

  // Reset haptic cue trackers when section changes
  useEffect(() => {
    if (firedCuesRef.current.index !== currentIndex) {
      firedCuesRef.current = { index: currentIndex, warn: false, crit: false, zero: false };
    }
  }, [currentIndex]);

  // High-precision monotonic ticker (rezistent la sleep / background throttling)
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 150);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Persist live session snapshot so refresh / OS tab kill never loses progress
  useEffect(() => {
    const snapshot: ActiveRunSnapshot = {
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      autoAdvance: recipe.autoAdvance,
      originalPlannedSeconds: sumRecipeSeconds(originalSections),
      originalSections,
      liveSections,
      currentIndex,
      isRunning,
      sectionElapsedMs,
      runSliceStartedAt,
      completedActuals,
      sessionStartedAt,
    };
    saveActiveRun(snapshot);
  }, [
    recipe.id,
    recipe.title,
    recipe.autoAdvance,
    originalSections,
    liveSections,
    currentIndex,
    isRunning,
    sectionElapsedMs,
    runSliceStartedAt,
    completedActuals,
    sessionStartedAt,
  ]);

  const currentSection = liveSections[currentIndex] ?? liveSections[0];
  const nextSection =
    currentIndex + 1 < liveSections.length ? liveSections[currentIndex + 1] : null;

  const activeElapsedMs =
    sectionElapsedMs + (isRunning && runSliceStartedAt ? Math.max(0, now - runSliceStartedAt) : 0);
  const activeElapsedSeconds = Math.floor(activeElapsedMs / 1000);
  const currentDurationMs = currentSection.durationSeconds * 1000;
  const remainingMs = currentDurationMs - activeElapsedMs;
  const isOvertime = remainingMs <= -1000;
  const isAtOrPastZero = remainingMs <= 0;

  const displaySeconds = isAtOrPastZero
    ? Math.floor(Math.abs(remainingMs) / 1000)
    : Math.ceil(remainingMs / 1000);

  const progressPct =
    currentDurationMs > 0 ? Math.min(100, Math.max(0, (activeElapsedMs / currentDurationMs) * 100)) : 100;
  const remainingPct = Math.max(0, 100 - progressPct);

  // Silent color state machine
  const urgencyState: 'ok' | 'warning' | 'critical' | 'overtime' = useMemo(() => {
    if (isAtOrPastZero) return 'overtime';
    const remainingSec = Math.ceil(remainingMs / 1000);
    if (remainingSec <= preferences.criticalSeconds) return 'critical';
    const warnThresholdSeconds = Math.min(
      120,
      Math.max(15, Math.round((currentSection.durationSeconds * preferences.warningThresholdPct) / 100)),
    );
    if (remainingSec <= warnThresholdSeconds) return 'warning';
    return 'ok';
  }, [
    isAtOrPastZero,
    remainingMs,
    preferences.criticalSeconds,
    preferences.warningThresholdPct,
    currentSection.durationSeconds,
  ]);

  // Trigger optional discrete haptic cues once per threshold per section
  useEffect(() => {
    if (!isRunning) return;
    const cues = firedCuesRef.current;
    if (cues.index !== currentIndex) return;
    if (urgencyState === 'warning' && !cues.warn) {
      cues.warn = true;
      triggerHaptic('warning', hapticsEnabled);
    } else if (urgencyState === 'critical' && !cues.crit) {
      cues.crit = true;
      triggerHaptic('critical', hapticsEnabled);
    } else if (urgencyState === 'overtime' && !cues.zero) {
      cues.zero = true;
      triggerHaptic('overtime', hapticsEnabled);
    }
  }, [isRunning, currentIndex, urgencyState, hapticsEnabled]);

  const finishLecture = useCallback(
    (finalActualsOverride?: Record<number, number>) => {
      const mergedActuals = {
        ...completedActuals,
        [currentIndex]: activeElapsedSeconds,
        ...(finalActualsOverride ?? {}),
      };

      const sectionsResult: SectionRunResult[] = originalSections.map((orig, idx) => ({
        sectionId: orig.id,
        title: liveSections[idx]?.title ?? orig.title,
        category: orig.category,
        plannedSeconds: orig.durationSeconds,
        actualSeconds: mergedActuals[idx] ?? 0,
      }));

      const plannedTotal = sumRecipeSeconds(originalSections);
      const actualTotal = sectionsResult.reduce((acc, s) => acc + s.actualSeconds, 0);

      saveActiveRun(null);
      onCompleteSession({
        id: generateId(),
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        startedAt: sessionStartedAt,
        finishedAt: new Date().toISOString(),
        plannedSeconds: plannedTotal,
        actualSeconds: actualTotal,
        sectionsResult,
        updatedAt: new Date().toISOString(),
      });
    },
    [
      activeElapsedSeconds,
      completedActuals,
      currentIndex,
      liveSections,
      onCompleteSession,
      originalSections,
      recipe.id,
      recipe.title,
      sessionStartedAt,
    ],
  );

  const goToSection = useCallback(
    (targetIndex: number, keepRunningState = isRunning) => {
      if (targetIndex < 0 || targetIndex >= liveSections.length) return;
      const updatedActuals = {
        ...completedActuals,
        [currentIndex]: activeElapsedSeconds,
      };
      setCompletedActuals(updatedActuals);
      setCurrentIndex(targetIndex);
      // Dacă utilizatorul revine la o secțiune deja începută (ex: click accidental pe Următoarea),
      // reia exact de unde rămăsese; butonul Reset permite reluarea de la zero.
      const savedTargetSeconds = targetIndex < currentIndex ? (updatedActuals[targetIndex] ?? 0) : 0;
      setSectionElapsedMs(savedTargetSeconds * 1000);
      setRunSliceStartedAt(keepRunningState ? Date.now() : null);
      setIsRunning(keepRunningState);
      setNow(Date.now());
      setShowSectionDrawer(false);
    },
    [activeElapsedSeconds, completedActuals, currentIndex, isRunning, liveSections.length],
  );

  // Auto-advance handler when enabled
  useEffect(() => {
    if (!recipe.autoAdvance || !isRunning || remainingMs > 0) return;
    if (currentIndex + 1 < liveSections.length) {
      goToSection(currentIndex + 1, true);
    } else {
      finishLecture();
    }
  }, [
    recipe.autoAdvance,
    isRunning,
    remainingMs,
    currentIndex,
    liveSections.length,
    goToSection,
    finishLecture,
  ]);

  const togglePlayPause = () => {
    triggerHaptic('tap', hapticsEnabled);
    const ts = Date.now();
    if (isRunning) {
      const slice = runSliceStartedAt ? Math.max(0, ts - runSliceStartedAt) : 0;
      setSectionElapsedMs((prev) => prev + slice);
      setRunSliceStartedAt(null);
      setIsRunning(false);
    } else {
      setRunSliceStartedAt(ts);
      setIsRunning(true);
    }
    setNow(ts);
  };

  const adjustCurrentDuration = (deltaSeconds: number) => {
    triggerHaptic('tap', hapticsEnabled);
    setLiveSections((prev) =>
      prev.map((sec, idx) =>
        idx === currentIndex
          ? { ...sec, durationSeconds: Math.max(15, sec.durationSeconds + deltaSeconds) }
          : sec,
      ),
    );
  };

  const resetCurrentSection = () => {
    triggerHaptic('tap', hapticsEnabled);
    const ts = Date.now();
    setSectionElapsedMs(0);
    setRunSliceStartedAt(isRunning ? ts : null);
    setNow(ts);
    firedCuesRef.current = { index: currentIndex, warn: false, crit: false, zero: false };
  };

  // Global pacing telemetry
  const totalOriginalPlannedSeconds = useMemo(
    () => sumRecipeSeconds(originalSections),
    [originalSections],
  );

  const pastActualSeconds = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < currentIndex; i++) {
      sum += completedActuals[i] ?? originalSections[i]?.durationSeconds ?? 0;
    }
    return sum;
  }, [completedActuals, currentIndex, originalSections]);

  const futurePlannedSeconds = useMemo(() => {
    let sum = 0;
    for (let i = currentIndex + 1; i < liveSections.length; i++) {
      sum += liveSections[i].durationSeconds;
    }
    return sum;
  }, [currentIndex, liveSections]);

  const currentSectionRemainingIfOnTrack = Math.max(
    0,
    currentSection.durationSeconds - activeElapsedSeconds,
  );
  const projectedRemainingSeconds = currentSectionRemainingIfOnTrack + futurePlannedSeconds;
  const projectedTotalSeconds = pastActualSeconds + activeElapsedSeconds + projectedRemainingSeconds;
  const scheduleDeltaSeconds = projectedTotalSeconds - totalOriginalPlannedSeconds;
  const estimatedFinishDate = new Date(now + projectedRemainingSeconds * 1000);

  // Smart proportional rebalance for remaining unstarted sections
  const canRebalance = scheduleDeltaSeconds > 45 && currentIndex < liveSections.length - 1;
  const handleRebalanceFuture = () => {
    if (!canRebalance) return;
    triggerHaptic('tap', hapticsEnabled);
    const futureCount = liveSections.length - (currentIndex + 1);
    if (futureCount <= 0 || futurePlannedSeconds <= 0) return;

    const minFloorPerSection = 30;
    const maxReducible = Math.max(0, futurePlannedSeconds - futureCount * minFloorPerSection);
    const toTrim = Math.min(scheduleDeltaSeconds, maxReducible);
    if (toTrim <= 0) return;

    setLiveSections((prev) =>
      prev.map((sec, idx) => {
        if (idx <= currentIndex) return sec;
        const share = sec.durationSeconds / futurePlannedSeconds;
        const cut = Math.round(toTrim * share);
        return {
          ...sec,
          durationSeconds: Math.max(minFloorPerSection, sec.durationSeconds - cut),
        };
      }),
    );
  };

  // Touch Lock long-press unlock logic
  const unlockTimerRef = useRef<number | null>(null);
  const startUnlockHold = () => {
    const start = Date.now();
    const duration = 900;
    if (unlockTimerRef.current) window.clearInterval(unlockTimerRef.current);
    unlockTimerRef.current = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100);
      setUnlockProgress(pct);
      if (pct >= 100) {
        if (unlockTimerRef.current) window.clearInterval(unlockTimerRef.current);
        unlockTimerRef.current = null;
        setIsTouchLocked(false);
        setUnlockProgress(0);
        triggerHaptic('tap', hapticsEnabled);
      }
    }, 30);
  };

  const cancelUnlockHold = () => {
    if (unlockTimerRef.current) {
      window.clearInterval(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    setUnlockProgress(0);
  };

  const categoryMeta = CATEGORIES[currentSection.category] ?? CATEGORIES.theory;

  const timerTextColor =
    urgencyState === 'overtime'
      ? 'text-red-400'
      : urgencyState === 'critical'
        ? 'text-orange-400'
        : urgencyState === 'warning'
          ? 'text-amber-300'
          : 'text-zinc-50';

  const progressBarColor =
    urgencyState === 'overtime'
      ? 'bg-red-500 animate-pulse'
      : urgencyState === 'critical'
        ? 'bg-orange-500'
        : urgencyState === 'warning'
          ? 'bg-amber-400'
          : 'bg-emerald-400';

  const containerRingClass =
    urgencyState === 'overtime'
      ? 'animate-overtime-glow'
      : urgencyState === 'critical'
        ? 'ring-2 ring-inset ring-orange-500/60'
        : urgencyState === 'warning'
          ? 'ring-1 ring-inset ring-amber-400/35'
          : '';

  return (
    <div
      className={`relative mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-between bg-zinc-950 px-4 pb-6 pt-4 transition-all sm:px-6 ${containerRingClass}`}
    >
      {/* Top Control & Status Bar */}
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Ieși</span>
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-semibold text-zinc-200">{recipe.title}</p>
          <div className="mt-0.5 flex items-center justify-center gap-2 text-[11px] text-zinc-400">
            <span>
              Etapa {currentIndex + 1}/{liveSections.length}
            </span>
            {wakeLockActive && (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Eye className="h-3 w-3" />
                Ecran activ
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setHapticsEnabled((v) => !v)}
            title={hapticsEnabled ? 'Vibrații pornite' : 'Vibrații oprite (silențios complet)'}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
              hapticsEnabled
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500'
            }`}
          >
            <Smartphone className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowSectionDrawer((v) => !v)}
            title="Vezi toate etapele"
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
              showSectionDrawer
                ? 'border-zinc-600 bg-zinc-800 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsTouchLocked(true)}
            title="Blochează atingerile accidentale"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Global Timeline & ETA Pacing Strip */}
      <section className="mt-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-zinc-500">Rămas total: </span>
              <span className="font-mono font-semibold text-zinc-200 tabular-nums">
                {formatCountdown(projectedRemainingSeconds)}
              </span>
            </div>
            <div className="hidden sm:block text-zinc-700">•</div>
            <div>
              <span className="text-zinc-500">Finisaj: </span>
              <span className="font-mono font-semibold text-zinc-200 tabular-nums">
                {formatClockHHMM(estimatedFinishDate)}
              </span>
            </div>
          </div>

          <span
            className={`rounded-lg border px-2 py-0.5 font-mono text-[11px] font-semibold ${
              scheduleDeltaSeconds >= 30
                ? 'border-red-500/40 bg-red-500/15 text-red-300'
                : scheduleDeltaSeconds <= -30
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300'
            }`}
          >
            {formatDeltaCompact(scheduleDeltaSeconds)}
          </span>
        </div>

        <SegmentedTimeline
          sections={liveSections}
          currentIndex={currentIndex}
          currentProgressPct={progressPct}
          isOvertime={isAtOrPastZero}
          onSelectSection={(idx) => {
            if (!isTouchLocked) goToSection(idx);
          }}
        />
      </section>

      {/* Smart Rebalance Suggestion when behind schedule */}
      {canRebalance && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs">
          <span className="text-amber-200">
            Ești cu <strong>{formatDeltaCompact(scheduleDeltaSeconds)}</strong> peste plan.
          </span>
          <button
            type="button"
            onClick={handleRebalanceFuture}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 font-bold text-zinc-950 hover:bg-amber-300"
          >
            <Scissors className="h-3 w-3" />
            Ajustează restul
          </button>
        </div>
      )}

      {/* Main Hero Countdown Card */}
      <main className="my-4 flex flex-1 flex-col items-center justify-center rounded-3xl border border-zinc-800/90 bg-zinc-900/50 px-5 py-7 text-center">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${categoryMeta.badgeClass}`}>
          {categoryMeta.label}
        </span>

        <h2 className="mt-3 max-w-lg text-2xl font-bold leading-snug tracking-tight text-zinc-50 sm:text-3xl">
          {currentSection.title}
        </h2>

        {currentSection.cueNote && (
          <p className="mt-2 max-w-md rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-xs italic text-amber-200/90">
            „{currentSection.cueNote}”
          </p>
        )}

        {/* Massive Tabular Numerals */}
        <div className="my-6 select-none">
          <div
            className={`font-mono text-7xl font-extrabold tracking-tight tabular-nums sm:text-8xl ${timerTextColor}`}
          >
            {isOvertime ? '+' : ''}
            {formatCountdown(displaySeconds)}
          </div>
          <p className="mt-2 text-xs font-medium uppercase tracking-widest text-zinc-400">
            {isAtOrPastZero
              ? 'Depășire timp alocat — treci la următoarea'
              : `Alocat: ${formatDurationHuman(currentSection.durationSeconds)} • ${Math.round(remainingPct)}% rămas`}
          </p>
        </div>

        {/* Thick Current Section Progress Bar */}
        <div className="w-full max-w-md">
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-zinc-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-200 ${progressBarColor}`}
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
        </div>
      </main>

      {/* Up Next Preview Card */}
      <section className="mb-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/80 px-4 py-3">
        {nextSection ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Urmează (Etapa {currentIndex + 2}/{liveSections.length})
              </p>
              <p className="truncate text-sm font-semibold text-zinc-100">{nextSection.title}</p>
              {nextSection.cueNote && (
                <p className="truncate text-[11px] text-zinc-400">{nextSection.cueNote}</p>
              )}
            </div>
            <span className="shrink-0 rounded-xl border border-zinc-700/80 bg-zinc-950 px-2.5 py-1 font-mono text-xs font-semibold text-zinc-300">
              {formatDurationHuman(nextSection.durationSeconds)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-300">
              Aceasta este ultima secțiune din rețetă.
            </p>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
        )}
      </section>

      {/* Bottom Ergonomic Thumb Controls */}
      <footer className="space-y-2.5">
        {/* Fine Adjustment Row */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => adjustCurrentDuration(-60)}
            className="flex items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 active:scale-[0.98]"
          >
            <Minus className="h-3.5 w-3.5" />1 min
          </button>
          <button
            type="button"
            onClick={resetCurrentSection}
            className="flex items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => adjustCurrentDuration(60)}
            className="flex items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />1 min
          </button>
        </div>

        {/* Main Navigation & Play/Pause Row */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => goToSection(currentIndex - 1)}
            className="flex h-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-30"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={togglePlayPause}
            className={`col-span-2 flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-bold transition active:scale-[0.98] ${
              isRunning
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                : 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5 fill-current" />
                Pauză
              </>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" />
                {activeElapsedMs > 0 ? 'Continuă' : 'Pornește'}
              </>
            )}
          </button>

          {nextSection ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap', hapticsEnabled);
                goToSection(currentIndex + 1, isRunning);
              }}
              className={`flex h-14 items-center justify-center gap-1 rounded-2xl text-sm font-bold transition active:scale-[0.98] ${
                isAtOrPastZero
                  ? 'animate-pulse bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-400'
                  : 'border border-zinc-700 bg-zinc-100 text-zinc-950 hover:bg-white'
              }`}
            >
              <span className="hidden sm:inline">Urm.</span>
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => finishLecture()}
              className="flex h-14 items-center justify-center gap-1 rounded-2xl bg-emerald-500 text-xs font-bold text-zinc-950 hover:bg-emerald-400"
            >
              Final
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </footer>

      {/* Section Drawer Modal */}
      {showSectionDrawer && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100">Toate etapele ({liveSections.length})</h3>
              <button
                type="button"
                onClick={() => setShowSectionDrawer(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {liveSections.map((sec, idx) => {
                const active = idx === currentIndex;
                const done = idx < currentIndex;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => goToSection(idx)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-semibold text-zinc-100">
                        {idx + 1}. {sec.title}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {done
                          ? `Real: ${formatDurationHuman(completedActuals[idx] ?? sec.durationSeconds)}`
                          : active
                            ? 'În desfășurare'
                            : 'Urmează'}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-zinc-300">
                      {formatDurationHuman(sec.durationSeconds)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="text-base font-bold text-zinc-100">Închei sesiunea curentă?</h3>
            <p className="mt-1.5 text-xs text-zinc-400">
              Poți salva progresul de până acum în istoricul cursurilor sau poți ieși fără salvare.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => finishLecture()}
                className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400"
              >
                Finalizează & Salvează rezumatul
              </button>
              <button
                type="button"
                onClick={() => {
                  saveActiveRun(null);
                  onExit();
                }}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
              >
                Ieși fără salvare
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Anulează (înapoi la curs)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tactical Touch Lock Overlay */}
      {isTouchLocked && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/45 p-6 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-900/95 p-5 text-center shadow-2xl">
            <Lock className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
            <p className="text-sm font-bold text-zinc-100">Ecran blocat tactic</p>
            <p className="mt-1 text-xs text-zinc-400">
              Cronometrul continuă în fundal fără risc de apăsări accidentale.
            </p>

            <button
              type="button"
              onPointerDown={startUnlockHold}
              onPointerUp={cancelUnlockHold}
              onPointerLeave={cancelUnlockHold}
              onPointerCancel={cancelUnlockHold}
              className="relative mt-4 flex w-full select-none items-center justify-center gap-2 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 py-3.5 text-xs font-bold text-zinc-100"
            >
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500/30 transition-none"
                style={{ width: `${unlockProgress}%` }}
              />
              <Unlock className="relative z-10 h-4 w-4 text-emerald-400" />
              <span className="relative z-10">Ține apăsat 1s pentru deblocare</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
