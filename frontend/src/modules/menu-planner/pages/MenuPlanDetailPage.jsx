/**
 * MenuPlanDetailPage — view a menu plan and manage its recipe items.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenuPlan, useAddMenuPlanItem, useRemoveMenuPlanItem, useUpdateMenuPlanItem } from '../hooks/useMenuPlanner';
import MealTypeBadge from '../components/MealTypeBadge';
import RecipePicker from '../components/RecipePicker';
import { useAuth } from '../../../contexts/AuthContext';

const FOOD_TYPE_ICONS = { VEG: '🥦', NON_VEG: '🍗', EGG: '🥚', VEGAN: '🌱' };

export default function MenuPlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = ['ADMIN', 'OPS_MANAGER', 'KITCHEN_MANAGER'].includes(user?.role);

  const { data: menuPlan, isLoading, isError } = useMenuPlan(id);
  const { mutateAsync: addItem, isPending: addingItem } = useAddMenuPlanItem(id);
  const { mutateAsync: removeItem } = useRemoveMenuPlanItem(id);
  const { mutateAsync: updateItem } = useUpdateMenuPlanItem(id);

  const [showPicker, setShowPicker] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [editingServings, setEditingServings] = useState({});

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (isLoading) return <div className="card"><p style={{ textAlign: 'center', padding: 32 }}>Loading...</p></div>;
  if (isError) return <div className="card"><p style={{ textAlign: 'center', padding: 32, color: 'var(--color-danger)' }}>Failed to load menu plan.</p></div>;

  const items = menuPlan?.items || [];
  const addedRecipeIds = items.map((item) => item.recipeId);

  const handleAddRecipe = async (recipe) => {
    await addItem({ recipeId: recipe.id, servings: 1 });
  };

  const handleRemove = async (itemId) => {
    await removeItem(itemId);
    setRemoveConfirm(null);
  };

  const handleServingsSave = async (itemId, servings) => {
    await updateItem({ itemId, data: { servings: parseInt(servings, 10) || 1 } });
    setEditingServings((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{menuPlan?.planName}</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
            <MealTypeBadge mealType={menuPlan?.mealType} />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>📅 {fmtDate(menuPlan?.planDate)}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>🏭 {menuPlan?.warehouse?.name}</span>
          </div>
          {menuPlan?.description && (
            <p style={{ color: 'var(--color-gray-500)', marginTop: 6, fontSize: '0.875rem' }}>{menuPlan.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/menu-planner')}>← Back</button>
          {canManage && (
            <button className="btn btn-primary" onClick={() => navigate(`/menu-planner/${id}/edit`)}>Edit Plan</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{items.length}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>Total Recipes</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>
            {items.filter((i) => i.recipe?.foodType === 'VEG' || i.recipe?.foodType === 'VEGAN').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>Veg / Vegan</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)' }}>
            {items.reduce((sum, i) => sum + (i.servings || 1), 0)}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>Total Servings</div>
        </div>
      </div>

      {/* Recipe Items */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recipes in this Plan</span>
          {canManage && (
            <button className="btn btn-sm btn-primary" onClick={() => setShowPicker((p) => !p)}>
              {showPicker ? 'Hide Picker' : '+ Add Recipe'}
            </button>
          )}
        </div>

        {/* Recipe Picker */}
        {showPicker && (
          <div style={{ marginBottom: 20, padding: 16, background: 'var(--color-gray-50)', borderRadius: 8 }}>
            <h4 style={{ marginBottom: 12, fontSize: '0.9rem', fontWeight: 600 }}>Browse Approved Recipes</h4>
            <RecipePicker
              onAdd={handleAddRecipe}
              alreadyAdded={addedRecipeIds}
              mealTypeFilter={menuPlan?.mealType}
            />
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-gray-500)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🍽️</div>
            <p style={{ fontWeight: 500 }}>No recipes in this plan yet</p>
            {canManage && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowPicker(true)}>
                Add Recipes
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-50)', borderBottom: '2px solid var(--color-gray-200)' }}>
                {['#', 'Recipe', 'Code', 'Meal Type', 'Food Type', 'Std Pax', 'Servings', canManage ? 'Actions' : ''].filter(Boolean).map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--color-gray-500)', fontSize: '0.85rem' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{item.recipe?.recipeName}</div>
                    {item.notes && <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{item.notes}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-gray-500)', fontFamily: 'var(--font-mono)' }}>
                    {item.recipe?.recipeCode}
                  </td>
                  <td style={{ padding: '12px 16px' }}><MealTypeBadge mealType={item.recipe?.mealType} /></td>
                  <td style={{ padding: '12px 16px', fontSize: '1.1rem' }} title={item.recipe?.foodType}>
                    {FOOD_TYPE_ICONS[item.recipe?.foodType] || item.recipe?.foodType}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--color-gray-700)' }}>
                    {item.recipe?.standardPax} pax
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {canManage ? (
                      editingServings[item.id] !== undefined ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            value={editingServings[item.id]}
                            onChange={(e) => setEditingServings((p) => ({ ...p, [item.id]: e.target.value }))}
                            style={{ width: 60, padding: '4px 8px', border: '1px solid var(--color-gray-300)', borderRadius: 4, fontSize: '0.875rem' }}
                          />
                          <button className="btn btn-sm btn-success" onClick={() => handleServingsSave(item.id, editingServings[item.id])}>✓</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setEditingServings((p) => { const n = { ...p }; delete n[item.id]; return n; })}>✕</button>
                        </div>
                      ) : (
                        <span
                          style={{ cursor: 'pointer', fontWeight: 600, borderBottom: '1px dashed var(--color-gray-400)' }}
                          onClick={() => setEditingServings((p) => ({ ...p, [item.id]: item.servings }))}
                          title="Click to edit"
                        >
                          {item.servings}
                        </span>
                      )
                    ) : (
                      <span style={{ fontWeight: 600 }}>{item.servings}</span>
                    )}
                  </td>
                  {canManage && (
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setRemoveConfirm(item.id)}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Remove Confirm Modal */}
      {removeConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: 360, width: '90%' }}>
            <h3 style={{ marginBottom: 12 }}>Remove Recipe?</h3>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: 20 }}>Remove this recipe from the menu plan?</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setRemoveConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleRemove(removeConfirm)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
