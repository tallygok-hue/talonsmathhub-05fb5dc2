import { useState } from 'react';
import { apiSetUsername } from '../lib/api';

interface Props {
  onComplete: (username: string) => void;
}

export function PermUsernameModal({ onComplete }: Props) {
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const proceed = () => {
    const clean = name.trim();
    if (clean.length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (clean.length > 20) { setError('Username must be 20 characters or fewer.'); return; }
    if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) { setError('Only letters, numbers, _ . - allowed.'); return; }
    setError('');
    setStep('confirm');
  };

  const confirm = async () => {
    if (loading) return;
    setLoading(true);
    const res = await apiSetUsername(name.trim());
    setLoading(false);
    if (!res.success) {
      setError(res.message || res.error || 'Could not set username.');
      setStep('pick');
      return;
    }
    sessionStorage.setItem('tmh_user', name.trim());
    onComplete(name.trim());
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-950 border border-blue-600/40 rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-600/40 mb-3">
            Official Account Integration
          </div>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl mb-3">🪪</div>
          <h1 className="text-2xl font-black text-white">
            {step === 'pick' ? 'Claim Your Username' : 'Confirm Username'}
          </h1>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed">
            {step === 'pick'
              ? 'Choose a permanent username. This will be locked to your access code forever — only an admin can change it.'
              : 'This username will be permanently linked to your code. Make sure it is correct.'}
          </p>
        </div>

        {step === 'pick' ? (
          <>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') proceed(); }}
              placeholder="your_permanent_name"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-lg text-center font-mono"
            />
            {error && <p className="mt-3 text-sm text-red-400 text-center">{error}</p>}
            <button
              onClick={proceed}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white"
            >
              Continue →
            </button>
            <p className="text-[11px] text-gray-600 text-center mt-3">This step cannot be skipped.</p>
          </>
        ) : (
          <>
            <div className="bg-gray-950 border border-blue-600/40 rounded-xl p-5 text-center mb-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Your permanent username</p>
              <p className="text-3xl font-black text-blue-300 font-mono">{name.trim()}</p>
            </div>
            {error && <p className="mb-3 text-sm text-red-400 text-center">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setStep('pick'); setError(''); }}
                disabled={loading}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-white"
              >
                ← Edit
              </button>
              <button
                onClick={confirm}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 rounded-xl font-bold text-white"
              >
                {loading ? 'Saving…' : '✓ Confirm'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
