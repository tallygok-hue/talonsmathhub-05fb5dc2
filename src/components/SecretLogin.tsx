import { useState } from 'react';

interface LoginResult {
  success: boolean;
  isAdmin: boolean;
  message: string;
  mustSetUsername?: boolean;
  username?: string | null;
}

interface SecretLoginProps {
  onLogin: (username: string, code: string) => Promise<LoginResult>;
  onBack: () => void;
  onSuccess: (admin: boolean, mustSetUsername: boolean) => void;
}

export function SecretLogin({ onLogin, onBack, onSuccess }: SecretLoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    if (loading) return;
    if (!identifier.trim() || !secret.trim()) {
      setMessage('Enter a username and access code.');
      return;
    }

    setLoading(true);
    setMessage('');
    const result = await onLogin(identifier.trim(), secret.trim());
    setLoading(false);

    if (!result.success) {
      setMessage(result.message || 'Login failed.');
      return;
    }

    onSuccess(result.isAdmin, !!result.mustSetUsername);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6">← Back to math</button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-3xl mb-3">π</div>
          <h1 className="text-2xl font-black">Login</h1>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Username</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="username"
              className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Access Code</label>
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitLogin(); }}
              type="password"
              placeholder="access code"
              className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {message && <p className="mt-4 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">{message}</p>}

        <button
          onClick={submitLogin}
          disabled={loading}
          className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-xl font-bold transition-colors"
        >
          {loading ? 'Working…' : 'Login'}
        </button>
      </div>
    </div>
  );
}
