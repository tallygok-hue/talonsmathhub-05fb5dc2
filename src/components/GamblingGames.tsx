import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGamble, apiGamblePity, apiMe } from '../lib/api';

interface Props { onClose?: () => void }

type Game = 'coinflip' | 'dice' | 'slots';
type PityRow = { tier: string; loss_streak: number; total_lost: number };

const SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎'];

function tierFromWager(w: number): 'small' | 'mid' | 'big' {
  if (w >= 500) return 'big';
  if (w >= 50) return 'mid';
  return 'small';
}

export function GamblingGames({ onClose }: Props) {
  const [points, setPoints] = useState(0);
  const [game, setGame] = useState<Game>('coinflip');
  const [wager, setWager] = useState(50);
  const [choice, setChoice] = useState<string>('heads');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<any>(null);
  const [history, setHistory] = useState<Array<{ won: boolean; net: number; game: string }>>([]);
  const [pity, setPity] = useState<PityRow[]>([]);
  const [flashClass, setFlashClass] = useState('');

  // Animation state
  const [coinSpinning, setCoinSpinning] = useState(false);
  const [coinFace, setCoinFace] = useState<'heads' | 'tails'>('heads');
  const [diceSpinning, setDiceSpinning] = useState(false);
  const [diceFace, setDiceFace] = useState(1);
  const [reels, setReels] = useState<string[]>(['🍒', '🍋', '🍇']);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const reelIntervals = useRef<Array<ReturnType<typeof setInterval> | null>>([null, null, null]);

  const refresh = useCallback(async () => {
    const [me, p] = await Promise.all([apiMe(), apiGamblePity()]);
    setPoints(me?.account?.points || 0);
    setPity(p?.pity || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (game === 'coinflip') setChoice('heads');
    else if (game === 'dice') setChoice('high');
    else setChoice('');
  }, [game]);

  useEffect(() => () => {
    reelIntervals.current.forEach(i => i && clearInterval(i));
  }, []);

  const animateCoin = (finalSide: 'heads' | 'tails') => new Promise<void>(resolve => {
    setCoinSpinning(true);
    setTimeout(() => {
      setCoinFace(finalSide);
      setCoinSpinning(false);
      resolve();
    }, 1200);
  });

  const animateDice = (finalRoll: number) => new Promise<void>(resolve => {
    setDiceSpinning(true);
    const flip = setInterval(() => setDiceFace(1 + Math.floor(Math.random() * 6)), 80);
    setTimeout(() => {
      clearInterval(flip);
      setDiceFace(finalRoll);
      setDiceSpinning(false);
      resolve();
    }, 1000);
  });

  const animateSlots = (finalReels: string[]) => new Promise<void>(resolve => {
    setSpinningReels([true, true, true]);
    reelIntervals.current.forEach((i, idx) => {
      if (i) clearInterval(i);
      reelIntervals.current[idx] = setInterval(() => {
        setReels(prev => {
          const next = [...prev];
          next[idx] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
          return next;
        });
      }, 60);
    });
    const stopReel = (idx: number, delay: number) => setTimeout(() => {
      const handle = reelIntervals.current[idx];
      if (handle) clearInterval(handle);
      reelIntervals.current[idx] = null;
      setReels(prev => {
        const next = [...prev];
        next[idx] = finalReels[idx];
        return next;
      });
      setSpinningReels(prev => {
        const n = [...prev]; n[idx] = false; return n;
      });
      if (idx === 2) resolve();
    }, delay);
    stopReel(0, 700);
    stopReel(1, 1100);
    stopReel(2, 1500);
  });

  const play = async () => {
    if (busy) return;
    if (wager < 1 || wager > points) return;
    setBusy(true);
    setLast(null);
    setFlashClass('');

    // Optimistic spin start while server rolls
    const rollPromise = apiGamble(game, wager, choice || undefined);

    if (game === 'coinflip') setCoinSpinning(true);
    else if (game === 'dice') {
      setDiceSpinning(true);
      const flip = setInterval(() => setDiceFace(1 + Math.floor(Math.random() * 6)), 80);
      setTimeout(() => clearInterval(flip), 200); // brief pre-anim, real one starts after response
    } else if (game === 'slots') {
      setSpinningReels([true, true, true]);
    }

    const res = await rollPromise;

    if (!res?.success) {
      setBusy(false);
      setCoinSpinning(false); setDiceSpinning(false); setSpinningReels([false, false, false]);
      setLast({ error: res?.error || 'Failed' });
      return;
    }

    // Run real reveal animations matching server outcome
    if (game === 'coinflip') await animateCoin(res.outcome.result);
    else if (game === 'dice') await animateDice(res.outcome.roll);
    else if (game === 'slots') await animateSlots(res.outcome.reels);

    setBusy(false);
    setLast(res);
    setPoints(res.balance);
    setHistory(h => [{ won: res.won, net: res.net, game }, ...h].slice(0, 10));
    setFlashClass(res.won ? 'animate-flash-win' : 'animate-flash-lose');
    setTimeout(() => setFlashClass(''), 700);
    // Refresh pity rows
    apiGamblePity().then(p => setPity(p?.pity || []));
  };

  const currentTier = tierFromWager(wager);
  const tierPity = pity.find(p => p.tier === currentTier);
  const lossStreak = tierPity?.loss_streak || 0;
  const tierLabel = currentTier === 'big' ? 'Big (25%)' : currentTier === 'mid' ? 'Mid (15%)' : 'Small (10%)';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <style>{`
        @keyframes flash-win { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } 30% { box-shadow: 0 0 60px 10px rgba(34,197,94,0.6); } }
        @keyframes flash-lose { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
        .animate-flash-win { animation: flash-win 0.7s ease-out; }
        .animate-flash-lose { animation: flash-lose 0.5s ease-out; }
        @keyframes coin-spin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(1800deg); } }
        .coin-spinning { animation: coin-spin 1.2s cubic-bezier(.4,.1,.2,1); }
        @keyframes dice-tumble { 0% { transform: rotate(0) scale(1); } 50% { transform: rotate(180deg) scale(1.15); } 100% { transform: rotate(360deg) scale(1); } }
        .dice-spinning { animation: dice-tumble 0.3s linear infinite; }
        @keyframes reel-blur { 0%,100% { filter: blur(0); transform: translateY(0); } 50% { filter: blur(2px); transform: translateY(-4px); } }
        .reel-spinning { animation: reel-blur 0.12s linear infinite; }
        @keyframes count-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
        .count-pulse { animation: count-pulse 0.5s ease-out; }
      `}</style>
      <div className={`bg-gradient-to-br from-gray-900 via-purple-950/40 to-gray-900 border border-purple-700/40 rounded-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(168,85,247,0.25)] ${flashClass}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white tracking-wide">🎰 <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">CASINO</span></h2>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase text-gray-500 tracking-wider">Balance</div>
              <div key={points} className="text-xl font-black text-yellow-400 count-pulse">{points.toLocaleString()}</div>
            </div>
            {onClose && <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>}
          </div>
        </div>

        {/* Game picker */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {([
            { id: 'coinflip', label: '🪙 Coinflip', pay: '2x' },
            { id: 'dice', label: '🎲 Dice', pay: '2x' },
            { id: 'slots', label: '🎰 Slots', pay: 'up to 20x' },
          ] as const).map(g => (
            <button key={g.id} onClick={() => setGame(g.id)}
              className={`p-3 rounded-xl border-2 text-center transition ${
                game === g.id ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'border-gray-700 bg-gray-800/40 hover:border-gray-500'
              }`}>
              <div className="text-sm font-bold text-white">{g.label}</div>
              <div className="text-[10px] text-gray-400">{g.pay}</div>
            </button>
          ))}
        </div>

        {/* Animation stage */}
        <div className="bg-black/40 border border-gray-800 rounded-2xl h-44 mb-4 flex items-center justify-center overflow-hidden relative">
          {game === 'coinflip' && (
            <div className={`text-7xl ${coinSpinning ? 'coin-spinning' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
              {coinFace === 'heads' ? '👑' : '🪙'}
            </div>
          )}
          {game === 'dice' && (
            <div className={`text-8xl ${diceSpinning ? 'dice-spinning' : ''}`}>
              {['⚀','⚁','⚂','⚃','⚄','⚅'][Math.max(0, Math.min(5, diceFace - 1))]}
            </div>
          )}
          {game === 'slots' && (
            <div className="flex gap-3">
              {reels.map((r, i) => (
                <div key={i} className={`w-20 h-24 bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-yellow-600/40 rounded-xl flex items-center justify-center text-5xl ${spinningReels[i] ? 'reel-spinning' : ''}`}>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Choice */}
        {game === 'coinflip' && (
          <div className="flex gap-2 mb-3">
            {['heads', 'tails'].map(c => (
              <button key={c} onClick={() => setChoice(c)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${choice === c ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {c === 'heads' ? '👑 Heads' : '🪙 Tails'}
              </button>
            ))}
          </div>
        )}
        {game === 'dice' && (
          <div className="flex gap-2 mb-3">
            <button onClick={() => setChoice('low')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold ${choice === 'low' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Low (1–3)</button>
            <button onClick={() => setChoice('high')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold ${choice === 'high' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>High (4–6)</button>
          </div>
        )}

        {/* Wager */}
        <div className="mb-3">
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

        {/* Pity progress */}
        <div className="mb-4 bg-gray-800/40 border border-gray-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-1.5">
            <span className="text-gray-400">🛡️ Pity · {tierLabel}</span>
            <span className="font-bold text-yellow-300">{lossStreak}/10</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all"
              style={{ width: `${(lossStreak / 10) * 100}%` }} />
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5">10 losses in a row → refund a % of total lost</p>
        </div>

        <button onClick={play} disabled={busy || wager < 1 || wager > points}
          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black rounded-xl text-base shadow-lg shadow-orange-500/30">
          {busy ? 'Rolling…' : `🎲 Play for ${wager} pts`}
        </button>

        {/* Result */}
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
                <p className={`text-center font-black text-lg ${last.won ? 'text-green-400' : 'text-red-400'}`}>
                  {last.won ? `🎉 +${last.net} pts` : `💸 ${last.net} pts`}
                </p>
                {last.pityBonus > 0 && (
                  <p className="text-center text-sm text-yellow-300 mt-1 font-bold">🛡️ Pity bonus: +{last.pityBonus} pts</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Recent strip */}
        {history.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Recent</div>
            <div className="flex gap-1">
              {history.map((h, i) => (
                <div key={i} title={`${h.game} ${h.net > 0 ? '+' : ''}${h.net}`}
                  className={`flex-1 h-6 rounded ${h.won ? 'bg-green-500/40' : 'bg-red-500/30'}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
