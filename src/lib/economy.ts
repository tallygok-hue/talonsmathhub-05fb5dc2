import { apiAdminAdjustPoints, apiCreateMultiplier, apiEndMultiplier, apiGetActiveMultiplier, apiGetMultipliers, apiMe } from './api';

export async function getUserEconomy(_userId: string) {
  const me = await apiMe();
  const account = me?.account || {};
  const transactions = Array.isArray(me?.transactions) ? me.transactions : [];
  const pointsEarned = transactions.filter((t: any) => Number(t.amount) > 0).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0) || account.total_earned || 0;
  const pointsSpent = Math.abs(transactions.filter((t: any) => Number(t.amount) < 0).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0));
  return {
    currentBalance: account.points || 0,
    pointsEarned,
    pointsSpent,
  };
}

export async function getUserStreak(_userId: string) {
  const me = await apiMe();
  const account = me?.account || {};
  return {
    currentStreak: account.streak_days || 0,
    longestStreak: account.streak_days || 0,
    streakBrokenCount: 0,
  };
}

export async function getUserTransactionHistory(_userId: string, limit = 10) {
  const me = await apiMe();
  return (me?.transactions || []).slice(0, limit).map((tx: any) => ({
    id: tx.id || `${tx.reason}-${tx.created_at}`,
    transactionType: tx.reason || 'activity',
    description: tx.reason || 'Account activity',
    amount: tx.amount || 0,
    createdAt: tx.created_at || new Date().toISOString(),
  }));
}

export async function updateActivityStreak(_userId: string) {
  return { success: true };
}

export async function getActiveMultiplier() {
  const result = await apiGetActiveMultiplier();
  return Number(result?.multiplier || 1);
}

export async function getPointMultipliers() {
  const result = await apiGetMultipliers();
  return (result?.multipliers || []).map((m: any) => ({
    ...m,
    startsAt: m.starts_at || m.startsAt,
    endsAt: m.ends_at || m.endsAt,
  }));
}

export async function createPointMultiplier(name: string, multiplier: number, startsAt: string, endsAt: string, _userId?: string) {
  const result = await apiCreateMultiplier(name, multiplier, new Date(startsAt).toISOString(), new Date(endsAt).toISOString());
  return {
    success: !!result?.success,
    message: result?.message || result?.error || (result?.success ? 'Multiplier scheduled' : 'Failed to schedule multiplier'),
  };
}

export async function deactivateMultiplier(id: string) {
  const result = await apiEndMultiplier(id);
  return !!result?.success;
}

export async function adjustUserPoints(accountId: string, amount: number, note?: string) {
  return apiAdminAdjustPoints(accountId, amount, note);
}
