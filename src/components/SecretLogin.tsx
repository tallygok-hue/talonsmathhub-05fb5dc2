import { useState } from 'react';
import { apiRegister, apiSetUsername } from '../lib/api';

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

type Mode = 'code' | 'account' | 'register';

export function SecretLogin({ onLogin, onBack, onSuccess }: SecretLoginProps) {
  const [mode, setMode] = useState<Mode>('code');
  const [accessCode, setAccessCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [needsUsername, setNeedsUsername] = useState(false);
  const [pendingAdmin, setPendingAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    if (loading) return;
    const loginName = mode === 'code' ? '' : username.trim();
    const secret = mode === 'code' ? accessCode.trim() : password;
    if (!secret || (mode === 'account' && !loginName)) {
      setMessage('Enter your code or username and password.');
      return;
    }

    setLoading(true);
    setMessage('');
    const result = await onLogin(loginName, secret);
    setLoading(false);

    if (!result.success) {
      setMessage(result.message || 'Login failed.');
      return;
    }

    if (result.mustSetUsername) {
      setPendingAdmin(result.isAdmin);
      setNeedsUsername(true);
      setMessage('Pick your permanent username to finish login.');
      return;
    }

    onSuccess(result.isAdmin);
  };

  const submitRegister = async () => {
    if (loading) return;
    const cleanName = username.trim();
    if (!cleanName || password.length < 4) {
      setMessage('Username is required and password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setMessage('');
    const result = await apiRegister(cleanName, password);
    setLoading(false);

    if (!result.success) {
      setMessage(result.message || 'Could not create account.');
      return;
    }

    setMessage('Account created. Sign in now.');
    setMode('account');
    setConfirmPassword('');
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
          <h1 className="text-2xl font-black">Talons Access</h1>
          <p className="text-gray-400 text-sm mt-2">Sign in with an access code or your account.</p>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-gray-950 rounded-xl p-1 mb-5 border border-gray-800">
          {[
            ['code', 'Code'],
            ['account', 'Account'],
            ['register', 'New'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setMode(id as Mode); setMessage(''); }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'code' ? (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Access code</label>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitLogin(); }}
              type="password"
              placeholder="Enter your code"
              className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') mode === 'register' ? submitRegister() : submitLogin(); }}
                type="password"
                placeholder="password"
                className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Confirm password</label>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitRegister(); }}
                  type="password"
                  placeholder="confirm password"
                  className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {message && <p className="mt-4 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">{message}</p>}

        <button
          onClick={mode === 'register' ? submitRegister : submitLogin}
          disabled={loading}
          className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-xl font-bold transition-colors"
        >
          {loading ? 'Working…' : mode === 'register' ? 'Create Account' : 'Login'}
        </button>
      </div>
    </div>
  );
}
