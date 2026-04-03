import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import { toast } from 'react-toastify';

export default function CompanyLoginPage() {
  const { companyUser, login } = useCompanyAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (companyUser) {
    navigate('/company/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/company/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #0f172a, #1e293b)',
        borderRadius: 20, padding: '40px 44px', width: '100%', maxWidth: 400,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #059669, #10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
        }}>🏭</div>

        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ color: '#f0fdf4', fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>
            Company Portal
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            Manage kitchens, stores &amp; delivery units
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
            { label: 'Email Address', value: email, set: setEmail, type: 'email', ph: 'you@company.com' },
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
              background: loading ? '#059669aa' : 'linear-gradient(135deg, #059669, #10b981)',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer', marginTop: 6,
              boxShadow: '0 4px 20px rgba(5,150,105,0.3)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: '#64748b', fontSize: '0.78rem' }}>
          Client admin?{' '}
          <a href="/portal" style={{ color: '#6ee7b7', textDecoration: 'none', fontWeight: 600 }}>Client Portal →</a>
        </p>
      </div>
    </div>
  );
}
