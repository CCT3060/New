import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { toast } from 'react-toastify';

export default function ClientLoginPage() {
  const { clientAdmin, login } = useClientAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (clientAdmin) {
    navigate('/portal/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/portal/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0c4a6e 0%, #0e7490 40%, #164e63 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #0f172a, #1e293b)',
        borderRadius: 20, padding: '40px 44px', width: '100%', maxWidth: 400,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{
          width: 60, height: 60, borderRadius: 16, marginBottom: 24, margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem',
        }}>
          🏢
        </div>

        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ color: '#f0f9ff', fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>
            Client Portal
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            Sign in to manage your organisation
          </p>
        </div>

        {error && (
          <div style={{
            background: '#7f1d1d22', border: '1px solid #ef4444', borderRadius: 8,
            padding: '10px 14px', marginBottom: 18, color: '#fca5a5', fontSize: '0.82rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Email Address', value: email, set: setEmail, type: 'email', ph: 'admin@yourcompany.com' },
            { label: 'Password', value: password, set: setPassword, type: 'password', ph: '••••••••' },
          ].map(({ label, value, set, type, ph }) => (
            <div key={label} style={{ marginBottom: 18 }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
              <input
                type={type}
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={ph}
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 9,
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)', color: '#f1f5f9',
                  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? '#0891b2aa' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 6, boxShadow: '0 4px 20px rgba(8,145,178,0.3)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#64748b', fontSize: '0.78rem' }}>
          System admin?{' '}
          <a href="/root" style={{ color: '#7dd3fc', textDecoration: 'none', fontWeight: 600 }}>Root Portal →</a>
        </p>
      </div>
    </div>
  );
}
