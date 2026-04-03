import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRootAuth } from '../../contexts/RootAuthContext';

export default function RootLoginPage() {
  const { login } = useRootAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Email and password required'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/root/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 44px', width: 420, maxWidth: '90vw',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '1.6rem',
          }}>⚙️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Root Portal</h1>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: '0.875rem' }}>
            System administrator access only
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '10px 14px', color: '#dc2626', fontSize: '0.85rem', marginBottom: 20,
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
              placeholder="root@system.com"
              style={{
                width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
                borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
                borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px', border: 'none', borderRadius: 9,
              background: loading ? '#818cf8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In as Root Admin'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <a href="/portal" style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>
            → Go to Client Portal
          </a>
        </div>
      </div>
    </div>
  );
}
