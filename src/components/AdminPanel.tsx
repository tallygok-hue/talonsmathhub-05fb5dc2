import { useState, useEffect, useCallback } from 'react';
import {
  apiGetCodes, apiAddCode, apiRemoveCode, apiActivateCode,
  apiGetSessions, apiEndSession, apiGetLogs, apiChangeAdminCode,
  apiGetAllRequests, apiRespondRequest, apiDeleteRequest,
  apiBanDevice, apiUnbanDevice, apiGetBannedDevices, apiGetCodeAccount,
} from '../lib/api';
import { supabase } from '../integrations/supabase/client';
import { LiveMonitor } from './LiveMonitor';
import { AnalyticsPanel } from './AnalyticsPanel';
import { PollsAdmin } from './PollsAdmin';

interface AdminPanelProps {
  onBack: () => void;
  onLogout: () => void;
}

interface CodeEntry { id: string; code: string; is_admin: boolean; active: boolean; created_at: string; }
interface SessionEntry { id: string; username: string; is_admin: boolean; created_at: string; last_active: string; code_id: string; device_hash?: string | null; }
interface LogEntry { id: string; username: string; code_text: string; success: boolean; ip: string; user_agent: string; created_at: string; device_hash?: string | null; }
interface RequestEntry { id: string; code_id: string; username: string; category: string; message: string; status: 'pending' | 'accepted' | 'denied'; admin_response: string | null; created_at: string; responded_at: string | null; }
interface BannedDevice { id: string; device_hash: string; reason: string | null; created_at: string; last_username: string | null; last_user_agent: string | null; }
interface CodeAccount { favorites: string[]; recent: any[]; sessions: any[]; recentLogs: any[]; }

type TabId = 'dashboard' | 'live' | 'sessions' | 'logs' | 'codes' | 'bans' | 'requests' | 'analytics' | 'polls';

