/**
 * RecipePicker — modal/panel to search and pick recipes for a menu plan.
 */
import { useState } from 'react';
import { useRecipeLookup } from '../hooks/useMenuPlanner';
import MealTypeBadge from './MealTypeBadge';

const FOOD_TYPE_ICONS = { VEG: '🥦', NON_VEG: '🍗', EGG: '🥚', VEGAN: '🌱' };
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'BEVERAGE', 'DESSERT'];

export default function RecipePicker({ onAdd, alreadyAdded = [], mealTypeFilter }) {
  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState(mealTypeFilter || '');

  const { data, isLoading } = useRecipeLookup({ search, mealType, limit: 50 });
  const recipes = data?.recipes || [];

  const isAdded = (id) => alreadyAdded.includes(id);

  return (
    <div>
      {/* Search & filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          className="form-control"
          placeholder="Search recipe name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          className="form-control"
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          style={{ width: 150 }}
        >
          <option value="">All meal types</option>
          {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {isLoading && <div style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: 20 }}>Loading recipes...</div>}

      {!isLoading && recipes.length === 0 && (
        <div style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: 20 }}>
          No approved recipes found. Create and approve recipes in the Recipes module first.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-gray-200)',
              background: isAdded(recipe.id) ? 'var(--color-gray-50)' : '#fff',
              opacity: isAdded(recipe.id) ? 0.6 : 1,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{recipe.recipeName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{recipe.recipeCode}</span>
                <span title={recipe.foodType}>{FOOD_TYPE_ICONS[recipe.foodType] || ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <MealTypeBadge mealType={recipe.mealType} />
                {recipe.cuisineType && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{recipe.cuisineType}</span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                  {recipe.standardPax} pax
                </span>
              </div>
            </div>
            <button
              className={`btn btn-sm ${isAdded(recipe.id) ? 'btn-secondary' : 'btn-primary'}`}
              disabled={isAdded(recipe.id)}
              onClick={() => !isAdded(recipe.id) && onAdd(recipe)}
            >
              {isAdded(recipe.id) ? 'Added' : '+ Add'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
