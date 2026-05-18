import { useState, useEffect, useCallback, useRef } from 'react';
import { apiToggleFav, apiGetFavs, apiGetRecent, apiAddRecent, apiTrackPlay, getCodeId } from '../lib/api';
import { supabase } from '../integrations/supabase/client';

import { FeedbackWidget } from './FeedbackWidget';
import { ChatPanel } from './ChatPanel';
import { PollsPanel } from './PollsPanel';
import { ProfilePanel } from './ProfilePanel';
import { PermUsernameModal } from './PermUsernameModal';
import { useActivityTracker } from '../lib/useActivityTracker';

interface GamePortalProps {
  username: string;
  isAdmin: boolean;
  onLogout: () => void;
  onAdminPanel: () => void;
  mustSetUsername?: boolean;
  onUsernameSet?: (name: string) => void;
}

interface Game {
  id: string;
  name: string;
  icon: string;
  url: string;
  color?: string;
  category?: string;
  description?: string;
}

interface RecentGame {
  id: string;
  name: string;
  icon?: string;
  url?: string;
  ts?: number;
}

// Lookup catalog (favorites/recents reference these IDs); curated grid UI is gone
const GAME_CATALOG: Record<string, Game> = {
  slope: { id: 'slope', name: 'Slope', icon: '🎿', url: 'https://slope-game.github.io/', color: 'from-green-500 to-emerald-600' },
  retrobowl: { id: 'retrobowl', name: 'Retro Bowl', icon: '🏈', url: 'https://retrobowl.me/', color: 'from-amber-500 to-orange-600' },
  cookieclicker: { id: 'cookieclicker', name: 'Cookie Clicker', icon: '🍪', url: 'https://orteil.dashnet.org/cookieclicker/', color: 'from-amber-400 to-yellow-500' },
  '1v1lol': { id: '1v1lol', name: '1v1.LOL', icon: '🔫', url: 'https://1v1lol.com/', color: 'from-red-500 to-rose-600' },
  geometrydash: { id: 'geometrydash', name: 'Geometry Dash', icon: '🔷', url: 'https://geometrydash.io/', color: 'from-blue-600 to-indigo-700' },
  smashkarts: { id: 'smashkarts', name: 'Smash Karts', icon: '🏎️', url: 'https://smashkarts.io/', color: 'from-green-400 to-teal-500' },
  krunker: { id: 'krunker', name: 'Krunker.io', icon: '🎯', url: 'https://krunker.io/', color: 'from-blue-600 to-blue-800' },
  agario: { id: 'agario', name: 'Agar.io', icon: '⭕', url: 'https://agar.io/', color: 'from-teal-500 to-cyan-600' },
  flappy: { id: 'flappy', name: 'Flappy Bird', icon: '🐦', url: 'https://flappybird.io/', color: 'from-green-400 to-cyan-500' },
  chromedino: { id: 'chromedino', name: 'Chrome Dino', icon: '🦕', url: 'https://chromedino.com/', color: 'from-gray-500 to-gray-700' },
  minecraftclassic: { id: 'minecraftclassic', name: 'Minecraft Classic', icon: '⛏️', url: 'https://classic.minecraft.net/', color: 'from-green-700 to-lime-600' },
  garticphone: { id: 'garticphone', name: 'Gartic Phone', icon: '📞', url: 'https://garticphone.com/', color: 'from-orange-400 to-pink-500' },
};

