/**
 * MenuPlanForm — shared create/edit form for menu plans.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RecipePicker from '../components/RecipePicker';
import MealTypeBadge from '../components/MealTypeBadge';
import {
  useCreateMenuPlan,
  useUpdateMenuPlan,
  useAddMenuPlanItem,
  useRemoveMenuPlanItem,
} from '../hooks/useMenuPlanner';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'BEVERAGE', 'DESSERT'];
const FOOD_TYPE_ICONS = { VEG: '🥦', NON_VEG: '🍗', EGG: '🥚', VEGAN: '🌱' };
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const today = () => new Date().toISOString().split('T')[0];

export default function MenuPlanForm({ existingPlan, warehouseId }) {
  const navigate = useNavigate();
  const isEdit = !!existingPlan;

  const [form, setForm] = useState({
    planName: existingPlan?.planName || '',
    planDate: existingPlan?.planDate ? existingPlan.planDate.split('T')[0] : today(),
    mealType: existingPlan?.mealType || 'LUNCH',
    description: existingPlan?.description || '',
    unitId: existingPlan?.unitId || '',
  });

  const [units, setUnits] = useState([]);

  useEffect(() => {
    // Fetch delivery units for this company (requires ck_token which includes companyId)
    const token = localStorage.getItem('ck_token');
    if (!token || token === 'undefined') return;
    fetch(`${BASE}/menu-planner/delivery-units`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setUnits(d.data?.units || []); })
      .catch(() => {});
  }, []);

  const [selectedRecipes, setSelectedRecipes] = useState(
    existingPlan?.items?.map((item) => ({ ...item.recipe, itemId: item.id, servings: item.servings, notes: item.notes })) || []
  );
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState({});

  const { mutateAsync: createPlan, isPending: creating } = useCreateMenuPlan();
  const { mutateAsync: updatePlan, isPending: updating } = useUpdateMenuPlan();

  const validate = () => {
    const e = {};
    if (!form.planName.trim()) e.planName = 'Plan name is required';
    if (!form.planDate) e.planDate = 'Date is required';
    if (!form.mealType) e.mealType = 'Meal type is required';
    return e;
  };

  const handleAddRecipe = (recipe) => {
    if (selectedRecipes.find((r) => r.id === recipe.id)) return;
    setSelectedRecipes((prev) => [...prev, { ...recipe, servings: 1, notes: '' }]);
  };

  const handleRemoveRecipe = (recipeId) => {
    setSelectedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  };

  const handleServingsChange = (recipeId, value) => {
    setSelectedRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, servings: parseInt(value, 10) || 1 } : r))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      ...form,
      items: selectedRecipes.map((r, idx) => ({
        recipeId: r.id,
        servings: r.servings || 1,
        notes: r.notes || null,
        sortOrder: idx,
      })),
    };

    if (isEdit) {
      await updatePlan({ id: existingPlan.id, data: form });
      navigate(`/menu-planner/${existingPlan.id}`);
    } else {
      const created = await createPlan(payload);
      navigate(`/menu-planner/${created.id}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Menu Plan' : 'New Menu Plan'}</h1>
          <p style={{ color: 'var(--color-gray-500)', marginTop: 4 }}>
            {isEdit ? `Editing: ${existingPlan.planName}` : 'Plan meals by linking approved recipes'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left — Plan Details */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Plan Details</span></div>

              <div className="form-group">
                <label className="form-label required">Plan Name</label>
                <input
                  className={`form-control${errors.planName ? ' error' : ''}`}
                  value={form.planName}
                  onChange={(e) => setForm((p) => ({ ...p, planName: e.target.value }))}
                  placeholder="e.g. Monday Lunch Menu"
                />
                {errors.planName && <p className="form-error">{errors.planName}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label required">Plan Date</label>
                  <input
                    type="date"
                    className={`form-control${errors.planDate ? ' error' : ''}`}
                    value={form.planDate}
                    onChange={(e) => setForm((p) => ({ ...p, planDate: e.target.value }))}
                  />
                  {errors.planDate && <p className="form-error">{errors.planDate}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label required">Meal Type</label>
                  <select
                    className={`form-control${errors.mealType ? ' error' : ''}`}
                    value={form.mealType}
                    onChange={(e) => setForm((p) => ({ ...p, mealType: e.target.value }))}
                  >
                    {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional notes about this menu plan..."
                />
              </div>

              {units.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Delivery Unit</label>
                  <select
                    className="form-control"
                    value={form.unitId}
                    onChange={(e) => setForm((p) => ({ ...p, unitId: e.target.value }))}
                  >
                    <option value="">— All Units / Unassigned —</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}{u.code ? ` (${u.code})` : ''}</option>)}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: 4 }}>
                    Assign this menu plan to a specific delivery unit
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={creating || updating}>
                {creating || updating ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Menu Plan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/menu-planner')}>
                Cancel
              </button>
            </div>
          </div>

          {/* Right — Recipe Selection */}
          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Recipes ({selectedRecipes.length})</span>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowPicker((p) => !p)}>
                  {showPicker ? 'Hide Recipe List' : '+ Add Recipes'}
                </button>
              </div>

              {showPicker && (
                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-gray-100)' }}>
                  <RecipePicker
                    onAdd={handleAddRecipe}
                    alreadyAdded={selectedRecipes.map((r) => r.id)}
                    mealTypeFilter={form.mealType}
                  />
                </div>
              )}

              {selectedRecipes.length === 0 ? (
                <p style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: '20px 0' }}>
                  No recipes added yet. Click "Add Recipes" to browse approved recipes.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--color-gray-200)',
                        background: 'var(--color-gray-50)',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{recipe.recipeName}</span>
                          <span title={recipe.foodType}>{FOOD_TYPE_ICONS[recipe.foodType] || ''}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <MealTypeBadge mealType={recipe.mealType} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{recipe.recipeCode}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)' }}>Servings</label>
                        <input
                          type="number"
                          min={1}
                          value={recipe.servings}
                          onChange={(e) => handleServingsChange(recipe.id, e.target.value)}
                          style={{ width: 60, padding: '4px 8px', border: '1px solid var(--color-gray-300)', borderRadius: 4, fontSize: '0.875rem' }}
                        />
                        <button
                          type="button"
                          className="btn btn-icon"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleRemoveRecipe(recipe.id)}
                          title="Remove recipe"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
