export type HapticCue = 'warning' | 'critical' | 'overtime' | 'tap';

export function triggerHaptic(cue: HapticCue, enabled: boolean): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    switch (cue) {
      case 'tap':
        navigator.vibrate(25);
        break;
      case 'warning':
        navigator.vibrate([90]);
        break;
      case 'critical':
        navigator.vibrate([100, 70, 100]);
        break;
      case 'overtime':
        navigator.vibrate([180, 90, 180]);
        break;
    }
  } catch {
    // Ignoră silențios pe browserele care blochează vibrațiile fără interacțiune recentă
  }
}
