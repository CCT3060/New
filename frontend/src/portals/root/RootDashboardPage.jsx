import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRootAuth } from '../../contexts/RootAuthContext';
import { toast } from 'react-toastify';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function rootFetch(path, token, opts = {}) {
  return fetch(`${BASE}/root${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  }).then(async (r) => {
    const d = await r.json();
    if (!d.success) throw new Error(d.message);
    return d.data;
  });
}

const cardStyle = {
  background: '#fff', borderRadius: 14, padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1.5px solid #f1f5f9',
};

export default function RootDashboardPage() {
  const { rootAdmin, logout, getToken } = useRootAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', adminEmail: '', adminPassword: '' });

  const load = () => {
    setLoading(true);
    rootFetch('/clients', getToken())
      .then((d) => setClients(d.clients || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ name: '', adminEmail: '', adminPassword: '' });
    setEditClient(null);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setForm({ name: c.name, adminEmail: c.adminEmail, adminPassword: '' });
    setEditClient(c);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.adminEmail || (!editClient && !form.adminPassword)) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      if (editClient) {
        await rootFetch(`/clients/${editClient.id}`, getToken(), {
          method: 'PUT', body: JSON.stringify(form),
        });
        toast.success('Client updated');
      } else {
        await rootFetch('/clients', getToken(), {
          method: 'POST', body: JSON.stringify(form),
        });
        toast.success('Client registered successfully');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await rootFetch(`/clients/${id}`, getToken(), { method: 'DELETE' });
      toast.success('Client deleted');
      setDeleteConfirm(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleLogout = () => { logout(); navigate('/root'); };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Topbar */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: '#fff', padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.3rem' }}>⚙️</span>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em' }}>Root Portal</span>
            <span style={{ marginLeft: 12, fontSize: '0.75rem', opacity: 0.6 }}>System Administration</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{rootAdmin?.email}</span>
          <button
            onClick={handleLogout}
            style={{ padding: '6px 16px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
          >Sign Out</button>
        </div>
      </header>

      <div style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Client Management</h1>
            <p style={{ color: '#64748b', marginTop: 4, fontSize: '0.875rem' }}>
              Register and manage client organisations
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href="/portal"
              style={{
                padding: '9px 20px', borderRadius: 9, border: '1.5px solid #6366f1',
                background: '#eef2ff', color: '#6366f1', fontWeight: 600, fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              → Client Portal
            </a>
            <button
              onClick={openNew}
              style={{
                padding: '9px 20px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              + Register Client
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Clients', value: clients.length, color: '#6366f1', bg: '#eef2ff' },
            { label: 'Active', value: clients.filter(c => c.isActive).length, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Inactive', value: clients.filter(c => !c.isActive).length, color: '#6b7280', bg: '#f1f5f9' },
          ].map(s => (
            <div key={s.label} style={{ ...cardStyle, padding: '16px 24px', background: s.bg, border: `1px solid ${s.color}22` }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Clients Table */}
        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Client Name', 'Admin Email', 'Companies', 'Status', 'Registered', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', background: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0', fontSize: '0.72rem',
                      fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} style={{ padding: '12px 14px' }}>
                          <div style={{ background: '#e2e8f0', borderRadius: 4, height: 14, width: '70%', opacity: 0.5 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                  : clients.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                        No clients registered yet. Click "+ Register Client" to add one.
                      </td>
                    </tr>
                  )
                  : clients.map((c) => (
                    <tr key={c.id}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{c.name}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#475569' }}>{c.adminEmail}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                        {c._count?.companies ?? 0}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: c.isActive ? '#f0fdf4' : '#f1f5f9',
                          color: c.isActive ? '#16a34a' : '#6b7280',
                        }}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#94a3b8' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openEdit(c)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: '1.5px solid #bfdbfe',
                              background: '#eff6ff', fontSize: '0.72rem', cursor: 'pointer', color: '#2563eb', fontWeight: 500,
                            }}
                          >Edit</button>
                          <button
                            onClick={() => setDeleteConfirm(c)}
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: '1.5px solid #fee2e2',
                              background: '#fef2f2', fontSize: '0.72rem', cursor: 'pointer', color: '#dc2626', fontWeight: 500,
                            }}
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Register / Edit Modal */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 32, width: 480, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
          >
            <h2 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 24, fontSize: '1.15rem' }}>
              {editClient ? 'Edit Client' : 'Register New Client'}
            </h2>
            <form onSubmit={handleSave}>
              {[
                { key: 'name', label: 'Client Name *', ph: 'e.g. Catalyst Foods' },
                { key: 'adminEmail', label: 'Admin Email *', ph: 'admin@catalyst.com', type: 'email' },
                { key: 'adminPassword', label: `Password${editClient ? ' (leave blank to keep)' : ' *'}`, ph: '••••••••', type: 'password' },
              ].map(({ key, label, ph, type, disabled }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input
                    type={type || 'text'}
                    value={form[key]}
                    disabled={disabled}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph}
                    style={{
                      width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
                      borderRadius: 7, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                      background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#94a3b8' : '#0f172a',
                    }}
                  />
                </div>
              ))}
              {editClient && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Status</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, isActive: v }))}
                        style={{
                          padding: '6px 16px', borderRadius: 7, border: '1.5px solid',
                          borderColor: form.isActive === v ? (v ? '#16a34a' : '#dc2626') : '#e2e8f0',
                          background: form.isActive === v ? (v ? '#f0fdf4' : '#fef2f2') : '#fff',
                          color: form.isActive === v ? (v ? '#16a34a' : '#dc2626') : '#64748b',
                          cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                        }}
                      >
                        {v ? 'Active' : 'Inactive'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '9px 22px', borderRadius: 8, border: 'none',
                    background: saving ? '#818cf8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : editClient ? 'Update Client' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
          >
            <h3 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>Delete Client</h3>
            <p style={{ color: '#64748b', margin: '0 0 22px', lineHeight: 1.5 }}>
              Delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
