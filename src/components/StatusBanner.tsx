import { useEffect, useState } from 'react';
import { apiGetStatus } from '../lib/api';

interface StatusData {
  status: string;
  message: string;
  lastIncidentAt: string | null;
  onlineNow: number;
}

const STYLES: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  operational: { dot: 'bg-green-400', text: 'text-green-300', bg: 'bg-green-500/10 border-green-500/30', label: 'All systems operational' },
  degraded: { dot: 'bg-yellow-400', text: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/30', label: 'Degraded performance' },
  outage: { dot: 'bg-red-500', text: 'text-red-300', bg: 'bg-red-500/10 border-red-500/40', label: 'Outage' },
  maintenance: { dot: 'bg-blue-400', text: 'text-blue-300', bg: 'bg-blue-500/10 border-blue-500/30', label: 'Maintenance' },
};

export function formatSinceIncident(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return '0h 0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h ${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

export function StatusBanner() {
  const [data, setData] = useState<StatusData | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const r = await apiGetStatus().catch(() => null);
      if (!cancelled && r && !r.error) setData(r);
    };
    load();
    const poll = setInterval(load, 60_000);
    const clock = setInterval(() => tick(x => x + 1), 30_000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(clock); };
  }, []);

  if (!data) return null;
  const st = STYLES[data.status] || STYLES.operational;

  return (
    <div className={`border-y px-4 py-1.5 flex items-center justify-center gap-3 text-xs flex-wrap ${st.bg}`}>
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${st.dot} animate-pulse`} />
        <span className={`font-semibold ${st.text}`}>{data.message || st.label}</span>
      </span>
      <span className="text-gray-500">•</span>
      <span className="text-gray-400">
        <span className="font-mono font-bold text-gray-200">{formatSinceIncident(data.lastIncidentAt)}</span> since last incident
      </span>
      <span className="text-gray-500">•</span>
      <span className="text-gray-400">
        <span className="font-mono font-bold text-gray-200">{data.onlineNow}</span> online
      </span>
    </div>
  );
}
