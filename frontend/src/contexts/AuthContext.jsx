import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../modules/recipe/services/recipe.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ck_token');
    const savedUser = localStorage.getItem('ck_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('ck_token');
        localStorage.removeItem('ck_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('ck_token', data.token);
    localStorage.setItem('ck_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ck_token');
    localStorage.removeItem('ck_user');
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles) => user && roles.includes(user.role),
    [user]
  );

  const canEdit = useCallback(
    () => hasRole('ADMIN', 'OPS_MANAGER'),
    [hasRole]
  );

  const canApprove = useCallback(
    () => hasRole('ADMIN', 'APPROVER'),
    [hasRole]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, canEdit, canApprove }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
