import { useEffect, useState } from 'react';
import { apiGameAnalytics } from '../lib/api';

interface Row { id: string; name: string; plays: number; uniqueUsers: number; }

export function AnalyticsPanel() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async (d: number) => {
    setLoading(true);
    const r = await apiGameAnalytics(d);
    setRows(r?.top || []);
    setTotal(r?.totalPlays || 0);
    setLoading(false);
  };
  useEffect(() => { load(days); }, [days]);

  const max = Math.max(1, ...rows.map(r => r.plays));

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 w-full space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">📈 Game Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">Most-played games across the last {days} day{days === 1 ? '' : 's'} · {total} total plays</p>
        </div>
        <div className="flex gap-1.5">
          {[1, 7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${days === d ? 'bg-yellow-500 text-yellow-950' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'}`}>
              {d === 1 ? '24h' : `${d}d`}
            </button>
          ))}
          <button onClick={() => load(days)} className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">🔄</button>
        </div>
      </div>

      {loading ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500 text-sm">No game plays recorded yet for this window.</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-800/60 border-b border-gray-700">
              {['#', 'Game', 'Plays', 'Unique users', 'Popularity'].map(h => <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-800/50">
              {rows.slice(0, 50).map((r, i) => (
                <tr key={r.id} className="hover:bg-gray-800/40">
                  <td className="px-3 py-2 text-gray-600 text-xs w-8">{i + 1}</td>
                  <td className="px-3 py-2"><span className="font-semibold text-white text-xs">{r.name}</span><div className="text-[10px] text-gray-600 font-mono truncate max-w-[280px]">{r.id}</div></td>
                  <td className="px-3 py-2 font-mono text-pink-300 text-xs font-bold">{r.plays}</td>
                  <td className="px-3 py-2 font-mono text-blue-300 text-xs">{r.uniqueUsers}</td>
                  <td className="px-3 py-2 w-1/3">
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: `${(r.plays / max) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
