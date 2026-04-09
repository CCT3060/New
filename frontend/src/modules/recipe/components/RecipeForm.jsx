/**
 * RecipeForm
 * Tabbed wrapper that combines all recipe sections.
 * Used by both RecipeCreatePage and RecipeEditPage.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import RecipeBasicInfoForm from './RecipeBasicInfoForm';
import RecipeIngredientsTable from './RecipeIngredientsTable';
import RecipeCostSummary from './RecipeCostSummary';
import {
  useAddIngredient,
  useUpdateIngredient,
  useRemoveIngredient,
  useRecipeCosting,
  useRecalculateCosting,
  useChangeStatus,
} from '../hooks/useRecipes';

const recipeSchema = z.object({
  recipeCode: z.string().min(3, 'Recipe code required').max(50),
  recipeName: z.string().min(3, 'Recipe name required').max(200),
  category: z.string().min(1, 'Category required'),
  mealType: z.string().min(1, 'Meal type required'),
  foodType: z.string().min(1, 'Food type required'),
  cuisineType: z.string().optional().or(z.literal('')),
  warehouseId: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).default('ACTIVE'),
  standardPax: z.coerce.number().int().positive('Standard pax must be positive'),
  yieldQty: z.coerce.number().positive('Yield qty required'),
  yieldUnit: z.string().min(1, 'Yield unit required'),
  portionPerPax: z.coerce.number().positive('Portion must be positive'),
  prepTimeMin: z.coerce.number().int().min(0).optional(),
  cookTimeMin: z.coerce.number().int().min(0).optional(),
  description: z.string().optional().or(z.literal('')),
});

const TABS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'costing', label: 'Costing' },
];

export default function RecipeForm({
  recipe = null,       // null = create mode
  onSubmit,
  submitLoading,
  disabled = false,
}) {
  const [activeTab, setActiveTab] = useState('basic');
  const isEditMode = !!recipe;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(recipeSchema),
    defaultValues: recipe
      ? {
          recipeCode: recipe.recipeCode,
          recipeName: recipe.recipeName,
          category: recipe.category,
          mealType: recipe.mealType,
          foodType: recipe.foodType,
          cuisineType: recipe.cuisineType || '',
          warehouseId: recipe.warehouseId || '',
          status: ['ACTIVE', 'INACTIVE'].includes(recipe.status) ? recipe.status : 'ACTIVE',
          standardPax: recipe.standardPax,
          yieldQty: recipe.yieldQty,
          yieldUnit: recipe.yieldUnit || 'kg',
          portionPerPax: recipe.portionPerPax || 1,
          prepTimeMin: recipe.prepTimeMin ?? '',
          cookTimeMin: recipe.cookTimeMin ?? '',
          description: recipe.description || '',
        }
      : {
          recipeCode: '',
          recipeName: '',
          category: '',
          mealType: '',
          foodType: 'VEG',
          cuisineType: '',
          warehouseId: '',
          status: 'ACTIVE',
          standardPax: 100,
          yieldQty: '',
          yieldUnit: 'kg',
          portionPerPax: 1,
          prepTimeMin: '',
          cookTimeMin: '',
          description: '',
        },
    mode: 'onTouched',
  });

  const recipeId = recipe?.id;
  const warehouseId = watch('warehouseId');

  // Ingredient mutations
  const { mutateAsync: addIngredient, isPending: addIngLoading } = useAddIngredient(recipeId);
  const { mutateAsync: updateIngredient, isPending: updIngLoading } = useUpdateIngredient(recipeId);
  const { mutateAsync: removeIngredient, isPending: remIngLoading } = useRemoveIngredient(recipeId);

  // Costing
  const { data: costingData } = useRecipeCosting(recipeId);
  const { mutateAsync: recalculate, isPending: recalcLoading } = useRecalculateCosting(recipeId);

  // Status toggle
  const { mutateAsync: changeStatus, isPending: statusLoading } = useChangeStatus(recipeId);

  // Guards for ingredient tab in create mode (need recipe to exist first)
  const needsSave = !isEditMode;
  const isReadOnlyStatus = false;

  const canEditContent = !disabled && !isReadOnlyStatus;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {/* Show error indicator on Basic Info tab */}
            {tab.id === 'basic' && Object.keys(errors).length > 0 && (
              <span style={{ marginLeft: 4, color: 'var(--color-danger)', fontSize: '0.7rem' }}>●</span>
            )}
          </button>
        ))}
      </div>

      <div className="card" style={{ borderTopLeftRadius: 0, minHeight: 400 }}>

        {/* === BASIC INFO === */}
        {activeTab === 'basic' && (
          <>
            <RecipeBasicInfoForm
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              disabled={disabled}
              isEditMode={isEditMode}
              onStatusChange={isEditMode ? (newStatus) => changeStatus({ status: newStatus }) : null}
              statusLoading={statusLoading}
            />
            <div className="flex gap-8" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-gray-100)' }}>
              <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                {submitLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Recipe'}
              </button>
              {isEditMode && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('ingredients')}
                >
                  Next: Ingredients →
                </button>
              )}
            </div>
          </>
        )}

        {/* === INGREDIENTS === */}
        {activeTab === 'ingredients' && (
          needsSave ? (
            <div className="text-center" style={{ padding: 40, color: 'var(--color-gray-400)' }}>
              Save the recipe first to add ingredients.
            </div>
          ) : (
            <RecipeIngredientsTable
              ingredients={recipe?.ingredients || []}
              warehouseId={recipe?.warehouseId || warehouseId}
              disabled={!canEditContent}
              onAdd={(data) => addIngredient(data)}
              onUpdate={({ ingredientId, data }) => updateIngredient({ ingredientId, data })}
              onRemove={(ingredientId) => removeIngredient(ingredientId)}
              addLoading={addIngLoading}
              updateLoading={updIngLoading}
              removeLoading={remIngLoading}
            />
          )
        )}

        {/* === COSTING === */}
        {activeTab === 'costing' && (
          needsSave ? (
            <div className="text-center" style={{ padding: 40, color: 'var(--color-gray-400)' }}>
              Save the recipe first to view costing.
            </div>
          ) : (
            <RecipeCostSummary
              costing={costingData}
              standardPax={recipe?.standardPax}
              disabled={!canEditContent}
              onRecalculate={() => recalculate()}
              onUpdateCost={(data) => recalculate(data)}
              recalculateLoading={recalcLoading}
            />
          )
        )}
      </div>
    </form>
  );
}
