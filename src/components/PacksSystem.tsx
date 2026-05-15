import { useState, useEffect } from 'react';
import { getPackTypes, getTrendingPacks, getPackWithCards, openPack, subscribeToCollectibles, getUserCollectibles } from '@/lib/packs';

interface Props {
  userId: string;
  onPackOpened?: () => void;
  currentBalance: number;
  onBalanceUpdate: () => void;
}

const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
  common: { bg: 'bg-gray-600', text: 'text-gray-300', border: 'border-gray-600' },
  uncommon: { bg: 'bg-green-600', text: 'text-green-300', border: 'border-green-600' },
  rare: { bg: 'bg-blue-600', text: 'text-blue-300', border: 'border-blue-600' },
  epic: { bg: 'bg-purple-600', text: 'text-purple-300', border: 'border-purple-600' },
  legendary: { bg: 'bg-yellow-500', text: 'text-yellow-300', border: 'border-yellow-500' },
};

export function PacksSystem({ userId, onPackOpened, currentBalance, onBalanceUpdate }: Props) {
  const [view, setView] = useState<'browse' | 'inventory' | 'opening'>('browse');
  const [packs, setPacks] = useState<any[]>([]);
  const [trendingPacks, setTrendingPacks] = useState<any[]>([]);
  const [selectedPack, setSelectedPack] = useState<any>(null);
  const [collectibles, setCollectibles] = useState<any[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [openingAnimation, setOpeningAnimation] = useState<any>(null);

  useEffect(() => {
    loadPacks();
    loadTrendingPacks();
    subscribeToCollectibles(userId, setCollectibles);
  }, [userId]);

  const loadPacks = async () => {
    try {
      const data = await getPackTypes();
      setPacks(data);
    } catch (err) {
      console.error('Failed to load packs:', err);
    }
  };

  const loadTrendingPacks = async () => {
    try {
      const data = await getTrendingPacks();
      setTrendingPacks(data);
    } catch (err) {
      console.error('Failed to load trending:', err);
    }
  };

  const handleOpenPack = async () => {
    if (!selectedPack || currentBalance < selectedPack.cost_points) return;

    setIsOpening(true);
    setView('opening');
    setOpeningAnimation({ stage: 'opening' });

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setOpeningAnimation({ stage: 'spinning' });

      const result = await openPack(userId, selectedPack.id);

      if (result.success) {
        const cards = selectedPack.cards.filter((c: any) => result.cards?.includes(c.id));
        setOpeningAnimation({
          stage: 'reveal',
          cards: cards.map((c: any) => ({
            ...c,
            isNew: !collectibles.find((co: any) => co.card_id === c.id),
          })),
          duplicates: result.duplicates,
          duplicatePointsEarned: result.duplicate_points_earned,
        });

        onBalanceUpdate();
        onPackOpened?.();
      }
    } finally {
      setIsOpening(false);
    }
  };

  // Browse View
  if (view === 'browse') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setView('browse')}
            className={`px-4 py-2 rounded font-bold text-sm transition-all ${
              view === 'browse'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            📦 Browse Packs
          </button>
          <button
            onClick={() => setView('inventory')}
            className={`px-4 py-2 rounded font-bold text-sm transition-all ${
              view === 'inventory'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🎨 My Collection ({collectibles.length})
          </button>
        </div>

        {/* Trending Packs */}
        <div className="space-y-3">
          <h3 className="font-bold text-white">🔥 Trending This Week</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trendingPacks.slice(0, 3).map((pack: any) => (
              <div key={pack.pack_id} className="bg-gradient-to-br from-orange-600 to-red-600 rounded-lg p-4 text-white hover:shadow-lg transition-all cursor-pointer">
                <p className="font-bold">{pack.name}</p>
                <p className="text-xs text-gray-200">{pack.opens_count} opens by {pack.unique_users} users</p>
              </div>
            ))}
          </div>
        </div>

        {/* All Packs Grid */}
        <div className="space-y-3">
          <h3 className="font-bold text-white">All Available Packs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pack) => (
              <div
                key={pack.id}
                onClick={() => {
                  setSelectedPack(pack);
                  setView('opening');
                }}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                  pack.cost_points <= currentBalance
                    ? 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'
                    : 'border-gray-700 bg-gray-900 opacity-50'
                }`}
              >
                {pack.image_url && (
                  <img src={pack.image_url} alt={pack.name} className="w-full h-32 object-cover rounded mb-3" />
                )}
                <h4 className="font-bold text-white mb-1">{pack.name}</h4>
                <p className="text-xs text-gray-400 mb-3">{pack.description}</p>
                {pack.is_seasonal && (
                  <span className="inline-block text-xs bg-blue-500/30 text-blue-300 px-2 py-1 rounded mr-2 mb-3">
                    🎄 Seasonal
                  </span>
                )}
                {pack.is_event_pack && (
                  <span className="inline-block text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded mb-3">
                    🎉 Event
                  </span>
                )}
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${pack.cost_points <= currentBalance ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {pack.cost_points} pts
                  </span>
                  <button
                    disabled={pack.cost_points > currentBalance}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-xs rounded font-bold transition-all"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Inventory View
  if (view === 'inventory') {
    const groupedByRarity = collectibles.reduce((acc: any, col: any) => {
      const rarity = col.card?.rarity || 'common';
      if (!acc[rarity]) acc[rarity] = [];
      acc[rarity].push(col);
      return acc;
    }, {});

    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <button
          onClick={() => setView('browse')}
          className="px-4 py-2 rounded font-bold text-sm bg-gray-800 text-gray-300 hover:bg-gray-700"
        >
          ← Back
        </button>

        {['legendary', 'epic', 'rare', 'uncommon', 'common'].map((rarity) => {
          const cards = groupedByRarity[rarity] || [];
          if (cards.length === 0) return null;

          const colors = rarityColors[rarity];
          return (
            <div key={rarity} className="space-y-3">
              <h3 className={`font-bold ${colors.text} text-sm`}>
                {rarity.toUpperCase()} ({cards.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {cards.map((col: any) => (
                  <div
                    key={col.id}
                    className={`rounded-lg border-2 ${colors.border} overflow-hidden relative`}
                  >
                    {col.card?.image_url && (
                      <img
                        src={col.card.image_url}
                        alt={col.card.name}
                        className={`w-full h-32 object-cover ${col.card?.animated ? 'animate-pulse' : ''}`}
                      />
                    )}
                    <div className={`${colors.bg} p-2 text-center`}>
                      <p className="text-xs font-bold text-white truncate">{col.card?.name}</p>
                      {col.count > 1 && (
                        <span className="text-xs text-gray-300">×{col.count}</span>
                      )}
                    </div>
                    {col.card?.animated && (
                      <div className="absolute top-1 right-1 text-lg">✨</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Opening Animation View
  if (view === 'opening' && selectedPack) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="space-y-6 text-center">
          {openingAnimation?.stage === 'opening' && (
            <div className="animate-bounce text-6xl">📦</div>
          )}

          {openingAnimation?.stage === 'spinning' && (
            <div className="animate-spin text-6xl">🎰</div>
          )}

          {openingAnimation?.stage === 'reveal' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Pack Opened! 🎉</h2>
              <div className="grid grid-cols-3 gap-4">
                {openingAnimation.cards?.map((card: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${rarityColors[card.rarity].border} ${rarityColors[card.rarity].bg}`}>
                    {card.image_url && (
                      <img src={card.image_url} alt={card.name} className="w-full h-24 object-cover rounded mb-2" />
                    )}
                    <p className="font-bold text-sm text-white">{card.name}</p>
                    {card.isNew && <span className="text-xs text-green-300">✨ NEW</span>}
                  </div>
                ))}
              </div>
              {openingAnimation.duplicates > 0 && (
                <p className="text-yellow-400 font-bold">
                  +{openingAnimation.duplicatePointsEarned} points from {openingAnimation.duplicates} duplicates!
                </p>
              )}
              <button
                onClick={() => {
                  setView('browse');
                  setSelectedPack(null);
                  setOpeningAnimation(null);
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {!openingAnimation?.stage && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Open {selectedPack.name}?</h2>
              <p className="text-gray-300">Cost: {selectedPack.cost_points} points</p>
              <p className="text-gray-400 text-sm">Your balance: {currentBalance} points</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setView('browse');
                    setSelectedPack(null);
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOpenPack}
                  disabled={isOpening || currentBalance < selectedPack.cost_points}
                  className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-white font-bold rounded transition-all"
                >
                  {isOpening ? 'Opening...' : 'Open Pack'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
