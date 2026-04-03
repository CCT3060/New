import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { toast } from 'react-toastify';

const ROLES = ['ADMIN', 'OPS_MANAGER', 'KITCHEN_MANAGER', 'STORE_MANAGER', 'APPROVER'];

const cardStyle = {
  background: '#fff', borderRadius: 14, padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1.5px solid #f1f5f9',
};

export default function ClientDashboardPage() {
  const { clientAdmin, logout, portalFetch } = useClientAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('companies');

  // --- Companies ---
  const [companies, setCompanies] = useState([]);
  const [compLoading, setCompLoading] = useState(true);
  const [compForm, setCompForm] = useState({ name: '', code: '' });
  const [editComp, setEditComp] = useState(null);
  const [showCompForm, setShowCompForm] = useState(false);
  const [deleteCompConfirm, setDeleteCompConfirm] = useState(null);

  // --- Users ---
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'KITCHEN_MANAGER', companyId: '' });
  const [editUser, setEditUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadCompanies = () => {
    setCompLoading(true);
    portalFetch('/companies')
      .then(d => setCompanies(d.companies || []))
      .catch(e => toast.error(e.message))
      .finally(() => setCompLoading(false));
  };

  const loadUsers = () => {
    setUserLoading(true);
    portalFetch('/users')
      .then(d => setUsers(d.users || []))
      .catch(e => toast.error(e.message))
      .finally(() => setUserLoading(false));
  };

  useEffect(() => { loadCompanies(); loadUsers(); }, []);

  // ---- Company CRUD ----
  const openNewComp = () => { setCompForm({ name: '', code: '' }); setEditComp(null); setShowCompForm(true); };
  const openEditComp = (c) => { setCompForm({ name: c.name, code: c.code }); setEditComp(c); setShowCompForm(true); };

  const handleSaveComp = async (e) => {
    e.preventDefault();
    if (!compForm.name || !compForm.code) { toast.error('Name and code are required'); return; }
    setSaving(true);
    try {
      if (editComp) {
        await portalFetch(`/companies/${editComp.id}`, { method: 'PUT', body: JSON.stringify(compForm) });
        toast.success('Company updated');
      } else {
        await portalFetch('/companies', { method: 'POST', body: JSON.stringify(compForm) });
        toast.success('Company created');
      }
      setShowCompForm(false);
      loadCompanies();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDeleteComp = async (id) => {
    try {
      await portalFetch(`/companies/${id}`, { method: 'DELETE' });
      toast.success('Company deleted');
      setDeleteCompConfirm(null);
      loadCompanies();
    } catch (err) { toast.error(err.message); }
  };

  // ---- User CRUD ----
  const openNewUser = () => {
    setUserForm({ name: '', email: '', password: '', role: 'KITCHEN_MANAGER', companyId: '' });
    setEditUser(null);
    setShowUserForm(true);
  };
  const openEditUser = (u) => {
    setUserForm({ name: u.name, email: u.email, password: '', role: u.role, companyId: u.companyId || '' });
    setEditUser(u);
    setShowUserForm(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || (!editUser && !userForm.password)) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      if (editUser) {
        await portalFetch(`/users/${editUser.id}`, { method: 'PUT', body: JSON.stringify(userForm) });
        toast.success('User updated');
      } else {
        await portalFetch('/users', { method: 'POST', body: JSON.stringify(userForm) });
        toast.success('User created — they can now log in at the main app');
      }
      setShowUserForm(false);
      loadUsers();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDeleteUser = async (id) => {
    try {
      await portalFetch(`/users/${id}`, { method: 'DELETE' });
      toast.success('User deleted');
      setDeleteUserConfirm(null);
      loadUsers();
    } catch (err) { toast.error(err.message); }
  };

  const handleLogout = () => { logout(); navigate('/portal'); };

  const companyName = (cid) => companies.find(c => c.id === cid)?.name || '—';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Topbar */}
      <header style={{
        background: 'linear-gradient(135deg, #0c4a6e, #0e7490)',
        color: '#fff', padding: '0 28px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.3rem' }}>🏢</span>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>Client Portal</span>
            <span style={{ marginLeft: 12, fontSize: '0.75rem', opacity: 0.6 }}>{clientAdmin?.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/" style={{ fontSize: '0.8rem', color: '#bae6fd', textDecoration: 'none', fontWeight: 500 }}>Open App →</a>
          <button
            onClick={handleLogout}
            style={{ padding: '6px 16px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.25)', background: 'transparent', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
          >Sign Out</button>
        </div>
      </header>

      <div style={{ padding: '28px 36px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Companies', value: companies.length, color: '#0891b2', bg: '#ecfeff' },
            { label: 'Users', value: users.length, color: '#7c3aed', bg: '#ede9fe' },
            { label: 'Active Users', value: users.filter(u => u.isActive).length, color: '#16a34a', bg: '#f0fdf4' },
          ].map(s => (
            <div key={s.label} style={{ ...cardStyle, padding: '16px 24px', background: s.bg, border: `1px solid ${s.color}22` }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
          {[
            { key: 'companies', label: '🏛 Companies' },
            { key: 'users', label: '👥 Users' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 22px', border: 'none', background: 'transparent',
                fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? '#0891b2' : '#64748b',
                borderBottom: tab === t.key ? '2.5px solid #0891b2' : '2.5px solid transparent',
                cursor: 'pointer', fontSize: '0.9rem', marginBottom: -2,
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* ---- COMPANIES PANEL ---- */}
        {tab === 'companies' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Companies</h2>
              <button
                onClick={openNewComp}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
              >+ Add Company</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Company Name', 'Code', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compLoading
                  ? <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
                  : companies.length === 0
                  ? <tr><td colSpan={5} style={{ padding: 36, textAlign: 'center', color: '#94a3b8' }}>No companies yet.</td></tr>
                  : companies.map(c => (
                    <tr key={c.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '11px 12px', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{c.name}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ background: '#ecfeff', color: '#0891b2', padding: '2px 9px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{c.code}</span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: c.isActive ? '#f0fdf4' : '#f1f5f9', color: c.isActive ? '#16a34a' : '#6b7280' }}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: '0.78rem', color: '#94a3b8' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEditComp(c)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #bfdbfe', background: '#eff6ff', fontSize: '0.72rem', cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}>Edit</button>
                          <button onClick={() => setDeleteCompConfirm(c)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fef2f2', fontSize: '0.72rem', cursor: 'pointer', color: '#dc2626', fontWeight: 500 }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}

        {/* ---- USERS PANEL ---- */}
        {tab === 'users' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Users</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Created users can log in at the main app (/login)</p>
              </div>
              <button
                onClick={openNewUser}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
              >+ Add User</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Email', 'Role', 'Company', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userLoading
                  ? <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
                  : users.length === 0
                  ? <tr><td colSpan={6} style={{ padding: 36, textAlign: 'center', color: '#94a3b8' }}>No users yet.</td></tr>
                  : users.map(u => (
                    <tr key={u.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '11px 12px', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{u.name}</td>
                      <td style={{ padding: '11px 12px', fontSize: '0.82rem', color: '#475569' }}>{u.email}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: '#ede9fe', color: '#7c3aed' }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: '0.82rem', color: '#64748b' }}>{companyName(u.companyId)}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: u.isActive ? '#f0fdf4' : '#f1f5f9', color: u.isActive ? '#16a34a' : '#6b7280' }}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEditUser(u)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #bfdbfe', background: '#eff6ff', fontSize: '0.72rem', cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}>Edit</button>
                          <button onClick={() => setDeleteUserConfirm(u)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fef2f2', fontSize: '0.72rem', cursor: 'pointer', color: '#dc2626', fontWeight: 500 }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Company Form Modal */}
      {showCompForm && (
        <Modal onClose={() => setShowCompForm(false)} title={editComp ? 'Edit Company' : 'Add Company'}>
          <form onSubmit={handleSaveComp}>
            {[
              { key: 'name', label: 'Company Name *', ph: 'e.g. North Kitchen' },
              { key: 'code', label: 'Company Code *', ph: 'e.g. NK01' },
            ].map(({ key, label, ph }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={labelSt}>{label}</label>
                <input value={compForm[key]} onChange={e => setCompForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={inputSt} />
              </div>
            ))}
            <ModalActions onCancel={() => setShowCompForm(false)} saving={saving} label={editComp ? 'Update' : 'Create'} />
          </form>
        </Modal>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <Modal onClose={() => setShowUserForm(false)} title={editUser ? 'Edit User' : 'Create User'}>
          <form onSubmit={handleSaveUser}>
            {[
              { key: 'name', label: 'Full Name *', ph: 'John Doe' },
              { key: 'email', label: 'Email *', ph: 'john@company.com', type: 'email' },
              { key: 'password', label: `Password${editUser ? ' (leave blank to keep)' : ' *'}`, ph: '••••••••', type: 'password' },
            ].map(({ key, label, ph, type }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={labelSt}>{label}</label>
                <input type={type || 'text'} value={userForm[key]} onChange={e => setUserForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={inputSt} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Role *</label>
              <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} style={inputSt}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Assign to Company</label>
              <select value={userForm.companyId} onChange={e => setUserForm(f => ({ ...f, companyId: e.target.value }))} style={inputSt}>
                <option value="">— No company —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {!editUser && (
              <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.78rem', color: '#0e7490' }}>
                ℹ️ This user will be able to log in to the main app using their email and password.
              </div>
            )}
            <ModalActions onCancel={() => setShowUserForm(false)} saving={saving} label={editUser ? 'Update User' : 'Create User'} />
          </form>
        </Modal>
      )}

      {/* Delete Company Confirm */}
      {deleteCompConfirm && (
        <DeleteModal
          name={deleteCompConfirm.name}
          onConfirm={() => handleDeleteComp(deleteCompConfirm.id)}
          onCancel={() => setDeleteCompConfirm(null)}
        />
      )}

      {/* Delete User Confirm */}
      {deleteUserConfirm && (
        <DeleteModal
          name={deleteUserConfirm.name}
          onConfirm={() => handleDeleteUser(deleteUserConfirm.id)}
          onCancel={() => setDeleteUserConfirm(null)}
        />
      )}
    </div>
  );
}

// ---- Shared Modal Helpers ----
const labelSt = { fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };
const inputSt = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' };

function Modal({ onClose, title, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 32, width: 460, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 22, fontSize: '1.1rem' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, saving, label }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
      <button type="button" onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
      <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: saving ? '#818cf8' : 'linear-gradient(135deg, #0891b2, #06b6d4)', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving...' : label}
      </button>
    </div>
  );
}

function DeleteModal({ name, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 28, width: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>Confirm Delete</h3>
        <p style={{ color: '#64748b', margin: '0 0 22px', lineHeight: 1.5 }}>Delete <strong>{name}</strong>? This cannot be undone.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
