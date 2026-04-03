/**
 * RecipeReportPage - Full table report of all recipes with CRUD operations.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes, useDeleteRecipe } from '../hooks/useRecipes';
import RecipeStatusBadge from '../components/RecipeStatusBadge';
import { useAuth } from '../../../contexts/AuthContext';

const STATUSES = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const FOOD_TYPES = ['VEG', 'NON_VEG', 'VEGAN', 'EGG'];
const FOOD_COLORS = { VEG: '#16a34a', NON_VEG: '#dc2626', VEGAN: '#7c3aed', EGG: '#d97706' };

const fmtCurrency = (n) => {
  const num = parseFloat(n);
  if (isNaN(num) || num === 0) return '—';
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const colStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '0.82rem',
  color: '#374151',
  verticalAlign: 'middle',
};
const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  background: '#f8fafc',
  borderBottom: '2px solid #e2e8f0',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
};

export default function RecipeReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = ['ADMIN', 'OPS_MANAGER'].includes(user?.role);

  const [filters, setFilters] = useState({
    search: '', status: '', category: '', page: 1, limit: 30,
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, isError } = useRecipes(filters);
  const { mutateAsync: deleteRecipe, isPending: deleteLoading } = useDeleteRecipe();

  const recipes = data?.recipes || [];
  const pagination = data?.pagination || {};
  const total = pagination.total || 0;

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const hasFilters = !!(filters.search || filters.status || filters.category);
  const handleDelete = async (id) => { await deleteRecipe(id); setDeleteConfirm(null); };

  const handleExportCSV = () => {
    const rows = [['Recipe Code', 'Recipe Name', 'Food Type', 'Status', 'Std Pax', 'Yield Qty', 'Yield Unit', 'Version', 'Cost/Pax']];
    recipes.forEach((r) => {
      rows.push([
        r.recipeCode, r.recipeName,
        r.foodType?.replace('_', ' '), r.status,
        r.standardPax, r.yieldQty, r.yieldUnit,
        `v${r.versionNumber}`,
        r.latestCost?.costPerPax ? parseFloat(r.latestCost.costPerPax).toFixed(2) : '',
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipe-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Recipe Report</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: '0.875rem' }}>
            {isLoading ? 'Loading...' : `${total} recipe${total !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            style={{ padding: '9px 18px', border: '1.5px solid #16a34a', borderRadius: 9, background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            ⬇ Export CSV
          </button>
          {canCreate && (
            <button
              onClick={() => navigate('/recipes/new')}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              + New Recipe
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '14px 18px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5, letterSpacing: '0.05em' }}>SEARCH</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Name or code..."
            style={{ width: '100%', padding: '7px 11px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: '0.85rem', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
          />
        </div>
        {[
          { label: 'STATUS', key: 'status', opts: STATUSES, ph: 'All statuses' },
          { label: 'FOOD TYPE', key: 'category', opts: FOOD_TYPES, ph: 'All types' },
        ].map(({ label, key, opts, ph }) => (
          <div key={key} style={{ flex: '0 0 150px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5, letterSpacing: '0.05em' }}>{label}</label>
            <select
              value={filters[key]}
              onChange={(e) => setFilter(key, e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: '0.85rem', background: '#f8fafc', outline: 'none' }}
            >
              <option value="">{ph}</option>
              {opts.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
            </select>
          </div>
        ))}
        {hasFilters && (
          <button
            onClick={() => setFilters({ search: '', status: '', category: '', page: 1, limit: 30 })}
            style={{ padding: '7px 14px', border: '1.5px solid #e2e8f0', borderRadius: 7, background: '#fff', fontSize: '0.8rem', cursor: 'pointer', color: '#64748b', alignSelf: 'flex-end' }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Error */}
      {isError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', color: '#dc2626', marginBottom: 16 }}>
          Failed to load recipes. Please try again.
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr>
                {['#', 'Code', 'Recipe Name', 'Food Type', 'Std Pax', 'Yield', 'Status', 'Version', 'Cost / Pax', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} style={colStyle}>
                        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 16, width: '70%', opacity: 0.5 }} />
                      </td>
                    ))}
                  </tr>
                ))
                : recipes.length === 0
                ? (
                  <tr>
                    <td colSpan={10} style={{ ...colStyle, textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                      {hasFilters ? 'No recipes match your filters.' : 'No recipes yet. Click + New Recipe to get started.'}
                    </td>
                  </tr>
                )
                : recipes.map((recipe, idx) => {
                  const foodColor = FOOD_COLORS[recipe.foodType] || '#6b7280';
                  const rowIdx = (filters.page - 1) * filters.limit + idx + 1;
                  return (
                    <tr
                      key={recipe.id}
                      style={{ transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ ...colStyle, color: '#94a3b8', width: 40 }}>{rowIdx}</td>
                      <td style={{ ...colStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {recipe.recipeCode}
                      </td>
                      <td style={{ ...colStyle, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }} onClick={() => navigate(`/recipes/${recipe.id}`)}>
                        {recipe.recipeName}
                        {recipe.cuisineType && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>{recipe.cuisineType}</div>
                        )}
                      </td>
                      <td style={colStyle}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: foodColor, background: `${foodColor}18`, padding: '2px 8px', borderRadius: 20 }}>
                          {recipe.foodType?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ ...colStyle, textAlign: 'center' }}>{recipe.standardPax}</td>
                      <td style={{ ...colStyle, whiteSpace: 'nowrap' }}>
                        {recipe.yieldQty} {recipe.yieldUnit}
                      </td>
                      <td style={colStyle}>
                        <RecipeStatusBadge status={recipe.status} />
                      </td>
                      <td style={{ ...colStyle, color: '#94a3b8', fontSize: '0.75rem' }}>v{recipe.versionNumber}</td>
                      <td style={{ ...colStyle, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {fmtCurrency(recipe.latestCost?.costPerPax)}
                      </td>
                      <td style={{ ...colStyle, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => navigate(`/recipes/${recipe.id}`)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.72rem', cursor: 'pointer', color: '#475569', fontWeight: 500 }}
                          >
                            View
                          </button>
                          {canCreate && (
                            <button
                              onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #bfdbfe', background: '#eff6ff', fontSize: '0.72rem', cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}
                            >
                              Edit
                            </button>
                          )}
                          {isAdmin && recipe.status === 'DRAFT' && (
                            <button
                              onClick={() => setDeleteConfirm(recipe)}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fef2f2', fontSize: '0.72rem', cursor: 'pointer', color: '#dc2626', fontWeight: 500 }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {(filters.page - 1) * filters.limit + 1}–{Math.min(filters.page * filters.limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: filters.page <= 1 ? '#f8fafc' : '#fff', cursor: filters.page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: filters.page <= 1 ? '#94a3b8' : '#0f172a' }}
              >
                ← Prev
              </button>
              <span style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#64748b' }}>
                {filters.page} / {pagination.totalPages}
              </span>
              <button
                disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: filters.page >= pagination.totalPages ? '#f8fafc' : '#fff', cursor: filters.page >= pagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', color: filters.page >= pagination.totalPages ? '#94a3b8' : '#0f172a' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, padding: 28, width: 380, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700 }}>Delete Recipe</h3>
            <p style={{ color: '#64748b', margin: '0 0 22px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{deleteConfirm.recipeName}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)} disabled={deleteLoading}
                style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
