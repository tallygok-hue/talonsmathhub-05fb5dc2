import { useState, useEffect, useCallback } from 'react';
import { getScriptUrl, VALID_CODES, DEFAULT_ADMIN_CODE } from '../pages/Index';
import type { LogEntry } from '../pages/Index';

interface AdminPanelProps {
  loginLog: LogEntry[];
  onBack: () => void;
  onLogout: () => void;
  onClearLogs: () => void;
}

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1TAca1DZK0PxYHJg2bP3j1pAnNRs69jKVT-g7REW4k08/edit?resourcekey=&gid=1720444453#gid=1720444453';
const S3_ADMIN_PANEL = 'https://solomath.s3.amazonaws.com/sys_files_jaysonAnipper/admin-panel.html';
const S3_INDEX = 'https://solomath.s3.amazonaws.com/index.html';
const S3_VAULT = 'https://solomath.s3.amazonaws.com/vault.html';
const DOVER_HUB = 'https://neb.dovereducation.net';
const GITHUB_REPO = 'https://github.com/tallygok-hue/Talonsmathhub';

interface SessionEntry {
  id: string;
  username: string;
  loginTime: string;
  device: string;
  ip?: string;
  isAdmin: boolean;
  active: boolean;
}

function getSessionsFromStorage(): SessionEntry[] {
  try { return JSON.parse(localStorage.getItem('tmh_sessions') || '[]'); }
  catch { return []; }
}

function saveSessionsToStorage(sessions: SessionEntry[]) {
  try { localStorage.setItem('tmh_sessions', JSON.stringify(sessions)); }
  catch { /* ignore */ }
}

const APPS_SCRIPT_CODE = `// Talon's Math Hub — Google Apps Script (Full Version)
// SETUP:
//  1. Extensions > Apps Script > paste this > Save
//  2. Run setupSheets() once to create tabs + headers
//  3. Deploy > New Deployment > Web App
//     Execute as: Me | Who has access: Anyone
//  4. Copy the /exec URL into Admin Panel > Script Setup box

var LOGS_SHEET    = 'Logs';
var CONFIG_SHEET  = 'Config';
var SESSION_SHEET = 'Sessions';

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var p  = e.parameter || {};
    if (p.action === 'log') {
      var ls = ss.getSheetByName(LOGS_SHEET) || ss.getActiveSheet();
      ls.appendRow([p.timestamp||new Date().toLocaleString(),p.username||'unknown',p.code||'',p.status||'',p.ip||'',(p.userAgent||'').substring(0,200)]);
      return json({ status: 'ok', logged: true });
    }
    if (p.action === 'getLogs') { var logSheet = ss.getSheetByName(LOGS_SHEET)||ss.getActiveSheet(); return json({ status:'ok', logs: logSheet.getDataRange().getValues() }); }
    if (p.action === 'getConfig') { var cs=ss.getSheetByName(CONFIG_SHEET); if(!cs)return json({status:'ok',adminCode:'',customCodes:[]}); var vals=cs.getDataRange().getValues(); var adminCode=''; var customCodes=[]; for(var j=0;j<vals.length;j++){var key=String(vals[j][0]).trim(); var val=String(vals[j][1]).trim(); if(key==='admin_code'&&val)adminCode=val; if(key==='custom_code'&&val)customCodes.push(val);} return json({status:'ok',adminCode:adminCode,customCodes:customCodes}); }
    if (p.action === 'setConfig') { var cfg=ss.getSheetByName(CONFIG_SHEET); if(!cfg)cfg=ss.insertSheet(CONFIG_SHEET); cfg.clearContents(); var rows=[['key','value']]; if(p.adminCode)rows.push(['admin_code',p.adminCode]); if(p.customCodes){var codes=p.customCodes.split(','); for(var k=0;k<codes.length;k++){if(codes[k].trim())rows.push(['custom_code',codes[k].trim()]);}} cfg.getRange(1,1,rows.length,2).setValues(rows); return json({status:'ok',saved:true}); }
    if (p.action === 'ping') return json({ status: 'ok', message: 'Connected! TMH logging active.' });
    return json({ status: 'ready', message: 'Script is running.' });
  } catch(err) { return json({ status: 'error', error: err.toString() }); }
}
function doPost(e) { return doGet(e); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function setupSheets() { var ss=SpreadsheetApp.getActiveSpreadsheet(); var logs=ss.getSheetByName(LOGS_SHEET)||ss.insertSheet(LOGS_SHEET); logs.clearContents(); logs.getRange(1,1,1,6).setValues([['Timestamp','Username','Code Used','Status','IP Address','User Agent']]); var cfg=ss.getSheetByName(CONFIG_SHEET)||ss.insertSheet(CONFIG_SHEET); cfg.clearContents(); cfg.getRange(1,1,2,2).setValues([['key','value'],['admin_code','admintalon']]); var sess=ss.getSheetByName(SESSION_SHEET)||ss.insertSheet(SESSION_SHEET); sess.clearContents(); sess.getRange(1,1,1,7).setValues([['Session ID','Username','Login Time','Device','IP','Role','Status']]); ss.toast('All 3 sheets set up!'); }`;

