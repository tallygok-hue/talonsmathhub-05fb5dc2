import { useState, useEffect } from 'react';
import { getUserEconomy, getUserTransactionHistory, updateActivityStreak, getUserStreak, getActiveMultiplier } from '@/lib/economy';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  userId: string;
  username: string;
}

export function EconomyDashboard({ userId, username }: Props) {
  const [economy, setEconomy] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [econ, str, txns, mult] = await Promise.all([
        getUserEconomy(userId),
        getUserStreak(userId),
        getUserTransactionHistory(userId, 10),
        getActiveMultiplier(),
      ]);

      setEconomy(econ);
      setStreak(str);
      setTransactions(txns);
      setMultiplier(mult);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleUpdateStreak = async () => {
    const result = await updateActivityStreak(userId);
    if (result) {
      const updated = await getUserStreak(userId);
      setStreak(updated);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 p-8 text-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Points Card */}
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-700/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-purple-200">💰 Points</h3>
            {multiplier > 1 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full font-bold">
                {multiplier}x Active
              </span>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-gray-400 text-sm">Current Balance</span>
              <span className="text-3xl font-bold text-purple-400">
                {economy?.currentBalance ? Number(economy.currentBalance).toLocaleString() : '0'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 rounded p-2">
                <p className="text-gray-500">Earned</p>
                <p className="text-green-400 font-bold">
                  +{economy?.pointsEarned ? Number(economy.pointsEarned).toLocaleString() : '0'}
                </p>
              </div>
              <div className="bg-black/30 rounded p-2">
                <p className="text-gray-500">Spent</p>
                <p className="text-red-400 font-bold">
                  -{economy?.pointsSpent ? Number(economy.pointsSpent).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-700/40 rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-orange-200">🔥 Activity Streak</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-gray-400 text-sm">Current Streak</span>
              <span className="text-3xl font-bold text-orange-400">
                {streak?.currentStreak || 0} days
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 rounded p-2">
                <p className="text-gray-500">Longest</p>
                <p className="text-blue-400 font-bold">
                  {streak?.longestStreak || 0} days
                </p>
              </div>
              <div className="bg-black/30 rounded p-2">
                <p className="text-gray-500">Times Broken</p>
                <p className="text-gray-300 font-bold">
                  {streak?.streakBrokenCount || 0}
                </p>
              </div>
            </div>
            <button
              onClick={handleUpdateStreak}
              className="w-full mt-2 bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 text-sm font-bold py-2 rounded border border-orange-600/30 transition"
            >
              Check In Daily ✓
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-gray-200 text-sm">📜 Recent Activity</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-4">No transactions yet</p>
          ) : (
            transactions.map(txn => (
              <div key={txn.id} className="flex items-center justify-between bg-black/30 p-3 rounded border border-gray-800/50 text-xs">
                <div className="flex-1">
                  <p className="text-gray-200 font-medium capitalize">
                    {txn.transactionType === 'streak_bonus' ? '🔥 Streak Bonus' : 
                     txn.transactionType === 'poll' ? '🗳️ Poll Reward' :
                     txn.transactionType === 'event' ? '🎉 Event Reward' :
                     txn.transactionType === 'purchase' ? '🛍️ Purchase' :
                     txn.transactionType === 'gambling' ? '🎲 Gambling' :
                     txn.transactionType === 'pack_open' ? '📦 Pack Opened' :
                     txn.transactionType === 'admin' ? '👑 Admin' :
                     '💬 Chat'}
                  </p>
                  <p className="text-gray-500">{txn.description}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${txn.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {txn.amount > 0 ? '+' : ''}{Number(txn.amount).toLocaleString()}
                  </p>
                  <p className="text-gray-500">
                    {formatDistanceToNow(new Date(txn.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
