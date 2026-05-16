import { supabase } from '@/integrations/supabase/client';

export interface PackType {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  cost_points: number;
  is_seasonal: boolean;
  is_event_pack: boolean;
  season_name?: string;
  event_name?: string;
}

export interface CollectibleCard {
  id: string;
  pack_type_id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description?: string;
  image_url?: string;
  animated: boolean;
  animation_url?: string;
}

export interface UserCollectible {
  id: string;
  user_id: string;
  card_id: string;
  count: number;
  is_duplicate: boolean;
  acquired_at: string;
  card?: CollectibleCard;
}

export interface PackOpeningResult {
  success: boolean;
  cards?: string[];
  duplicates?: number;
  duplicate_points_earned?: number;
  cost?: number;
  error?: string;
}

// Get all pack types
export async function getPackTypes(filters?: { seasonal?: boolean; event?: boolean }) {
  let query = (supabase as any).from('pack_types').select('*');

  if (filters?.seasonal) query = query.eq('is_seasonal', true);
  if (filters?.event) query = query.eq('is_event_pack', true);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as PackType[];
}

// Get trending packs
export async function getTrendingPacks() {
  const { data, error } = await (supabase as any).rpc('get_trending_packs');
  if (error) throw error;
  return data;
}

// Get single pack with cards
export async function getPackWithCards(packId: string) {
  const { data: packData, error: packError } = await (supabase as any)
    .from('pack_types')
    .select('*')
    .eq('id', packId)
    .single();

  if (packError) throw packError;

  const { data: cardsData, error: cardsError } = await (supabase as any)
    .from('collectible_cards')
    .select('*')
    .eq('pack_type_id', packId)
    .order('rarity', { ascending: false });

  if (cardsError) throw cardsError;

  return {
    ...packData,
    cards: cardsData as unknown as CollectibleCard[],
  };
}

// Open a pack
export async function openPack(userId: string, packTypeId: string, numCards: number = 3) {
  const { data, error } = await (supabase as any).rpc('open_pack', {
    p_user_id: userId,
    p_pack_type_id: packTypeId,
    p_num_cards: numCards,
  });

  if (error) throw error;
  return data as PackOpeningResult;
}

// Get user inventory
export async function getUserCollectibles(userId: string) {
  const { data, error } = await (supabase as any)
    .from('user_collectibles')
    .select(
      `
      *,
      card:collectible_cards(*)
    `
    )
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false });

  if (error) throw error;
  return data as unknown as UserCollectible[];
}

// Get collection stats
export async function getCollectionStats(userId: string) {
  const { data, error } = await (supabase as any).rpc('get_collection_stats', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
}

// Get user's pack openings history
export async function getUserPackOpenings(userId: string, limit: number = 10) {
  const { data, error } = await (supabase as any)
    .from('pack_openings')
    .select(
      `
      *,
      pack:pack_types(name, image_url, cost_points)
    `
    )
    .eq('user_id', userId)
    .order('opened_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Create new pack type (admin)
export async function createPackType(pack: Omit<PackType, 'id'>) {
  const { data, error } = await (supabase as any)
    .from('pack_types')
    .insert([pack])
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PackType;
}

// Create collectible cards (admin)
export async function createCollectibleCards(cards: Omit<CollectibleCard, 'id'>[]) {
  const { data, error } = await (supabase as any)
    .from('collectible_cards')
    .insert(cards)
    .select();

  if (error) throw error;
  return data as unknown as CollectibleCard[];
}

// Get single card details
export async function getCardDetails(cardId: string) {
  const { data, error } = await (supabase as any)
    .from('collectible_cards')
    .select('*')
    .eq('id', cardId)
    .single();

  if (error) throw error;
  return data as unknown as CollectibleCard;
}

// Subscribe to user collectibles changes
export function subscribeToCollectibles(userId: string, callback: (collectibles: UserCollectible[]) => void) {
  const channel = (supabase as any)
    .channel(`collectibles-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_collectibles', filter: `user_id=eq.${userId}` },
      async () => {
        const collectibles = await getUserCollectibles(userId);
        callback(collectibles);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// Get pack opening animations data
export async function getPackOpeningAnimation(packTypeId: string) {
  const pack = await getPackWithCards(packTypeId);
  return {
    packName: pack.name,
    packImage: pack.image_url,
    totalCards: pack.cards.length,
    rarities: pack.cards.reduce(
      (acc, card) => {
        acc[card.rarity] = (acc[card.rarity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}
