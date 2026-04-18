const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-api`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function call(action: string, method: 'GET' | 'POST' = 'GET', body?: unknown, params?: Record<string, string>) {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

export function getSessionToken(): string | null {
  return sessionStorage.getItem('tmh_session_token');
}

export function setSessionToken(token: string) {
  sessionStorage.setItem('tmh_session_token', token);
}

export function clearSessionToken() {
  sessionStorage.removeItem('tmh_session_token');
  sessionStorage.removeItem('tmh_code_id');
  sessionStorage.removeItem('tmh_user');
  sessionStorage.removeItem('tmh_admin');
}

export function getCodeId(): string | null {
  return sessionStorage.getItem('tmh_code_id');
}

export async function apiLogin(username: string, code: string) {
  const result = await call('login', 'POST', { username, code });
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

export async function apiToggleFav(gameId: string) {
  const codeId = getCodeId();
  if (!codeId) return;
  return call('toggleFav', 'POST', { codeId, gameId });
}

export async function apiGetFavs() {
  const codeId = getCodeId();
  if (!codeId) return { favorites: [] };
  return call('getFavs', 'GET', undefined, { codeId });
}

export async function apiSaveProgress(progressType: string, data: unknown) {
  const codeId = getCodeId();
  if (!codeId) return;
  return call('saveProgress', 'POST', { codeId, progressType, data });
}

// Admin APIs
export async function apiGetCodes() {
  const token = getSessionToken();
  return call('getCodes', 'GET', undefined, { token: token || '' });
}

export async function apiAddCode(code: string, isAdmin = false) {
  const token = getSessionToken();
  return call('addCode', 'POST', { token, code, isAdmin });
}

export async function apiRemoveCode(codeId: string) {
  const token = getSessionToken();
  return call('removeCode', 'POST', { token, codeId });
}

export async function apiActivateCode(codeId: string) {
  const token = getSessionToken();
  return call('activateCode', 'POST', { token, codeId });
}

export async function apiGetSessions() {
  const token = getSessionToken();
  return call('getSessions', 'GET', undefined, { token: token || '' });
}

export async function apiEndSession(sessionId: string) {
  const token = getSessionToken();
  return call('endSession', 'POST', { token, sessionId });
}

export async function apiGetLogs() {
  const token = getSessionToken();
  return call('getLogs', 'GET', undefined, { token: token || '' });
}

export async function apiChangeAdminCode(oldCodeId: string, newCode: string) {
  const token = getSessionToken();
  return call('changeAdminCode', 'POST', { token, oldCodeId, newCode });
}

// User Requests / Feedback
export async function apiSubmitRequest(category: string, message: string) {
  const token = getSessionToken();
  return call('submitRequest', 'POST', { token, category, message });
}

export async function apiGetMyRequests() {
  const token = getSessionToken();
  return call('getMyRequests', 'GET', undefined, { token: token || '' });
}

export async function apiMarkNotified(requestId: string) {
  const token = getSessionToken();
  return call('markNotified', 'POST', { token, requestId });
}

// Admin: requests moderation
export async function apiGetAllRequests() {
  const token = getSessionToken();
  return call('getAllRequests', 'GET', undefined, { token: token || '' });
}

export async function apiRespondRequest(requestId: string, status: 'accepted' | 'denied' | 'pending', response: string) {
  const token = getSessionToken();
  return call('respondRequest', 'POST', { token, requestId, status, response });
}

export async function apiDeleteRequest(requestId: string) {
  const token = getSessionToken();
  return call('deleteRequest', 'POST', { token, requestId });
}
