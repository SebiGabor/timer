import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Download,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { AppPreferences, Recipe, TursoConfig } from '../types';

interface SettingsViewProps {
  preferences: AppPreferences;
  tursoConfig: TursoConfig;
  isSyncing: boolean;
  syncStatusMsg: string | null;
  syncError: string | null;
  onUpdatePreferences: (prefs: AppPreferences) => void;
  onSaveAndSyncTurso: (config: TursoConfig) => Promise<void>;
  onDisconnectTurso: () => void;
  onExportJson: () => void;
  onImportJson: (recipes: Recipe[]) => void;
  onRestoreStarterRecipes: () => void;
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  preferences,
  tursoConfig,
  isSyncing,
  syncStatusMsg,
  syncError,
  onUpdatePreferences,
  onSaveAndSyncTurso,
  onDisconnectTurso,
  onExportJson,
  onImportJson,
  onRestoreStarterRecipes,
  onBack,
}) => {
  const [url, setUrl] = useState(tursoConfig.url);
  const [authToken, setAuthToken] = useState(tursoConfig.authToken);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTursoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAndSyncTurso({
      url: url.trim(),
      authToken: authToken.trim(),
      lastSyncedAt: tursoConfig.lastSyncedAt,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed)) {
        setImportFeedback('Fișier JSON invalid: trebuie să conțină o listă de rețete.');
        return;
      }
      onImportJson(parsed as Recipe[]);
      setImportFeedback(`Au fost importate ${parsed.length} rețete.`);
    } catch {
      setImportFeedback('Nu am putut citi fișierul JSON.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-20 pt-5 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi
        </button>
        <h1 className="text-sm font-bold text-zinc-100">Setări & Sincronizare</h1>
        <div className="w-16" />
      </header>

      <div className="space-y-6">
        {/* Presentation Preferences */}
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Preferințe în sala de curs
          </h2>

          <label className="flex cursor-pointer items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Menține ecranul activ (Wake Lock)</p>
              <p className="text-xs text-zinc-500">
                Previne blocarea automată a telefonului în timp ce cronometrul rulează.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.keepScreenAwake}
              onChange={(e) =>
                onUpdatePreferences({ ...preferences, keepScreenAwake: e.target.checked })
              }
              className="mt-1 h-4 w-4 accent-emerald-500"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-3 border-t border-zinc-800 pt-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Vibrații discrete (Haptic)</p>
              <p className="text-xs text-zinc-500">
                Oprit implicit: pe o catedră de lemn vibrația se poate auzi. Util doar dacă ții telefonul în buzunar.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.enableHaptics}
              onChange={(e) =>
                onUpdatePreferences({ ...preferences, enableHaptics: e.target.checked })
              }
              className="mt-1 h-4 w-4 accent-emerald-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Prag avertizare galben (%)</label>
              <input
                type="number"
                min={5}
                max={50}
                value={preferences.warningThresholdPct}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    warningThresholdPct: Math.max(5, Math.min(50, Number(e.target.value) || 25)),
                  })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Prag critic (secunde)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={preferences.criticalSeconds}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    criticalSeconds: Math.max(5, Math.min(120, Number(e.target.value) || 30)),
                  })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>
        </section>

        {/* Turso Cloud Sync */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-zinc-100">Sincronizare Cloud Turso (opțional)</h2>
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-zinc-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              Cheile Turso sunt salvate <strong>doar local în browser</strong> (niciodată în codul de pe GitHub Pages). Creezi rețetele pe laptop și le sincronizezi instant pe telefon.
            </span>
          </div>

          <form onSubmit={handleTursoSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Turso Database URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="libsql://tact-curs-utilizator.turso.io"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">Turso Auth Token</label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="eyJhbGciOi..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none"
              />
            </div>

            {syncError && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {syncError}
              </p>
            )}

            {syncStatusMsg && !syncError && (
              <p className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {syncStatusMsg}
              </p>
            )}

            {tursoConfig.lastSyncedAt && (
              <p className="text-[11px] text-zinc-500">
                Ultima sincronizare:{' '}
                {new Date(tursoConfig.lastSyncedAt).toLocaleString('ro-RO')}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={isSyncing || !url.trim() || !authToken.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Se sincronizează...' : 'Testează & Sincronizează DB'}
              </button>

              {(tursoConfig.url || tursoConfig.authToken) && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl('');
                    setAuthToken('');
                    onDisconnectTurso();
                  }}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Deconectează
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Backup / Export / Starter Data */}
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Backup JSON & Rețete Demo
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportJson}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              Exportă JSON
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              <Upload className="h-3.5 w-3.5 text-sky-400" />
              Importă JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => {
                onRestoreStarterRecipes();
                setImportFeedback('Rețetele demo au fost adăugate.');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurează rețete demo
            </button>
          </div>

          {importFeedback && (
            <p className="text-xs text-emerald-300">{importFeedback}</p>
          )}
        </section>
      </div>
    </div>
  );
};
