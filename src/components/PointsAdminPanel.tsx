import { useState, useEffect } from 'react';
import {
  apiGetAllAccounts,
  apiAdminGivePoints,
  apiAdminTakePoints,
  apiCreatePointsMultiplier,
  apiGetPointsMultipliers,
  apiCancelPointsMultiplier,
  apiCreateLuckMultiplier,
  apiGetLuckMultipliers,
  apiCancelLuckMultiplier,
} from '../lib/api';

interface UserAccount {
  code_id: string;
  username: string;
  points: number;
  total_points_earned: number;
  level: number;
}

interface Multiplier {
  id: string;
  multiplier: number;
  reason?: string;
  start_time: string;
  end_time: string;
  active: boolean;
}

interface LuckMultiplier {
  id: string;
  luck_multiplier: number;
  description?: string;
  start_time: string;
  end_time: string;
  active: boolean;
}

export function PointsAdminPanel() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [multipliers, setMultipliers] = useState<Multiplier[]>([]);
  const [luckMultipliers, setLuckMultipliers] = useState<LuckMultiplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Point transaction form
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [transactionType, setTransactionType] = useState<'give' | 'take'>('give');
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState('Admin adjustment');

  // Multiplier form
  const [multiplierValue, setMultiplierValue] = useState(2);
  const [multiplierReason, setMultiplierReason] = useState('Double points event');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Luck multiplier form
  const [luckValue, setLuckValue] = useState(1.5);
  const [luckDescription, setLuckDescription] = useState('Boosted luck event');
  const [luckStartTime, setLuckStartTime] = useState('');
  const [luckEndTime, setLuckEndTime] = useState('');

  useEffect(() => {
    const load = async () => {
      const [usersData, multipData, luckData] = await Promise.all([
        apiGetAllAccounts(),
        apiGetPointsMultipliers(),
        apiGetLuckMultipliers(),
      ]);
      if (usersData?.accounts) setUsers(usersData.accounts);
      if (multipData?.multipliers) setMultipliers(multipData.multipliers);
      if (luckData?.multipliers) setLuckMultipliers(luckData.multipliers);
      setLoading(false);
    };
    load();
  }, []);

  const handleTransaction = async () => {
    if (!selectedUser || amount < 1) return;

    const result =
      transactionType === 'give'
        ? await apiAdminGivePoints(selectedUser.code_id, selectedUser.username, amount, reason)
        : await apiAdminTakePoints(selectedUser.code_id, selectedUser.username, amount, reason);

    if (result?.success) {
      setUsers(
        users.map((u) =>
          u.code_id === selectedUser.code_id
            ? {
                ...u,
                points: transactionType === 'give' ? u.points + amount : u.points - amount,
              }
            : u
        )
      );
      alert(`✅ ${transactionType === 'give' ? 'Gave' : 'Took'} ${amount} points!`);
      setAmount(100);
      setReason('Admin adjustment');
    }
  };

  const handleCreatePointsMultiplier = async () => {
    if (!startTime || !endTime) {
      alert('Please set start and end times');
      return;
    }

    const result = await apiCreatePointsMultiplier(
      multiplierValue,
      startTime,
      endTime,
      multiplierReason
    );

    if (result?.success) {
      setMultipliers([...multipliers, result.multiplier]);
      alert('✅ Points multiplier created!');
      setMultiplierValue(2);
      setMultiplierReason('Double points event');
      setStartTime('');
      setEndTime('');
    }
  };

  const handleCancelPointsMultiplier = async (id: string) => {
    const result = await apiCancelPointsMultiplier(id);
    if (result?.success) {
      setMultipliers(multipliers.map((m) => (m.id === id ? { ...m, active: false } : m)));
      alert('✅ Multiplier cancelled');
    }
  };

  const handleCreateLuckMultiplier = async () => {
    if (!luckStartTime || !luckEndTime) {
      alert('Please set start and end times');
      return;
    }

    const result = await apiCreateLuckMultiplier(
      luckValue,
      luckStartTime,
      luckEndTime,
      luckDescription
    );

    if (result?.success) {
      setLuckMultipliers([...luckMultipliers, result.multiplier]);
      alert('✅ Luck multiplier created!');
      setLuckValue(1.5);
      setLuckDescription('Boosted luck event');
      setLuckStartTime('');
      setLuckEndTime('');
    }
  };

  const handleCancelLuckMultiplier = async (id: string) => {
    const result = await apiCancelLuckMultiplier(id);
    if (result?.success) {
      setLuckMultipliers(
        luckMultipliers.map((m) => (m.id === id ? { ...m, active: false } : m))
      );
      alert('✅ Luck multiplier cancelled');
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-400">Loading admin panel...</div>;

  return (
    <div className="bg-gray-950 rounded-2xl p-6 space-y-8">
      <h2 className="text-3xl font-bold text-white">⚙️ Points Administration</h2>

      {/* User Points Management */}
      <div className="space-y-4 border-b border-gray-700 pb-8">
        <h3 className="text-2xl font-bold text-white">💳 User Points Management</h3>

        {/* User Selection & Transaction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-sm text-gray-400">Select User</label>
            <select
              value={selectedUser?.code_id || ''}
              onChange={(e) => {
                const user = users.find((u) => u.code_id === e.target.value);
                setSelectedUser(user || null);
              }}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            >
              <option value="">Choose a user...</option>
              {users.map((u) => (
                <option key={u.code_id} value={u.code_id}>
                  {u.username} ({u.points} points)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm text-gray-400">Transaction Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTransactionType('give')}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                  transactionType === 'give'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                ➕ Give
              </button>
              <button
                onClick={() => setTransactionType('take')}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                  transactionType === 'take'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                ➖ Take
              </button>
            </div>
          </div>
        </div>

        {/* Amount & Reason */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              min={1}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Bug compensation, weekly reward"
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>
        </div>

        <button
          onClick={handleTransaction}
          disabled={!selectedUser}
          className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
            selectedUser
              ? `bg-gradient-to-r ${
                  transactionType === 'give'
                    ? 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                    : 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                }`
              : 'bg-gray-700 cursor-not-allowed'
          }`}
        >
          {transactionType === 'give' ? '✅' : '❌'} Execute Transaction
        </button>

        {selectedUser && (
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <p>
              You will {transactionType === 'give' ? 'give' : 'take'} <strong>{amount}</strong> points{' '}
              {transactionType === 'give' ? 'to' : 'from'} <strong>{selectedUser.username}</strong>
            </p>
            <p className="text-gray-500 mt-2">Reason: {reason}</p>
          </div>
        )}
      </div>

      {/* Points Multiplier Schedule */}
      <div className="space-y-4 border-b border-gray-700 pb-8">
        <h3 className="text-2xl font-bold text-white">📈 Points Multiplier</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Multiplier Value (e.g., 2 = 2x points)</label>
            <input
              type="number"
              value={multiplierValue}
              onChange={(e) => setMultiplierValue(parseFloat(e.target.value) || 1)}
              min={1}
              step={0.5}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Reason</label>
            <input
              type="text"
              value={multiplierReason}
              onChange={(e) => setMultiplierReason(e.target.value)}
              placeholder="e.g., Weekend boost"
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>
        </div>

        <button
          onClick={handleCreatePointsMultiplier}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg font-bold text-white transition-all"
        >
          📊 Create Multiplier Schedule
        </button>

        {/* Active Multipliers */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-300">Active Multipliers</h4>
          {multipliers.filter((m) => m.active).length === 0 ? (
            <p className="text-gray-500 text-sm">None active</p>
          ) : (
            multipliers
              .filter((m) => m.active)
              .map((m) => (
                <div key={m.id} className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-300">{m.multiplier}x Points</p>
                      <p className="text-xs text-gray-400">{m.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(m.start_time).toLocaleString()} →{' '}
                        {new Date(m.end_time).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelPointsMultiplier(m.id)}
                      className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-red-300 rounded text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Luck Multiplier Schedule */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-white">🍀 Luck Multiplier (Gambling)</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Luck Multiplier (e.g., 1.5 = 50% better odds)</label>
            <input
              type="number"
              value={luckValue}
              onChange={(e) => setLuckValue(parseFloat(e.target.value) || 1)}
              min={1}
              step={0.1}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Description</label>
            <input
              type="text"
              value={luckDescription}
              onChange={(e) => setLuckDescription(e.target.value)}
              placeholder="e.g., Lucky Friday"
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Start Time</label>
            <input
              type="datetime-local"
              value={luckStartTime}
              onChange={(e) => setLuckStartTime(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">End Time</label>
            <input
              type="datetime-local"
              value={luckEndTime}
              onChange={(e) => setLuckEndTime(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500"
            />
          </div>
        </div>

        <button
          onClick={handleCreateLuckMultiplier}
          className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-lg font-bold text-white transition-all"
        >
          🍀 Create Luck Boost Schedule
        </button>

        {/* Active Luck Multipliers */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-300">Active Luck Boosts</h4>
          {luckMultipliers.filter((m) => m.active).length === 0 ? (
            <p className="text-gray-500 text-sm">None active</p>
          ) : (
            luckMultipliers
              .filter((m) => m.active)
              .map((m) => (
                <div key={m.id} className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-yellow-300">🍀 {m.luck_multiplier}x Luck</p>
                      <p className="text-xs text-gray-400">{m.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(m.start_time).toLocaleString()} →{' '}
                        {new Date(m.end_time).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelLuckMultiplier(m.id)}
                      className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-red-300 rounded text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
