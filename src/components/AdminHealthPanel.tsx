import { useCallback, useEffect, useState } from 'react';
import { apiGetStatus, apiSetStatus, apiResetIncidentClock } from '../lib/api';
import { formatSinceIncident } from './StatusBanner';

const OPTIONS: { id: 'operational' | 'degraded' | 'outage' | 'maintenance'; label: string; color: string }[] = [
  { id: 'operational', label: '🟢 Operational', color: 'border-green-500 text-green-300 bg-green-500/10' },
  { id: 'degraded', label: '🟡 Degraded', color: 'border-yellow-500 text-yellow-300 bg-yellow-500/10' },
  { id: 'outage', label: '🔴 Outage', color: 'border-red-500 text-red-300 bg-red-500/10' },
  { id: 'maintenance', label: '🔵 Maintenance', color: 'border-blue-500 text-blue-300 bg-blue-500/10' },
];

export function AdminHealthPanel() {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    const r = await apiGetStatus().catch(() => null);
    if (r && !r.error) { setData(r); setMessage(r.message || ''); }
  }, []);

  useEffect(() => {
    load();
    const p = setInterval(load, 30_000);
    const c = setInterval(() => tick(x => x + 1), 30_000);
    return () => { clearInterval(p); clearInterval(c); };
  }, [load]);

  const setStatus = async (status: 'operational' | 'degraded' | 'outage' | 'maintenance') => {
    setBusy(true);
    await apiSetStatus(status, message, status !== 'operational');
    await load();
    setBusy(false);
    setToast('Status updated');
    setTimeout(() => setToast(''), 2500);
  };

  const reset = async () => {
    if (!confirm('Reset the "hours since last incident" counter back to zero?')) return;
    setBusy(true);
    await apiResetIncidentClock(note || undefined);
    setNote('');
    await load();
    setBusy(false);
    setToast('Incident clock reset');
    setTimeout(() => setToast(''), 2500);
  };

  if (!data) return <div className="p-6 text-sm text-gray-500">Loading health…</div>;

  return (
    <div className="p-4 space-y-4">
      {toast && <p className="text-xs text-green-400 font-medium">✅ {toast}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Status</p>
          <p className="text-lg font-black capitalize">{data.status}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Since last incident</p>
          <p className="text-lg font-black font-mono">{formatSinceIncident(data.lastIncidentAt)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Online now</p>
          <p className="text-lg font-black">{data.onlineNow}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Open reports</p>
          <p className="text-lg font-black">{data.openReports}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm">Status banner</h3>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Banner message shown to everyone"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
        />
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map(o => (
            <button
              key={o.id}
              disabled={busy}
              onClick={() => setStatus(o.id)}
              className={`px-3 py-2 rounded border text-xs font-bold transition disabled:opacity-50 ${o.color} ${data.status === o.id ? 'ring-2 ring-white/30' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500">Anything other than Operational starts a new incident automatically.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm">Incident counter</h3>
        {data.lastIncidentNote && <p className="text-xs text-gray-500">Last note: {data.lastIncidentNote}</p>}
        <div className="flex gap-2">
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Reason for reset (optional)"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
          />
          <button
            onClick={reset}
            disabled={busy}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-bold px-4 rounded text-sm transition"
          >
            Reset to 0
          </button>
        </div>
      </div>
    </div>
  );
}
