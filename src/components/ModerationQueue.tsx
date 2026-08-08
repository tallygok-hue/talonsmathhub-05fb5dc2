import { useCallback, useEffect, useState } from 'react';
import { apiGetReports, apiAiTriageReports, apiModQueueAction } from '../lib/api';

interface QueueItem {
  id: string;
  message_id: string;
  reason: string | null;
  source: string;
  created_at: string;
  ai_severity: string | null;
  ai_summary: string | null;
  ai_action: string | null;
  ai_reviewed_at: string | null;
  message: { id: string; username: string; message: string; image_url: string | null } | null;
}

const SEV: Record<string, string> = {
  critical: 'bg-red-600/20 text-red-300 border-red-600/40',
  high: 'bg-orange-600/20 text-orange-300 border-orange-600/40',
  medium: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40',
  low: 'bg-blue-600/20 text-blue-300 border-blue-600/40',
  none: 'bg-gray-700/30 text-gray-400 border-gray-700',
};

export function ModerationQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState<'all' | 'auto' | 'user' | 'unreviewed'>('all');

  const load = useCallback(async () => {
    const r = await apiGetReports().catch(() => null);
    if (r?.reports) setItems(r.reports);
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 20_000);
    return () => clearInterval(i);
  }, [load]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const triage = async () => {
    setBusy(true);
    const r = await apiAiTriageReports();
    setBusy(false);
    if (r?.error) flash('❌ ' + r.error);
    else flash(`✅ AI reviewed ${r.reviewed} item(s)`);
    await load();
  };

  const act = async (id: string, kind: 'dismiss' | 'delete' | 'timeout' | 'delete_timeout', minutes?: number) => {
    setBusy(true);
    await apiModQueueAction(id, kind, minutes);
    setBusy(false);
    await load();
  };

  const shown = items.filter(i =>
    filter === 'all' ? true
      : filter === 'unreviewed' ? !i.ai_reviewed_at
        : i.source === filter
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'unreviewed', 'auto', 'user'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-xs font-bold capitalize transition ${filter === f ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={triage} disabled={busy}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-bold px-3 py-1.5 rounded text-xs transition">
          {busy ? 'Running…' : '🛡️ Run AI safety gate'}
        </button>
      </div>

      {toast && <p className="text-xs font-medium text-gray-300">{toast}</p>}

      {shown.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">Queue is clear. Nothing to review.</p>
      )}

      <div className="space-y-3">
        {shown.map(it => (
          <div key={it.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">
                  <span className="font-bold text-gray-300">{it.message?.username || 'unknown'}</span>
                  {' · '}{new Date(it.created_at).toLocaleString()}
                  {' · '}<span className="uppercase">{it.source}</span>
                </p>
                <p className="text-sm text-white mt-1 break-words">{it.message?.message || <em className="text-gray-600">message deleted</em>}</p>
                {it.message?.image_url && (
                  <img src={it.message.image_url} alt="Reported chat attachment" className="mt-2 max-h-32 rounded border border-gray-800" />
                )}
                {it.reason && <p className="text-[11px] text-gray-500 mt-1">Reported: {it.reason}</p>}
              </div>
              <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded border ${SEV[it.ai_severity || 'none'] || SEV.none}`}>
                {it.ai_severity || 'unreviewed'}
              </span>
            </div>

            {it.ai_summary && (
              <div className="bg-black/40 rounded p-2.5 text-xs text-gray-300">
                <span className="text-purple-300 font-bold">AI:</span> {it.ai_summary}
                {it.ai_action && <span className="text-gray-500"> · suggested: <span className="font-bold text-gray-300">{it.ai_action}</span></span>}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => act(it.id, 'dismiss')} disabled={busy}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1.5 rounded transition">Dismiss</button>
              <button onClick={() => act(it.id, 'delete')} disabled={busy}
                className="text-xs bg-red-600/30 hover:bg-red-600/50 text-red-300 px-2.5 py-1.5 rounded transition">Delete message</button>
              <button onClick={() => act(it.id, 'timeout', 10)} disabled={busy}
                className="text-xs bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 px-2.5 py-1.5 rounded transition">Timeout 10m</button>
              <button onClick={() => act(it.id, 'delete_timeout', 60)} disabled={busy}
                className="text-xs bg-pink-600/30 hover:bg-pink-600/50 text-pink-300 px-2.5 py-1.5 rounded transition">Delete + 1h timeout</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
