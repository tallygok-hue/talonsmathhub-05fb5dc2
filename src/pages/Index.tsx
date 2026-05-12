import { useState, useEffect, useCallback } from 'react';
import { MathHome } from '../components/MathHome';
import { SecretLogin } from '../components/SecretLogin';
import { GamePortal } from '../components/GamePortal';
import { AdminPanel } from '../components/AdminPanel';
import { apiLogin, apiValidateSession, apiLogout, apiLogoutBeacon, getSessionToken, clearSessionToken } from '../lib/api';
import { supabase } from '../integrations/supabase/client';

export type AppView = 'math' | 'login' | 'games' | 'admin';

const Index = () => {
  const [view, setView] = useState<AppView>('math');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [loading, setLoading] = useState(true);

  // Restore session on load
  useEffect(() => {
    const restore = async () => {
      const token = getSessionToken();
      if (token) {
        try {
          const result = await apiValidateSession();
          if (result.valid) {
            setIsAuthenticated(true);
            setCurrentUser(result.username);
            setIsAdmin(result.isAdmin);
          } else {
            clearSessionToken();
          }
        } catch {
          clearSessionToken();
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  // Listen for realtime session deletions (kicked by admin or code removed)
  useEffect(() => {
    const token = getSessionToken();
    if (!token || !isAuthenticated) return;

    const channel = supabase
      .channel('session-monitor')
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'active_sessions',
      }, () => {
        // Re-validate our session
        apiValidateSession().then(result => {
          if (!result.valid) {
            setIsAuthenticated(false);
            setIsAdmin(false);
            setCurrentUser('');
            setView('math');
            clearSessionToken();
          }
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  // Auto-end session when leaving / closing the tab so codes free up immediately
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = () => apiLogoutBeacon();
    window.addEventListener('pagehide', handler);
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('pagehide', handler);
      window.removeEventListener('beforeunload', handler);
    };
  }, [isAuthenticated]);

  const handleLogin = useCallback(async (username: string, code: string): Promise<{ success: boolean; isAdmin: boolean; message: string }> => {
    try {
      const result = await apiLogin(username, code);
      if (result.success) {
        setIsAuthenticated(true);
        setCurrentUser(username);
        setIsAdmin(result.isAdmin);
      }
      return { success: result.success, isAdmin: result.isAdmin || false, message: result.message };
    } catch {
      return { success: false, isAdmin: false, message: 'Connection error. Try again.' };
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser('');
    setView('math');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {view === 'math' && <MathHome onSecretAccess={() => setView('login')} isAuthenticated={isAuthenticated} onGoToGames={() => setView('games')} />}
      {view === 'login' && <SecretLogin onLogin={handleLogin} onBack={() => setView('math')} onSuccess={(admin: boolean) => setView(admin ? 'admin' : 'games')} />}
      {view === 'games' && isAuthenticated && <GamePortal username={currentUser} isAdmin={isAdmin} onLogout={handleLogout} onAdminPanel={() => setView('admin')} />}
      {view === 'admin' && isAdmin && <AdminPanel onBack={() => setView('games')} onLogout={handleLogout} />}
    </div>
  );
};

export default Index;
