import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

// The updater plugin is only available inside a real Tauri window.
// This guard prevents errors when the app runs in a regular browser.
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface UpdateInfo {
  version: string;
  body: string | null;
}

export default function UpdateChecker() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [state, setState] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauri) return;

    // Dynamically import to avoid bundling issues in the browser build.
    let cancelled = false;
    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const result = await check();
        if (!cancelled && result?.available) {
          setUpdate({ version: result.version, body: result.body ?? null });
        }
      } catch (err) {
        // Silently ignore — update check failures should never surface to users.
        console.warn('[Updater] Update check failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleInstall = async () => {
    if (!update || !isTauri) return;
    setState('downloading');
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const result = await check();
      if (result?.available) {
        await result.downloadAndInstall();
        setState('done');
        // Prompt restart after a short delay so the user sees the "done" state.
        setTimeout(async () => {
          const { relaunch } = await import('@tauri-apps/plugin-process');
          await relaunch();
        }, 1500);
      }
    } catch (err) {
      console.error('[Updater] Install failed:', err);
      setState('error');
    }
  };

  if (!update || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm w-full shadow-2xl rounded-2xl border
                 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
                 animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="alert"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <Download size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              Update available — v{update.version}
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Dismiss update notification"
          >
            <X size={16} />
          </button>
        </div>

        {/* Release notes snippet */}
        {update.body && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-3">
            {update.body}
          </p>
        )}

        {/* Action button */}
        <button
          onClick={handleInstall}
          disabled={state === 'downloading' || state === 'done'}
          className="w-full py-2 px-4 rounded-xl text-sm font-semibold transition-all
                     bg-indigo-600 hover:bg-indigo-700 text-white
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state === 'idle' && 'Install Update'}
          {state === 'downloading' && (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Downloading…
            </span>
          )}
          {state === 'done' && '✓ Restarting…'}
          {state === 'error' && 'Update failed — try again later'}
        </button>
      </div>
    </div>
  );
}