export function GamePortal({ username, isAdmin, onLogout, onAdminPanel, mustSetUsername, onUsernameSet }: GamePortalProps) {
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const iframeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentGame[]>([]);
  
  const [luminLoading, setLuminLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Load favs + recent from cloud
  const refreshAccount = useCallback(async () => {
    const [f, r] = await Promise.all([apiGetFavs(), apiGetRecent()]);
    if (f?.favorites) setFavorites(f.favorites);
    if (r?.recent) setRecent(r.recent);
  }, []);
  useEffect(() => { refreshAccount(); }, [refreshAccount]);

  // Realtime sync favs across devices
  useEffect(() => {
    const codeId = getCodeId();
    if (!codeId) return;
    const ch = supabase.channel('account-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'code_favorites' }, () => refreshAccount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'code_progress' }, () => refreshAccount())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refreshAccount]);

  useEffect(() => {
    setIframeError(false);
    setIframeLoading(true);
    setRetryCount(0);
    if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current);
    if (activeGame) {
      iframeTimeoutRef.current = setTimeout(() => setIframeLoading(false), 15000);
    }
    return () => { if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current); };
  }, [activeGame, retryCount]);

  const toggleFav = useCallback(async (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    await apiToggleFav(id);
  }, []);

  const openGame = (game: Game) => {
    setActiveGame(game);
    apiAddRecent({ id: game.id, name: game.name, icon: game.icon, url: game.url });
    apiTrackPlay(game.id, game.name);
  };

  // Live activity + screenshots for admin monitoring
  useActivityTracker({
    enabled: true,
    view: activeGame ? 'game' : 'hub',
    game: activeGame?.name || null,
  });

  

  // Active game iframe overlay
  if (activeGame) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="bg-gray-900 px-3 py-2 flex items-center justify-between border-b border-gray-800 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setActiveGame(null)} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm font-medium shrink-0">← Back</button>
            <span className="text-xl shrink-0">{activeGame.icon}</span>
            <span className="text-white font-semibold hidden sm:inline truncate">{activeGame.name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => toggleFav(activeGame.id)} className="p-2 hover:bg-gray-800 rounded-lg text-lg" title="Favorite">
              {favorites.includes(activeGame.id) ? '⭐' : '☆'}
            </button>
            <a href={activeGame.url} target="_blank" rel="noopener noreferrer"
              className="px-2 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-600 text-xs font-bold">↗ New Tab</a>
            <button onClick={onLogout} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold" title="Quick Exit">🚨</button>
          </div>
        </div>
        {iframeError ? (
          <div className="flex-1 flex items-center justify-center bg-gray-950">
            <div className="text-center p-8 max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-white mb-2">Game Failed to Load</h3>
              <p className="text-gray-600 text-xs mb-6 font-mono break-all">{activeGame.url}</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => { setIframeError(false); setIframeLoading(true); setRetryCount(c => c + 1); }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700">🔄 Retry</button>
                <a href={activeGame.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">🎮 Open in New Tab ↗</a>
                <button onClick={() => setActiveGame(null)} className="px-6 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700">Back</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            {iframeLoading && (
              <div className="absolute inset-0 bg-gray-950 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400 text-sm">Loading {activeGame.name}…</p>
                </div>
              </div>
            )}
            <iframe key={`game-${retryCount}`} id="game-frame" src={activeGame.url}
              className="w-full h-full border-0 absolute inset-0"
              allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope; microphone; camera"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox allow-downloads"
              referrerPolicy="no-referrer"
              onLoad={() => { setIframeLoading(false); if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current); }}
              onError={() => setIframeError(true)}
              title={activeGame.name} />
          </div>
        )}
      </div>
    );
  }

  // Resolve favorites/recents to game objects
  const favGames: Game[] = favorites.map(id => GAME_CATALOG[id] || (recent.find(r => r.id === id) ? {
    id, name: recent.find(r => r.id === id)!.name, icon: recent.find(r => r.id === id)!.icon || '🎮',
    url: recent.find(r => r.id === id)!.url || '#',
  } : null)).filter(Boolean) as Game[];
  const recentGames: Game[] = recent.slice(0, 12).map(r => ({
    id: r.id, name: r.name, icon: r.icon || '🎮', url: r.url || '#',
  }));

  // Default landing: full-screen Lumin Games Hub (700+ games)
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center text-lg shrink-0">🎮</div>
            <div className="min-w-0">
              <h1 className="text-base font-bold">🎮 Games Hub</h1>
              <p className="text-xs text-gray-500 truncate">{username} · 700+ games · ☁️ Account synced</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button onClick={() => setProfileOpen(true)} className="px-3 py-2 bg-purple-600/20 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-600/30 border border-purple-600/30">
              ✨ Profile
            </button>
            <button onClick={() => setAccountOpen(v => !v)} className="px-3 py-2 bg-blue-600/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-600/30 border border-blue-600/30">
              👤 Account ({favGames.length}⭐ · {recentGames.length}🕒)
            </button>
            
            {isAdmin && (
              <button onClick={onAdminPanel} className="px-3 py-2 bg-yellow-600/20 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-600/30 border border-yellow-600/30">⚙️ Admin</button>
            )}
            <button onClick={onLogout} className="px-3 py-2 bg-red-900/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-900/50 border border-red-800/30" title="Exit">🚨 Exit</button>
          </div>
        </div>

        {/* Account drawer: favorites + recently played */}
        {accountOpen && (favGames.length > 0 || recentGames.length > 0) && (
          <div className="border-t border-gray-800 bg-gray-900/60 max-w-7xl mx-auto px-4 py-3 space-y-3">
            {favGames.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-bold text-yellow-400 mb-1.5">⭐ Favorites</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {favGames.map(g => (
                    <button key={g.id} onClick={() => openGame(g)}
                      className="bg-gray-800 hover:bg-gray-700 border border-yellow-600/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shrink-0 text-xs whitespace-nowrap">
                      <span>{g.icon}</span><span>{g.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {recentGames.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-1.5">🕒 Recently Played</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recentGames.map(g => (
                    <button key={g.id + (g as any).ts} onClick={() => openGame(g)}
                      className="bg-gray-800 hover:bg-gray-700 border border-blue-600/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shrink-0 text-xs whitespace-nowrap">
                      <span>{g.icon}</span><span>{g.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {favGames.length === 0 && recentGames.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-2">No favorites or recent games yet — play something below!</p>
            )}
          </div>
        )}
      </header>

      <PollsPanel />

      <div className="flex-1 relative">

        {luminLoading && (
          <div className="absolute inset-0 bg-gray-950 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Loading 700+ games…</p>
            </div>
          </div>
        )}
        <iframe
          src="/games/lumin.html"
          title="Games Hub"
          className="w-full h-full absolute inset-0"
          style={{ border: 'none', minHeight: 'calc(100vh - 64px)' }}
          allow="autoplay; fullscreen; gamepad; keyboard-focus"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="no-referrer"
          onLoad={() => setLuminLoading(false)}
        />
      </div>
      <FeedbackWidget />
      <ChatPanel username={username} isAdmin={isAdmin} />
      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
