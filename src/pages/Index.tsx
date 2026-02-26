import { useState, useEffect, useCallback } from 'react';
import { MathHome } from '../components/MathHome';
import { SecretLogin } from '../components/SecretLogin';
import { GamePortal } from '../components/GamePortal';
import { AdminPanel } from '../components/AdminPanel';

export type AppView = 'math' | 'login' | 'games' | 'admin';

export interface LogEntry {
  user: string;
  code: string;
  time: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
}

export const VALID_CODES = ['talon2024', 'mathgamer', 'unblockedftw', 'letmein99', 'gamer123'];
export const DEFAULT_ADMIN_CODE = 'admintalon';
export const HARDCODED_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzHHZ2yFOGX1bvk6Ow7YgX1Rk_7-P4TRde6sCBBrgoxFqTZ97RA3fjxJNCTv6cLQMo0/exec';

export function getScriptUrl(): string {
  return HARDCODED_SCRIPT_URL || localStorage.getItem('tmh_script_url') || '';
}

function getAdminCode(): string {
  return sessionStorage.getItem('tmh_cloud_admin') || localStorage.getItem('tmh_admin_code') || DEFAULT_ADMIN_CODE;
}

export function getAllValidCodes(): string[] {
  const local: string[] = (() => { try { return JSON.parse(localStorage.getItem('tmh_custom_codes') || '[]'); } catch { return []; } })();
  const cloud: string[] = (() => { try { return JSON.parse(sessionStorage.getItem('tmh_cloud_codes') || '[]'); } catch { return []; } })();
  return [...new Set([...VALID_CODES, ...local, ...cloud])];
}

async function refreshCloudCodes(): Promise<string[]> {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) return getAllValidCodes();
  try {
    const res = await fetch(`${scriptUrl}?action=getConfig`, { mode: 'cors' });
    const data = await res.json();
    if (data.adminCode) sessionStorage.setItem('tmh_cloud_admin', data.adminCode);
    if (Array.isArray(data.customCodes)) sessionStorage.setItem('tmh_cloud_codes', JSON.stringify(data.customCodes));
  } catch { /* silent */ }
  return getAllValidCodes();
}

async function getUserIP(): Promise<string> {
  try { const res = await fetch('https://api.ipify.org?format=json'); const data = await res.json(); return data.ip || 'unknown'; } catch { return 'unknown'; }
}

async function logToGoogleSheet(entry: LogEntry) {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) return;
  try {
    const ip = await getUserIP();
    const params = new URLSearchParams({ action: 'log', username: entry.user, code: entry.code, status: entry.success ? 'SUCCESS' : 'FAILED', timestamp: entry.time, ip, userAgent: navigator.userAgent.substring(0, 150) });
    await fetch(`${scriptUrl}?${params.toString()}`, { method: 'GET', mode: 'no-cors' });
  } catch { /* silent */ }
}

async function fetchCloudConfig() {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl) return;
  try {
    const res = await fetch(`${scriptUrl}?action=getConfig`, { mode: 'cors' });
    const data = await res.json();
    if (data.adminCode) sessionStorage.setItem('tmh_cloud_admin', data.adminCode);
    if (Array.isArray(data.customCodes)) sessionStorage.setItem('tmh_cloud_codes', JSON.stringify(data.customCodes));
  } catch { /* silent */ }
}

function saveSession(username: string, isAdmin: boolean) {
  try {
    const sessions = JSON.parse(localStorage.getItem('tmh_sessions') || '[]');
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const entry = { id: sessionId, username, loginTime: new Date().toLocaleString(), device: navigator.userAgent.substring(0, 80), isAdmin, active: true };
    sessions.push(entry);
    if (sessions.length > 200) sessions.splice(0, sessions.length - 200);
    localStorage.setItem('tmh_sessions', JSON.stringify(sessions));
    sessionStorage.setItem('tmh_session_id', sessionId);
    const scriptUrl = getScriptUrl();
    if (scriptUrl) {
      const params = new URLSearchParams({ action: 'logSession', sessionId, username, loginTime: entry.loginTime, device: entry.device, isAdmin: String(isAdmin) });
      fetch(`${scriptUrl}?${params}`, { mode: 'no-cors' }).catch(() => {});
    }
  } catch { /* ignore */ }
}

