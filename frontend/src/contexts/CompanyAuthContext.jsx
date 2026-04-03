import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CompanyAuthContext = createContext(null);

export function CompanyAuthProvider({ children }) {
  const [companyUser, setCompanyUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('company_token');
    const saved = localStorage.getItem('company_user');
    if (token && saved) {
      try { setCompanyUser(JSON.parse(saved)); } catch { localStorage.removeItem('company_token'); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${BASE}/company/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Login failed');
    localStorage.setItem('company_token', data.data.token);
    localStorage.setItem('company_user', JSON.stringify({ ...data.data.user, company: data.data.company }));
    setCompanyUser({ ...data.data.user, company: data.data.company });
    return data.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('company_token');
    localStorage.removeItem('company_user');
    setCompanyUser(null);
  }, []);

  const getToken = () => localStorage.getItem('company_token');

  const companyFetch = useCallback(async (path, opts = {}) => {
    const token = getToken();
    const res = await fetch(`${BASE}/company${path}`, {
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
    <CompanyAuthContext.Provider value={{ companyUser, loading, login, logout, getToken, companyFetch }}>
      {children}
    </CompanyAuthContext.Provider>
  );
}

export const useCompanyAuth = () => {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) throw new Error('useCompanyAuth must be inside CompanyAuthProvider');
  return ctx;
};
