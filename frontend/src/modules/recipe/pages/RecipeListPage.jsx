/**
 * RecipeListPage - Professional card-grid recipe browser.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes, useDeleteRecipe } from '../hooks/useRecipes';
import RecipeStatusBadge from '../components/RecipeStatusBadge';
import { useAuth } from '../../../contexts/AuthContext';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT', 'BEVERAGE'];
const CATEGORIES = ['VEG', 'NON_VEG', 'VEGAN', 'EGG'];
const STATUSES = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

const MEAL_ICONS = {
  BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner',
  SNACK: 'Snack', DESSERT: 'Dessert', BEVERAGE: 'Beverage',
};
const FOOD_COLORS = {
  VEG: '#16a34a', NON_VEG: '#dc2626', VEGAN: '#7c3aed', EGG: '#d97706',
};
const FOOD_ICONS = { VEG: 'VEG', NON_VEG: 'NON VEG', VEGAN: 'VEGAN', EGG: 'EGG' };

const fmtCurrency = (n) => {
  const num = parseFloat(n);
  if (isNaN(num) || num === 0) return null;
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function RecipeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = ['ADMIN', 'OPS_MANAGER'].includes(user?.role);

  const [filters, setFilters] = useState({
    search: '', status: '', mealType: '', category: '', page: 1, limit: 18,
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, isError } = useRecipes(filters);
  const { mutateAsync: deleteRecipe, isPending: deleteLoading } = useDeleteRecipe();

  const recipes = data?.recipes || [];
  const pagination = data?.pagination || {};
  const total = pagination.total || 0;

  const statusCounts = recipes.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  const hasFilters = !!(filters.search || filters.status || filters.mealType || filters.category);
  const handleDelete = async (id) => { await deleteRecipe(id); setDeleteConfirm(null); };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Recipes</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: '0.9rem' }}>
            {isLoading ? 'Loading...' : `${total} recipe${total !== 1 ? 's' : ''} in your collection`}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/recipes/new')} style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 4px rgba(37,99,235,0.3)',
          }}>
            + New Recipe
          </button>
        )}
      </div>

      {/* Stats */}
      {!isLoading && total > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: total, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Active', value: (statusCounts['ACTIVE'] || 0) + (statusCounts['APPROVED'] || 0), color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Draft', value: statusCounts['DRAFT'] || 0, color: '#d97706', bg: '#fffbeb' },
            { label: 'Archived', value: statusCounts['ARCHIVED'] || 0, color: '#6b7280', bg: '#f1f5f9' },
          ].map((s) => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 12, padding: '12px 20px', minWidth: 90,
              border: `1px solid ${s.color}22`,
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>SEARCH</label>
          <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Name or code..."
            style={{
              width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
              borderRadius: 8, fontSize: '0.875rem', outline: 'none', background: '#f8fafc', boxSizing: 'border-box',
            }}
          />
        </div>
        {[
          { label: 'STATUS', key: 'status', opts: STATUSES, raw: STATUSES, ph: 'All statuses' },
          { label: 'MEAL TYPE', key: 'mealType', opts: MEAL_TYPES, raw: MEAL_TYPES, ph: 'All meals' },
          { label: 'FOOD TYPE', key: 'category', opts: CATEGORIES.map(c => c.replace('_', ' ')), raw: CATEGORIES, ph: 'All types' },
        ].map(({ label, key, opts, raw, ph }) => (
          <div key={key} style={{ flex: '0 0 140px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>{label}</label>
            <select value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', background: '#f8fafc', outline: 'none' }}>
              <option value="">{ph}</option>
              {opts.map((o, i) => <option key={o} value={raw[i]}>{o}</option>)}
            </select>
          </div>
        ))}
        {hasFilters && (
          <button onClick={() => setFilters({ search: '', status: '', mealType: '', category: '', page: 1, limit: 18 })}
            style={{ padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: '0.8rem', cursor: 'pointer', color: '#64748b' }}>
            œ• Clear
          </button>
        )}
      </div>

      {/* Error */}
      {isError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', color: '#dc2626', marginBottom: 20 }}>
          Failed to load recipes. Please try again.
        </div>
      )}

      {/* Cards Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ background: '#e2e8f0', borderRadius: 14, height: 180, opacity: 0.5 }} />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>Ÿ</div>
          <h3 style={{ color: '#0f172a', fontWeight: 600, margin: '0 0 8px' }}>No recipes found</h3>
          <p style={{ color: '#94a3b8', margin: '0 0 20px' }}>
            {hasFilters ? 'Try adjusting your filters' : 'Start by creating your first recipe'}
          </p>
          {canCreate && !hasFilters && (
            <button onClick={() => navigate('/recipes/new')}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
              + New Recipe
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {recipes.map((recipe) => {
            const cost = fmtCurrency(recipe.latestCost?.costPerPax);
            const foodColor = FOOD_COLORS[recipe.foodType] || '#6b7280';
            return (
              <div key={recipe.id} onClick={() => navigate(`/recipes/${recipe.id}`)}
                style={{
                  background: '#fff', borderRadius: 14, padding: 20,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer',
                  border: '1.5px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 12,
                  position: 'relative', overflow: 'hidden', transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#2563eb44'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#f1f5f9'; }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: foodColor }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>
                    {recipe.recipeCode}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
const MEAL_ICONS = {
                  </span>
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                    {recipe.recipeName}
                  </h3>
                  {recipe.cuisineType && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{recipe.cuisineType}</span>}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: foodColor, background: `${foodColor}15`, padding: '2px 8px', borderRadius: 20 }}>
                    {FOOD_ICONS[recipe.foodType]} {recipe.foodType?.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '2px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                    {recipe.standardPax} pax
                  </span>
                  {cost && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>{cost}<span style={{ fontWeight: 400, color: '#94a3b8' }}>/pax</span></span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RecipeStatusBadge status={recipe.status} />
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>v{recipe.versionNumber}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    {canCreate && (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/recipes/${recipe.id}/edit`); }}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.75rem', cursor: 'pointer', color: '#475569', fontWeight: 500 }}>
                        Edit
                      </button>
                    )}
                    {isAdmin && recipe.status === 'DRAFT' && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(recipe); }}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fef2f2', fontSize: '0.75rem', cursor: 'pointer', color: '#dc2626' }}>
                        Ÿ—‘
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 32 }}>
          <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: filters.page <= 1 ? '#f8fafc' : '#fff', cursor: filters.page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', color: filters.page <= 1 ? '#94a3b8' : '#0f172a' }}>
            † Prev
          </button>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: filters.page >= pagination.totalPages ? '#f8fafc' : '#fff', cursor: filters.page >= pagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', color: filters.page >= pagination.totalPages ? '#94a3b8' : '#0f172a' }}>
            Next †’
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 700 }}>Delete Recipe</h3>
            <p style={{ color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{deleteConfirm.recipeName}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)} disabled={deleteLoading}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

