import { useEffect, useRef, useState, useCallback } from 'react';
import { apiGetChat, apiSendChat, apiDeleteChat } from '../lib/api';
import { supabase } from '../integrations/supabase/client';

interface ChatMsg {
  id: string;
  username: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

interface Props {
  username: string;
  isAdmin: boolean;
}

export function ChatPanel({ username, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
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
    // Realtime is disabled for chat_messages (no public SELECT). Poll every 3s instead.
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
    <div className="fixed bottom-4 right-4 z-40 w-[340px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-6rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="px-3 py-2 bg-gradient-to-r from-pink-700 to-purple-700 flex items-center justify-between">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          💬 Live Chat
          <span className="text-[10px] font-normal text-pink-100/80">· {messages.length} msgs</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg leading-none px-1">×</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-950">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-8">No messages yet. Say hi! 👋</p>
        )}
        {messages.map(m => {
          const mine = m.username === username;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-1.5 ${mine ? 'bg-pink-600 text-white' : m.is_admin ? 'bg-yellow-700/40 border border-yellow-600/40 text-yellow-100' : 'bg-gray-800 text-gray-100'}`}>
                {!mine && (
                  <div className="text-[10px] font-bold text-pink-300 mb-0.5 flex items-center gap-1">
                    {m.username} {m.is_admin && <span className="text-yellow-400">👑</span>}
                  </div>
                )}
                <div className="text-sm break-words whitespace-pre-wrap">{m.message}</div>
                <div className="text-[9px] opacity-60 mt-0.5 flex items-center justify-end gap-1.5">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isAdmin && (
                    <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-300" title="Delete">🗑️</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
