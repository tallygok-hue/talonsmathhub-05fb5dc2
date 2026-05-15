import { useState, useEffect, useCallback, useRef } from 'react';
import { playCoinflip, playDice, playSlots, playJackpot, checkGamblingCooldown, getGamblingStats, getRecentGames, subscribeToGamblingTransactions, subscribeToGamblingCooldown, GamblingResult, GamblingStats, GamblingTransaction, CooldownStatus } from '../lib/gambling';

interface GamblingGamesProps {
  userId: string;
  currentBalance: number;
  onBalanceUpdate: () => void;
}

export function GamblingGames({ userId, currentBalance, onBalanceUpdate }: GamblingGamesProps) {
  const [activeGame, setActiveGame] = useState<'coinflip' | 'dice' | 'slots' | 'jackpot' | null>(null);
  const [wager, setWager] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cooldown, setCooldown] = useState<CooldownStatus>({ on_cooldown: false });
  const [lastResult, setLastResult] = useState<GamblingResult | null>(null);
  const [stats, setStats] = useState<GamblingStats | null>(null);
  const [recentGames, setRecentGames] = useState<GamblingTransaction[]>([]);
  const cooldownIntervalRef = useRef<number | null>(null);

  // Load initial stats
  useEffect(() => {
    const loadStats = async () => {
      const s = await getGamblingStats(userId);
      setStats(s);
      const games = await getRecentGames(userId, 10);
      setRecentGames(games);
    };
    loadStats();
  }, [userId]);

  // Check cooldown on mount and subscribe
  useEffect(() => {
    const checkCooldown = async () => {
      const status = await checkGamblingCooldown(userId);
      setCooldown(status);
    };

    checkCooldown();

    const sub = subscribeToGamblingCooldown(userId, (expiresAt) => {
      const now = new Date();
      const expires = new Date(expiresAt);
      setCooldown({
        on_cooldown: expires > now,
        expires_at: expiresAt,
        seconds_remaining: expires > now ? Math.ceil((expires.getTime() - now.getTime()) / 1000) : 0,
      });
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [userId]);

  // Countdown timer
  useEffect(() => {
    if (!cooldown.on_cooldown) return;

    const tick = () => {
      setCooldown((prev) => {
        if (!prev.expires_at) return prev;
        const now = new Date();
        const expires = new Date(prev.expires_at);
        const remaining = Math.ceil((expires.getTime() - now.getTime()) / 1000);

        if (remaining <= 0) {
          return { on_cooldown: false };
        }

        return { ...prev, seconds_remaining: remaining };
      });
    };

    cooldownIntervalRef.current = window.setInterval(tick, 100);
    return () => {
      if (cooldownIntervalRef.current) window.clearInterval(cooldownIntervalRef.current);
    };
  }, [cooldown.on_cooldown]);

  // Subscribe to new transactions
  useEffect(() => {
    const sub = subscribeToGamblingTransactions(userId, (transaction) => {
      setRecentGames((prev) => [transaction, ...prev].slice(0, 10));
      getGamblingStats(userId).then(setStats);
      onBalanceUpdate();
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [userId, onBalanceUpdate]);

  const playGame = useCallback(
    async (game: 'coinflip' | 'dice' | 'slots' | 'jackpot') => {
      if (cooldown.on_cooldown || isPlaying) return;
      if (wager > currentBalance) {
        setLastResult({
          success: false,
          game,
          wager,
          result: 'insufficient',
          payout: 0,
          multiplier: 0,
          error: 'Insufficient balance',
        });
        return;
      }

      setIsPlaying(true);
      let result: GamblingResult;

      try {
        switch (game) {
          case 'coinflip':
            result = await playCoinflip(userId, wager);
            break;
          case 'dice':
            result = await playDice(userId, wager);
            break;
          case 'slots':
            result = await playSlots(userId, wager);
            break;
          case 'jackpot':
            result = await playJackpot(userId, wager);
            break;
        }

        setLastResult(result);

        // Update cooldown immediately
        const status = await checkGamblingCooldown(userId);
        setCooldown(status);

        // Update stats
        const updatedStats = await getGamblingStats(userId);
        setStats(updatedStats);
      } finally {
        setIsPlaying(false);
      }
    },
    [userId, wager, currentBalance, cooldown.on_cooldown, isPlaying]
  );

  const wagerPresets = [10, 50, 100, 500, 1000, 5000, 10000];
  const jackpotPresets = [100, 500, 1000, 5000, 10000, 25000, 50000];

  const resultColor = lastResult
    ? lastResult.result.includes('win') || lastResult.result.includes('jackpot')
      ? 'text-green-400'
      : 'text-red-400'
    : 'text-gray-400';

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-6">
      {/* Game Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coinflip */}
        <div
          onClick={() => setActiveGame('coinflip')}
          className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
            activeGame === 'coinflip'
              ? 'border-yellow-400 bg-yellow-500/20'
              : 'border-gray-700 bg-gray-900 hover:border-yellow-400/50'
          }`}
        >
          <div className="text-3xl mb-2">🪙</div>
          <h3 className="font-bold text-white mb-1">Coinflip</h3>
          <p className="text-xs text-gray-400">50/50 chance to 2x your wager</p>
        </div>

        {/* Dice */}
        <div
          onClick={() => setActiveGame('dice')}
          className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
            activeGame === 'dice'
              ? 'border-yellow-400 bg-yellow-500/20'
              : 'border-gray-700 bg-gray-900 hover:border-yellow-400/50'
          }`}
        >
          <div className="text-3xl mb-2">🎲</div>
          <h3 className="font-bold text-white mb-1">Dice</h3>
          <p className="text-xs text-gray-400">Roll 4-6 to win 1.5x</p>
        </div>

        {/* Slots */}
        <div
          onClick={() => setActiveGame('slots')}
          className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
            activeGame === 'slots'
              ? 'border-yellow-400 bg-yellow-500/20'
              : 'border-gray-700 bg-gray-900 hover:border-yellow-400/50'
          }`}
        >
          <div className="text-3xl mb-2">🎰</div>
          <h3 className="font-bold text-white mb-1">Slots</h3>
          <p className="text-xs text-gray-400">All 3 match = 5x, 2 match = 2x</p>
        </div>

        {/* Jackpot */}
        <div
          onClick={() => setActiveGame('jackpot')}
          className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
            activeGame === 'jackpot'
              ? 'border-yellow-400 bg-yellow-500/20'
              : 'border-gray-700 bg-gray-900 hover:border-yellow-400/50'
          }`}
        >
          <div className="text-3xl mb-2">💰</div>
          <h3 className="font-bold text-white mb-1">Jackpot</h3>
          <p className="text-xs text-gray-400">1% chance to win 100x!</p>
        </div>
      </div>

      {/* Game Play Area */}
      {activeGame && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white capitalize">{activeGame} Game</h2>
            {cooldown.on_cooldown && (
              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">
                Cooldown: {cooldown.seconds_remaining}s
              </span>
            )}
          </div>

          {/* Wager Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300">Wager Amount</label>
            <input
              type="number"
              value={wager}
              onChange={(e) => setWager(Math.max(1, parseInt(e.target.value) || 0))}
              disabled={isPlaying}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              min={activeGame === 'jackpot' ? 100 : 10}
              max={activeGame === 'jackpot' ? 50000 : 10000}
            />
            <div className="flex gap-2 flex-wrap">
              {(activeGame === 'jackpot' ? jackpotPresets : wagerPresets)
                .filter((p) => p <= currentBalance)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setWager(p)}
                    disabled={isPlaying}
                    className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                  >
                    {p}
                  </button>
                ))}
            </div>
          </div>

          {/* Play Button */}
          <button
            onClick={() => playGame(activeGame)}
            disabled={isPlaying || cooldown.on_cooldown || wager > currentBalance}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-all"
          >
            {isPlaying ? '🎲 Playing...' : `Play ${activeGame.charAt(0).toUpperCase() + activeGame.slice(1)}`}
          </button>

          {/* Last Result */}
          {lastResult && (
            <div
              className={`p-4 rounded-lg border ${
                lastResult.success && lastResult.result.includes('win')
                  ? 'border-green-600 bg-green-900/20'
                  : lastResult.success && lastResult.result.includes('jackpot')
                    ? 'border-purple-600 bg-purple-900/20'
                    : 'border-red-600 bg-red-900/20'
              }`}
            >
              <p className="text-xs text-gray-400 mb-1">Last Result:</p>
              <p className={`font-bold text-sm ${resultColor}`}>{lastResult.result}</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                  <p className="text-gray-500">Wager</p>
                  <p className="font-semibold text-white">-{lastResult.wager}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payout</p>
                  <p className="font-semibold text-green-400">+{lastResult.payout}</p>
                </div>
                <div>
                  <p className="text-gray-500">Multiplier</p>
                  <p className="font-semibold text-yellow-400">{lastResult.multiplier}x</p>
                </div>
              </div>
              {lastResult.symbols && (
                <p className="mt-2 text-lg text-center">{lastResult.symbols.join(' ')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stats Card */}
        {stats && (
          <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-white text-sm">📊 Your Stats</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Games Played</span>
                <span className="font-semibold">{stats.total_games_played}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate</span>
                <span className={`font-semibold ${stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.win_rate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Net Profit</span>
                <span className={`font-semibold ${stats.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.net_profit >= 0 ? '+' : ''}{stats.net_profit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Jackpot Hits</span>
                <span className="font-semibold text-purple-400">{stats.jackpot_hits}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Games */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-white text-sm">⏰ Recent Games</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentGames.length === 0 ? (
              <p className="text-xs text-gray-500">No games played yet</p>
            ) : (
              recentGames.map((game, idx) => (
                <div key={idx} className="flex justify-between text-xs bg-black/30 p-2 rounded border border-gray-800">
                  <div>
                    <span className="font-semibold capitalize">{game.game_type}</span>
                    <span className="text-gray-500 ml-2">{game.result}</span>
                  </div>
                  <div className="flex gap-2">
                    <span>
                      {game.result.includes('loss') ? '❌' : '✅'}
                    </span>
                    <span className={game.payout > 0 ? 'text-green-400' : 'text-red-400'}>
                      {game.payout > 0 ? '+' : '-'}{Math.max(game.wager, game.payout)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
