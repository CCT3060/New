import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { label: 'Recipes', path: '/recipes', icon: '📋' },
  { label: 'Recipe Report', path: '/recipe-report', icon: '📊' },
  { label: 'Menu Planner', path: '/menu-planner', icon: '📅' },
];

export default function Layout() {
  const { user, kitchen, logout } = useAuth();
  const location = useLocation();
  const isEmbed = window.self !== window.top;

  // Build breadcrumb
  const parts = location.pathname.split('/').filter(Boolean);
  const crumbs = parts.map((part, i) => ({
    label: isUuid(part) ? 'Detail' : capitalize(part.replace(/-/g, ' ')),
    path: '/' + parts.slice(0, i + 1).join('/'),
  }));

  if (isEmbed) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
        <Outlet />
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>{kitchen?.name || 'Central Kitchen'}</h2>
          <p>Recipe Management</p>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-label">Modules</div>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.name}</strong>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{formatRole(user?.role)}</span>
          </div>
          {localStorage.getItem('company_token') && (
            <a
              href="/company/dashboard"
              style={{ display: 'block', marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', color: '#059669', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center', border: '1.5px solid #bbf7d0' }}
            >
              ← Company Portal
            </a>
          )}
          <button
            className="btn btn-sm btn-secondary"
            style={{ marginTop: 10, width: '100%' }}
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="/recipes">Home</a>
            {crumbs.map((crumb, i) => (
              <span key={i} style={{ display: 'contents' }}>
                <span className="sep">/</span>
                {i === crumbs.length - 1 ? (
                  <span className="current">{crumb.label}</span>
                ) : (
                  <a href={crumb.path}>{crumb.label}</a>
                )}
              </span>
            ))}
          </nav>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </header>

        <div className={`page-content${location.pathname === '/menu-planner' ? ' page-content--full' : ''}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function isUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRole(role) {
  const map = {
    ADMIN: 'Administrator',
    OPS_MANAGER: 'Ops Manager',
    KITCHEN_MANAGER: 'Kitchen Manager',
    STORE_MANAGER: 'Store Manager',
    APPROVER: 'Head Chef / Approver',
  };
  return map[role] || role;
}