type TabId = 'dashboard' | 'sessions' | 'logs' | 'sheet_logs' | 'codes' | 'setup';

interface SheetLog {
  timestamp: string;
  username: string;
  code: string;
  status: string;
  ip: string;
  userAgent: string;
}

export function AdminPanel({ loginLog, onBack, onLogout, onClearLogs }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const APPS_SCRIPT_EXEC = 'https://script.google.com/macros/s/AKfycbzHHZ2yFOGX1bvk6Ow7YgX1Rk_7-P4TRde6sCBBrgoxFqTZ97RA3fjxJNCTv6cLQMo0/exec';
  const [scriptUrlInput, setScriptUrlInput] = useState(() => getScriptUrl() || APPS_SCRIPT_EXEC);
  const [scriptUrl, setScriptUrl] = useState(() => {
    const existing = getScriptUrl();
    if (!existing) { localStorage.setItem('tmh_script_url', APPS_SCRIPT_EXEC); return APPS_SCRIPT_EXEC; }
    return existing;
  });
  const [urlSaved, setUrlSaved] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [customCodes, setCustomCodes] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('tmh_custom_codes') || '[]'); } catch { return []; } });
  const [newCode, setNewCode] = useState('');
  const [showCodes, setShowCodes] = useState(false);
  const [newAdminCode, setNewAdminCode] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminSaved, setAdminSaved] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const savedAdminCode = localStorage.getItem('tmh_admin_code') || DEFAULT_ADMIN_CODE;
  const [sessions, setSessions] = useState<SessionEntry[]>(() => getSessionsFromStorage());
  const [sheetSessions, setSheetSessions] = useState<string[][]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sheetLogs, setSheetLogs] = useState<SheetLog[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [lastFetched, setLastFetched] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const successCount = loginLog.filter(l => l.success).length;
  const failedCount = loginLog.filter(l => !l.success).length;
  const activeSessions = sessions.filter(s => s.active);

  const handleSaveUrl = () => {
    const trimmed = scriptUrlInput.trim();
    localStorage.setItem('tmh_script_url', trimmed);
    setScriptUrl(trimmed); setUrlSaved(true);
    setTimeout(() => setUrlSaved(false), 3000);
  };

  const handleCopyUrl = () => {
    if (scriptUrl) { navigator.clipboard.writeText(scriptUrl); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); }
  };

  const testConnection = async () => {
    const url = scriptUrlInput.trim() || scriptUrl;
    if (!url) { setTestStatus('fail'); setTestMsg('No URL entered.'); return; }
    setTestStatus('testing'); setTestMsg('');
    try {
      const res = await fetch(`${url}?action=ping`, { mode: 'cors' });
      const data = await res.json();
      if (data.status === 'ok') { setTestStatus('ok'); setTestMsg('✅ ' + (data.message || 'Connected!')); }
      else { setTestStatus('fail'); setTestMsg('⚠️ ' + JSON.stringify(data)); }
    } catch {
      try { await fetch(`${url}?action=ping`, { mode: 'no-cors' }); setTestStatus('ok'); setTestMsg('✅ Request sent — check sheet for ping row.'); }
      catch { setTestStatus('fail'); setTestMsg('❌ Unreachable. Check URL & deployment.'); }
    }
    setTimeout(() => { setTestStatus('idle'); setTestMsg(''); }, 15000);
  };

  const fetchSheetLogs = useCallback(async () => {
    const url = getScriptUrl();
    if (!url) { setSheetError('No Apps Script URL.'); return; }
    setSheetLoading(true); setSheetError('');
    try {
      const res = await fetch(`${url}?action=getLogs`, { mode: 'cors' });
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.logs)) {
        const rows: SheetLog[] = data.logs.slice(1).map((row: string[]) => ({ timestamp: row[0] || '', username: row[1] || '', code: row[2] || '', status: row[3] || '', ip: row[4] || '', userAgent: row[5] || '' }));
        setSheetLogs(rows.reverse()); setLastFetched(new Date().toLocaleTimeString());
      } else { setSheetError('Unexpected response.'); }
    } catch { setSheetError('Could not fetch.'); }
    setSheetLoading(false);
  }, []);

  const fetchSheetSessions = useCallback(async () => {
    const url = getScriptUrl();
    if (!url) return;
    setSessionsLoading(true);
    try { const res = await fetch(`${url}?action=getSessions`, { mode: 'cors' }); const data = await res.json(); if (data.status === 'ok' && Array.isArray(data.sessions)) { setSheetSessions(data.sessions.slice(1).reverse()); } } catch { /* silent */ }
    setSessionsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'sheet_logs' && scriptUrl) fetchSheetLogs();
    if (activeTab === 'sessions' && scriptUrl) fetchSheetSessions();
  }, [activeTab, scriptUrl, fetchSheetLogs, fetchSheetSessions]);

  const endSession = (id: string) => {
    const updated = sessions.map(s => s.id === id ? { ...s, active: false } : s);
    setSessions(updated); saveSessionsToStorage(updated);
    const url = getScriptUrl();
    if (url) { fetch(`${url}?action=endSession&sessionId=${id}`, { mode: 'no-cors' }).catch(() => {}); }
  };

  const clearAllSessions = () => { setSessions([]); saveSessionsToStorage([]); };

  const saveConfigToCloud = useCallback(async (opts?: { adminCode?: string; codes?: string[] }) => {
    const url = getScriptUrl();
    if (!url) { setCloudMsg('⚠️ No URL — saved locally only.'); setTimeout(() => setCloudMsg(''), 4000); return; }
    setCloudSaving(true); setCloudMsg('');
    try {
      const allCodes = opts?.codes ?? customCodes;
      const aCode = opts?.adminCode ?? localStorage.getItem('tmh_admin_code') ?? DEFAULT_ADMIN_CODE;
      const params = new URLSearchParams({ action: 'setConfig', adminCode: aCode, customCodes: allCodes.join(',') });
      await fetch(`${url}?${params}`, { mode: 'no-cors' });
      setCloudMsg('✅ Saved to cloud.');
    } catch { setCloudMsg('❌ Cloud save failed.'); }
    setCloudSaving(false); setTimeout(() => setCloudMsg(''), 6000);
  }, [customCodes]);

  const addCode = () => {
    const trimmed = newCode.trim().toLowerCase();
    if (!trimmed) return;
    if (customCodes.includes(trimmed) || VALID_CODES.includes(trimmed)) { setCloudMsg('⚠️ Code already exists!'); setTimeout(() => setCloudMsg(''), 3000); return; }
    const updated = [...customCodes, trimmed];
    setCustomCodes(updated); localStorage.setItem('tmh_custom_codes', JSON.stringify(updated)); setNewCode('');
    saveConfigToCloud({ codes: updated });
  };

  const removeCode = (code: string) => {
    const updated = customCodes.filter(c => c !== code);
    setCustomCodes(updated); localStorage.setItem('tmh_custom_codes', JSON.stringify(updated));
    saveConfigToCloud({ codes: updated });
  };

  const sendTestLog = async () => {
    const url = getScriptUrl();
    if (!url) return;
    const params = new URLSearchParams({ action: 'log', username: 'ADMIN_TEST', code: 'TEST_ENTRY', status: 'TEST', timestamp: new Date().toLocaleString(), ip: 'admin-panel', userAgent: 'AdminPanel/3.0' });
    try { await fetch(`${url}?${params}`, { mode: 'no-cors' }); } catch { /* silent */ }
  };

  const filteredLocal = loginLog.filter(log => {
    const okFilter = logFilter === 'all' || (logFilter === 'success' && log.success) || (logFilter === 'failed' && !log.success);
    const okSearch = !logSearch || log.user.toLowerCase().includes(logSearch.toLowerCase()) || log.time.toLowerCase().includes(logSearch.toLowerCase());
    return okFilter && okSearch;
  });

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'sessions', label: 'Sessions', icon: '👥' },
    { id: 'logs', label: 'Local Logs', icon: '📋' },
    { id: 'sheet_logs', label: 'Sheet Logs', icon: '🟢' },
    { id: 'codes', label: 'Codes', icon: '🔑' },
    { id: 'setup', label: 'Setup', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-lg shrink-0">⚙️</div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight">Admin Panel</h1>
              <p className="text-[10px] text-gray-500 truncate">{scriptUrl ? '🟢 Sheets connected' : '🔴 Sheets not set'} · {loginLog.length} logs · {activeSessions.length} active</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onBack} className="px-2.5 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors">← Games</button>
            <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 bg-green-600/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-600/30 transition-colors border border-green-600/30 hidden sm:flex items-center gap-1">📊 Sheet ↗</a>
            <button onClick={onLogout} className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">🚨 Exit</button>
          </div>
        </div>
        <div className="border-t border-gray-800 bg-gray-900/80 px-3 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0 font-semibold uppercase tracking-wide">📡 Script URL</span>
            <input type="text" value={scriptUrlInput} onChange={e => setScriptUrlInput(e.target.value)} placeholder="Paste your Apps Script /exec URL here..."
              className={`flex-1 min-w-0 px-3 py-1.5 text-xs font-mono rounded-lg border focus:outline-none transition-colors bg-gray-800 text-white placeholder-gray-600 ${scriptUrl ? 'border-green-700/50 focus:border-green-500' : 'border-gray-700 focus:border-yellow-500'}`} />
            <div className="flex gap-1.5 shrink-0">
              {scriptUrl && <button onClick={handleCopyUrl} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${urlCopied ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>{urlCopied ? '✓ Copied' : '📋 Copy'}</button>}
              <button onClick={handleSaveUrl} disabled={!scriptUrlInput.trim()} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-30 ${urlSaved ? 'bg-green-600 text-white' : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'}`}>{urlSaved ? '✓ Saved!' : 'Save'}</button>
              <button onClick={testConnection} disabled={testStatus === 'testing' || !scriptUrlInput.trim()} className="px-2.5 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors border border-blue-600/30 disabled:opacity-40">
                {testStatus === 'testing' ? '...' : testStatus === 'ok' ? '🟢' : testStatus === 'fail' ? '🔴' : '🧪 Test'}
              </button>
            </div>
          </div>
          {testMsg && <p className={`max-w-7xl mx-auto text-[10px] mt-1 ${testStatus === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{testMsg}</p>}
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
              { label: 'Total Logins', value: loginLog.length, color: 'text-white', border: 'border-gray-800' },
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { href: SHEET_URL, icon: '📊', label: 'Google Sheet', cls: 'bg-green-900/20 text-green-400 border-green-800/40' },
              { href: S3_ADMIN_PANEL, icon: '🖥️', label: 'Admin Panel', cls: 'bg-blue-900/20 text-blue-400 border-blue-800/40' },
              { href: S3_INDEX, icon: '🎮', label: 'S3 Index', cls: 'bg-purple-900/20 text-purple-400 border-purple-800/40' },
              { href: S3_VAULT, icon: '🔐', label: 'S3 Vault', cls: 'bg-yellow-900/20 text-yellow-400 border-yellow-800/40' },
              { href: DOVER_HUB, icon: '🌐', label: 'Dover Hub', cls: 'bg-cyan-900/20 text-cyan-400 border-cyan-800/40' },
              { href: GITHUB_REPO, icon: '🐙', label: 'GitHub Repo', cls: 'bg-gray-800 text-gray-400 border-gray-700' },
            ].map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-80 transition-opacity border ${l.cls}`}>{l.icon} {l.label} ↗</a>
            ))}
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-sm">🕐 Recent Activity</h3>
              <button onClick={() => setActiveTab('logs')} className="text-xs text-gray-500 hover:text-gray-300">View all →</button>
            </div>
            {loginLog.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No login attempts yet.</div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {[...loginLog].reverse().slice(0, 8).map((log, idx) => (
                  <div key={idx} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-800/30">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${log.success ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{log.user}</p>
                      <p className="text-xs text-gray-500">{log.time}</p>
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
              <h2 className="text-lg font-bold">👥 Sessions</h2>
              <p className="text-gray-500 text-xs mt-0.5">Track who is logged in and when</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {scriptUrl && <button onClick={fetchSheetSessions} disabled={sessionsLoading} className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30 disabled:opacity-40">{sessionsLoading ? 'Loading...' : '🔄 Fetch from Sheet'}</button>}
              {sessions.length > 0 && <button onClick={clearAllSessions} className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-600/30 border border-red-600/30">🗑️ Clear All Local</button>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center"><p className="text-2xl font-black text-green-400">{activeSessions.length}</p><p className="text-xs text-gray-500 mt-0.5">Active Now</p></div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center"><p className="text-2xl font-black">{sessions.length}</p><p className="text-xs text-gray-500 mt-0.5">Total Local</p></div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center"><p className="text-2xl font-black text-blue-400">{sheetSessions.length}</p><p className="text-xs text-gray-500 mt-0.5">Sheet Sessions</p></div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800"><h3 className="font-bold text-sm">💾 Local Sessions</h3></div>
            {sessions.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No sessions recorded yet.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-800/60 border-b border-gray-700">{['User', 'Login Time', 'Role', 'Status', 'Action'].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {[...sessions].reverse().map(sess => (
                      <tr key={sess.id} className="hover:bg-gray-800/40">
                        <td className="px-4 py-2.5 font-semibold">{sess.username}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{sess.loginTime}</td>
                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-bold ${sess.isAdmin ? 'bg-yellow-900/50 text-yellow-400' : 'bg-blue-900/50 text-blue-400'}`}>{sess.isAdmin ? '👑 Admin' : '👤 User'}</span></td>
                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-bold ${sess.active ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>{sess.active ? '🟢 Active' : '⚫ Ended'}</span></td>
                        <td className="px-4 py-2.5">{sess.active && <button onClick={() => endSession(sess.id)} className="px-2.5 py-1 bg-red-900/30 text-red-400 rounded-lg text-xs hover:bg-red-900/50 font-medium">End</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOCAL LOGS */}
      {activeTab === 'logs' && (
        <div className="max-w-6xl mx-auto px-4 py-5 w-full space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><h2 className="text-lg font-bold">📋 Local Login Logs</h2></div>
            {loginLog.length > 0 && !showClearConfirm && <button onClick={() => setShowClearConfirm(true)} className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-600/30 border border-red-600/30">🗑️ Clear All</button>}
            {showClearConfirm && (
              <div className="flex gap-2">
                <button onClick={() => { onClearLogs(); setShowClearConfirm(false); }} className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">✓ Confirm</button>
                <button onClick={() => setShowClearConfirm(false)} className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-700">Cancel</button>
              </div>
            )}
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
          {filteredLocal.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center"><p className="text-gray-400 text-sm">No logs match.</p></div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-800/60 border-b border-gray-700">{['#', 'Time', 'Username', 'Code', 'Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {[...filteredLocal].reverse().map((log, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/40">
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{filteredLocal.length - idx}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{log.time}</td>
                        <td className="px-4 py-2.5 font-semibold">{log.user}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{log.code === '***ADMIN***' ? <span className="text-yellow-400 font-bold">🔑 ADMIN</span> : <span className="text-gray-400">{log.code.slice(0, 3)}•••</span>}</td>
                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${log.success ? 'bg-green-900/60 text-green-400' : 'bg-red-900/60 text-red-400'}`}>{log.success ? '✓ OK' : '✗ FAIL'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SHEET LOGS */}
      {activeTab === 'sheet_logs' && (
        <div className="max-w-6xl mx-auto px-4 py-5 w-full space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><h2 className="text-lg font-bold">🟢 Live Sheet Logs</h2><p className="text-gray-500 text-xs">{lastFetched ? `Last: ${lastFetched}` : 'From Apps Script'}</p></div>
            <div className="flex gap-2">
              <button onClick={fetchSheetLogs} disabled={sheetLoading || !scriptUrl} className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30 disabled:opacity-40">{sheetLoading ? 'Fetching...' : '🔄 Refresh'}</button>
              <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-600/30 border border-green-600/30">📊 Open Sheet ↗</a>
            </div>
          </div>
          {!scriptUrl ? <div className="bg-red-900/10 border border-red-700/40 rounded-xl p-8 text-center"><div className="text-4xl mb-3">🔴</div><h3 className="font-bold mb-2 text-red-400">Not Connected</h3></div>
          : sheetError ? <div className="bg-red-900/10 border border-red-700/40 rounded-xl p-5"><p className="text-red-400 font-semibold">⚠️ Error</p><p className="text-gray-400 text-sm">{sheetError}</p></div>
          : sheetLogs.length === 0 && !sheetLoading ? <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center"><p className="text-gray-400 text-sm">No logs in sheet yet.</p></div>
          : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-800/60 border-b border-gray-700">{['Timestamp', 'Username', 'Code', 'Status', 'IP'].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-semibold text-xs uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {sheetLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/40">
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{log.timestamp}</td>
                        <td className="px-4 py-2.5 font-semibold">{log.username}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{log.code === '***ADMIN***' ? <span className="text-yellow-400 font-bold">🔑 ADMIN</span> : log.code.slice(0, 3) + '•••'}</td>
                        <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-bold ${log.status === 'SUCCESS' ? 'bg-green-900/60 text-green-400' : 'bg-red-900/60 text-red-400'}`}>{log.status === 'SUCCESS' ? '✓ OK' : '✗ FAIL'}</span></td>
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
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="font-bold text-sm mb-3">➕ Add New Access Code</h3>
            <div className="flex gap-2">
              <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCode()} placeholder="Type new code..."
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm font-mono" />
              <button onClick={addCode} disabled={!newCode.trim()} className="px-5 py-2.5 bg-yellow-500 text-gray-900 rounded-xl font-bold hover:bg-yellow-400 disabled:opacity-30 text-sm shrink-0">+ Add</button>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">🗝️ Custom User Codes</h3>
              {customCodes.length > 0 && <button onClick={() => setShowCodes(v => !v)} className="px-2.5 py-1 bg-gray-800 text-gray-400 text-xs rounded-lg hover:bg-gray-700 border border-gray-700">{showCodes ? '🙈 Hide' : '👁️ Show'}</button>}
            </div>
            {customCodes.length === 0 ? <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-xl text-gray-600 text-sm">No custom codes yet.</div> : (
              <div className="space-y-2 mb-4">
                {customCodes.map(code => (
                  <div key={code} className="flex items-center justify-between bg-gray-800 border border-gray-700/50 rounded-xl px-4 py-3 gap-3">
                    <span className="font-mono text-blue-300 text-sm truncate">{showCodes ? code : code.slice(0, 2) + '•'.repeat(Math.max(code.length - 2, 4))}</span>
                    <button onClick={() => { if (window.confirm(`Delete code "${code}"?`)) removeCode(code); }} className="px-3 py-1.5 bg-red-900/20 text-red-400 rounded-lg text-xs hover:bg-red-600 hover:text-white font-bold border border-red-800/40">🗑️ Delete</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-gray-800">
              <button onClick={() => saveConfigToCloud()} disabled={cloudSaving || !scriptUrl} className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/30 border border-blue-600/30 disabled:opacity-40">{cloudSaving ? 'Syncing...' : '☁️ Force Sync'}</button>
              {cloudMsg && <span className={`text-xs font-medium ${cloudMsg.startsWith('✅') ? 'text-green-400' : 'text-yellow-400'}`}>{cloudMsg}</span>}
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="font-bold mb-4">🔒 Built-in Codes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VALID_CODES.map(code => (
                <div key={code} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-2.5">
                  <span className="font-mono text-green-400 text-sm">{showCodes ? code : code.slice(0, 2) + '•'.repeat(code.length - 2)}</span>
                  <span className="px-2 py-0.5 bg-green-900/40 text-green-500 text-xs rounded font-medium">Built-in</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-yellow-700/30 p-5">
            <h3 className="font-bold text-yellow-400 mb-1">🔐 Change Admin Code</h3>
            <p className="text-xs text-gray-500 mb-4">Current: <code className="bg-gray-800 px-1 rounded text-gray-400">{showAdminInput ? savedAdminCode : '•••••••'}</code></p>
            <div className="flex gap-2">
              <input type={showAdminInput ? 'text' : 'password'} value={newAdminCode} onChange={e => setNewAdminCode(e.target.value)} placeholder="New admin code (min 4 chars)..."
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm font-mono" />
              <button onClick={() => setShowAdminInput(v => !v)} className="px-3 py-2.5 bg-gray-800 text-gray-400 rounded-xl text-sm border border-gray-700 hover:bg-gray-700">{showAdminInput ? '🙈' : '👁️'}</button>
              <button onClick={() => {
                if (newAdminCode.trim().length >= 4) {
                  localStorage.setItem('tmh_admin_code', newAdminCode.trim());
                  sessionStorage.setItem('tmh_cloud_admin', newAdminCode.trim());
                  setAdminSaved(true); saveConfigToCloud({ adminCode: newAdminCode.trim() }); setNewAdminCode('');
                  setTimeout(() => setAdminSaved(false), 3000);
                }
              }} disabled={newAdminCode.trim().length < 4} className="px-5 py-2.5 bg-yellow-500 text-gray-900 rounded-xl font-bold hover:bg-yellow-400 disabled:opacity-30 text-sm shrink-0">
                {adminSaved ? '✓ Saved!' : 'Save & Sync ☁️'}
              </button>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-red-800/40 p-5">
            <h3 className="font-bold text-red-400 mb-2">☢️ Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-4">Wipe ALL local data and log out.</p>
            <button onClick={() => { if (window.confirm('⚠️ Delete ALL local data?')) { localStorage.clear(); sessionStorage.clear(); window.location.reload(); } }}
              className="px-5 py-2.5 bg-red-700 text-white rounded-xl text-sm font-bold hover:bg-red-800 transition-colors">🗑️ Wipe All Data & Logout</button>
          </div>
        </div>
      )}

      {/* SETUP */}
      {activeTab === 'setup' && (
        <div className="max-w-4xl mx-auto px-4 py-5 w-full space-y-5">
          <h2 className="text-lg font-bold">⚙️ Apps Script Setup</h2>
          <div className={`rounded-xl border p-4 ${scriptUrl ? 'bg-green-900/15 border-green-700/40' : 'bg-yellow-900/10 border-yellow-700/30'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{scriptUrl ? '🟢' : '🟡'}</span>
              <div>
                <p className="font-bold text-sm">{scriptUrl ? 'Connected — Logging Active' : 'Not Connected Yet'}</p>
                {scriptUrl ? <p className="text-xs text-gray-400 font-mono break-all mt-0.5">{scriptUrl}</p> : <p className="text-xs text-gray-500">Paste URL in the top bar</p>}
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <span className="font-bold text-sm">Step 1: Copy script to Google Sheet</span>
              <button onClick={() => { navigator.clipboard.writeText(APPS_SCRIPT_CODE); setCopiedScript(true); setTimeout(() => setCopiedScript(false), 3000); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${copiedScript ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'}`}>
                {copiedScript ? '✓ Copied!' : '📋 Copy Script'}
              </button>
            </div>
            <pre className="p-5 text-xs text-green-300 overflow-x-auto font-mono leading-relaxed whitespace-pre max-h-52 overflow-y-auto">{APPS_SCRIPT_CODE}</pre>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <span className="font-bold text-sm">Step 2: Deploy as Web App</span>
            <ol className="space-y-2 text-sm text-gray-400 ml-8 mt-3">
              {['Deploy → New deployment', 'Click ⚙️ gear icon → Web app', 'Execute as: Me', 'Who has access: Anyone', 'Deploy → Authorize → copy the /exec URL'].map((step, i) => (
                <li key={i} className="flex gap-2"><span className="text-yellow-400 font-bold">{i + 1}.</span><span className="text-gray-300">{step}</span></li>
              ))}
            </ol>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <span className="font-bold text-sm">Step 3: Paste & Save URL</span>
            <div className="flex gap-2 mt-3">
              <input type="text" value={scriptUrlInput} onChange={e => setScriptUrlInput(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-sm font-mono" />
              <button onClick={handleSaveUrl} disabled={!scriptUrlInput.trim()} className={`px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-30 ${urlSaved ? 'bg-green-600 text-white' : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'}`}>{urlSaved ? '✓ Saved!' : 'Save'}</button>
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-3">
              <button onClick={testConnection} disabled={testStatus === 'testing' || !scriptUrlInput.trim()} className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/30 border border-blue-600/30 disabled:opacity-40">{testStatus === 'testing' ? 'Testing...' : '🧪 Test Connection'}</button>
              <button onClick={sendTestLog} disabled={!scriptUrl} className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40">📝 Send Test Log</button>
              {testMsg && <span className={`text-sm ${testStatus === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{testMsg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}