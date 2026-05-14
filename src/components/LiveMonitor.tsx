import { useEffect, useState, useCallback, useRef } from 'react';
import { apiGetSessions, apiGetScreens, apiGetScreen, apiEndSession } from '../lib/api';
import { supabase } from '../integrations/supabase/client';

interface SessionRow {
  id: string; username: string; is_admin: boolean; created_at: string; last_active: string;
  code_id: string; device_hash?: string | null;
  current_view?: string | null; current_game?: string | null; current_url?: string | null;
  session_token?: string;
}

interface ScreenMeta { session_token: string; username: string; updated_at: string; width?: number; height?: number; }

export function LiveMonitor() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [screens, setScreens] = useState<Record<string, ScreenMeta>>({});
  const [viewing, setViewing] = useState<{ token: string; username: string } | null>(null);
  const [bigScreen, setBigScreen] = useState<string | null>(null);
  const [bigMeta, setBigMeta] = useState<{ updated_at?: string } | null>(null);
  const intervalRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const [s, sc] = await Promise.all([apiGetSessions(), apiGetScreens()]);
    if (s?.sessions) setSessions(s.sessions);
    if (sc?.screens) {
      const map: Record<string, ScreenMeta> = {};
      for (const r of sc.screens) map[r.session_token] = r;
      setScreens(map);
    }
  }, []);

  useEffect(() => { load(); const id = window.setInterval(load, 5000); return () => window.clearInterval(id); }, [load]);

  useEffect(() => {
    const ch = supabase.channel('live-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_screens' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // When a "viewing" session is open, poll the screenshot every 3s
  useEffect(() => {
    if (!viewing) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setBigScreen(null); setBigMeta(null);
      return;
    }
    const fetchOne = async () => {
      const r = await apiGetScreen(viewing.token);
      if (r?.screen?.screenshot) { setBigScreen(r.screen.screenshot); setBigMeta({ updated_at: r.screen.updated_at }); }
    };
    fetchOne();
    intervalRef.current = window.setInterval(fetchOne, 3000) as unknown as number;
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [viewing]);

  const ageSec = (ts?: string) => ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 1000) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 w-full space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">📺 Live Monitor</h2>
          <p className="text-xs text-gray-500 mt-0.5">See what each user is doing right now. Click any thumbnail to enlarge with auto-refresh.</p>
        </div>
        <button onClick={load} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">🔄 Refresh</button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500 text-sm">No active sessions.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sessions.map(s => {
            // session_token may not be present (we don't expose it via getSessions). Match by user+code if needed.
            // We use device_hash + username heuristic for screenshot matching: actually the session_screens uses session_token only.
            // The screens map keyed by session_token. Without token here, we look for the matching screen by username+code.
            const matching = Object.values(screens).find(sc => sc.username === s.username);
            const age = ageSec(matching?.updated_at);
            const stale = age === null || age > 30;
            return (
              <div key={s.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
                <button
                  onClick={() => matching && setViewing({ token: matching.session_token, username: s.username })}
                  className="aspect-video bg-black relative flex items-center justify-center text-gray-600 text-xs hover:opacity-90"
                >
                  {matching ? (
                    <ScreenThumb token={matching.session_token} stamp={matching.updated_at} />
                  ) : (
                    <span>📷 awaiting first screen…</span>
                  )}
                  {!stale && <span className="absolute top-1.5 right-1.5 bg-green-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">● LIVE</span>}
                </button>
                <div className="p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm truncate">{s.is_admin ? '👑 ' : '👤 '}{s.username}</span>
                    <span className="text-[10px] text-gray-500">{age != null ? `${age}s` : '—'}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    <span className="text-purple-300">{s.current_view || 'unknown'}</span>
                    {s.current_game ? <span className="text-pink-300"> · 🎮 {s.current_game}</span> : null}
                  </div>
                  {s.current_url && <div className="text-[9px] text-gray-600 truncate font-mono" title={s.current_url}>{s.current_url}</div>}
                  <div className="flex gap-1 pt-1">
                    <button onClick={() => apiEndSession(s.id).then(load)} className="flex-1 px-2 py-1 bg-gray-800 text-gray-300 rounded text-[10px] hover:bg-gray-700">End session</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-gray-950 border border-gray-800 rounded-xl max-w-5xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">📺 Watching {viewing.username}</h3>
                <p className="text-[10px] text-gray-500">Auto-refreshing every 3s · last frame {bigMeta?.updated_at ? new Date(bigMeta.updated_at).toLocaleTimeString() : '—'}</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="bg-black flex items-center justify-center min-h-[400px]">
              {bigScreen ? (
                <img src={bigScreen} alt="live screen" className="max-w-full max-h-[75vh] object-contain" />
              ) : (
                <div className="text-gray-600 text-sm py-12">Waiting for screen…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScreenThumb({ token, stamp }: { token: string; stamp: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    apiGetScreen(token).then(r => { if (alive && r?.screen?.screenshot) setSrc(r.screen.screenshot); });
    return () => { alive = false; };
  }, [token, stamp]);
  if (!src) return <span>loading…</span>;
  return <img src={src} alt="screen" className="w-full h-full object-cover" />;
}
