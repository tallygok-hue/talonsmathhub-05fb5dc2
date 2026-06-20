import { useCallback, useEffect, useState } from 'react';
import {
  apiGetAccounts, apiAdminAdjustPoints, apiAdminSetRole,
  apiGetMultipliers, apiCreateMultiplier, apiEndMultiplier, apiGetActiveMultiplier,
} from '../lib/api';

interface Account {
  id: string;
  username: string | null;
  role: string;
  points: number;
  banned: boolean;
}
interface Multiplier {
  id: string;
  name: string;
  multiplier: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
}

const QUICK_EVENTS = [
  { label: '2x · 15 min', mult: 2, mins: 15 },
  { label: '2x · 1 h', mult: 2, mins: 60 },
  { label: '2x · 6 h', mult: 2, mins: 360 },
  { label: '2x · 24 h', mult: 2, mins: 1440 },
  { label: '3x · 1 h', mult: 3, mins: 60 },
  { label: '5x · 30 min', mult: 5, mins: 30 },
];

export function AdminEconomyPanel() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [multipliers, setMultipliers] = useState<Multiplier[]>([]);
  const [activeMult, setActiveMult] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [customMult, setCustomMult] = useState(2);
  const [customMins, setCustomMins] = useState(60);
  const [customName, setCustomName] = useState('Bonus Event');

  const refresh = useCallback(async () => {
    const [a, m, ac] = await Promise.all([apiGetAccounts(), apiGetMultipliers(), apiGetActiveMultiplier()]);
    setAccounts(a?.accounts || []);
    setMultipliers(m?.multipliers || []);
    setActiveMult(ac?.multiplier || 1);
  }, []);

  useEffect(() => { refresh(); const i = setInterval(refresh, 15000); return () => clearInterval(i); }, [refresh]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 3500); };

  const adjust = async () => {
    if (!selectedId || !amount) return;
    const r = await apiAdminAdjustPoints(selectedId, amount, note || undefined);
    if (r?.success) { flash(`✅ ${amount > 0 ? '+' : ''}${amount} pts applied`); setNote(''); refresh(); }
    else flash('❌ ' + (r?.error || 'Failed'));
  };

  const setRole = async (id: string, role: 'user' | 'moderator' | 'admin') => {
    const r = await apiAdminSetRole(id, role);
    if (r?.success) { flash(`✅ Role set to ${role}`); refresh(); }
  };

  const launchEvent = async (mult: number, mins: number, name?: string) => {
    const starts = new Date().toISOString();
    const ends = new Date(Date.now() + mins * 60_000).toISOString();
    const r = await apiCreateMultiplier(name || `${mult}x Bonus`, mult, starts, ends);
    if (r?.success) { flash(`🎉 ${mult}x event live for ${mins} min!`); refresh(); }
    else flash('❌ ' + (r?.error || 'Failed'));
  };

  const endEvent = async (id: string) => {
    if (!confirm('End this event now?')) return;
    await apiEndMultiplier(id);
    refresh();
  };

  const filtered = accounts.filter(a =>
    !search || (a.username || '').toLowerCase().includes(search.toLowerCase())
  ).slice(0, 60);

  const liveEvents = multipliers.filter(m => m.active && new Date(m.ends_at) > new Date());

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold">💰 Economy & Events</h2>
        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeMult > 1 ? 'bg-yellow-500 text-yellow-950' : 'bg-gray-800 text-gray-400'}`}>
          Current multiplier: {activeMult}x
        </div>
      </div>
      {msg && <p className={`text-sm font-medium ${msg.startsWith('✅') || msg.startsWith('🎉') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

      {/* Events */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
        <h3 className="font-bold text-sm">⚡ Quick Launch Events</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_EVENTS.map(q => (
            <button key={q.label} onClick={() => launchEvent(q.mult, q.mins)}
              className="px-3 py-2.5 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/40 hover:to-orange-500/40 border border-yellow-700/40 rounded-lg text-sm font-bold text-yellow-200">
              {q.label}
            </button>
          ))}
        </div>
        <div className="border-t border-gray-800 pt-4">
          <div className="text-xs uppercase text-gray-500 font-bold mb-2">Custom Event</div>
          <div className="flex gap-2 flex-wrap">
            <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Event name"
              className="flex-1 min-w-[140px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="number" min={2} max={10} value={customMult} onChange={e => setCustomMult(Number(e.target.value) || 2)}
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <span className="text-gray-500 self-center text-sm">x for</span>
            <input type="number" min={1} max={10080} value={customMins} onChange={e => setCustomMins(Number(e.target.value) || 60)}
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            <span className="text-gray-500 self-center text-sm">min</span>
            <button onClick={() => launchEvent(customMult, customMins, customName)}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 rounded-lg text-sm font-bold">
              Launch
            </button>
          </div>
        </div>

        {liveEvents.length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <div className="text-xs uppercase text-gray-500 font-bold mb-2">🔴 Live Events</div>
            <div className="space-y-2">
              {liveEvents.map(e => {
                const remaining = Math.max(0, Math.floor((new Date(e.ends_at).getTime() - Date.now()) / 60000));
                return (
                  <div key={e.id} className="flex items-center justify-between bg-gray-800/60 border border-yellow-700/30 rounded-lg px-3 py-2">
                    <div className="text-sm">
                      <span className="font-bold text-yellow-300">{e.multiplier}x</span> · {e.name}
                      <span className="text-xs text-gray-500 ml-2">{remaining} min left</span>
                    </div>
                    <button onClick={() => endEvent(e.id)} className="px-2 py-1 bg-red-900/40 hover:bg-red-700 text-red-200 rounded text-xs font-bold">End now</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Give / take points */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
        <h3 className="font-bold text-sm">🪙 Give / Take Points</h3>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filtered.map(a => (
            <button key={a.id} onClick={() => setSelectedId(a.id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition ${selectedId === a.id ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold truncate">{a.username || '(no name)'}</span>
                {a.role === 'admin' && <span className="text-yellow-400 text-xs">👑</span>}
                {a.role === 'moderator' && <span className="text-emerald-400 text-xs">🛡️</span>}
                {a.banned && <span className="text-red-400 text-xs">🚫</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-yellow-300">{a.points} pts</span>
                <select value={a.role} onClick={e => e.stopPropagation()}
                  onChange={e => { e.stopPropagation(); setRole(a.id, e.target.value as any); }}
                  className="bg-gray-900 border border-gray-700 rounded text-[10px] px-1 py-0.5 text-gray-300">
                  <option value="user">user</option>
                  <option value="moderator">mod</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-xs text-gray-500 text-center py-3">No accounts.</p>}
        </div>
        <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-800">
          <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value) | 0)}
            className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
            className="flex-1 min-w-[140px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          <div className="flex gap-1">
            {[-100, -10, 10, 100, 500].map(n => (
              <button key={n} onClick={() => setAmount(n)}
                className={`px-2 py-2 rounded-lg text-xs font-bold ${n < 0 ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'} hover:bg-gray-700`}>
                {n > 0 ? '+' : ''}{n}
              </button>
            ))}
          </div>
          <button onClick={adjust} disabled={!selectedId || !amount}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 text-yellow-950 rounded-lg text-sm font-bold">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
