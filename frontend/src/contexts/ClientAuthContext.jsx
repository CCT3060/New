import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ClientAuthContext = createContext(null);

export function ClientAuthProvider({ children }) {
  const [clientAdmin, setClientAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    const saved = localStorage.getItem('portal_client');
    if (token && saved) {
      try { setClientAdmin(JSON.parse(saved)); } catch { localStorage.removeItem('portal_token'); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${BASE}/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Login failed');
    localStorage.setItem('portal_token', data.data.token);
    localStorage.setItem('portal_client', JSON.stringify(data.data.client));
    setClientAdmin(data.data.client);
    return data.data.client;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_client');
    setClientAdmin(null);
  }, []);

  const getToken = () => localStorage.getItem('portal_token');

  const portalFetch = useCallback(async (path, opts = {}) => {
    const token = getToken();
    const res = await fetch(`${BASE}/portal${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Request failed');
    return data.data;
  }, []);

  return (
    <ClientAuthContext.Provider value={{ clientAdmin, loading, login, logout, getToken, portalFetch }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export const useClientAuth = () => {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error('useClientAuth must be inside ClientAuthProvider');
  return ctx;
};
