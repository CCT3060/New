import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import { toast } from 'react-toastify';
import PaxCountTab from './PaxCountTab';
import RequisitionTab from './RequisitionTab';

const cardStyle = {
  background: '#fff', borderRadius: 14, padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1.5px solid #f1f5f9',
};
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

function ModalActions({ onCancel, saving, label, accent = '#059669' }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
      <button type="button" onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
      <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: saving ? '#94a3b8' : `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? 'Saving...' : label}
      </button>
    </div>
  );
}

function DeleteConfirm({ name, onConfirm, onCancel }) {
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

export default function CompanyDashboardPage() {
  const { companyUser, logout, companyFetch } = useCompanyAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('kitchens');

  // ── Kitchens ──
  const [kitchens, setKitchens] = useState([]);
  const [kitchenLoading, setKitchenLoading] = useState(true);
  const [kitchenForm, setKitchenForm] = useState({ name: '', address: '' });
  const [editKitchen, setEditKitchen] = useState(null);
  const [showKitchenForm, setShowKitchenForm] = useState(false);
  const [deleteKitchen, setDeleteKitchen] = useState(null);

  // ── Stores ──
  const [stores, setStores] = useState([]);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeForm, setStoreForm] = useState({ name: '', code: '', kitchenId: '' });
  const [editStore, setEditStore] = useState(null);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [deleteStore, setDeleteStore] = useState(null);

  // ── Units ──
  const [units, setUnits] = useState([]);
  const [unitLoading, setUnitLoading] = useState(true);
  const [unitForm, setUnitForm] = useState({ name: '', code: '', address: '' });
  const [editUnit, setEditUnit] = useState(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [deleteUnit, setDeleteUnit] = useState(null);

  // ── Kitchen Users ──
  const [kitchenUsers, setKitchenUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'KITCHEN_MANAGER', kitchenId: '' });
  const [editUser, setEditUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);

  const [saving, setSaving] = useState(false);

  const load = () => {
    setKitchenLoading(true);
    companyFetch('/kitchens').then(d => setKitchens(d.kitchens || [])).catch(e => toast.error(e.message)).finally(() => setKitchenLoading(false));
    setStoreLoading(true);
    companyFetch('/stores').then(d => setStores(d.stores || [])).catch(e => toast.error(e.message)).finally(() => setStoreLoading(false));
    setUnitLoading(true);
    companyFetch('/units').then(d => setUnits(d.units || [])).catch(e => toast.error(e.message)).finally(() => setUnitLoading(false));
    setUserLoading(true);
    companyFetch('/kitchen-users').then(d => setKitchenUsers(d.users || [])).catch(e => toast.error(e.message)).finally(() => setUserLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Kitchen handlers ──
  const openNewKitchen = () => { setKitchenForm({ name: '', address: '' }); setEditKitchen(null); setShowKitchenForm(true); };
  const openEditKitchen = (k) => { setKitchenForm({ name: k.name, address: k.address || '' }); setEditKitchen(k); setShowKitchenForm(true); };
  const handleSaveKitchen = async (e) => {
    e.preventDefault();
    if (!kitchenForm.name) { toast.error('Kitchen name is required'); return; }
    setSaving(true);
    try {
      if (editKitchen) {
        await companyFetch(`/kitchens/${editKitchen.id}`, { method: 'PUT', body: JSON.stringify(kitchenForm) });
        toast.success('Kitchen updated');
      } else {
        await companyFetch('/kitchens', { method: 'POST', body: JSON.stringify(kitchenForm) });
        toast.success('Kitchen created');
      }
      setShowKitchenForm(false); load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };
  const handleDeleteKitchen = async (id) => {
    try { await companyFetch(`/kitchens/${id}`, { method: 'DELETE' }); toast.success('Kitchen deleted'); setDeleteKitchen(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  // ── Store handlers ──
  const openNewStore = () => { setStoreForm({ name: '', code: '', kitchenId: kitchens[0]?.id || '' }); setEditStore(null); setShowStoreForm(true); };
  const openEditStore = (s) => { setStoreForm({ name: s.name, code: s.code, kitchenId: s.kitchenId }); setEditStore(s); setShowStoreForm(true); };
  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!storeForm.name || !storeForm.kitchenId) { toast.error('Name and kitchen are required'); return; }
    setSaving(true);
    try {
      if (editStore) {
        await companyFetch(`/stores/${editStore.id}`, { method: 'PUT', body: JSON.stringify(storeForm) });
        toast.success('Store updated');
      } else {
        await companyFetch('/stores', { method: 'POST', body: JSON.stringify(storeForm) });
        toast.success('Store created');
      }
      setShowStoreForm(false); load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };
  const handleDeleteStore = async (id) => {
    try { await companyFetch(`/stores/${id}`, { method: 'DELETE' }); toast.success('Store deleted'); setDeleteStore(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  // ── Unit handlers ──
  const openNewUnit = () => { setUnitForm({ name: '', code: '', address: '' }); setEditUnit(null); setShowUnitForm(true); };
  const openEditUnit = (u) => { setUnitForm({ name: u.name, code: u.code || '', address: u.address || '' }); setEditUnit(u); setShowUnitForm(true); };
  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!unitForm.name) { toast.error('Unit name is required'); return; }
    setSaving(true);
    try {
      if (editUnit) {
        await companyFetch(`/units/${editUnit.id}`, { method: 'PUT', body: JSON.stringify(unitForm) });
        toast.success('Unit updated');
      } else {
        await companyFetch('/units', { method: 'POST', body: JSON.stringify(unitForm) });
        toast.success('Unit created');
      }
      setShowUnitForm(false); load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };
  const handleDeleteUnit = async (id) => {
    try { await companyFetch(`/units/${id}`, { method: 'DELETE' }); toast.success('Unit deleted'); setDeleteUnit(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  // ── Kitchen User handlers ──
  const ROLES = ['KITCHEN_MANAGER', 'STORE_MANAGER', 'OPS_MANAGER', 'APPROVER', 'ADMIN'];
  const openNewUser = () => { setUserForm({ name: '', email: '', password: '', role: 'KITCHEN_MANAGER', kitchenId: kitchens[0]?.id || '' }); setEditUser(null); setShowUserForm(true); };
  const openEditUser = (u) => { setUserForm({ name: u.name, email: u.email, password: '', role: u.role, kitchenId: u.kitchenId || '' }); setEditUser(u); setShowUserForm(true); };
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.kitchenId) { toast.error('Name, email, and kitchen are required'); return; }
    if (!editUser && !userForm.password) { toast.error('Password is required for new users'); return; }
    setSaving(true);
    try {
      if (editUser) {
        const body = { name: userForm.name, role: userForm.role };
        if (userForm.password) body.password = userForm.password;
        await companyFetch(`/kitchen-users/${editUser.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('User updated');
      } else {
        await companyFetch('/kitchen-users', { method: 'POST', body: JSON.stringify(userForm) });
        toast.success('Kitchen user created');
      }
      setShowUserForm(false); load();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };
  const handleDeleteUser = async (id) => {
    try { await companyFetch(`/kitchen-users/${id}`, { method: 'DELETE' }); toast.success('User deleted'); setDeleteUser(null); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handleLogout = () => { logout(); navigate('/company'); };

  const NAV_MANAGEMENT = [
    { key: 'kitchens', icon: '🍳', label: 'Kitchens', count: kitchens.length },
    { key: 'stores', icon: '🏪', label: 'Stores', count: stores.length },
    { key: 'units', icon: '🏢', label: 'Delivery Units', count: units.length },
    { key: 'users', icon: '👥', label: 'Kitchen Users', count: kitchenUsers.length },
  ];

  const NAV_APP = [
    { key: 'recipes', icon: '📋', label: 'Recipes' },
    { key: 'report', icon: '📊', label: 'Recipe Report' },
    { key: 'menu-planner', icon: '📅', label: 'Menu Planner' },
    { key: 'pax', icon: '⚖', label: 'Pax Count' },
    { key: 'requisition', icon: '📦', label: 'Requisition' },
  ];

  const APP_TAB_SRC = {
    recipes: '/recipes',
    report: '/recipe-report',
    'menu-planner': '/menu-planner',
  };

  const TAB_LABELS = {
    kitchens: '🍳 Kitchens', stores: '🏪 Stores', units: '🏢 Delivery Units', users: '👥 Kitchen Users',
    recipes: '📋 Recipes', report: '📊 Recipe Report', 'menu-planner': '📅 Menu Planner', pax: '⚖ Pax Count',
    requisition: '📦 Requisition',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: '1.4rem' }}>🏭</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>Company Portal</span>
          </div>
          <span style={{ color: '#6ee7b7', fontSize: '0.72rem', fontWeight: 500 }}>{companyUser?.company?.name}</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          <div style={{ padding: '8px 16px 3px', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Management</div>
          {NAV_MANAGEMENT.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '9px 16px', border: 'none',
              background: tab === item.key ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: tab === item.key ? '#fff' : 'rgba(255,255,255,0.65)',
              cursor: 'pointer', fontSize: '0.83rem', fontWeight: tab === item.key ? 600 : 400,
              borderLeft: tab === item.key ? '3px solid #6ee7b7' : '3px solid transparent',
              textAlign: 'left',
            }}>
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.15)', padding: '1px 7px', borderRadius: 10, color: 'rgba(255,255,255,0.7)' }}>{item.count}</span>
            </button>
          ))}

          <div style={{ padding: '14px 16px 3px', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recipes &amp; Menu</div>
          <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV_APP.map(item => (
              <button key={item.key} onClick={() => setTab(item.key)} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', border: 'none', borderRadius: 9,
                background: tab === item.key ? '#ecfdf5' : 'rgba(255,255,255,0.1)',
                color: tab === item.key ? '#065f46' : 'rgba(255,255,255,0.85)',
                cursor: 'pointer', fontSize: '0.83rem', fontWeight: tab === item.key ? 700 : 500,
                textAlign: 'left', boxShadow: tab === item.key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (tab !== item.key) { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; } }}
              onMouseLeave={e => { if (tab !== item.key) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; } }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 2 }}>{companyUser?.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', marginBottom: 12 }}>{companyUser?.role?.replace(/_/g, ' ')}</div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 28px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{TAB_LABELS[tab] || tab}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Kitchens', value: kitchens.length, color: '#059669', bg: '#f0fdf4' },
              { label: 'Stores', value: stores.length, color: '#d97706', bg: '#fffbeb' },
              { label: 'Delivery Units', value: units.length, color: '#7c3aed', bg: '#ede9fe' },
              { label: 'Users', value: kitchenUsers.length, color: '#0284c7', bg: '#f0f9ff' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '4px 11px', display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: s.color, fontSize: '0.82rem' }}>{s.value}</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </header>

        {APP_TAB_SRC[tab] && (
          <iframe
            key={tab}
            src={APP_TAB_SRC[tab]}
            style={{ flex: 1, border: 'none', width: '100%', height: 'calc(100vh - 54px)', display: 'block' }}
            title={TAB_LABELS[tab]}
          />
        )}
        {tab === 'pax' && (
          <div style={{ padding: '28px 32px', flex: 1 }}>
            <PaxCountTab />
          </div>
        )}
        {tab === 'requisition' && (
          <div style={{ padding: '28px 32px', flex: 1 }}>
            <RequisitionTab />
          </div>
        )}
        <div style={{ padding: '28px 32px', flex: 1, display: APP_TAB_SRC[tab] || tab === 'pax' || tab === 'requisition' ? 'none' : 'block' }}>
        {/* ── KITCHENS ── */}
        {tab === 'kitchens' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Kitchens</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Kitchen locations for your company</p>
              </div>
              <button onClick={openNewKitchen} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                + Add Kitchen
              </button>
            </div>
            <Table
              headers={['Kitchen Name', 'Address', 'Stores', 'Status', 'Created', 'Actions']}
              loading={kitchenLoading}
              empty="No kitchens yet. Add your first kitchen."
              rows={kitchens}
              renderRow={(k) => (
                <tr key={k.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={tdSt}><span style={{ fontWeight: 600, color: '#0f172a' }}>{k.name}</span></td>
                  <td style={{ ...tdSt, color: '#64748b', fontSize: '0.8rem', maxWidth: 200 }}>{k.address || '—'}</td>
                  <td style={{ ...tdSt, textAlign: 'center' }}>
                    <span style={{ background: '#f0fdf4', color: '#059669', padding: '2px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600 }}>{k.storesCount}</span>
                  </td>
                  <td style={tdSt}><StatusBadge active={k.isActive} /></td>
                  <td style={{ ...tdSt, color: '#94a3b8', fontSize: '0.78rem' }}>{new Date(k.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={tdSt}>
                    <RowActions onEdit={() => openEditKitchen(k)} onDelete={() => setDeleteKitchen(k)} />
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {/* ── STORES ── */}
        {tab === 'stores' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Stores</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Stores are linked to a specific kitchen</p>
              </div>
              <button onClick={openNewStore} disabled={kitchens.length === 0} title={kitchens.length === 0 ? 'Add a kitchen first' : ''} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: kitchens.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#fff', fontWeight: 700, cursor: kitchens.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}>
                + Add Store
              </button>
            </div>
            <Table
              headers={['Store Name', 'Code', 'Kitchen', 'Status', 'Created', 'Actions']}
              loading={storeLoading}
              empty="No stores yet. Add a kitchen first, then create stores."
              rows={stores}
              renderRow={(s) => (
                <tr key={s.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={tdSt}><span style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</span></td>
                  <td style={tdSt}><span style={{ background: '#fffbeb', color: '#d97706', padding: '2px 9px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{s.code}</span></td>
                  <td style={{ ...tdSt, color: '#374151', fontSize: '0.82rem' }}>🍳 {s.kitchenName || '—'}</td>
                  <td style={tdSt}><StatusBadge active={s.isActive} /></td>
                  <td style={{ ...tdSt, color: '#94a3b8', fontSize: '0.78rem' }}>{new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={tdSt}>
                    <RowActions onEdit={() => openEditStore(s)} onDelete={() => setDeleteStore(s)} />
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {/* ── UNITS ── */}
        {tab === 'units' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Delivery Units</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Clients/destinations the central kitchen delivers to (e.g. Infosys, Capgemini)</p>
              </div>
              <button onClick={openNewUnit} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                + Add Unit
              </button>
            </div>
            <Table
              headers={['Unit Name', 'Code', 'Address', 'Status', 'Created', 'Actions']}
              loading={unitLoading}
              empty="No delivery units yet."
              rows={units}
              renderRow={(u) => (
                <tr key={u.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={tdSt}><span style={{ fontWeight: 600, color: '#0f172a' }}>{u.name}</span></td>
                  <td style={tdSt}>
                    {u.code ? <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 9px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700 }}>{u.code}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ ...tdSt, color: '#64748b', fontSize: '0.8rem', maxWidth: 200 }}>{u.address || '—'}</td>
                  <td style={tdSt}><StatusBadge active={u.isActive} /></td>
                  <td style={{ ...tdSt, color: '#94a3b8', fontSize: '0.78rem' }}>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={tdSt}>
                    <RowActions onEdit={() => openEditUnit(u)} onDelete={() => setDeleteUnit(u)} />
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {/* ── KITCHEN USERS ── */}
        {tab === 'users' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Kitchen Users</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Assign users to kitchens — they log in at the main Kitchen Portal</p>
              </div>
              <button onClick={openNewUser} disabled={kitchens.length === 0} title={kitchens.length === 0 ? 'Add a kitchen first' : ''} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: kitchens.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #0284c7, #0ea5e9)', color: '#fff', fontWeight: 700, cursor: kitchens.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}>
                + Add User
              </button>
            </div>
            <Table
              headers={['Name', 'Email', 'Role', 'Kitchen', 'Status', 'Created', 'Actions']}
              loading={userLoading}
              empty="No kitchen users yet. Add a kitchen first, then create users."
              rows={kitchenUsers}
              renderRow={(u) => (
                <tr key={u.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={tdSt}><span style={{ fontWeight: 600, color: '#0f172a' }}>{u.name}</span></td>
                  <td style={{ ...tdSt, color: '#64748b', fontSize: '0.8rem' }}>{u.email}</td>
                  <td style={tdSt}><span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 9px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>{u.role?.replace(/_/g, ' ')}</span></td>
                  <td style={{ ...tdSt, color: '#374151', fontSize: '0.82rem' }}>🍳 {u.kitchenName || '—'}</td>
                  <td style={tdSt}><StatusBadge active={u.isActive} /></td>
                  <td style={{ ...tdSt, color: '#94a3b8', fontSize: '0.78rem' }}>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={tdSt}><RowActions onEdit={() => openEditUser(u)} onDelete={() => setDeleteUser(u)} /></td>
                </tr>
              )}
            />
          </div>
        )}
        </div>
      </div>
      {showKitchenForm && (
        <Modal onClose={() => setShowKitchenForm(false)} title={editKitchen ? 'Edit Kitchen' : 'Add Kitchen'}>
          <form onSubmit={handleSaveKitchen}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Kitchen Name *</label>
              <input value={kitchenForm.name} onChange={e => setKitchenForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. North Kitchen" style={inputSt} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Address / Location</label>
              <textarea value={kitchenForm.address} onChange={e => setKitchenForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. Plot 12, MIDC, Pune" rows={3}
                style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <ModalActions onCancel={() => setShowKitchenForm(false)} saving={saving} label={editKitchen ? 'Update' : 'Create'} accent="#059669" />
          </form>
        </Modal>
      )}

      {/* Store Form */}
      {showStoreForm && (
        <Modal onClose={() => setShowStoreForm(false)} title={editStore ? 'Edit Store' : 'Add Store'}>
          <form onSubmit={handleSaveStore}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Store Name *</label>
              <input value={storeForm.name} onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cold Storage A" style={inputSt} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Store Code</label>
              <input value={storeForm.code} onChange={e => setStoreForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CS-A01" style={inputSt} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Kitchen *</label>
              <select value={storeForm.kitchenId} onChange={e => setStoreForm(f => ({ ...f, kitchenId: e.target.value }))} style={inputSt}>
                <option value="">— Select kitchen —</option>
                {kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <ModalActions onCancel={() => setShowStoreForm(false)} saving={saving} label={editStore ? 'Update' : 'Create'} accent="#d97706" />
          </form>
        </Modal>
      )}

      {/* Unit Form */}
      {showUnitForm && (
        <Modal onClose={() => setShowUnitForm(false)} title={editUnit ? 'Edit Unit' : 'Add Delivery Unit'}>
          <form onSubmit={handleSaveUnit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Unit Name *</label>
              <input value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Infosys, Capgemini" style={inputSt} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Code</label>
              <input value={unitForm.code} onChange={e => setUnitForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. INF01" style={inputSt} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Address</label>
              <textarea value={unitForm.address} onChange={e => setUnitForm(f => ({ ...f, address: e.target.value }))} placeholder="Delivery address" rows={3}
                style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <ModalActions onCancel={() => setShowUnitForm(false)} saving={saving} label={editUnit ? 'Update' : 'Create'} accent="#7c3aed" />
          </form>
        </Modal>
      )}

      {deleteKitchen && <DeleteConfirm name={deleteKitchen.name} onConfirm={() => handleDeleteKitchen(deleteKitchen.id)} onCancel={() => setDeleteKitchen(null)} />}
      {deleteStore   && <DeleteConfirm name={deleteStore.name}   onConfirm={() => handleDeleteStore(deleteStore.id)}     onCancel={() => setDeleteStore(null)} />}
      {deleteUnit    && <DeleteConfirm name={deleteUnit.name}    onConfirm={() => handleDeleteUnit(deleteUnit.id)}       onCancel={() => setDeleteUnit(null)} />}
      {deleteUser    && <DeleteConfirm name={deleteUser.name}    onConfirm={() => handleDeleteUser(deleteUser.id)}       onCancel={() => setDeleteUser(null)} />}

      {/* Kitchen User Form */}
      {showUserForm && (
        <Modal onClose={() => setShowUserForm(false)} title={editUser ? 'Edit Kitchen User' : 'Add Kitchen User'}>
          <form onSubmit={handleSaveUser}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>Full Name *</label>
              <input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ravi Kumar" style={inputSt} />
            </div>
            {!editUser && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelSt}>Email *</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. ravi@kitchen.com" style={inputSt} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder={editUser ? 'Leave blank to keep current' : 'Min 6 characters'} style={inputSt} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>Role</label>
              <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} style={inputSt}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {!editUser && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelSt}>Kitchen *</label>
                <select value={userForm.kitchenId} onChange={e => setUserForm(f => ({ ...f, kitchenId: e.target.value }))} style={inputSt}>
                  <option value="">— Select kitchen —</option>
                  {kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
            )}
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 4px' }}>
              This user logs in at <strong>/login</strong> with their email and password.
            </p>
            <ModalActions onCancel={() => setShowUserForm(false)} saving={saving} label={editUser ? 'Update' : 'Create User'} accent="#0284c7" />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────────────
const tdSt = { padding: '11px 12px', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9' };

function StatusBadge({ active }) {
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: active ? '#f0fdf4' : '#f1f5f9', color: active ? '#16a34a' : '#6b7280' }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={onEdit} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #bfdbfe', background: '#eff6ff', fontSize: '0.72rem', cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}>Edit</button>
      <button onClick={onDelete} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fef2f2', fontSize: '0.72rem', cursor: 'pointer', color: '#dc2626', fontWeight: 500 }}>Delete</button>
    </div>
  );
}

function Table({ headers, loading, empty, rows, renderRow }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{ padding: '9px 12px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? <tr><td colSpan={headers.length} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            : rows.length === 0
            ? <tr><td colSpan={headers.length} style={{ padding: 36, textAlign: 'center', color: '#94a3b8' }}>{empty}</td></tr>
            : rows.map(renderRow)
          }
        </tbody>
      </table>
    </div>
  );
}
