export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Formatează secunde în format MM:SS (suportă și peste 60 de minute, ex: 90:00,
 * pentru că în predare bugetul este gândit direct în minute).
 */
export function formatCountdown(totalSeconds: number): string {
  const abs = Math.max(0, Math.floor(Math.abs(totalSeconds)));
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Formatează durata uman în minute / secunde (ex: "90 min", "12 min 30s", "45s").
 */
export function formatDurationHuman(totalSeconds: number): string {
  const abs = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

/**
 * Formatează diferența de ritm (ex: "+2m 10s", "-1m", "La timp").
 */
export function formatDeltaCompact(deltaSeconds: number): string {
  const rounded = Math.round(deltaSeconds);
  if (Math.abs(rounded) < 10) return 'La timp';
  const sign = rounded > 0 ? '+' : '-';
  const abs = Math.abs(rounded);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  if (mins === 0) return `${sign}${secs}s`;
  if (secs === 0) return `${sign}${mins}m`;
  return `${sign}${mins}m ${secs}s`;
}

export function formatClockHHMM(date: Date): string {
  return date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function sumRecipeSeconds(sections: { durationSeconds: number }[]): number {
  return sections.reduce((acc, s) => acc + Math.max(0, s.durationSeconds), 0);
}