export function AdminPanel({ onBack, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bans, setBans] = useState<BannedDevice[]>([]);
  const [newCode, setNewCode] = useState('');
  const [showCodes, setShowCodes] = useState(false);
  const [showFullLogCodes, setShowFullLogCodes] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [newAdminCode, setNewAdminCode] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [requests, setRequests] = useState<RequestEntry[]>([]);
  const [responseDraft, setResponseDraft] = useState<Record<string, string>>({});
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'accepted' | 'denied'>('pending');
  const [accountModal, setAccountModal] = useState<{ codeId: string; code: string; data: CodeAccount | null } | null>(null);

  const fetchCodes = useCallback(async () => { const r = await apiGetCodes(); if (r.codes) setCodes(r.codes); }, []);
  const fetchSessions = useCallback(async () => { const r = await apiGetSessions(); if (r.sessions) setSessions(r.sessions); }, []);
  const fetchLogs = useCallback(async () => { const r = await apiGetLogs(); if (r.logs) setLogs(r.logs); }, []);
  const fetchRequests = useCallback(async () => { const r = await apiGetAllRequests(); if (r.requests) setRequests(r.requests); }, []);
  const fetchBans = useCallback(async () => { const r = await apiGetBannedDevices(); if (r.banned) setBans(r.banned); }, []);

  useEffect(() => { fetchCodes(); fetchSessions(); fetchLogs(); fetchRequests(); fetchBans(); },
    [fetchCodes, fetchSessions, fetchLogs, fetchRequests, fetchBans]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'codes') fetchCodes();
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'bans') fetchBans();
  }, [activeTab, fetchSessions, fetchLogs, fetchCodes, fetchRequests, fetchBans]);

  useEffect(() => {
    const channel = supabase.channel('admin-requests-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_requests' }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  const respondToRequest = async (id: string, status: 'accepted' | 'denied') => {
    const response = responseDraft[id] || '';
    await apiRespondRequest(id, status, response);
    setResponseDraft(d => ({ ...d, [id]: '' }));
    setCloudMsg(status === 'accepted' ? '✅ Request accepted — user notified!' : '❌ Request denied — user notified!');
    fetchRequests();
    setTimeout(() => setCloudMsg(''), 4000);
  };
  const deleteRequest = async (id: string) => {
    if (!window.confirm('Delete this request?')) return;
    await apiDeleteRequest(id); fetchRequests();
  };
  const addCode = async () => {
    const trimmed = newCode.trim(); if (!trimmed) return;
    setLoading(true);
    const r = await apiAddCode(trimmed);
    if (r.success) { setNewCode(''); setCloudMsg('✅ Code added & synced!'); fetchCodes(); }
    else setCloudMsg('❌ ' + (r.error || 'Failed to add'));
    setLoading(false); setTimeout(() => setCloudMsg(''), 4000);
  };
  const removeCode = async (codeId: string) => {
    if (!window.confirm('Remove this code? All users using it will be logged out.')) return;
    setLoading(true);
    await apiRemoveCode(codeId);
    setCloudMsg('✅ Code removed & users kicked!'); fetchCodes(); fetchSessions();
    setLoading(false); setTimeout(() => setCloudMsg(''), 4000);
  };
  const activateCode = async (codeId: string) => { setLoading(true); await apiActivateCode(codeId); fetchCodes(); setLoading(false); };
  const endSession = async (sessionId: string) => { await apiEndSession(sessionId); fetchSessions(); };
  const changeAdminCode = async () => {
    if (newAdminCode.trim().length < 4) return;
    const adminEntry = codes.find(c => c.is_admin); if (!adminEntry) return;
    await apiChangeAdminCode(adminEntry.id, newAdminCode.trim());
    setNewAdminCode(''); setCloudMsg('✅ Admin code changed!'); fetchCodes();
    setTimeout(() => setCloudMsg(''), 4000);
  };

  const banDevice = async (deviceHash: string, username?: string, userAgent?: string) => {
    if (!deviceHash) { alert('No device fingerprint recorded for this user yet.'); return; }
    const reason = window.prompt(`Ban this device?\nFingerprint: ${deviceHash.slice(0, 16)}…\n\nOptional reason:`, '');
    if (reason === null) return;
    await apiBanDevice(deviceHash, reason || undefined, username, userAgent);
    setCloudMsg('✅ Device banned & kicked!');
    fetchBans(); fetchSessions();
    setTimeout(() => setCloudMsg(''), 4000);
  };
  const unbanDevice = async (deviceHash: string) => {
    if (!window.confirm('Unban this device?')) return;
    await apiUnbanDevice(deviceHash); fetchBans();
  };

  const openAccount = async (codeId: string, codeText: string) => {
    setAccountModal({ codeId, code: codeText, data: null });
    const r = await apiGetCodeAccount(codeId);
    setAccountModal({ codeId, code: codeText, data: r });
  };

  const activeSessions = sessions;
  const successCount = logs.filter(l => l.success).length;
  const failedCount = logs.filter(l => !l.success).length;
  const activeCodes = codes.filter(c => c.active && !c.is_admin);
  const filteredLogs = logs.filter(log => {
    const okFilter = logFilter === 'all' || (logFilter === 'success' && log.success) || (logFilter === 'failed' && !log.success);
    const okSearch = !logSearch || log.username.toLowerCase().includes(logSearch.toLowerCase())
      || log.created_at.includes(logSearch)
      || (log.code_text || '').toLowerCase().includes(logSearch.toLowerCase());
    return okFilter && okSearch;
  });
  const pendingRequestCount = requests.filter(r => r.status === 'pending').length;
  const filteredRequests = requests.filter(r => requestFilter === 'all' || r.status === requestFilter);

  const tabs: { id: TabId; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'live', label: 'Live', icon: '📺', badge: activeSessions.length || undefined },
    { id: 'sessions', label: 'Sessions', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'polls', label: 'Polls', icon: '🗳️' },
    { id: 'logs', label: 'Logs', icon: '📋' },
    { id: 'codes', label: 'Accounts', icon: '🔑' },
    { id: 'bans', label: 'Bans', icon: '🚫', badge: bans.length || undefined },
    { id: 'requests', label: 'Requests', icon: '💬', badge: pendingRequestCount || undefined },
  ];

  const fmtCode = (c: string) => showFullLogCodes ? c : (c === '***ADMIN***' ? '🔑 ADMIN' : (c || '').slice(0, 3) + '•••');

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-lg shrink-0">⚙️</div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight">Admin Panel</h1>
              <p className="text-[10px] text-gray-500 truncate">☁️ {logs.length} logs · {activeSessions.length} live · {activeCodes.length} codes · {bans.length} bans</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onBack} className="px-2.5 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-700">← Games</button>
            <button onClick={onLogout} className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">🚨 Exit</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 flex overflow-x-auto border-t border-gray-800/50">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-1 shrink-0 ${activeTab === tab.id ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'}`}>
              <span>{tab.icon}</span><span>{tab.label}</span>
              {tab.badge ? <span className="ml-1 bg-pink-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 min-w-[16px] text-center">{tab.badge}</span> : null}
            </button>
          ))}
        </div>
      </header>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="max-w-6xl mx-auto px-4 py-5 w-full space-y-5">
          <h2 className="text-lg font-bold">📊 Dashboard</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Logins', value: logs.length, color: 'text-white', border: 'border-gray-800' },
              { label: 'Successful', value: successCount, color: 'text-green-400', border: 'border-green-800/40' },
              { label: 'Failed', value: failedCount, color: 'text-red-400', border: 'border-red-800/40' },
              { label: 'Active Sessions', value: activeSessions.length, color: 'text-blue-400', border: 'border-blue-800/40' },
            ].map(s => (
              <div key={s.label} className={`bg-gray-900 rounded-xl border ${s.border} p-4 text-center`}>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {cloudMsg && <p className={`text-sm font-medium ${cloudMsg.startsWith('✅') ? 'text-green-400' : 'text-yellow-400'}`}>{cloudMsg}</p>}
        </div>
      )}

      {/* SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="max-w-6xl mx-auto px-4 py-5 w-full space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold">👥 Active Sessions</h2>
            <button onClick={fetchSessions} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">🔄 Refresh</button>
          </div>
          {cloudMsg && <p className="text-sm font-medium text-green-400">{cloudMsg}</p>}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {sessions.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No active sessions.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-800/60 border-b border-gray-700">{['User', 'Login', 'Last Active', 'Device', 'Role', 'Actions'].map(h => <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {sessions.map(sess => (
                      <tr key={sess.id} className="hover:bg-gray-800/40">
                        <td className="px-3 py-2.5 font-semibold">{sess.username}</td>
                        <td className="px-3 py-2.5 text-gray-400 font-mono text-[10px]">{new Date(sess.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-400 font-mono text-[10px]">{new Date(sess.last_active).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-500 font-mono text-[10px]" title={sess.device_hash || 'no fingerprint'}>{sess.device_hash ? sess.device_hash.slice(0, 10) + '…' : '—'}</td>
                        <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-bold ${sess.is_admin ? 'bg-yellow-900/50 text-yellow-400' : 'bg-blue-900/50 text-blue-400'}`}>{sess.is_admin ? '👑' : '👤'}</span></td>
                        <td className="px-3 py-2.5 flex gap-1.5">
                          <button onClick={() => endSession(sess.id)} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700">End</button>
                          <button onClick={() => banDevice(sess.device_hash || '', sess.username)} disabled={!sess.device_hash}
                            className="px-2 py-1 bg-red-900/40 text-red-300 rounded text-xs hover:bg-red-700 hover:text-white disabled:opacity-30 font-bold">🚫 Ban Device</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOGS */}
      {activeTab === 'logs' && (
        <div className="max-w-6xl mx-auto px-4 py-5 w-full space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold">📋 Login Logs</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowFullLogCodes(v => !v)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border ${showFullLogCodes ? 'bg-yellow-500 text-yellow-950 border-yellow-400' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}>
                {showFullLogCodes ? '👁️ Codes Visible' : '🙈 Show Full Codes'}
              </button>
              <button onClick={fetchLogs} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">🔄</button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search by user, code, or date…"
              className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm" />
            <div className="flex gap-1.5 shrink-0">
              {(['all', 'success', 'failed'] as const).map(f => (
                <button key={f} onClick={() => setLogFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold ${logFilter === f ? f === 'success' ? 'bg-green-600 text-white' : f === 'failed' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-gray-900' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'}`}>
                  {f === 'all' ? 'All' : f === 'success' ? '✓ Success' : '✗ Failed'}
                </button>
              ))}
            </div>
          </div>
          {filteredLogs.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center"><p className="text-gray-400 text-sm">No logs match.</p></div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-800/60 border-b border-gray-700">{['#', 'Time', 'User', 'Code', 'Status', 'Device', 'IP', 'Action'].map(h => <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {filteredLogs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-gray-800/40">
                        <td className="px-3 py-2 text-gray-600 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2 font-semibold text-xs">{log.username}</td>
                        <td className="px-3 py-2 font-mono text-xs"><span className={log.code_text === '***ADMIN***' || (showFullLogCodes && /admin/i.test(log.code_text || '')) ? 'text-yellow-400 font-bold' : 'text-gray-300'}>{fmtCode(log.code_text)}</span></td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${log.success ? 'bg-green-900/60 text-green-400' : 'bg-red-900/60 text-red-400'}`}>{log.success ? '✓' : '✗'}</span></td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-[10px]" title={log.device_hash || 'no fingerprint'}>{log.device_hash ? log.device_hash.slice(0, 10) + '…' : '—'}</td>
                        <td className="px-3 py-2 text-gray-600 font-mono text-[10px]">{log.ip}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => banDevice(log.device_hash || '', log.username, log.user_agent)} disabled={!log.device_hash}
                            className="px-2 py-0.5 bg-red-900/40 text-red-300 rounded text-[10px] hover:bg-red-700 hover:text-white disabled:opacity-30 font-bold">🚫 Ban</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CODES (now styled as accounts) */}
      {activeTab === 'codes' && (
        <div className="max-w-4xl mx-auto px-4 py-5 w-full space-y-5">
          <h2 className="text-lg font-bold">🔑 Code Accounts</h2>
          {cloudMsg && <p className={`text-sm font-medium ${cloudMsg.startsWith('✅') ? 'text-green-400' : cloudMsg.startsWith('❌') ? 'text-red-400' : 'text-yellow-400'}`}>{cloudMsg}</p>}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="font-bold text-sm mb-3">➕ Add New Account Code</h3>
            <div className="flex gap-2">
              <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCode()} placeholder="Type new code..."
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm font-mono" />
              <button onClick={addCode} disabled={!newCode.trim() || loading} className="px-5 py-2.5 bg-yellow-500 text-gray-900 rounded-xl font-bold hover:bg-yellow-400 disabled:opacity-30 text-sm shrink-0">+ Add</button>
            </div>
            <p className="text-[10px] text-gray-600 mt-2">Each code is an account: stores favorites & recently played, synced across devices.</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">🗝️ All Account Codes</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowCodes(v => !v)} className="px-2.5 py-1 bg-gray-800 text-gray-400 text-xs rounded-lg hover:bg-gray-700 border border-gray-700">{showCodes ? '🙈 Hide' : '👁️ Show'}</button>
                <button onClick={fetchCodes} className="px-2.5 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-lg hover:bg-blue-600/30 border border-blue-600/30">🔄</button>
              </div>
            </div>
            {codes.length === 0 ? <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-xl text-gray-600 text-sm">Loading…</div> : (
              <div className="space-y-2">
                {codes.filter(c => !c.is_admin).map(c => (
                  <div key={c.id} className={`flex items-center justify-between rounded-xl px-4 py-3 gap-3 ${c.active ? 'bg-gray-800 border border-gray-700/50' : 'bg-gray-800/50 border border-red-800/30 opacity-60'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${c.active ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="font-mono text-blue-300 text-sm truncate">{showCodes ? c.code : c.code.slice(0, 2) + '•'.repeat(Math.max(c.code.length - 2, 4))}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openAccount(c.id, c.code)} className="px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-lg text-xs hover:bg-blue-700 hover:text-white border border-blue-800/40 font-bold">👤 View</button>
                      {!c.active && <button onClick={() => activateCode(c.id)} className="px-3 py-1.5 bg-green-900/20 text-green-400 rounded-lg text-xs hover:bg-green-600 hover:text-white font-bold border border-green-800/40">✓ Reactivate</button>}
                      <button onClick={() => removeCode(c.id)} disabled={loading} className="px-3 py-1.5 bg-red-900/20 text-red-400 rounded-lg text-xs hover:bg-red-600 hover:text-white font-bold border border-red-800/40 disabled:opacity-30">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-gray-900 rounded-xl border border-yellow-700/30 p-5">
            <h3 className="font-bold text-yellow-400 mb-1">🔐 Change Admin Code</h3>
            <p className="text-xs text-gray-500 mb-4">Current: <code className="bg-gray-800 px-1 rounded text-gray-400">{showAdminInput ? (codes.find(c => c.is_admin)?.code || '???') : '•••••••'}</code></p>
            <div className="flex gap-2">
              <input type={showAdminInput ? 'text' : 'password'} value={newAdminCode} onChange={e => setNewAdminCode(e.target.value)} placeholder="New admin code (min 4 chars)…"
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm font-mono" />
              <button onClick={() => setShowAdminInput(v => !v)} className="px-3 py-2.5 bg-gray-800 text-gray-400 rounded-xl text-sm border border-gray-700 hover:bg-gray-700">{showAdminInput ? '🙈' : '👁️'}</button>
              <button onClick={changeAdminCode} disabled={newAdminCode.trim().length < 4} className="px-4 py-2.5 bg-yellow-500 text-gray-900 rounded-xl font-bold text-sm hover:bg-yellow-400 disabled:opacity-30">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* BANS */}
      {activeTab === 'bans' && (
        <div className="max-w-5xl mx-auto px-4 py-5 w-full space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold">🚫 Banned Devices</h2>
              <p className="text-xs text-gray-500 mt-0.5">Bans are by browser/device fingerprint — works around shared school WiFi IPs.</p>
            </div>
            <button onClick={fetchBans} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">🔄 Refresh</button>
          </div>
          {cloudMsg && <p className="text-sm font-medium text-green-400">{cloudMsg}</p>}
          {bans.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-10 text-center text-gray-500 text-sm">
              No banned devices. Use the 🚫 Ban Device button on any session or login log.
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-800/60 border-b border-gray-700">{['Banned', 'Last User', 'Fingerprint', 'Reason', 'Action'].map(h => <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-800/50">
                  {bans.map(b => (
                    <tr key={b.id} className="hover:bg-gray-800/40">
                      <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{new Date(b.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 font-semibold text-xs">{b.last_username || '—'}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-gray-500" title={b.device_hash}>{b.device_hash.slice(0, 24)}…</td>
                      <td className="px-3 py-2 text-xs text-gray-300">{b.reason || <span className="text-gray-600 italic">no reason</span>}</td>
                      <td className="px-3 py-2"><button onClick={() => unbanDevice(b.device_hash)} className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs hover:bg-green-600 hover:text-white font-bold">✓ Unban</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* REQUESTS */}
      {activeTab === 'requests' && (
        <div className="max-w-6xl mx-auto px-4 py-5 w-full space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold">💬 User Requests & Feedback</h2>
              <p className="text-gray-500 text-xs mt-0.5">{pendingRequestCount} pending</p>
            </div>
            <button onClick={fetchRequests} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">🔄</button>
          </div>
          {cloudMsg && <p className={`text-sm font-medium ${cloudMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{cloudMsg}</p>}
          <div className="flex gap-1.5 flex-wrap">
            {(['pending', 'accepted', 'denied', 'all'] as const).map(f => (
              <button key={f} onClick={() => setRequestFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${requestFilter === f ? f === 'pending' ? 'bg-yellow-500 text-yellow-950' : f === 'accepted' ? 'bg-emerald-500 text-emerald-950' : f === 'denied' ? 'bg-red-500 text-red-950' : 'bg-gray-300 text-gray-900' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'}`}>
                {f} {f === 'pending' && pendingRequestCount > 0 ? `(${pendingRequestCount})` : ''}
              </button>
            ))}
          </div>
          {filteredRequests.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center"><div className="text-4xl mb-2">📭</div><p className="text-gray-400 text-sm">No {requestFilter === 'all' ? '' : requestFilter} requests.</p></div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(r => (
                <div key={r.id} className={`bg-gray-900 rounded-xl border p-4 ${r.status === 'accepted' ? 'border-emerald-700/40' : r.status === 'denied' ? 'border-red-700/40' : 'border-yellow-700/40'}`}>
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{r.username}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{r.category}</span>
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${r.status === 'accepted' ? 'bg-emerald-500 text-emerald-950' : r.status === 'denied' ? 'bg-red-500 text-red-950' : 'bg-yellow-500 text-yellow-950'}`}>{r.status}</span>
                      <span className="text-[10px] text-gray-600">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <button onClick={() => deleteRequest(r.id)} className="text-gray-600 hover:text-red-400 text-xs">🗑️</button>
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap break-words mb-3 bg-gray-800/40 rounded-lg p-3">{r.message}</p>
                  {r.admin_response && <div className="text-xs text-gray-300 bg-gray-800/60 border-l-2 border-purple-500 rounded px-3 py-2 mb-2"><span className="font-bold text-purple-300">Your response:</span> {r.admin_response}</div>}
                  {r.status === 'pending' && (
                    <div className="space-y-2">
                      <textarea value={responseDraft[r.id] || ''} onChange={e => setResponseDraft(d => ({ ...d, [r.id]: e.target.value }))} placeholder="Optional response…" rows={2}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-xs focus:outline-none focus:border-purple-500 resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => respondToRequest(r.id, 'accepted')} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold">✓ Accept</button>
                        <button onClick={() => respondToRequest(r.id, 'denied')} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold">✗ Deny</button>
                      </div>
                    </div>
                  )}
                  {r.status !== 'pending' && (
                    <button onClick={() => respondToRequest(r.id, 'accepted')} className="text-[10px] text-gray-500 hover:text-gray-300">⟲ Re-open</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CODE ACCOUNT MODAL */}
      {accountModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" onClick={() => setAccountModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">👤 Account: <span className="font-mono text-blue-300">{accountModal.code}</span></h3>
                <p className="text-[10px] text-gray-500">Favorites · Recently played · Sessions</p>
              </div>
              <button onClick={() => setAccountModal(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {!accountModal.data ? (
                <div className="text-center py-8 text-gray-500 text-sm">Loading…</div>
              ) : (
                <>
                  <section>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-yellow-400 mb-2">⭐ Favorites ({accountModal.data.favorites.length})</h4>
                    {accountModal.data.favorites.length === 0 ? <p className="text-xs text-gray-600 italic">No favorites yet.</p> : (
                      <div className="flex flex-wrap gap-1.5">
                        {accountModal.data.favorites.map((id: string) => (
                          <span key={id} className="text-xs px-2 py-1 bg-yellow-900/20 text-yellow-300 rounded border border-yellow-800/30 font-mono">{id}</span>
                        ))}
                      </div>
                    )}
                  </section>
                  <section>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-2">🕒 Recently Played ({accountModal.data.recent.length})</h4>
                    {accountModal.data.recent.length === 0 ? <p className="text-xs text-gray-600 italic">Nothing played yet.</p> : (
                      <ul className="text-xs text-gray-300 space-y-1">
                        {accountModal.data.recent.map((g: any, i: number) => (
                          <li key={i} className="flex items-center gap-2"><span>{g.icon || '🎮'}</span><span className="font-medium">{g.name}</span><span className="text-gray-600 text-[10px]">{g.ts ? new Date(g.ts).toLocaleString() : ''}</span></li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-green-400 mb-2">📡 Live Sessions ({accountModal.data.sessions.length})</h4>
                    {accountModal.data.sessions.length === 0 ? <p className="text-xs text-gray-600 italic">No active sessions.</p> : (
                      <ul className="text-xs text-gray-300 space-y-1">
                        {accountModal.data.sessions.map((s: any, i: number) => (
                          <li key={i} className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{s.username}</span>
                            <span className="text-gray-600 text-[10px]">{new Date(s.last_active).toLocaleString()}</span>
                            <span className="font-mono text-[10px] text-gray-500">{s.device_hash ? s.device_hash.slice(0, 12) + '…' : 'no fp'}</span>
                            {s.device_hash && <button onClick={() => banDevice(s.device_hash, s.username)} className="text-[10px] px-1.5 py-0.5 bg-red-900/40 text-red-300 rounded font-bold hover:bg-red-700 hover:text-white">🚫 Ban</button>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
