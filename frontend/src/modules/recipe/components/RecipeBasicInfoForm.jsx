/**
 * RecipeBasicInfoForm
 * Section 1 of the recipe create/edit form — header fields
 */
import { useState } from 'react';
import { useWarehouses } from '../hooks/useRecipes';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'BEVERAGE', 'DESSERT'];
const FOOD_TYPES = [
  { value: 'VEG', label: 'Veg' },
  { value: 'NON_VEG', label: 'Non-Veg' },
  { value: 'EGG', label: 'Egg' },
  { value: 'VEGAN', label: 'Vegan' },
];
const CATEGORIES = [
  'Breakfast', 'Starters', 'Main Course', 'Side Dish', 'Rice & Biryani',
  'Breads', 'Soups', 'Salads', 'Desserts', 'Beverages', 'Snacks',
  'Condiments', 'Dairy', 'General', 'Rice Dishes', 'Curries', 'Dal',
  'Light Meals', 'Other',
];
const YIELD_UNITS = ['kg', 'g', 'litre', 'ml', 'pcs', 'portion', 'serving', 'cup', 'tbsp', 'tsp', 'nos', 'batch', 'tray'];

export default function RecipeBasicInfoForm({ register, errors, watch, setValue, disabled = false, isEditMode = false, onStatusChange, statusLoading }) {
  const { data: warehousesData = [], isLoading: warehousesLoading } = useWarehouses();
  const warehouses = warehousesData?.warehouses ?? (Array.isArray(warehousesData) ? warehousesData : []);
  const currentStatus = watch('status');
  const currentYieldUnit = watch('yieldUnit');
  const currentCategory = watch('category');
  const currentMealType = watch('mealType');
  const currentFoodType = watch('foodType');

  const KNOWN_FOOD_TYPES = [...FOOD_TYPES.map(f => f.value), 'JAIN', 'KETO', 'SATVIK', ''];
  // Detect if stored value is not in the standard enum list
  const isCustomCategory = currentCategory && !CATEGORIES.includes(currentCategory);
  const isCustomMealType = currentMealType && !MEAL_TYPES.includes(currentMealType?.toUpperCase?.());
  const isCustomFoodType = currentFoodType && !KNOWN_FOOD_TYPES.includes(currentFoodType);
  const isCustomYieldUnit = currentYieldUnit && !YIELD_UNITS.includes(currentYieldUnit);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, color: 'var(--color-gray-700)', margin: 0 }}>Basic Information</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>Status:</span>
          {isEditMode && onStatusChange ? (
            // Edit mode: live toggle buttons that call API
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                disabled={statusLoading || currentStatus === 'ACTIVE'}
                onClick={() => onStatusChange('ACTIVE')}
                style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: currentStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-gray-100)',
                  color: currentStatus === 'ACTIVE' ? '#fff' : 'var(--color-gray-500)',
                  opacity: statusLoading ? 0.6 : 1,
                }}
              >
                ● Active
              </button>
              <button
                type="button"
                disabled={statusLoading || currentStatus === 'INACTIVE'}
                onClick={() => onStatusChange('INACTIVE')}
                style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: currentStatus === 'INACTIVE' ? 'var(--color-danger)' : 'var(--color-gray-100)',
                  color: currentStatus === 'INACTIVE' ? '#fff' : 'var(--color-gray-500)',
                  opacity: statusLoading ? 0.6 : 1,
                }}
              >
                ○ Inactive
              </button>
            </div>
          ) : (
            // Create mode: part of form submission
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setValue('status', 'ACTIVE')}
                disabled={disabled}
                style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: currentStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-gray-100)',
                  color: currentStatus === 'ACTIVE' ? '#fff' : 'var(--color-gray-500)',
                }}
              >
                ● Active
              </button>
              <button
                type="button"
                onClick={() => setValue('status', 'INACTIVE')}
                disabled={disabled}
                style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: currentStatus === 'INACTIVE' ? 'var(--color-danger)' : 'var(--color-gray-100)',
                  color: currentStatus === 'INACTIVE' ? '#fff' : 'var(--color-gray-500)',
                }}
              >
                ○ Inactive
              </button>
            </div>
          )}
          {/* Hidden input so status is included in form data */}
          <input type="hidden" {...register('status')} />
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label required" htmlFor="recipeCode">Recipe Code</label>
          <input
            id="recipeCode"
            type="text"
            className={`form-control ${errors.recipeCode ? 'error' : ''}`}
            placeholder="e.g. REC-VEG-PULAO-001"
            disabled={disabled}
            {...register('recipeCode')}
          />
          {errors.recipeCode && <p className="form-error">{errors.recipeCode.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label required" htmlFor="recipeName">Recipe Name</label>
          <input
            id="recipeName"
            type="text"
            className={`form-control ${errors.recipeName ? 'error' : ''}`}
            placeholder="e.g. Veg Pulao"
            disabled={disabled}
            {...register('recipeName')}
          />
          {errors.recipeName && <p className="form-error">{errors.recipeName.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label required" htmlFor="category">Category</label>
          {isCustomCategory ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                id="category"
                type="text"
                className={`form-control ${errors.category ? 'error' : ''}`}
                disabled={disabled}
                {...register('category')}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => setValue('category', '')} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem' }}>↩</button>
            </div>
          ) : (
            <select id="category" className={`form-control ${errors.category ? 'error' : ''}`} disabled={disabled}
              value={currentCategory || ''}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setValue('category', 'Custom', { shouldDirty: true });
                } else {
                  setValue('category', e.target.value, { shouldDirty: true });
                }
              }}
              {...(() => { const { ref } = register('category'); return { ref }; })()}
            >
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">+ Add Custom...</option>
            </select>
          )}
          {errors.category && <p className="form-error">{errors.category.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label required" htmlFor="mealType">Meal Type</label>
          {isCustomMealType ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                id="mealType"
                type="text"
                className={`form-control ${errors.mealType ? 'error' : ''}`}
                disabled={disabled}
                {...register('mealType')}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => setValue('mealType', 'LUNCH')} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem' }}>↩</button>
            </div>
          ) : (
            <select id="mealType" className={`form-control ${errors.mealType ? 'error' : ''}`} disabled={disabled}
              value={currentMealType || ''}
              onChange={(e) => {
                if (e.target.value === '__custom_meal__') {
                  setValue('mealType', 'Custom', { shouldDirty: true });
                } else {
                  setValue('mealType', e.target.value, { shouldDirty: true });
                }
              }}
              {...(() => { const { ref } = register('mealType'); return { ref }; })()}
            >
              <option value="">Select meal type...</option>
              {MEAL_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              <option value="__custom_meal__">+ Add Custom...</option>
            </select>
          )}
          {errors.mealType && <p className="form-error">{errors.mealType.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label required" htmlFor="foodType">Food Type</label>
          {isCustomFoodType ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                id="foodType"
                type="text"
                className={`form-control ${errors.foodType ? 'error' : ''}`}
                disabled={disabled}
                {...register('foodType')}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => setValue('foodType', 'VEG')} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem' }}>↩</button>
            </div>
          ) : (
            <select id="foodType" className={`form-control ${errors.foodType ? 'error' : ''}`} disabled={disabled}
              value={currentFoodType || ''}
              onChange={(e) => {
                if (e.target.value === '__custom_food__') {
                  setValue('foodType', 'Custom', { shouldDirty: true });
                } else {
                  setValue('foodType', e.target.value, { shouldDirty: true });
                }
              }}
              {...(() => { const { ref } = register('foodType'); return { ref }; })()}
            >
              <option value="">Select food type...</option>
              {FOOD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              <option value="JAIN">Jain</option>
              <option value="KETO">Keto</option>
              <option value="SATVIK">Satvik</option>
              <option value="__custom_food__">+ Add Custom...</option>
            </select>
          )}
          {errors.foodType && <p className="form-error">{errors.foodType.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cuisineType">Cuisine Type</label>
          <input
            id="cuisineType"
            type="text"
            className="form-control"
            placeholder="e.g. North Indian"
            disabled={disabled}
            {...register('cuisineType')}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="warehouseId">Kitchen / Warehouse</label>
          <select id="warehouseId" className={`form-control ${errors.warehouseId ? 'error' : ''}`} disabled={disabled || warehousesLoading} {...register('warehouseId')}>
            <option value="">-- Auto assign --</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ''}</option>)}
          </select>
          {errors.warehouseId && <p className="form-error">{errors.warehouseId.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label required" htmlFor="standardPax">Standard Pax (portions)</label>
          <input
            id="standardPax"
            type="number"
            className={`form-control ${errors.standardPax ? 'error' : ''}`}
            placeholder="100"
            min="1"
            disabled={disabled}
            {...register('standardPax', { valueAsNumber: true })}
          />
          {errors.standardPax && <p className="form-error">{errors.standardPax.message}</p>}
        </div>
      </div>

      <div className="form-grid form-grid-3">
        <div className="form-group">
          <label className="form-label required" htmlFor="yieldQty">Yield Qty</label>
          <input
            id="yieldQty"
            type="number"
            step="0.001"
            className={`form-control ${errors.yieldQty ? 'error' : ''}`}
            placeholder="25"
            disabled={disabled}
            {...register('yieldQty', { valueAsNumber: true })}
          />
          {errors.yieldQty && <p className="form-error">{errors.yieldQty.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label required" htmlFor="yieldUnit">Yield Unit</label>
          {isCustomYieldUnit ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                id="yieldUnit"
                type="text"
                className={`form-control ${errors.yieldUnit ? 'error' : ''}`}
                disabled={disabled}
                {...register('yieldUnit')}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => setValue('yieldUnit', 'kg')} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem' }}>↩</button>
            </div>
          ) : (
            <select id="yieldUnit" className={`form-control ${errors.yieldUnit ? 'error' : ''}`} disabled={disabled}
              value={currentYieldUnit || ''}
              onChange={(e) => {
                if (e.target.value === '__custom_yield__') {
                  setValue('yieldUnit', 'custom', { shouldDirty: true });
                } else {
                  setValue('yieldUnit', e.target.value, { shouldDirty: true });
                }
              }}
              {...(() => { const { ref } = register('yieldUnit'); return { ref }; })()}
            >
              <option value="">Select unit...</option>
              {YIELD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              <option value="__custom_yield__">+ Add Custom...</option>
            </select>
          )}
          {errors.yieldUnit && <p className="form-error">{errors.yieldUnit.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label required" htmlFor="portionPerPax">Portion per Pax (g/ml)</label>
          <input
            id="portionPerPax"
            type="number"
            step="0.001"
            className={`form-control ${errors.portionPerPax ? 'error' : ''}`}
            placeholder="250"
            disabled={disabled}
            {...register('portionPerPax', { valueAsNumber: true })}
          />
          {errors.portionPerPax && <p className="form-error">{errors.portionPerPax.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="prepTimeMin">Prep Time (min)</label>
          <input
            id="prepTimeMin"
            type="number"
            className="form-control"
            placeholder="30"
            min="0"
            disabled={disabled}
            {...register('prepTimeMin', { valueAsNumber: true })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cookTimeMin">Cook Time (min)</label>
          <input
            id="cookTimeMin"
            type="number"
            className="form-control"
            placeholder="45"
            min="0"
            disabled={disabled}
            {...register('cookTimeMin', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="description">Description / Notes</label>
        <textarea
          id="description"
          className="form-control"
          rows="3"
          placeholder="Brief description of the dish, its origin, or special notes..."
          disabled={disabled}
          {...register('description')}
        />
      </div>
    </div>
  );
}
