import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session from backend on mount
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await authService.getMe();
        if (res && res.user) {
          setUser(res.user);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session verification failed:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, [token]);

  /**
   * Real login calling backend POST /api/auth/login
   */
  const login = async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  /**
   * Sign out: clear token & reset state
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const role = user ? user.role : null;

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    role,
    isAdmin: role === 'Admin',
    isProjectManager: role === 'Project Manager',
    isTeamMember: role === 'Team Member',
    isViewer: role === 'Viewer'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
