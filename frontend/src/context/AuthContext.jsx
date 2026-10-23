import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { initialMockUsers } from '../services/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  // Start loading only if we have a stored token to verify
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      // Restore user from storage immediately so UI doesn't flash
      const storedUser = localStorage.getItem('collab_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore malformed storage
        }
      }

      // Attempt to validate with real backend
      try {
        const res = await authService.getMe();
        if (res && res.user) {
          setUser(res.user);
          localStorage.setItem('collab_user', JSON.stringify(res.user));
          // Real backend responded — disable mock mode
          localStorage.removeItem('collab_mock_mode');
        }
      } catch {
        // Backend offline — keep mock user from storage
        console.warn('[CollabWorkers] Backend offline. Using stored preview session.');
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  /**
   * Real JWT login — used when backend is running
   */
  const login = async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('collab_user', JSON.stringify(data.user));
    localStorage.removeItem('collab_mock_mode'); // disable mock mode on real login
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  /**
   * Instant preview login for offline/demo evaluation
   */
  const previewLogin = (roleName) => {
    const mockMatch = initialMockUsers.find((u) => u.role === roleName) || initialMockUsers[0];
    const mockToken = `mock-token-${mockMatch.role.toLowerCase().replace(' ', '-')}`;

    localStorage.setItem('token', mockToken);
    localStorage.setItem('collab_user', JSON.stringify(mockMatch));
    localStorage.setItem('collab_mock_mode', 'true');

    setToken(mockToken);
    setUser(mockMatch);
    return mockMatch;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('collab_user');
    localStorage.removeItem('collab_mock_mode');
    setToken(null);
    setUser(null);
  };

  const role = user ? user.role : null;

  const value = {
    user,
    token,
    loading,
    login,
    previewLogin,
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
