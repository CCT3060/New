import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../modules/recipe/services/recipe.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [kitchen, setKitchen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ck_token');
    const savedUser = localStorage.getItem('ck_user');
    const savedKitchen = localStorage.getItem('ck_kitchen');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        if (savedKitchen) setKitchen(JSON.parse(savedKitchen));
      } catch {
        localStorage.removeItem('ck_token');
        localStorage.removeItem('ck_user');
        localStorage.removeItem('ck_kitchen');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('ck_token', data.token);
    localStorage.setItem('ck_user', JSON.stringify(data.user));
    if (data.kitchen) localStorage.setItem('ck_kitchen', JSON.stringify(data.kitchen));
    else localStorage.removeItem('ck_kitchen');
    setUser(data.user);
    setKitchen(data.kitchen || null);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ck_token');
    localStorage.removeItem('ck_user');
    localStorage.removeItem('ck_kitchen');
    setUser(null);
    setKitchen(null);
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
    <AuthContext.Provider value={{ user, kitchen, loading, login, logout, hasRole, canEdit, canApprove }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
