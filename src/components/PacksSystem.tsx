import { useCallback, useEffect, useState } from 'react';
import { apiMe, apiOpenPack, apiPacksList } from '../lib/api';

interface Props {
  onClose?: () => void;
}

interface Pack {
  id: string;
  key: string;
  name: string;
  description?: string;
  cost: number;
  weights: Record<string, number>;
}

const RARITY: Record<string, { bg: string; ring: string; label: string }> = {
  common:    { bg: 'from-gray-600 to-gray-700',     ring: 'ring-gray-400',    label: 'COMMON' },
  uncommon:  { bg: 'from-green-600 to-emerald-700', ring: 'ring-green-400',   label: 'UNCOMMON' },
  rare:      { bg: 'from-blue-600 to-indigo-700',   ring: 'ring-blue-400',    label: 'RARE' },
  epic:      { bg: 'from-purple-600 to-fuchsia-700',ring: 'ring-purple-400',  label: 'EPIC' },
  legendary: { bg: 'from-yellow-500 to-orange-600', ring: 'ring-yellow-300',  label: 'LEGENDARY' },
};

export function PacksSystem({ onClose }: Props) {
  const [points, setPoints] = useState(0);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const load = useCallback(async () => {
    const [me, p] = await Promise.all([apiMe(), apiPacksList()]);
    setPoints(me?.account?.points || 0);
    setPacks(p?.packs || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (pack: Pack) => {
    if (points < pack.cost || opening) return;
    setOpening(pack.id);
    const res = await apiOpenPack(pack.id);
    setOpening(null);
    if (res?.success) {
      setResult({ ...res, pack });
      load();
    } else {
      setResult({ error: res?.error || 'Failed to open pack', pack });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl p-6 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">📦 Pack Store</h2>
            <p className="text-xs text-gray-500">Open packs to unlock random avatars and name colors.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Balance</div>
            <div className="text-xl font-bold text-yellow-400">{points} pts</div>
          </div>
          {onClose && <button onClick={onClose} className="ml-3 text-gray-400 hover:text-white text-2xl leading-none">×</button>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {packs.map(pack => {
            const canAfford = points >= pack.cost;
            return (
              <div key={pack.id} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col">
                <div className="text-4xl text-center mb-2">
                  {pack.key === 'legendary' ? '🏆' : pack.key === 'premium' ? '💎' : '📦'}
                </div>
                <h3 className="font-bold text-white text-center">{pack.name}</h3>
                <p className="text-[11px] text-gray-400 text-center mt-1 flex-1">{pack.description}</p>
                <div className="flex flex-wrap gap-1 justify-center mt-3 text-[9px] font-bold">
                  {Object.entries(pack.weights || {}).map(([r, w]) => (
                    <span key={r} className={`px-1.5 py-0.5 rounded ${RARITY[r]?.ring || 'ring-gray-500'} ring-1 text-white/80`}>
                      {r[0].toUpperCase()}{w}%
                    </span>
                  ))}
                </div>
                <button onClick={() => open(pack)} disabled={!canAfford || opening === pack.id}
                  className="mt-3 w-full py-2 rounded-lg font-bold text-sm bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 disabled:text-gray-500 text-black disabled:cursor-not-allowed transition">
                  {opening === pack.id ? 'Opening…' : `Open · ${pack.cost} pts`}
                </button>
              </div>
            );
          })}
          {packs.length === 0 && <p className="col-span-3 text-center text-gray-500 py-8">No packs available.</p>}
        </div>

        {result && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-6" onClick={() => setResult(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm text-center" onClick={e => e.stopPropagation()}>
              {result.error ? (
                <>
                  <div className="text-5xl mb-3">⚠️</div>
                  <p className="text-red-400">{result.error}</p>
                </>
              ) : result.duplicate ? (
                <>
                  <div className="text-5xl mb-3 animate-bounce">🔁</div>
                  <h3 className="text-xl font-bold text-white">All items owned!</h3>
                  <p className="text-yellow-400 mt-2">+{result.refund} pts refunded</p>
                </>
              ) : result.item ? (
                <>
                  <div className={`mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br ${RARITY[result.rarity]?.bg} ring-4 ${RARITY[result.rarity]?.ring} flex items-center justify-center mb-4`}>
                    {result.item.kind === 'emoji'
                      ? <span className="text-5xl">{result.item.value}</span>
                      : <span className="block w-16 h-16 rounded-full border-4 border-white/30" style={{ backgroundColor: result.item.value }} />}
                  </div>
                  <div className={`text-xs font-bold tracking-widest mb-1 ${RARITY[result.rarity]?.ring.replace('ring-','text-')}`}>{RARITY[result.rarity]?.label}</div>
                  <h3 className="text-2xl font-bold text-white">{result.item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Added to your inventory</p>
                </>
              ) : null}
              <button onClick={() => setResult(null)} className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold">Continue</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
