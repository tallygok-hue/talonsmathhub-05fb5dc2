import { useEffect, useRef, useState, useCallback } from 'react';
import { apiGetChat, apiSendChat, apiDeleteChat, apiModTimeoutUser, apiModAdjustPoints, apiAdminSetRole, apiMe } from '../lib/api';

interface ChatMsg {
  id: string;
  account_id: string | null;
  username: string;
  message: string;
  is_admin: boolean;
  role?: string;
  avatar_emoji?: string | null;
  name_color?: string | null;
  created_at: string;
}

interface Props {
  username: string;
  isAdmin: boolean;
  isMod?: boolean;
}

const TIMEOUT_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '1 h', minutes: 60 },
  { label: '24 h', minutes: 60 * 24 },
];

export function ChatPanel({ username, isAdmin, isMod = false }: Props) {
  const canModerate = isAdmin || isMod;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState<{ msgId: string; accountId: string; username: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const r = await apiGetChat();
    if (r?.messages) {
      setMessages(prev => {
        if (!open && r.messages.length > prev.length) {
          const added = r.messages.slice(prev.length).filter((m: ChatMsg) => m.username !== username).length;
          if (added > 0) setUnread(u => u + added);
        }
        return r.messages;
      });
    }
  }, [open, username]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => { refresh(); }, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    }
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    const r = await apiSendChat(text);
    setSending(false);
    if (r?.error) setInput(text);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await apiDeleteChat(id);
    setMenu(null);
    refresh();
  };

  const timeout = async (accountId: string, minutes: number, label: string) => {
    if (!confirm(`Timeout this user for ${label}?`)) return;
    const r = await apiModTimeoutUser(accountId, minutes);
    setMenu(null);
    if (r?.error) alert(r.error);
  };

  const suspend = async (accountId: string) => {
    if (!confirm('Suspend this user from chat indefinitely?')) return;
    // ~10 years
    const r = await apiModTimeoutUser(accountId, 60 * 24 * 365 * 10);
    setMenu(null);
    if (r?.error) alert(r.error);
  };

  const tipPoints = async (accountId: string) => {
    const amt = prompt(isAdmin ? 'Adjust points by (negative to take):' : 'Adjust points by (-100 to +100):');
    if (!amt) return;
    const n = parseInt(amt, 10);
    if (isNaN(n)) return;
    const r = await apiModAdjustPoints(accountId, n);
    setMenu(null);
    if (r?.error) alert(r.error);
  };

  const promoteMod = async (accountId: string) => {
    if (!confirm('Promote this user to Moderator?')) return;
    await apiAdminSetRole(accountId, 'moderator');
    setMenu(null);
  };
  const demote = async (accountId: string) => {
    if (!confirm('Demote this user to regular user?')) return;
    await apiAdminSetRole(accountId, 'user');
    setMenu(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-gradient-to-br from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 text-white rounded-full shadow-2xl px-4 py-3 flex items-center gap-2 font-semibold text-sm border border-pink-400/30"
        title="Open chat"
      >
        💬 Chat
        {unread > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="px-3 py-2 bg-gradient-to-r from-pink-700 to-purple-700 flex items-center justify-between">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          💬 Live Chat
          <span className="text-[10px] font-normal text-pink-100/80">· {messages.length} msgs</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none px-1">×</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-950 relative">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-8">No messages yet. Say hi! 👋</p>
        )}
        {messages.map(m => {
          const mine = m.username === username;
          const role = m.role || (m.is_admin ? 'admin' : 'user');
          const isModBadge = role === 'moderator';
          const isAdminBadge = role === 'admin';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-1.5 ${mine ? 'bg-pink-600 text-white' : isAdminBadge ? 'bg-yellow-700/40 border border-yellow-600/40 text-yellow-100' : isModBadge ? 'bg-emerald-700/30 border border-emerald-600/40 text-emerald-50' : 'bg-gray-800 text-gray-100'}`}>
                {!mine && (
                  <div className="text-[10px] font-bold mb-0.5 flex items-center gap-1" style={m.name_color ? { color: m.name_color } : { color: '#f9a8d4' }}>
                    {m.avatar_emoji && <span className="text-sm">{m.avatar_emoji}</span>}
                    <button
                      disabled={!canModerate || !m.account_id}
                      onClick={() => canModerate && m.account_id && setMenu({ msgId: m.id, accountId: m.account_id, username: m.username })}
                      className={canModerate ? 'hover:underline cursor-pointer' : 'cursor-default'}
                    >
                      {m.username}
                    </button>
                    {isAdminBadge && <span className="text-yellow-400" title="Admin">👑</span>}
                    {isModBadge && <span className="text-emerald-400" title="Moderator">🛡️</span>}
                  </div>
                )}
                <div className="text-sm break-words whitespace-pre-wrap">{m.message}</div>
                <div className="text-[9px] opacity-60 mt-0.5 flex items-center justify-end gap-1.5">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {canModerate && (
                    <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-300" title="Delete">🗑️</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Moderation menu */}
        {menu && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-3 z-10" onClick={() => setMenu(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-xs" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-white truncate">Moderate @{menu.username}</div>
                <button onClick={() => setMenu(null)} className="text-gray-500 hover:text-white">×</button>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase text-gray-500">Timeout</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIMEOUT_OPTIONS.map(t => (
                    <button key={t.minutes} onClick={() => timeout(menu.accountId, t.minutes, t.label)}
                      className="px-2 py-1.5 bg-orange-900/30 hover:bg-orange-700 text-orange-200 rounded text-xs font-bold border border-orange-800/40">
                      {t.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => timeout(menu.accountId, 0, 'remove timeout')}
                  className="w-full px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs">
                  ✓ Remove timeout
                </button>
                <button onClick={() => suspend(menu.accountId)}
                  className="w-full px-2 py-1.5 bg-red-900/40 hover:bg-red-700 text-red-200 rounded text-xs font-bold border border-red-800/40">
                  🚫 Suspend (long)
                </button>
                <button onClick={() => tipPoints(menu.accountId)}
                  className="w-full px-2 py-1.5 bg-yellow-900/30 hover:bg-yellow-700 text-yellow-200 rounded text-xs font-bold border border-yellow-800/40">
                  💰 Adjust points
                </button>
                <button onClick={() => remove(menu.msgId)}
                  className="w-full px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs">
                  🗑️ Delete this message
                </button>
                {isAdmin && (
                  <div className="pt-2 border-t border-gray-800 space-y-1.5">
                    <div className="text-[10px] uppercase text-gray-500">Admin only</div>
                    <button onClick={() => promoteMod(menu.accountId)}
                      className="w-full px-2 py-1.5 bg-emerald-900/30 hover:bg-emerald-700 text-emerald-200 rounded text-xs font-bold border border-emerald-800/40">
                      🛡️ Promote to Moderator
                    </button>
                    <button onClick={() => demote(menu.accountId)}
                      className="w-full px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs">
                      Demote to User
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-2 bg-gray-900 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          maxLength={500}
          placeholder="Type a message…"
          className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-pink-500 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg px-3 text-sm font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}
