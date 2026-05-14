import { useEffect, useState, useCallback } from 'react';
import { apiGetPolls, apiCreatePoll, apiClosePoll, apiDeletePoll } from '../lib/api';
import { supabase } from '../integrations/supabase/client';

interface Poll { id: string; question: string; options: string[]; active: boolean; created_at: string; ends_at: string | null; }

export function PollsAdmin() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [tally, setTally] = useState<Record<string, number[]>>({});
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState<string[]>(['', '', '']);
  const [endsAt, setEndsAt] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await apiGetPolls();
    setPolls(r?.polls || []);
    setTally(r?.tally || {});
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel('polls-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const setOpt = (i: number, v: string) => setOpts(prev => prev.map((o, idx) => idx === i ? v : o));
  const addOpt = () => opts.length < 10 && setOpts(prev => [...prev, '']);
  const rmOpt = (i: number) => opts.length > 2 && setOpts(prev => prev.filter((_, idx) => idx !== i));

  const create = async () => {
    const cleaned = opts.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) { setMsg('❌ Need question and 2+ options'); return; }
    const r = await apiCreatePoll(question.trim(), cleaned, endsAt || undefined);
    if (r?.success) {
      setMsg('✅ Poll created!');
      setQuestion(''); setOpts(['', '', '']); setEndsAt('');
      load();
    } else setMsg('❌ ' + (r?.error || 'failed'));
    setTimeout(() => setMsg(''), 3500);
  };

  const close = async (id: string) => { await apiClosePoll(id); load(); };
  const remove = async (id: string) => { if (window.confirm('Delete this poll and all its votes?')) { await apiDeletePoll(id); load(); } };

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 w-full space-y-5">
      <h2 className="text-lg font-bold">🗳️ Polls</h2>
      {msg && <p className={`text-sm font-medium ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
        <h3 className="font-bold text-sm">➕ Create Poll</h3>
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="What should we add this week?"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
        <div className="space-y-1.5">
          {opts.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`}
                className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500" />
              {opts.length > 2 && <button onClick={() => rmOpt(i)} className="px-2 bg-red-900/30 text-red-300 rounded text-xs hover:bg-red-700 hover:text-white">×</button>}
            </div>
          ))}
          {opts.length < 10 && <button onClick={addOpt} className="text-xs text-purple-400 hover:text-purple-300">+ Add option</button>}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500">Ends (optional):</label>
          <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs" />
        </div>
        <button onClick={create} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold">Create Poll</button>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-sm">📋 All Polls</h3>
        {polls.length === 0 && <p className="text-gray-600 text-sm italic">No polls yet.</p>}
        {polls.map(p => {
          const counts = tally[p.id] || new Array(p.options.length).fill(0);
          const total = counts.reduce((a, b) => a + b, 0);
          return (
            <div key={p.id} className={`bg-gray-900 rounded-xl border p-4 ${p.active ? 'border-purple-700/40' : 'border-gray-800 opacity-70'}`}>
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div>
                  <p className="font-bold text-white text-sm">{p.question}</p>
                  <p className="text-[10px] text-gray-600">{new Date(p.created_at).toLocaleString()} · {total} votes · {p.active ? <span className="text-green-400">ACTIVE</span> : <span className="text-gray-500">CLOSED</span>}</p>
                </div>
                <div className="flex gap-1.5">
                  {p.active && <button onClick={() => close(p.id)} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700">Close</button>}
                  <button onClick={() => remove(p.id)} className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs hover:bg-red-700 hover:text-white">🗑️</button>
                </div>
              </div>
              <div className="space-y-1">
                {p.options.map((o, i) => {
                  const c = counts[i] || 0;
                  const pct = total > 0 ? Math.round((c / total) * 100) : 0;
                  return (
                    <div key={i} className="relative bg-black/40 rounded overflow-hidden border border-gray-800">
                      <div className="absolute inset-y-0 left-0 bg-purple-600/30" style={{ width: `${pct}%` }} />
                      <div className="relative px-2.5 py-1 flex items-center justify-between text-xs">
                        <span className="text-gray-200">{o}</span>
                        <span className="text-gray-400 font-mono">{c} · {pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
