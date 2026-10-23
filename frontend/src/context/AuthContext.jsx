import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import { initialMockUsers } from '../services/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('collab_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we have token but no user, try restoring from backend
    async function restoreSession() {
      if (token && !user) {
        try {
          const res = await authService.getMe();
          if (res && res.user) {
            setUser(res.user);
            localStorage.setItem('collab_user', JSON.stringify(res.user));
          }
        } catch {
          // Keep current state
        }
      }
    }
    restoreSession();
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('token', data.token);
    localStorage.setItem('collab_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  /**
   * One-click demo login for offline visual preview and fast evaluator role switching
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
  const isAdmin = role === 'Admin';
  const isProjectManager = role === 'Project Manager';
  const isTeamMember = role === 'Team Member';
  const isViewer = role === 'Viewer';

  const value = {
    user,
    token,
    loading,
    login,
    previewLogin,
    logout,
    role,
    isAdmin,
    isProjectManager,
    isTeamMember,
    isViewer
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
