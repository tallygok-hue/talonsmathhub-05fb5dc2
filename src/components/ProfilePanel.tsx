import { useEffect, useState } from 'react';
import { apiMe, apiUpdateProfile } from '../lib/api';

const EMOJI_CHOICES = ['🎮','🎯','🚀','👾','🤖','👻','🦊','🐉','⚡','🔥','💀','🎲','🏆','💎','🌟','🦄','🐱','🐺','🦁','🐼'];
const COLOR_CHOICES = ['#a78bfa','#f472b6','#60a5fa','#34d399','#fbbf24','#f87171','#fb923c','#22d3ee','#e879f9','#a3e635'];

interface ProfilePanelProps {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🎮');
  const [bio, setBio] = useState('');
  const [nameColor, setNameColor] = useState('#a78bfa');

  useEffect(() => {
    apiMe().then(res => {
      const a = res?.account;
      if (a) {
        setAccount(a);
        setDisplayName(a.display_name || '');
        setAvatarEmoji(a.avatar_emoji || '🎮');
        setBio(a.bio || '');
        setNameColor(a.name_color || '#a78bfa');
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await apiUpdateProfile({ display_name: displayName, avatar_emoji: avatarEmoji, bio, name_color: nameColor });
    setSaving(false);
    if (res?.ok) {
      setMsg('Saved');
      setTimeout(() => setMsg(null), 2000);
    } else {
      setMsg('Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Your Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : !account ? (
          <div className="py-12 text-center text-red-400">Failed to load profile</div>
        ) : (
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

            {/* Stats */}
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

            {/* Display name */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={32}
                placeholder={account.username || 'Display name'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
              <p className="text-[10px] text-gray-500 mt-1">Shown in chat. Leave blank to use your username.</p>
            </div>

            {/* Avatar emoji */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Avatar</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_CHOICES.map(e => (
                  <button key={e} onClick={() => setAvatarEmoji(e)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition ${
                      avatarEmoji === e ? 'border-purple-500 bg-purple-500/20' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}>{e}</button>
                ))}
              </div>
            </div>

            {/* Name color */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Name Color</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_CHOICES.map(c => (
                  <button key={c} onClick={() => setNameColor(c)}
                    className={`w-10 h-10 rounded-lg border-2 transition ${nameColor === c ? 'border-white scale-110' : 'border-gray-700 hover:border-gray-500'}`}
                    style={{ backgroundColor: c }} aria-label={c} />
                ))}
              </div>
            </div>

            {/* Bio */}
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
            {msg && <p className={`text-xs text-center ${msg === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
