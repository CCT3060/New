import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/recipes');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Central Kitchen</h1>
        <p>Recipe Management System — Sign in to continue</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label required" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              placeholder="you@centralkitchen.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label required" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in...</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
