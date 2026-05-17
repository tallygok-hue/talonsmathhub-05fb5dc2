import { getDeviceHash } from './fingerprint';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-api`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function call(action: string, method: 'GET' | 'POST' = 'GET', body?: unknown, params?: Record<string, string>) {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
  };
  const token = getSessionToken();
  if (token) headers['x-session-token'] = token;

  const res = await fetch(url.toString(), {
    method,
    headers,
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
    sessionStorage.setItem('tmh_user', result.username || username || '');
    if (result.isAdmin) sessionStorage.setItem('tmh_admin', 'true');
    else sessionStorage.removeItem('tmh_admin');
  }
  return result;
}

export async function apiValidateSession() {
  const token = getSessionToken();
  if (!token) return { valid: false };
  return call('validate', 'GET');
}

export async function apiLogout() {
  const token = getSessionToken();
  if (token) await call('logout', 'GET');
  clearSessionToken();
}

// Beacon-based logout — fires reliably during pagehide/unload.
// sendBeacon cannot set custom headers, so we send the token in the body.
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
  return call('toggleFav', 'POST', { gameId });
}
export async function apiGetFavs() {
  return call('getFavs', 'GET');
}
export async function apiSaveProgress(progressType: string, data: unknown) {
  return call('saveProgress', 'POST', { progressType, data });
}

export async function apiAddRecent(game: { id: string; name: string; icon?: string; url?: string }) {
  return call('addRecent', 'POST', { game });
}
export async function apiGetRecent() {
  return call('getRecent', 'GET');
}

// Admin
export async function apiGetCodes() { return call('getCodes', 'GET'); }
export async function apiAddCode(code: string, isAdmin = false) { return call('addCode', 'POST', { code, isAdmin }); }
export async function apiRemoveCode(codeId: string) { return call('removeCode', 'POST', { codeId }); }
export async function apiActivateCode(codeId: string) { return call('activateCode', 'POST', { codeId }); }
export async function apiGetSessions() { return call('getSessions', 'GET'); }
export async function apiEndSession(sessionId: string) { return call('endSession', 'POST', { sessionId }); }
export async function apiGetLogs() { return call('getLogs', 'GET'); }
export async function apiChangeAdminCode(oldCodeId: string, newCode: string) { return call('changeAdminCode', 'POST', { oldCodeId, newCode }); }

// Device bans
export async function apiBanDevice(deviceHash: string, reason?: string, username?: string, userAgent?: string) {
  return call('banDevice', 'POST', { deviceHash, reason, username, userAgent });
}
export async function apiUnbanDevice(deviceHash: string) {
  return call('unbanDevice', 'POST', { deviceHash });
}
export async function apiGetBannedDevices() { return call('getBannedDevices', 'GET'); }

// Code account view
export async function apiGetCodeAccount(codeId: string) {
  return call('getCodeAccount', 'GET', undefined, { codeId });
}

// Requests
export async function apiSubmitRequest(category: string, message: string) {
  return call('submitRequest', 'POST', { category, message });
}
export async function apiGetMyRequests() { return call('getMyRequests', 'GET'); }
export async function apiMarkNotified(requestId: string) { return call('markNotified', 'POST', { requestId }); }
export async function apiGetAllRequests() { return call('getAllRequests', 'GET'); }
export async function apiRespondRequest(requestId: string, status: 'accepted' | 'denied' | 'pending', response: string) {
  return call('respondRequest', 'POST', { requestId, status, response });
}
export async function apiDeleteRequest(requestId: string) { return call('deleteRequest', 'POST', { requestId }); }

// Chat
export async function apiGetChat() { return call('getChat', 'GET'); }
export async function apiSendChat(message: string) { return call('sendChat', 'POST', { message }); }
export async function apiDeleteChat(messageId: string) { return call('deleteChat', 'POST', { messageId }); }

// Live activity & screen monitoring
export async function apiUpdateActivity(view: string, game?: string | null, url?: string) {
  const token = getSessionToken(); if (!token) return;
  return call('updateActivity', 'POST', { view, game: game || null, url: url || location.href });
}
export async function apiUploadScreen(screenshot: string, width: number, height: number) {
  const token = getSessionToken(); if (!token) return;
  return call('uploadScreen', 'POST', { screenshot, width, height });
}
export async function apiGetScreens() { return call('getScreens', 'GET'); }
export async function apiGetScreen(sessionToken: string) { return call('getScreen', 'GET', undefined, { sessionToken }); }

// Game play analytics
export async function apiTrackPlay(gameId: string, gameName?: string) {
  const token = getSessionToken(); if (!token) return;
  return call('trackPlay', 'POST', { gameId, gameName });
}
export async function apiGameAnalytics(days = 7) {
  return call('gameAnalytics', 'GET', undefined, { days: String(days) });
}

// Polls
export async function apiGetPolls() { return call('getPolls', 'GET'); }
export async function apiCreatePoll(question: string, options: string[], endsAt?: string) {
  return call('createPoll', 'POST', { question, options, endsAt });
}
export async function apiClosePoll(pollId: string) { return call('closePoll', 'POST', { pollId }); }
export async function apiDeletePoll(pollId: string) { return call('deletePoll', 'POST', { pollId }); }
export async function apiVotePoll(pollId: string, optionIndex: number) {
  return call('votePoll', 'POST', { pollId, optionIndex });
}

// === Phase 1: Accounts / Profile / Quests / Update Notes / Flags ===
export async function apiRegister(username: string, password: string) {
  return call('register', 'POST', { username, password });
}
export async function apiSetUsername(username: string) {
  return call('setUsername', 'POST', { username });
}
export async function apiMe() {
  return call('me', 'GET');
}
export async function apiLeaderboard(period: 'all' | 'week' = 'all') {
  return call('leaderboard', 'GET', undefined, { period });
}
export async function apiGetQuests() {
  return call('getQuests', 'GET');
}
export async function apiGetUpdateLogs() {
  return call('getUpdateLogs', 'GET');
}
export async function apiAckUpdateLog(updateLogId: string) {
  return call('ackUpdateLog', 'POST', { updateLogId });
}
export async function apiCreateUpdateLog(payload: { version: string; title: string; body: string; highlights: string[]; severity?: string; target?: string; requireAck?: boolean; published?: boolean }) {
  return call('createUpdateLog', 'POST', payload);
}
export async function apiDeleteUpdateLog(updateLogId: string) {
  return call('deleteUpdateLog', 'POST', { updateLogId });
}
export async function apiGetAnnouncements() {
  return call('getAnnouncements', 'GET');
}
export async function apiAckAnnouncement(announcementId: string) {
  return call('ackAnnouncement', 'POST', { announcementId });
}
export async function apiCreateAnnouncement(payload: { title: string; body: string; severity?: string; dismissable?: boolean; active?: boolean; target?: string }) {
  return call('createAnnouncement', 'POST', payload);
}
export async function apiDeleteAnnouncement(id: string) {
  return call('deleteAnnouncement', 'POST', { id });
}
export async function apiGetAllAnnouncements() {
  return call('getAllAnnouncements', 'GET');
}
export async function apiSetFlag(key: string, enabled: boolean, scope: 'all' | 'admins' = 'all') {
  return call('setFlag', 'POST', { key, enabled, scope });
}
export async function apiGetAccounts() {
  return call('getAccounts', 'GET');
}
export async function apiAdminUpdateAccount(payload: { accountId: string; role?: string; banned?: boolean; muteMinutes?: number; points?: number }) {
  return call('adminUpdateAccount', 'POST', payload);
}
export async function apiAdminGrantPerm(accountId: string, permKey: string) {
  return call('adminGrantPerm', 'POST', { accountId, permKey });
}
export async function apiAdminRevokePerm(accountId: string, permKey: string) {
  return call('adminRevokePerm', 'POST', { accountId, permKey });
}
export async function apiAdminAdjustPoints(accountId: string, amount: number, note?: string) {
  return call('adminAdjustPoints', 'POST', { accountId, amount, note });
}
export async function apiGetPermissions() {
  return call('getPermissions', 'GET');
}
export async function apiGetMultipliers() {
  return call('getMultipliers', 'GET');
}
export async function apiCreateMultiplier(name: string, multiplier: number, startsAt: string, endsAt: string) {
  return call('createMultiplier', 'POST', { name, multiplier, startsAt, endsAt });
}
export async function apiEndMultiplier(multiplierId: string) {
  return call('endMultiplier', 'POST', { multiplierId });
}
export async function apiGetActiveMultiplier() {
  return call('getActiveMultiplier', 'GET');
}
export async function apiAdminGetQuests() {
  return call('adminGetQuests', 'GET');
}
export async function apiAdminCreateQuest(payload: { key: string; title: string; description: string; quest_type: 'daily' | 'weekly'; goal: number; reward: number; metric: string; active?: boolean }) {
  return call('adminCreateQuest', 'POST', payload);
}
export async function apiAdminUpdateQuest(questId: string, updates: any) {
  return call('adminUpdateQuest', 'POST', { questId, ...updates });
}
export async function apiAdminDeleteQuest(questId: string) {
  return call('adminDeleteQuest', 'POST', { questId });
}
export async function apiReportChat(messageId: string, reason: string) {
  return call('reportChat', 'POST', { messageId, reason });
}
export async function apiGetReports() {
  return call('getReports', 'GET');
}
export async function apiResolveReport(reportId: string) {
  return call('resolveReport', 'POST', { reportId });
}

// Feature flag reader (anon-readable, direct from client)
export async function apiReadFlags() {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/feature_flags?select=key,enabled,scope`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  return res.ok ? res.json() : [];
}
