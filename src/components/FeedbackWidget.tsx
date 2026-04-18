import { useState, useEffect, useCallback } from 'react';
import { apiSubmitRequest, apiGetMyRequests, apiMarkNotified, getCodeId } from '../lib/api';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface MyRequest {
  id: string;
  category: string;
  message: string;
  status: 'pending' | 'accepted' | 'denied';
  admin_response: string | null;
  notified: boolean;
  created_at: string;
  responded_at: string | null;
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<'request' | 'complaint' | 'comment'>('request');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [tab, setTab] = useState<'new' | 'mine'>('new');

  const refresh = useCallback(async () => {
    const r = await apiGetMyRequests();
    if (r?.requests) setMyRequests(r.requests);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: notify on status changes for my code
  useEffect(() => {
    const codeId = getCodeId();
    if (!codeId) return;

    const channel = supabase
      .channel('user-requests-notify')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_requests',
        filter: `code_id=eq.${codeId}`,
      }, (payload) => {
        const next = payload.new as MyRequest;
        const prev = payload.old as MyRequest;
        if (next.status !== prev.status && !next.notified) {
          if (next.status === 'accepted') {
            toast.success(`✅ Your ${next.category} was accepted!`, {
              description: next.admin_response || next.message.slice(0, 80),
              duration: 8000,
            });
          } else if (next.status === 'denied') {
            toast.error(`❌ Your ${next.category} was denied`, {
              description: next.admin_response || next.message.slice(0, 80),
              duration: 8000,
            });
          }
          apiMarkNotified(next.id);
        }
        refresh();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_requests',
        filter: `code_id=eq.${codeId}`,
      }, () => refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    const result = await apiSubmitRequest(category, message.trim());
    setSubmitting(false);
    if (result?.success) {
      toast.success('Sent! Admin will review it soon.');
      setMessage('');
      setTab('mine');
      refresh();
    } else {
      toast.error(result?.error || 'Failed to send');
    }
  };

  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-gradient-to-br from-pink-600 to-purple-700 text-white rounded-full shadow-lg shadow-pink-900/50 hover:scale-110 transition-transform p-3 flex items-center gap-2 text-sm font-bold"
        title="Send feedback / request"
      >
        💬 Feedback
        {pendingCount > 0 && (
          <span className="bg-yellow-400 text-gray-900 text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">💬 Comments, Complaints & Requests</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setTab('new')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'new' ? 'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                ✏️ New
              </button>
              <button
                onClick={() => setTab('mine')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'mine' ? 'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                📬 Mine ({myRequests.length})
              </button>
            </div>

            {tab === 'new' ? (
              <div className="p-4 space-y-3 overflow-y-auto">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['request', 'complaint', 'comment'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
                          category === c
                            ? c === 'request' ? 'bg-blue-600 text-white'
                            : c === 'complaint' ? 'bg-red-600 text-white'
                            : 'bg-emerald-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {c === 'request' ? '🎮 Request' : c === 'complaint' ? '⚠️ Complaint' : '💭 Comment'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    maxLength={2000}
                    rows={5}
                    placeholder={
                      category === 'request' ? 'e.g. Can you add Bloons TD 6 to the games hub?' :
                      category === 'complaint' ? 'Tell us what went wrong...' :
                      'Share a thought, idea, or shoutout...'
                    }
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 resize-none"
                  />
                  <p className="text-[10px] text-gray-600 mt-1 text-right">{message.length}/2000</p>
                </div>
                <button
                  onClick={submit}
                  disabled={!message.trim() || submitting}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-30 transition-opacity"
                >
                  {submitting ? 'Sending...' : '📤 Send to Admin'}
                </button>
                <p className="text-[10px] text-gray-600 text-center">You'll get a notification when an admin responds.</p>
              </div>
            ) : (
              <div className="overflow-y-auto p-3 space-y-2">
                {myRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    <div className="text-4xl mb-2">📭</div>
                    No requests yet. Hit "New" to send one!
                  </div>
                ) : (
                  myRequests.map(r => (
                    <div key={r.id} className={`rounded-lg p-3 border ${
                      r.status === 'accepted' ? 'bg-emerald-900/20 border-emerald-700/40' :
                      r.status === 'denied' ? 'bg-red-900/20 border-red-700/40' :
                      'bg-gray-800/60 border-gray-700/50'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-900/60 text-gray-300">{r.category}</span>
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                            r.status === 'accepted' ? 'bg-emerald-500 text-emerald-950' :
                            r.status === 'denied' ? 'bg-red-500 text-red-950' :
                            'bg-yellow-500 text-yellow-950'
                          }`}>
                            {r.status === 'accepted' ? '✓ Accepted' : r.status === 'denied' ? '✗ Denied' : '⏳ Pending'}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{r.message}</p>
                      {r.admin_response && (
                        <div className="mt-2 pt-2 border-t border-gray-700/40">
                          <p className="text-[10px] text-gray-500 mb-0.5 font-bold">ADMIN RESPONSE:</p>
                          <p className="text-xs text-gray-300 whitespace-pre-wrap break-words">{r.admin_response}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
