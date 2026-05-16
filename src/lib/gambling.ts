import { supabase } from '@/integrations/supabase/client';

export interface GamblingResult {
  success: boolean;
  game: string;
  wager: number;
  result: string;
  payout: number;
  multiplier: number;
  error?: string;
  symbols?: string[];
  roll?: number;
  chance?: string;
}

export interface GamblingStats {
  total_games_played: number;
  total_wagers: number;
  total_payouts: number;
  net_profit: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  jackpot_hits: number;
  daily_loss_total: number;
}

export interface GamblingTransaction {
  game_type: string;
  wager: number;
  result: string;
  payout: number;
  multiplier: number;
  created_at: string;
}

export interface CooldownStatus {
  on_cooldown: boolean;
  expires_at?: string;
  seconds_remaining?: number;
}

// Get current cooldown status
export async function checkGamblingCooldown(userId: string): Promise<CooldownStatus> {
  try {
    const { data, error } = await (supabase as any)
      .from('gambling_cooldowns')
      .select('cooldown_expires_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { on_cooldown: false };
    }

    const expiresAt = new Date(data.cooldown_expires_at);
    const now = new Date();
    const isOnCooldown = expiresAt > now;

    return {
      on_cooldown: isOnCooldown,
      expires_at: data.cooldown_expires_at,
      seconds_remaining: isOnCooldown ? Math.ceil((expiresAt.getTime() - now.getTime()) / 1000) : 0,
    };
  } catch (err) {
    console.error('Cooldown check error:', err);
    return { on_cooldown: false };
  }
}

// Play coinflip (50/50, 2x payout)
export async function playCoinflip(userId: string, wager: number): Promise<GamblingResult> {
  try {
    const { data, error } = await (supabase as any).rpc('play_coinflip', {
      p_user_id: userId,
      p_wager: wager,
    });

    if (error) {
      return {
        success: false,
        game: 'coinflip',
        wager,
        result: 'error',
        payout: 0,
        multiplier: 0,
        error: error.message,
      };
    }

    return {
      success: data.success,
      game: data.game,
      wager: data.wager,
      result: data.result,
      payout: data.payout,
      multiplier: data.multiplier,
    };
  } catch (err) {
    return {
      success: false,
      game: 'coinflip',
      wager,
      result: 'error',
      payout: 0,
      multiplier: 0,
      error: String(err),
    };
  }
}

// Play dice (1-6, 4-6 wins 1.5x)
export async function playDice(userId: string, wager: number): Promise<GamblingResult> {
  try {
    const { data, error } = await (supabase as any).rpc('play_dice', {
      p_user_id: userId,
      p_wager: wager,
    });

    if (error) {
      return {
        success: false,
        game: 'dice',
        wager,
        result: 'error',
        payout: 0,
        multiplier: 0,
        error: error.message,
      };
    }

    return {
      success: data.success,
      game: data.game,
      wager: data.wager,
      result: data.result,
      roll: data.roll,
      payout: data.payout,
      multiplier: data.multiplier,
    };
  } catch (err) {
    return {
      success: false,
      game: 'dice',
      wager,
      result: 'error',
      payout: 0,
      multiplier: 0,
      error: String(err),
    };
  }
}

// Play slots (3 symbols, all 3 = 5x, 2 = 2x)
export async function playSlots(userId: string, wager: number): Promise<GamblingResult> {
  try {
    const { data, error } = await (supabase as any).rpc('play_slots', {
      p_user_id: userId,
      p_wager: wager,
    });

    if (error) {
      return {
        success: false,
        game: 'slots',
        wager,
        result: 'error',
        payout: 0,
        multiplier: 0,
        symbols: [],
        error: error.message,
      };
    }

    return {
      success: data.success,
      game: data.game,
      wager: data.wager,
      result: data.result,
      symbols: data.symbols,
      payout: data.payout,
      multiplier: data.multiplier,
    };
  } catch (err) {
    return {
      success: false,
      game: 'slots',
      wager,
      result: 'error',
      payout: 0,
      multiplier: 0,
      symbols: [],
      error: String(err),
    };
  }
}

// Play jackpot (1% chance 100x multiplier)
export async function playJackpot(userId: string, wager: number): Promise<GamblingResult> {
  try {
    const { data, error } = await (supabase as any).rpc('play_jackpot', {
      p_user_id: userId,
      p_wager: wager,
    });

    if (error) {
      return {
        success: false,
        game: 'jackpot',
        wager,
        result: 'error',
        payout: 0,
        multiplier: 0,
        error: error.message,
      };
    }

    return {
      success: data.success,
      game: data.game,
      wager: data.wager,
      result: data.result,
      payout: data.payout,
      multiplier: data.multiplier,
      chance: data.chance,
    };
  } catch (err) {
    return {
      success: false,
      game: 'jackpot',
      wager,
      result: 'error',
      payout: 0,
      multiplier: 0,
      error: String(err),
    };
  }
}

// Get gambling stats
export async function getGamblingStats(userId: string): Promise<GamblingStats | null> {
  try {
    const { data, error } = await (supabase as any).rpc('get_gambling_stats', {
      p_user_id: userId,
    });

    if (error || !data) {
      return null;
    }

    return data as unknown as GamblingStats;
  } catch (err) {
    console.error('Stats error:', err);
    return null;
  }
}

// Get recent games
export async function getRecentGames(userId: string, limit: number = 20): Promise<GamblingTransaction[]> {
  try {
    const { data, error } = await (supabase as any).rpc('get_recent_games', {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) {
      return [];
    }

    return (data || []) as unknown as GamblingTransaction[];
  } catch (err) {
    console.error('Recent games error:', err);
    return [];
  }
}

// Subscribe to gambling transactions
export function subscribeToGamblingTransactions(
  userId: string,
  callback: (transaction: GamblingTransaction) => void
) {
  return (supabase as any)
    .channel(`gambling-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'gambling_transactions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const transaction = payload.new as GamblingTransaction;
        callback(transaction);
      }
    )
    .subscribe();
}

// Subscribe to cooldown changes
export function subscribeToGamblingCooldown(
  userId: string,
  callback: (cooldownExpires: string) => void
) {
  return (supabase as any)
    .channel(`cooldown-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gambling_cooldowns',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const data = payload.new as { cooldown_expires_at: string };
        callback(data.cooldown_expires_at);
      }
    )
    .subscribe();
}