function saveLogLocally(entry: LogEntry) {
  try { const existing = JSON.parse(localStorage.getItem('tmh_login_logs') || '[]'); existing.push(entry); if (existing.length > 500) existing.splice(0, existing.length - 500); localStorage.setItem('tmh_login_logs', JSON.stringify(existing)); } catch { /* ignore */ }
}

function loadLocalLogs(): LogEntry[] {
  try { return JSON.parse(localStorage.getItem('tmh_login_logs') || '[]'); } catch { return []; }
}

const Index = () => {
  const [view, setView] = useState<AppView>('math');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [loginLog, setLoginLog] = useState<LogEntry[]>(() => loadLocalLogs());

  useEffect(() => {
    const auth = sessionStorage.getItem('tmh_auth');
    const admin = sessionStorage.getItem('tmh_admin');
    const user = sessionStorage.getItem('tmh_user');
    if (auth === 'true') { setIsAuthenticated(true); setCurrentUser(user || 'Unknown'); }
    if (admin === 'true') setIsAdmin(true);
    fetchCloudConfig();
  }, []);

  const handleLogin = useCallback(async (username: string, code: string): Promise<{ success: boolean; isAdmin: boolean; message: string }> => {
    const validCodes = await refreshCloudCodes();
    const adminCode = getAdminCode();
    const logEntry: LogEntry = { user: username, code, time: new Date().toLocaleString(), success: false };

    if (code === adminCode || code.toLowerCase() === adminCode.toLowerCase()) {
      logEntry.success = true; logEntry.code = '***ADMIN***';
      setLoginLog(prev => [...prev, logEntry]); saveLogLocally(logEntry); logToGoogleSheet(logEntry); saveSession(username, true);
      setIsAuthenticated(true); setIsAdmin(true); setCurrentUser(username);
      sessionStorage.setItem('tmh_auth', 'true'); sessionStorage.setItem('tmh_admin', 'true'); sessionStorage.setItem('tmh_user', username);
      return { success: true, isAdmin: true, message: 'Admin access granted.' };
    }

    const codeMatch = validCodes.some(c => c.toLowerCase() === code.toLowerCase() || c === code);
    if (codeMatch) {
      logEntry.success = true;
      setLoginLog(prev => [...prev, logEntry]); saveLogLocally(logEntry); logToGoogleSheet(logEntry); saveSession(username, false);
      setIsAuthenticated(true); setCurrentUser(username);
      sessionStorage.setItem('tmh_auth', 'true'); sessionStorage.setItem('tmh_user', username);
      return { success: true, isAdmin: false, message: 'Access granted!' };
    }

    setLoginLog(prev => [...prev, logEntry]); saveLogLocally(logEntry); logToGoogleSheet(logEntry);
    return { success: false, isAdmin: false, message: 'Invalid access code. Try again.' };
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false); setIsAdmin(false); setCurrentUser(''); setView('math');
    sessionStorage.removeItem('tmh_auth'); sessionStorage.removeItem('tmh_admin'); sessionStorage.removeItem('tmh_user');
  }, []);

  const clearLogs = useCallback(() => { setLoginLog([]); localStorage.removeItem('tmh_login_logs'); }, []);

  return (
    <div className="min-h-screen bg-white">
      {view === 'math' && <MathHome onSecretAccess={() => setView('login')} isAuthenticated={isAuthenticated} onGoToGames={() => setView('games')} />}
      {view === 'login' && <SecretLogin onLogin={handleLogin} onBack={() => setView('math')} onSuccess={(admin: boolean) => setView(admin ? 'admin' : 'games')} />}
      {view === 'games' && isAuthenticated && <GamePortal username={currentUser} isAdmin={isAdmin} onLogout={handleLogout} onAdminPanel={() => setView('admin')} />}
      {view === 'admin' && isAdmin && <AdminPanel loginLog={loginLog} onBack={() => setView('games')} onLogout={handleLogout} onClearLogs={clearLogs} />}
    </div>
  );
};

export default Index;