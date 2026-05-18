import { useCallback, useEffect, useState } from 'react';
import { apiMe, apiShopList, apiShopBuy, apiUpdateProfile } from '../lib/api';

interface ProfilePanelProps {
  onClose: () => void;
}

interface ShopItem {
  id: string;
  kind: 'emoji' | 'color';
  value: string;
  name: string;
  cost: number;
  rarity: string;
  owned: boolean;
}

const RARITY_STYLE: Record<string, string> = {
  common: 'border-gray-600 text-gray-300',
  uncommon: 'border-green-600 text-green-300',
  rare: 'border-blue-500 text-blue-300',
  epic: 'border-purple-500 text-purple-300',
  legendary: 'border-yellow-400 text-yellow-300',
};

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const [tab, setTab] = useState<'profile' | 'shop'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [inventory, setInventory] = useState<Array<{ kind: string; value: string }>>([]);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [points, setPoints] = useState(0);
  const [buying, setBuying] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🎮');
  const [bio, setBio] = useState('');
  const [nameColor, setNameColor] = useState('#a78bfa');

  const refresh = useCallback(async () => {
    const [me, shop] = await Promise.all([apiMe(), apiShopList()]);
    const a = me?.account;
    if (a) {
      setAccount(a);
      setDisplayName(a.display_name || '');
      setAvatarEmoji(a.avatar_emoji || '🎮');
      setBio(a.bio || '');
      setNameColor(a.name_color || '#a78bfa');
      setPoints(a.points || 0);
    }
    setInventory(me?.inventory || []);
    setItems(shop?.items || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const ownedEmojis = inventory.filter(i => i.kind === 'emoji').map(i => i.value);
  const ownedColors = inventory.filter(i => i.kind === 'color').map(i => i.value);

  const flash = (text: string, tone: 'ok' | 'err' = 'ok') => {
    setMsg({ text, tone });
    setTimeout(() => setMsg(null), 2500);
  };

  const save = async () => {
    setSaving(true);
    const res = await apiUpdateProfile({ display_name: displayName, avatar_emoji: avatarEmoji, bio, name_color: nameColor });
    setSaving(false);
    if (res?.ok) flash('Saved');
    else flash(res?.error || 'Failed to save', 'err');
  };

  const buy = async (item: ShopItem) => {
    if (item.owned || buying) return;
    if (points < item.cost) return flash('Not enough points', 'err');
    setBuying(item.id);
    const res = await apiShopBuy(item.id);
    setBuying(null);
    if (res?.success) {
      flash(`Unlocked ${item.name}!`);
      refresh();
    } else {
      flash(res?.error || 'Purchase failed', 'err');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Your Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="flex gap-2 mb-4 border-b border-gray-800 pb-3">
          <button onClick={() => setTab('profile')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${tab === 'profile' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            ✨ Profile
          </button>
          <button onClick={() => setTab('shop')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${tab === 'shop' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            🛒 Shop · {points} pts
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : !account ? (
          <div className="py-12 text-center text-red-400">Failed to load profile</div>
        ) : tab === 'profile' ? (
          <div className="space-y-5">
            {/* Preview */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gray-700 flex items-center justify-center text-3xl">{avatarEmoji}</div>
              <div className="min-w-0">
                <div className="font-bold text-lg truncate" style={{ color: nameColor }}>
                  {displayName || account.username || 'Player'}
                </div>
                <div className="text-xs text-gray-500">@{account.username || '—'}</div>
                {bio && <div className="text-xs text-gray-400 mt-1 line-clamp-2">{bio}</div>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-800/40 rounded-lg p-2">
                <div className="text-lg font-bold text-yellow-400">{account.points || 0}</div>
                <div className="text-[10px] uppercase text-gray-500">Points</div>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2">
                <div className="text-lg font-bold text-orange-400">{account.streak_days || 0}🔥</div>
                <div className="text-[10px] uppercase text-gray-500">Streak</div>
              </div>
              <div className="bg-gray-800/40 rounded-lg p-2">
                <div className="text-lg font-bold text-blue-400">{account.chat_count || 0}</div>
                <div className="text-[10px] uppercase text-gray-500">Chats</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={32}
                placeholder={account.username || 'Display name'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase text-gray-400">Avatar · owned ({ownedEmojis.length})</label>
                <button onClick={() => setTab('shop')} className="text-[10px] text-yellow-400 hover:underline">Buy more →</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ownedEmojis.length === 0 && <p className="text-xs text-gray-500">No avatars yet. Visit the shop.</p>}
                {ownedEmojis.map(e => (
                  <button key={e} onClick={() => setAvatarEmoji(e)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition ${
                      avatarEmoji === e ? 'border-purple-500 bg-purple-500/20' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}>{e}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase text-gray-400">Name Color · owned ({ownedColors.length})</label>
                <button onClick={() => setTab('shop')} className="text-[10px] text-yellow-400 hover:underline">Buy more →</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ownedColors.map(c => (
                  <button key={c} onClick={() => setNameColor(c)}
                    className={`w-10 h-10 rounded-lg border-2 transition ${nameColor === c ? 'border-white scale-110' : 'border-gray-700 hover:border-gray-500'}`}
                    style={{ backgroundColor: c }} aria-label={c} />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={3}
                placeholder="Something about you (max 200 chars)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-purple-500" />
              <div className="text-[10px] text-gray-500 mt-1 text-right">{bio.length}/200</div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button onClick={save} disabled={saving}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm">
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          // SHOP TAB
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-700/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-300">{points} pts</div>
              <div className="text-[10px] uppercase text-gray-400">your balance</div>
            </div>

            {(['emoji','color'] as const).map(kind => (
              <div key={kind}>
                <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">
                  {kind === 'emoji' ? '🎭 Avatar Icons' : '🎨 Name Colors'}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {items.filter(i => i.kind === kind).map(item => {
                    const cls = RARITY_STYLE[item.rarity] || RARITY_STYLE.common;
                    const canBuy = !item.owned && points >= item.cost;
                    return (
                      <button key={item.id} onClick={() => buy(item)} disabled={item.owned || buying === item.id || !canBuy}
                        className={`p-2 rounded-lg border-2 ${cls} bg-gray-800/40 hover:bg-gray-800 transition text-left disabled:opacity-50 disabled:cursor-not-allowed`}>
                        <div className="flex items-center justify-center h-10 mb-1">
                          {kind === 'emoji'
                            ? <span className="text-2xl">{item.value}</span>
                            : <span className="block w-8 h-8 rounded-full border border-white/20" style={{ backgroundColor: item.value }} />}
                        </div>
                        <div className="text-[10px] font-bold truncate">{item.name}</div>
                        <div className="text-[10px] uppercase tracking-wider opacity-70">{item.rarity}</div>
                        <div className="text-[10px] font-mono mt-0.5">
                          {item.owned ? <span className="text-green-400">✓ owned</span>
                            : buying === item.id ? <span className="text-yellow-300">…</span>
                            : <span className={canBuy ? 'text-yellow-300' : 'text-red-400'}>{item.cost} pts</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {msg && (
          <p className={`text-xs text-center mt-3 ${msg.tone === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
