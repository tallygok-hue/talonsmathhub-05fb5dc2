import { useEffect, useState } from 'react';
import { apiGetActiveMultiplier, apiGetMultipliers } from '../lib/api';

interface Active { mult: number; endsAt?: string; name?: string }

export function MultiplierBanner() {
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const r = await apiGetActiveMultiplier();
      const mult = r?.multiplier || 1;
      if (mult > 1) {
        // Look up the live event row to get name + ends_at
        const m = await apiGetMultipliers().catch(() => null);
        const live = (m?.multipliers || []).find((x: any) =>
          x.active && new Date(x.ends_at) > new Date() && Number(x.multiplier) === mult
        );
        if (!cancelled) setActive({ mult, name: live?.name, endsAt: live?.ends_at });
      } else if (!cancelled) {
        setActive(null);
      }
    };
    refresh();
    const i = setInterval(refresh, 30_000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  // Countdown tick
  const [, force] = useState(0);
  useEffect(() => {
    if (!active?.endsAt) return;
    const t = setInterval(() => force(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [active?.endsAt]);

  if (!active) return null;

  const remainingMs = active.endsAt ? new Date(active.endsAt).getTime() - Date.now() : 0;
  const mins = Math.max(0, Math.floor(remainingMs / 60000));
  const secs = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
  const timeStr = active.endsAt
    ? (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}:${String(secs).padStart(2, '0')}`)
    : '';

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-yellow-950 px-4 py-2 flex items-center justify-center gap-3 font-bold text-sm shadow-lg animate-pulse-slow">
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.4),transparent_60%)] pointer-events-none" />
      <span className="text-lg">⚡</span>
      <span className="relative z-10 uppercase tracking-wide">
        {active.mult}× Points Event Active
        {active.name ? ` · ${active.name}` : ''}
      </span>
      {timeStr && (
        <span className="relative z-10 bg-yellow-950/20 px-2 py-0.5 rounded text-xs font-mono">
          {timeStr} left
        </span>
      )}
      <span className="text-lg">⚡</span>
    </div>
  );
}
