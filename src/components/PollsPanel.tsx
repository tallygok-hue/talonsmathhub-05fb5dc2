import { useEffect, useState, useCallback } from 'react';
import { apiGetPolls, apiVotePoll } from '../lib/api';
import { supabase } from '../integrations/supabase/client';

interface Poll { id: string; question: string; options: string[]; active: boolean; ends_at: string | null; created_at: string; }

export function PollsPanel() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [tally, setTally] = useState<Record<string, number[]>>({});
  const [myVote, setMyVote] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    const r = await apiGetPolls();
    if (r?.polls) {
      setPolls(r.polls);
      setTally(r.tally || {});
      setMyVote(r.myVote || {});
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // poll_votes/polls no longer have public SELECT; poll periodically instead.
    const id = setInterval(() => { load(); }, 5000);
    return () => clearInterval(id);
  }, [load]);

  const vote = async (pollId: string, idx: number) => {
    setMyVote(v => ({ ...v, [pollId]: idx }));
    await apiVotePoll(pollId, idx);
    load();
  };

  const activePolls = polls.filter(p => p.active);
  if (activePolls.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-3">
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-700/40 rounded-xl overflow-hidden">
        <button onClick={() => setOpen(o => !o)} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗳️</span>
            <span className="font-bold text-sm text-purple-200">Weekly Poll{activePolls.length > 1 ? 's' : ''} ({activePolls.length})</span>
          </div>
          <span className="text-purple-300 text-xs">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="px-4 pb-4 space-y-4">
            {activePolls.map(p => {
              const counts = tally[p.id] || new Array(p.options.length).fill(0);
              const total = counts.reduce((a, b) => a + b, 0);
              const mine = myVote[p.id];
              return (
                <div key={p.id} className="bg-black/30 rounded-lg p-3 border border-purple-800/30">
                  <p className="text-sm font-semibold text-white mb-2">{p.question}</p>
                  <div className="space-y-1.5">
                    {p.options.map((opt, i) => {
                      const c = counts[i] || 0;
                      const pct = total > 0 ? Math.round((c / total) * 100) : 0;
                      const isMine = mine === i;
                      return (
                        <button key={i} onClick={() => vote(p.id, i)}
                          className={`relative w-full text-left rounded-md overflow-hidden border transition ${isMine ? 'border-purple-400' : 'border-gray-700 hover:border-purple-500/50'}`}>
                          <div className="absolute inset-y-0 left-0 bg-purple-600/30 transition-all" style={{ width: `${pct}%` }} />
                          <div className="relative px-3 py-1.5 flex items-center justify-between text-xs">
                            <span className={`font-medium ${isMine ? 'text-purple-100' : 'text-gray-200'}`}>
                              {isMine ? '✓ ' : ''}{opt}
                            </span>
                            <span className="text-gray-300 font-mono">{c} · {pct}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">{total} vote{total === 1 ? '' : 's'} · click to {mine !== undefined ? 'change' : 'vote'}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
