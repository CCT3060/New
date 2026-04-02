/**
 * MenuPlanListPage — paginated list of all menu plans.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMenuPlans, useDeleteMenuPlan } from '../hooks/useMenuPlanner';
import MealTypeBadge from '../components/MealTypeBadge';
import { useAuth } from '../../../contexts/AuthContext';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'BEVERAGE', 'DESSERT'];

export default function MenuPlanListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = ['ADMIN', 'OPS_MANAGER', 'KITCHEN_MANAGER'].includes(user?.role);

  const [filters, setFilters] = useState({ search: '', mealType: '', page: 1, limit: 20 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data, isLoading, isError } = useMenuPlans(filters);
  const { mutateAsync: deleteMenuPlan, isPending: deleteLoading } = useDeleteMenuPlan();

  const menuPlans = data?.menuPlans || [];
  const pagination = data?.pagination || {};

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const handleDelete = async (id) => {
    await deleteMenuPlan(id);
    setDeleteConfirm(null);
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu Planner</h1>
          <p style={{ color: 'var(--color-gray-500)', marginTop: 4 }}>
            {pagination.total || 0} menu plans
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => navigate('/menu-planner')}>📅 Calendar View</button>
            <button className="btn btn-primary" onClick={() => navigate('/menu-planner/new')}>
              + New Menu Plan
            </button>
          </div>
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
              placeholder="Plan name..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Meal Type</label>
            <select
              className="form-control"
              value={filters.mealType}
              onChange={(e) => setFilter('mealType', e.target.value)}
            >
              <option value="">All meals</option>
              {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: 4 }}>Plan Date</label>
            <input
              type="date"
              className="form-control"
              value={filters.planDate || ''}
              onChange={(e) => setFilter('planDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading && <div className="card"><p style={{ textAlign: 'center', padding: 32, color: 'var(--color-gray-500)' }}>Loading...</p></div>}
      {isError && <div className="card"><p style={{ textAlign: 'center', padding: 32, color: 'var(--color-danger)' }}>Failed to load menu plans.</p></div>}

      {!isLoading && !isError && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {menuPlans.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-gray-500)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>📅</div>
              <p style={{ fontWeight: 500 }}>No menu plans found</p>
              {canManage && (
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/menu-planner/new')}>
                  Create First Menu Plan
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-gray-50)', borderBottom: '2px solid var(--color-gray-200)' }}>
                  {['Plan Name', 'Date', 'Meal Type', 'Recipes', 'Kitchen', 'Created By', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    style={{ borderBottom: '1px solid var(--color-gray-100)', cursor: 'pointer' }}
                    onClick={() => navigate(`/menu-planner/${plan.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-gray-50)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{plan.planName}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-gray-700)' }}>{fmtDate(plan.planDate)}</td>
                    <td style={{ padding: '12px 16px' }}><MealTypeBadge mealType={plan.mealType} /></td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-gray-700)' }}>
                      <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 600, padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem' }}>
                        {plan._count?.items ?? 0} recipes
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>{plan.warehouse?.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>{plan.creator?.name}</td>
                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canManage && (
                          <>
                            <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/menu-planner/${plan.id}/edit`)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(plan.id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--color-gray-100)' }}>
              <button className="btn btn-sm btn-secondary" disabled={filters.page <= 1} onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}>← Prev</button>
              <span style={{ padding: '4px 12px', fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>Page {pagination.page} of {pagination.totalPages}</span>
              <button className="btn btn-sm btn-secondary" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: 380, width: '90%' }}>
            <h3 style={{ marginBottom: 12 }}>Delete Menu Plan?</h3>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: 20 }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={deleteLoading} onClick={() => handleDelete(deleteConfirm)}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
