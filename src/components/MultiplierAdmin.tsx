import { useState, useEffect } from 'react';
import { getPointMultipliers, createPointMultiplier, deactivateMultiplier } from '@/lib/economy';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  userId: string;
}

export function MultiplierAdmin({ userId }: Props) {
  const [multipliers, setMultipliers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [multiplier, setMultiplier] = useState(2.0);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const mults = await getPointMultipliers();
    setMultipliers(mults);
  };

  const handleCreate = async () => {
    if (!name.trim() || !startsAt || !endsAt) {
      setMessage('❌ Fill all fields');
      return;
    }

    if (new Date(endsAt) <= new Date(startsAt)) {
      setMessage('❌ End time must be after start time');
      return;
    }

    setLoading(true);
    const result = await createPointMultiplier(name, multiplier, startsAt, endsAt, userId);
    setMessage(result.success ? '✅ ' + result.message : '❌ ' + result.message);

    if (result.success) {
      setName('');
      setMultiplier(2.0);
      setStartsAt('');
      setEndsAt('');
      await load();
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this multiplier?')) return;
    const success = await deactivateMultiplier(id);
    if (success) await load();
  };

  const now = new Date();
  const active = multipliers.filter(m => m.active && new Date(m.startsAt) <= now && new Date(m.endsAt) > now);
  const upcoming = multipliers.filter(m => m.active && new Date(m.startsAt) > now);
  const expired = multipliers.filter(m => !m.active || new Date(m.endsAt) <= now);

  return (
    <div className="space-y-5">
      {/* Create New */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
        <h3 className="font-bold text-sm">➕ Schedule 2x Points Event</h3>
        {message && (
          <p className={`text-sm font-medium ${message.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Event name"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
          />
          <input
            type="number"
            value={multiplier}
            onChange={e => setMultiplier(parseFloat(e.target.value))}
            placeholder="Multiplier"
            min="1"
            max="10"
            step="0.5"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={e => setStartsAt(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
          <input
            type="datetime-local"
            value={endsAt}
            onChange={e => setEndsAt(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold py-2 rounded text-sm transition"
        >
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </div>

      {/* Active Multipliers */}
      {active.length > 0 && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-green-300">✅ Active Right Now</h3>
          <div className="space-y-2">
            {active.map(m => (
              <div key={m.id} className="bg-black/40 rounded p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-300">{m.multiplier}x {m.name}</p>
                  <p className="text-xs text-gray-400">
                    Ends {formatDistanceToNow(new Date(m.endsAt), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeactivate(m.id)}
                  className="text-xs bg-red-600/30 hover:bg-red-600/50 text-red-300 px-2 py-1 rounded transition"
                >
                  End Early
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-yellow-300">⏳ Upcoming</h3>
          <div className="space-y-2">
            {upcoming.map(m => (
              <div key={m.id} className="bg-black/40 rounded p-3">
                <p className="font-bold text-yellow-300">{m.multiplier}x {m.name}</p>
                <p className="text-xs text-gray-400">
                  Starts {formatDistanceToNow(new Date(m.startsAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-gray-400">📜 History</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {expired.slice(0, 5).map(m => (
              <div key={m.id} className="bg-black/30 rounded p-2 text-xs text-gray-500">
                {m.multiplier}x {m.name} (ended {formatDistanceToNow(new Date(m.endsAt), { addSuffix: true })})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
