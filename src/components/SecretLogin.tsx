import { useState } from 'react';
import { apiSetUsername } from '../lib/api';

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
  onSuccess: (admin: boolean) => void;
}

export function SecretLogin({ onLogin, onBack, onSuccess }: SecretLoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [needsUsername, setNeedsUsername] = useState(false);
  const [pendingAdmin, setPendingAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    if (loading) return;
    if (!secret.trim()) {
      setMessage('Enter your code or password.');
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

    if (result.mustSetUsername) {
      setPendingAdmin(result.isAdmin);
      setNeedsUsername(true);
      setMessage('First login — pick a permanent username.');
      return;
    }

    onSuccess(result.isAdmin);
  };

  const finishUsername = async () => {
    if (loading) return;
    const cleanName = newUsername.trim();
    if (!cleanName) {
      setMessage('Enter a username.');
      return;
    }

    setLoading(true);
    const result = await apiSetUsername(cleanName);
    setLoading(false);

    if (!result.success) {
      setMessage(result.message || result.error || 'Could not set username.');
      return;
    }

    sessionStorage.setItem('tmh_user', cleanName);
    onSuccess(pendingAdmin);
  };

  if (needsUsername) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6">← Back</button>
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center text-3xl mb-3">👤</div>
            <h1 className="text-2xl font-black">Choose Username</h1>
            <p className="text-gray-400 text-sm mt-2">This name will show in chat and on your account.</p>
          </div>
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') finishUsername(); }}
            placeholder="username"
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {message && <p className="mt-3 text-sm text-yellow-300">{message}</p>}
          <button
            onClick={finishUsername}
            disabled={loading}
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-xl font-bold"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6">← Back to math</button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-3xl mb-3">π</div>
          <h1 className="text-2xl font-black">Login to Account</h1>
          <p className="text-gray-500 text-xs mt-2 leading-relaxed">
            If this is your first login, enter your access code only — you'll then create a permanent username.
            Returning users: enter your username and password. Contact admin for help.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Username <span className="text-gray-600 normal-case font-normal">(leave blank if using code)</span></label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="username"
              className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Code or Password</label>
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitLogin(); }}
              type="password"
              placeholder="access code or password"
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
