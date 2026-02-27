import { useState, useEffect, useCallback } from 'react';
import { apiGetCodes, apiAddCode, apiRemoveCode, apiActivateCode, apiGetSessions, apiEndSession, apiGetLogs, apiChangeAdminCode } from '../lib/api';

interface AdminPanelProps {
  onBack: () => void;
  onLogout: () => void;
}

interface CodeEntry {
  id: string;
  code: string;
  is_admin: boolean;
  active: boolean;
  created_at: string;
}

interface SessionEntry {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  last_active: string;
  code_id: string;
}

interface LogEntry {
  id: string;
  username: string;
  code_text: string;
  success: boolean;
  ip: string;
  user_agent: string;
  created_at: string;
}

type TabId = 'dashboard' | 'sessions' | 'logs' | 'codes';

export function AdminPanel({ onBack, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newCode, setNewCode] = useState('');
  const [showCodes, setShowCodes] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [newAdminCode, setNewAdminCode] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(false);

  const fetchCodes = useCallback(async () => {
    const result = await apiGetCodes();
    if (result.codes) setCodes(result.codes);
  }, []);

  const fetchSessions = useCallback(async () => {
    const result = await apiGetSessions();
    if (result.sessions) setSessions(result.sessions);
  }, []);

  const fetchLogs = useCallback(async () => {
    const result = await apiGetLogs();
    if (result.logs) setLogs(result.logs);
  }, []);

  useEffect(() => {
    fetchCodes();
    fetchSessions();
    fetchLogs();
  }, [fetchCodes, fetchSessions, fetchLogs]);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'codes') fetchCodes();
  }, [activeTab, fetchSessions, fetchLogs, fetchCodes]);

  const addCode = async () => {
    const trimmed = newCode.trim();
    if (!trimmed) return;
    setLoading(true);
    const result = await apiAddCode(trimmed);
    if (result.success) {
      setNewCode('');
      setCloudMsg('✅ Code added & synced!');
      fetchCodes();
    } else {
      setCloudMsg('❌ ' + (result.error || 'Failed to add'));
    }
    setLoading(false);
    setTimeout(() => setCloudMsg(''), 4000);
  };

  const removeCode = async (codeId: string) => {
    if (!window.confirm('Remove this code? All users using it will be logged out immediately.')) return;
    setLoading(true);
    await apiRemoveCode(codeId);
    setCloudMsg('✅ Code removed & users kicked!');
    fetchCodes();
    fetchSessions();
    setLoading(false);
    setTimeout(() => setCloudMsg(''), 4000);
  };

  const activateCode = async (codeId: string) => {
    setLoading(true);
    await apiActivateCode(codeId);
    fetchCodes();
    setLoading(false);
  };

  const endSession = async (sessionId: string) => {
    await apiEndSession(sessionId);
    fetchSessions();
  };

  const changeAdminCode = async () => {
    if (newAdminCode.trim().length < 4) return;
    const adminCodeEntry = codes.find(c => c.is_admin);
    if (!adminCodeEntry) return;
    await apiChangeAdminCode(adminCodeEntry.id, newAdminCode.trim());
    setNewAdminCode('');
    setCloudMsg('✅ Admin code changed!');
    fetchCodes();
    setTimeout(() => setCloudMsg(''), 4000);
  };

  const activeSessions = sessions;
  const successCount = logs.filter(l => l.success).length;
  const failedCount = logs.filter(l => !l.success).length;
  const activeCodes = codes.filter(c => c.active && !c.is_admin);

  const filteredLogs = logs.filter(log => {
    const okFilter = logFilter === 'all' || (logFilter === 'success' && log.success) || (logFilter === 'failed' && !log.success);
    const okSearch = !logSearch || log.username.toLowerCase().includes(logSearch.toLowerCase()) || log.created_at.includes(logSearch);
    return okFilter && okSearch;
  });

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'sessions', label: 'Sessions', icon: '👥' },
    { id: 'logs', label: 'Logs', icon: '📋' },
    { id: 'codes', label: 'Codes', icon: '🔑' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-lg shrink-0">⚙️</div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight">Admin Panel</h1>
              <p className="text-[10px] text-gray-500 truncate">☁️ Cloud synced · {logs.length} logs · {activeSessions.length} sessions · {activeCodes.length} codes</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onBack} className="px-2.5 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors">← Games</button>
            <button onClick={onLogout} className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">🚨 Exit</button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 flex overflow-x-auto border-t border-gray-800/50">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all flex items-center gap-1 shrink-0 ${activeTab === tab.id ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'}`}>
              <span>{tab.icon}</span><span>{tab.label}</span>
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
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-sm">🕐 Recent Activity</h3>
              <button onClick={() => setActiveTab('logs')} className="text-xs text-gray-500 hover:text-gray-300">View all →</button>
            </div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No login attempts yet.</div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-800/30">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${log.success ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{log.username}</p>
                      <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{log.success ? '✓ OK' : '✗ FAIL'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="max-w-6xl mx-auto px-4 py-5 w-full space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold">👥 Active Sessions</h2>
              <p className="text-gray-500 text-xs mt-0.5">Real-time across all devices</p>
            </div>
            <button onClick={fetchSessions} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">🔄 Refresh</button>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
            <p className="text-3xl font-black text-green-400">{activeSessions.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active Now</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {sessions.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No active sessions.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-800/60 border-b border-gray-700">{['User', 'Login Time', 'Last Active', 'Role', 'Action'].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {sessions.map(sess => (
                      <tr key={sess.id} className="hover:bg-gray-800/40">
                        <td className="px-4 py-2.5 font-semibold">{sess.username}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{new Date(sess.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{new Date(sess.last_active).toLocaleString()}</td>
                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-bold ${sess.is_admin ? 'bg-yellow-900/50 text-yellow-400' : 'bg-blue-900/50 text-blue-400'}`}>{sess.is_admin ? '👑 Admin' : '👤 User'}</span></td>
                        <td className="px-4 py-2.5"><button onClick={() => endSession(sess.id)} className="px-2.5 py-1 bg-red-900/30 text-red-400 rounded-lg text-xs hover:bg-red-900/50 font-medium">End</button></td>
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
            <button onClick={fetchLogs} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">🔄 Refresh</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Search..."
              className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm" />
            <div className="flex gap-1.5 shrink-0">
              {(['all', 'success', 'failed'] as const).map(f => (
                <button key={f} onClick={() => setLogFilter(f)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${logFilter === f ? f === 'success' ? 'bg-green-600 text-white' : f === 'failed' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-gray-900' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'}`}>
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
                  <thead><tr className="bg-gray-800/60 border-b border-gray-700">{['#', 'Time', 'Username', 'Code', 'Status', 'IP'].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {filteredLogs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-gray-800/40">
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-semibold">{log.username}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{log.code_text === '***ADMIN***' ? <span className="text-yellow-400 font-bold">🔑 ADMIN</span> : <span className="text-gray-400">{String(log.code_text || '').slice(0, 3)}•••</span>}</td>
                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${log.success ? 'bg-green-900/60 text-green-400' : 'bg-red-900/60 text-red-400'}`}>{log.success ? '✓ OK' : '✗ FAIL'}</span></td>
                        <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CODES */}
      {activeTab === 'codes' && (
        <div className="max-w-4xl mx-auto px-4 py-5 w-full space-y-5">
          <h2 className="text-lg font-bold">🔑 Access Codes</h2>
          {cloudMsg && <p className={`text-sm font-medium ${cloudMsg.startsWith('✅') ? 'text-green-400' : cloudMsg.startsWith('❌') ? 'text-red-400' : 'text-yellow-400'}`}>{cloudMsg}</p>}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="font-bold text-sm mb-3">➕ Add New Access Code</h3>
            <div className="flex gap-2">
              <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCode()} placeholder="Type new code..."
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm font-mono" />
              <button onClick={addCode} disabled={!newCode.trim() || loading} className="px-5 py-2.5 bg-yellow-500 text-gray-900 rounded-xl font-bold hover:bg-yellow-400 disabled:opacity-30 text-sm shrink-0">+ Add</button>
            </div>
            <p className="text-[10px] text-gray-600 mt-2">☁️ New codes sync instantly across all devices</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">🗝️ All Access Codes</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowCodes(v => !v)} className="px-2.5 py-1 bg-gray-800 text-gray-400 text-xs rounded-lg hover:bg-gray-700 border border-gray-700">{showCodes ? '🙈 Hide' : '👁️ Show'}</button>
                <button onClick={fetchCodes} className="px-2.5 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-lg hover:bg-blue-600/30 border border-blue-600/30">🔄</button>
              </div>
            </div>
            {codes.length === 0 ? <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-xl text-gray-600 text-sm">Loading codes...</div> : (
              <div className="space-y-2">
                {codes.filter(c => !c.is_admin).map(codeEntry => (
                  <div key={codeEntry.id} className={`flex items-center justify-between rounded-xl px-4 py-3 gap-3 ${codeEntry.active ? 'bg-gray-800 border border-gray-700/50' : 'bg-gray-800/50 border border-red-800/30 opacity-60'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${codeEntry.active ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="font-mono text-blue-300 text-sm truncate">{showCodes ? codeEntry.code : codeEntry.code.slice(0, 2) + '•'.repeat(Math.max(codeEntry.code.length - 2, 4))}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!codeEntry.active && (
                        <button onClick={() => activateCode(codeEntry.id)} className="px-3 py-1.5 bg-green-900/20 text-green-400 rounded-lg text-xs hover:bg-green-600 hover:text-white font-bold border border-green-800/40">✓ Reactivate</button>
                      )}
                      <button onClick={() => removeCode(codeEntry.id)} disabled={loading} className="px-3 py-1.5 bg-red-900/20 text-red-400 rounded-lg text-xs hover:bg-red-600 hover:text-white font-bold border border-red-800/40 disabled:opacity-30">{codeEntry.active ? '🗑️ Remove' : '🗑️ Delete'}</button>
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
              <input type={showAdminInput ? 'text' : 'password'} value={newAdminCode} onChange={e => setNewAdminCode(e.target.value)} placeholder="New admin code (min 4 chars)..."
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm font-mono" />
              <button onClick={() => setShowAdminInput(v => !v)} className="px-3 py-2.5 bg-gray-800 text-gray-400 rounded-xl text-sm border border-gray-700 hover:bg-gray-700">{showAdminInput ? '🙈' : '👁️'}</button>
              <button onClick={changeAdminCode} disabled={newAdminCode.trim().length < 4} className="px-4 py-2.5 bg-yellow-500 text-gray-900 rounded-xl font-bold text-sm hover:bg-yellow-400 disabled:opacity-30">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
