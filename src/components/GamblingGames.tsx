import { useCallback, useEffect, useState } from 'react';
import { apiGamble, apiMe } from '../lib/api';

interface Props { onClose?: () => void }

type Game = 'coinflip' | 'dice' | 'slots';

export function GamblingGames({ onClose }: Props) {
  const [points, setPoints] = useState(0);
  const [game, setGame] = useState<Game>('coinflip');
  const [wager, setWager] = useState(50);
  const [choice, setChoice] = useState<string>('heads');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<any>(null);

  const refresh = useCallback(async () => {
    const me = await apiMe();
    setPoints(me?.account?.points || 0);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (game === 'coinflip') setChoice('heads');
    else if (game === 'dice') setChoice('high');
    else setChoice('');
  }, [game]);

  const play = async () => {
    if (busy) return;
    if (wager < 1 || wager > points) return;
    setBusy(true);
    const res = await apiGamble(game, wager, choice || undefined);
    setBusy(false);
    if (res?.success) {
      setLast(res);
      setPoints(res.balance);
    } else {
      setLast({ error: res?.error || 'Failed' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">🎰 Casino</h2>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase text-gray-500">Balance</div>
              <div className="text-lg font-bold text-yellow-400">{points} pts</div>
            </div>
            {onClose && <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {([
            { id: 'coinflip', label: '🪙 Coinflip', pay: '2x' },
            { id: 'dice', label: '🎲 Dice', pay: '2x' },
            { id: 'slots', label: '🎰 Slots', pay: 'up to 20x' },
          ] as const).map(g => (
            <button key={g.id} onClick={() => setGame(g.id)}
              className={`p-3 rounded-xl border-2 text-center transition ${
                game === g.id ? 'border-yellow-400 bg-yellow-500/10' : 'border-gray-700 bg-gray-800/40 hover:border-gray-500'
              }`}>
              <div className="text-sm font-bold text-white">{g.label}</div>
              <div className="text-[10px] text-gray-400">{g.pay}</div>
            </button>
          ))}
        </div>

        {game === 'coinflip' && (
          <div className="flex gap-2 mb-4">
            {['heads', 'tails'].map(c => (
              <button key={c} onClick={() => setChoice(c)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold ${choice === c ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {c === 'heads' ? '👑 Heads' : '🪙 Tails'}
              </button>
            ))}
          </div>
        )}
        {game === 'dice' && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setChoice('low')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold ${choice === 'low' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Low (1–3)</button>
            <button onClick={() => setChoice('high')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold ${choice === 'high' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>High (4–6)</button>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Wager</label>
          <div className="flex gap-2">
            <input type="number" min={1} max={points} value={wager}
              onChange={e => setWager(Math.max(1, Math.min(points || 1, Number(e.target.value) | 0)))}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            {[10, 50, 100, 500].map(amt => (
              <button key={amt} disabled={amt > points} onClick={() => setWager(Math.min(amt, points))}
                className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-xs font-bold text-gray-300">
                {amt}
              </button>
            ))}
            <button disabled={points < 1} onClick={() => setWager(points)}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-xs font-bold text-yellow-300">
              MAX
            </button>
          </div>
        </div>

        <button onClick={play} disabled={busy || wager < 1 || wager > points}
          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl text-base shadow-lg">
          {busy ? 'Rolling…' : `🎲 Play for ${wager} pts`}
        </button>

        {last && (
          <div className={`mt-4 p-4 rounded-xl border-2 ${
            last.error ? 'border-red-500/50 bg-red-500/10'
              : last.won ? 'border-green-500/50 bg-green-500/10'
              : 'border-gray-700 bg-gray-800/50'
          }`}>
            {last.error ? (
              <p className="text-red-400 text-sm text-center">{last.error}</p>
            ) : (
              <>
                {last.outcome?.game === 'slots' && (
                  <div className="text-4xl tracking-widest text-center mb-2">
                    {last.outcome.reels?.join(' ')}
                  </div>
                )}
                {last.outcome?.game === 'coinflip' && (
                  <div className="text-center text-sm mb-1 text-gray-300">
                    Coin landed: <span className="font-bold text-white">{last.outcome.result}</span>
                  </div>
                )}
                {last.outcome?.game === 'dice' && (
                  <div className="text-center text-sm mb-1 text-gray-300">
                    Rolled: <span className="font-bold text-white text-xl">{last.outcome.roll}</span>
                  </div>
                )}
                <p className={`text-center font-bold ${last.won ? 'text-green-400' : 'text-red-400'}`}>
                  {last.won ? `🎉 +${last.net} pts` : `💸 -${Math.abs(last.net)} pts`}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
