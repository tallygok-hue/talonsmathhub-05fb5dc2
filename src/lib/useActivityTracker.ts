import { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { apiUpdateActivity, apiUploadScreen } from './api';

interface Opts {
  enabled: boolean;
  view: string;            // e.g. 'hub', 'game', 'abw', 'admin'
  game?: string | null;    // current game name when in-game
  pingMs?: number;         // activity ping interval
  screenshotMs?: number;   // screenshot interval
}

/**
 * Periodically pings the server with the user's current activity (view + game)
 * AND uploads a downscaled JPEG screenshot of the page (admin live-view).
 * Note: cross-origin iframes (games) appear as black in the capture by browser policy.
 */
export function useActivityTracker({ enabled, view, game, pingMs = 5000, screenshotMs = 8000 }: Opts) {
  const viewRef = useRef(view);
  const gameRef = useRef(game);
  useEffect(() => { viewRef.current = view; gameRef.current = game; }, [view, game]);

  // Activity pings
  useEffect(() => {
    if (!enabled) return;
    const ping = () => apiUpdateActivity(viewRef.current, gameRef.current).catch(() => {});
    ping();
    const id = window.setInterval(ping, pingMs);
    return () => window.clearInterval(id);
  }, [enabled, pingMs]);

  // Screenshots
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let busy = false;
    const capture = async () => {
      if (busy || cancelled || document.hidden) return;
      busy = true;
      try {
        const target = document.body;
        const canvas = await html2canvas(target, {
          backgroundColor: '#0a0a0f',
          logging: false,
          scale: Math.min(0.4, 640 / Math.max(target.clientWidth, 1)),
          useCORS: true,
          allowTaint: false,
          ignoreElements: (el) => el.tagName === 'SCRIPT',
        } as any);
        const w = canvas.width, h = canvas.height;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        if (!cancelled && dataUrl.length < 600_000) {
          await apiUploadScreen(dataUrl, w, h);
        }
      } catch { /* ignore */ }
      busy = false;
    };
    const start = window.setTimeout(capture, 2000);
    const id = window.setInterval(capture, screenshotMs);
    return () => { cancelled = true; window.clearTimeout(start); window.clearInterval(id); };
  }, [enabled, screenshotMs]);
}
