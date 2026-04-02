/**
 * RecipeListPage
 * Paginated, filterable list of all recipes.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes, useDeleteRecipe } from '../hooks/useRecipes';
import RecipeStatusBadge from '../components/RecipeStatusBadge';
import { useAuth } from '../../../contexts/AuthContext';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT', 'BEVERAGE'];
const CATEGORIES = ['VEG', 'NON_VEG', 'VEGAN'];
const STATUSES = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

const fmtCurrency = (n) => {
  const num = parseFloat(n);
  if (isNaN(num) || num === 0) return '—';
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function RecipeListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = ['ADMIN', 'OPS_MANAGER'].includes(user?.role);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    mealType: '',
    category: '',
    page: 1,
    limit: 20,
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, isError } = useRecipes(filters);
  const { mutateAsync: deleteRecipe, isPending: deleteLoading } = useDeleteRecipe();

  const recipes = data?.recipes || [];
  const pagination = data?.pagination || {};

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDelete = async (id) => {
    await deleteRecipe(id);
    setDeleteConfirm(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header flex justify-between items-center" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Recipes</h1>
          <p style={{ color: 'var(--color-gray-500)', marginTop: 4 }}>
            {pagination.total || 0} recipes found
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => navigate('/recipes/new')}>
            + New Recipe
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Name, code..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Status</label>
            <select className="form-control" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Meal Type</label>
            <select className="form-control" value={filters.mealType} onChange={(e) => setFilter('mealType', e.target.value)}>
              <option value="">All meals</option>
              {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Category</label>
            <select className="form-control" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          {(filters.search || filters.status || filters.mealType || filters.category) && (
            <button type="button" className="btn btn-sm btn-secondary" style={{ marginBottom: 1 }}
              onClick={() => setFilters({ search: '', status: '', mealType: '', category: '', page: 1, limit: 20 })}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isError ? (
        <div className="alert" style={{ color: 'var(--color-danger)', padding: 20 }}>
          Failed to load recipes. Please try again.
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Meal Type</th>
                  <th>Food Type</th>
                  <th>Std. Pax</th>
                  <th>Cost/Pax</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                      ))}
                    </tr>
                  ))
                )}
                {!isLoading && recipes.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)' }}>
                      No recipes found. {canCreate && <span>Click "+ New Recipe" to create one.</span>}
                    </td>
                  </tr>
                )}
                {!isLoading && recipes.map((recipe) => (
                  <tr key={recipe.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/recipes/${recipe.id}`)}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600 }}>
                        {recipe.recipeCode}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{recipe.recipeName}</div>
                      {recipe.cuisineType && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{recipe.cuisineType}</div>
                      )}
                    </td>
                    <td>{recipe.mealType}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: recipe.foodType === 'VEG' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {recipe.foodType}
                      </span>
                    </td>
                    <td className="font-mono">{recipe.standardPax}</td>
                    <td className="font-mono">{fmtCurrency(recipe.latestCost?.costPerPax)}</td>
                    <td>v{recipe.versionNumber}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <RecipeStatusBadge status={recipe.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>
                      {new Date(recipe.updatedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-8">
                        <button type="button" className="btn btn-sm btn-outline"
                          onClick={() => navigate(`/recipes/${recipe.id}`)}>
                          View
                        </button>
                        {canCreate && (
                          <button type="button" className="btn btn-sm btn-outline"
                            onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
                            Edit
                          </button>
                        )}
                        {isAdmin && recipe.status === 'DRAFT' && (
                          <button type="button" className="btn btn-sm btn-icon" style={{ color: 'var(--color-danger)' }}
                            onClick={() => setDeleteConfirm(recipe)}>
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination" style={{ padding: '12px 16px', borderTop: '1px solid var(--color-gray-100)' }}>
              <button className="btn btn-sm btn-secondary" disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                ← Previous
              </button>
              <span style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button className="btn btn-sm btn-secondary" disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Recipe</h3>
              <button type="button" className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>{deleteConfirm.recipeName}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
