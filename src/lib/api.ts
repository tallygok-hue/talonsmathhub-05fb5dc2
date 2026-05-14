import { getDeviceHash } from './fingerprint';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-api`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function call(action: string, method: 'GET' | 'POST' = 'GET', body?: unknown, params?: Record<string, string>) {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

export function getSessionToken(): string | null { return sessionStorage.getItem('tmh_session_token'); }
export function setSessionToken(token: string) { sessionStorage.setItem('tmh_session_token', token); }
export function clearSessionToken() {
  sessionStorage.removeItem('tmh_session_token');
  sessionStorage.removeItem('tmh_code_id');
  sessionStorage.removeItem('tmh_user');
  sessionStorage.removeItem('tmh_admin');
}
export function getCodeId(): string | null { return sessionStorage.getItem('tmh_code_id'); }

export async function apiLogin(username: string, code: string) {
  const deviceHash = await getDeviceHash();
  const result = await call('login', 'POST', { username, code, deviceHash });
  if (result.success) {
    setSessionToken(result.sessionToken);
    sessionStorage.setItem('tmh_code_id', result.codeId);
    sessionStorage.setItem('tmh_user', username);
    if (result.isAdmin) sessionStorage.setItem('tmh_admin', 'true');
  }
  return result;
}

export async function apiValidateSession() {
  const token = getSessionToken();
  if (!token) return { valid: false };
  return call('validate', 'GET', undefined, { token });
}

export async function apiLogout() {
  const token = getSessionToken();
  if (token) await call('logout', 'GET', undefined, { token });
  clearSessionToken();
}

// Beacon-based logout — fires reliably during pagehide/unload
export function apiLogoutBeacon() {
  const token = getSessionToken();
  if (!token) return;
  try {
    const url = `${FUNCTION_URL}?action=logout&apikey=${ANON_KEY}`;
    const blob = new Blob([JSON.stringify({ token })], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  } catch {}
}

export async function apiToggleFav(gameId: string) {
  const codeId = getCodeId(); if (!codeId) return;
  return call('toggleFav', 'POST', { codeId, gameId });
}
export async function apiGetFavs() {
  const codeId = getCodeId(); if (!codeId) return { favorites: [] };
  return call('getFavs', 'GET', undefined, { codeId });
}
export async function apiSaveProgress(progressType: string, data: unknown) {
  const codeId = getCodeId(); if (!codeId) return;
  return call('saveProgress', 'POST', { codeId, progressType, data });
}

export async function apiAddRecent(game: { id: string; name: string; icon?: string; url?: string }) {
  const codeId = getCodeId(); if (!codeId) return;
  return call('addRecent', 'POST', { codeId, game });
}
export async function apiGetRecent() {
  const codeId = getCodeId(); if (!codeId) return { recent: [] };
  return call('getRecent', 'GET', undefined, { codeId });
}

// Admin
export async function apiGetCodes() { return call('getCodes', 'GET', undefined, { token: getSessionToken() || '' }); }
export async function apiAddCode(code: string, isAdmin = false) { return call('addCode', 'POST', { token: getSessionToken(), code, isAdmin }); }
export async function apiRemoveCode(codeId: string) { return call('removeCode', 'POST', { token: getSessionToken(), codeId }); }
export async function apiActivateCode(codeId: string) { return call('activateCode', 'POST', { token: getSessionToken(), codeId }); }
export async function apiGetSessions() { return call('getSessions', 'GET', undefined, { token: getSessionToken() || '' }); }
export async function apiEndSession(sessionId: string) { return call('endSession', 'POST', { token: getSessionToken(), sessionId }); }
export async function apiGetLogs() { return call('getLogs', 'GET', undefined, { token: getSessionToken() || '' }); }
export async function apiChangeAdminCode(oldCodeId: string, newCode: string) { return call('changeAdminCode', 'POST', { token: getSessionToken(), oldCodeId, newCode }); }

// Device bans
export async function apiBanDevice(deviceHash: string, reason?: string, username?: string, userAgent?: string) {
  return call('banDevice', 'POST', { token: getSessionToken(), deviceHash, reason, username, userAgent });
}
export async function apiUnbanDevice(deviceHash: string) {
  return call('unbanDevice', 'POST', { token: getSessionToken(), deviceHash });
}
export async function apiGetBannedDevices() { return call('getBannedDevices', 'GET', undefined, { token: getSessionToken() || '' }); }

// Code account view
export async function apiGetCodeAccount(codeId: string) {
  return call('getCodeAccount', 'GET', undefined, { token: getSessionToken() || '', codeId });
}

// Requests
export async function apiSubmitRequest(category: string, message: string) {
  return call('submitRequest', 'POST', { token: getSessionToken(), category, message });
}
export async function apiGetMyRequests() { return call('getMyRequests', 'GET', undefined, { token: getSessionToken() || '' }); }
export async function apiMarkNotified(requestId: string) { return call('markNotified', 'POST', { token: getSessionToken(), requestId }); }
export async function apiGetAllRequests() { return call('getAllRequests', 'GET', undefined, { token: getSessionToken() || '' }); }
export async function apiRespondRequest(requestId: string, status: 'accepted' | 'denied' | 'pending', response: string) {
  return call('respondRequest', 'POST', { token: getSessionToken(), requestId, status, response });
}
export async function apiDeleteRequest(requestId: string) { return call('deleteRequest', 'POST', { token: getSessionToken(), requestId }); }

// Chat
export async function apiGetChat() { return call('getChat', 'GET'); }
export async function apiSendChat(message: string) { return call('sendChat', 'POST', { token: getSessionToken(), message }); }
export async function apiDeleteChat(messageId: string) { return call('deleteChat', 'POST', { token: getSessionToken(), messageId }); }
