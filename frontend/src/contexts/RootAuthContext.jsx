import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const RootAuthContext = createContext(null);

export function RootAuthProvider({ children }) {
  const [rootAdmin, setRootAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('root_token');
    const saved = localStorage.getItem('root_admin');
    if (token && saved) {
      try { setRootAdmin(JSON.parse(saved)); } catch { localStorage.removeItem('root_token'); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${BASE}/root/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Login failed');
    localStorage.setItem('root_token', data.data.token);
    localStorage.setItem('root_admin', JSON.stringify(data.data.admin));
    setRootAdmin(data.data.admin);
    return data.data.admin;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('root_token');
    localStorage.removeItem('root_admin');
    setRootAdmin(null);
  }, []);

  const getToken = () => localStorage.getItem('root_token');

  return (
    <RootAuthContext.Provider value={{ rootAdmin, loading, login, logout, getToken }}>
      {children}
    </RootAuthContext.Provider>
  );
}

export const useRootAuth = () => {
  const ctx = useContext(RootAuthContext);
  if (!ctx) throw new Error('useRootAuth must be inside RootAuthProvider');
  return ctx;
};
