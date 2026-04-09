/**
 * RecipeDetailPage
 * Full read-only view of a recipe with all sections.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipe, useRecipeCosting, useAddIngredient, useUpdateIngredient, useRemoveIngredient } from '../hooks/useRecipes';
import RecipeStatusBadge from '../components/RecipeStatusBadge';
import RecipeIngredientsTable from '../components/RecipeIngredientsTable';
import RecipeStepsEditor from '../components/RecipeStepsEditor';
import RecipeCostSummary from '../components/RecipeCostSummary';
import RecipeApprovalPanel from '../components/RecipeApprovalPanel';
import RecipeScaleCalculator from '../components/RecipeScaleCalculator';
import {
  useSubmitForReview,
  useApproveRecipe,
  useRejectRecipe,
  useChangeStatus,
  useCreateNewVersion,
  useScaleRecipe,
} from '../hooks/useRecipes';
import { useAuth } from '../../../contexts/AuthContext';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'steps', label: 'Steps' },
  { id: 'costing', label: 'Costing' },
  { id: 'scale', label: 'Scale' },
  { id: 'workflow', label: 'Workflow' },
];

const Field = ({ label, value }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', fontWeight: 500, marginBottom: 2 }}>
      {label}
    </div>
    <div style={{ fontWeight: 500, color: 'var(--color-gray-700)' }}>{value || '—'}</div>
  </div>
);

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [scaleResult, setScaleResult] = useState(null);

  const { data: recipe, isLoading, isError } = useRecipe(id);
  const { data: costingData } = useRecipeCosting(id, { enabled: !!id });

  const { mutateAsync: submitReview, isPending: submitRevLoading } = useSubmitForReview(id);
  const { mutateAsync: approveRecipe, isPending: approveLoading } = useApproveRecipe(id);
  const { mutateAsync: rejectRecipe, isPending: rejectLoading } = useRejectRecipe(id);
  const { mutateAsync: changeStatus, isPending: statusLoading } = useChangeStatus(id);
  const { mutateAsync: createVersion, isPending: versionLoading } = useCreateNewVersion(id);
  const { mutateAsync: scaleRecipe, isPending: scaleLoading } = useScaleRecipe(id);
  const canEdit = recipe && ['ADMIN', 'OPS_MANAGER'].includes(user?.role);

  const { mutateAsync: addIngredient } = useAddIngredient(id);
  const { mutateAsync: updateIngredient } = useUpdateIngredient(id);
  const { mutateAsync: removeIngredient } = useRemoveIngredient(id);

  if (isLoading) {
    return (
      <div style={{ padding: 40 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 20, marginBottom: 12, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)', marginBottom: 16 }}>Recipe not found.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/recipes')}>Back to list</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigate('/recipes')} style={{ marginBottom: 8 }}>
          ← All Recipes
        </button>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex gap-12 items-center" style={{ marginBottom: 4 }}>
              <h1 className="page-title">{recipe.recipeName}</h1>
              <RecipeStatusBadge status={recipe.status} />
            </div>
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
              {recipe.recipeCode} · v{recipe.versionNumber} · {recipe.mealType} · {recipe.foodType}
              {recipe.cuisineType && ` · ${recipe.cuisineType}`}
            </p>
          </div>
          <div className="flex gap-8">
            <button type="button" className="btn btn-sm btn-outline"
              onClick={() => navigate(`/recipes/${id}/versions`)}>
              Version History
            </button>
            {canEdit && (
              <button type="button" className="btn btn-sm btn-primary"
                onClick={() => navigate(`/recipes/${id}/edit`)}>
                Edit Recipe
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        {TABS.map((tab) => (
          <button key={tab.id} type="button"
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ borderTopLeftRadius: 0, minHeight: 300 }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4 style={{ marginBottom: 16, color: 'var(--color-gray-600)', fontWeight: 600 }}>Recipe Details</h4>
              <Field label="RECIPE CODE" value={recipe.recipeCode} />
              <Field label="RECIPE NAME" value={recipe.recipeName} />
              <Field label="CATEGORY" value={recipe.category} />
              <Field label="MEAL TYPE" value={recipe.mealType} />
              <Field label="FOOD TYPE" value={recipe.foodType} />
              <Field label="CUISINE TYPE" value={recipe.cuisineType} />
              <Field label="WAREHOUSE" value={recipe.warehouse?.warehouseName} />
            </div>
            <div>
              <h4 style={{ marginBottom: 16, color: 'var(--color-gray-600)', fontWeight: 600 }}>Production Info</h4>
              <Field label="STANDARD PAX" value={recipe.standardPax} />
              <Field label="YIELD QTY" value={`${recipe.yieldQty} ${recipe.yieldUnit}`} />
              <Field label="PORTION PER PAX" value={recipe.portionPerPax} />
              <Field label="PREP TIME" value={recipe.prepTimeMin ? `${recipe.prepTimeMin} min` : null} />
              <Field label="COOK TIME" value={recipe.cookTimeMin ? `${recipe.cookTimeMin} min` : null} />
              <Field label="TOTAL TIME" value={
                recipe.prepTimeMin || recipe.cookTimeMin
                  ? `${(recipe.prepTimeMin || 0) + (recipe.cookTimeMin || 0)} min`
                  : null
              } />

              {costingData && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-primary)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>COST PER PAX</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                    ₹ {parseFloat(costingData.costPerPax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
            {recipe.description && (
              <div style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ marginBottom: 8, color: 'var(--color-gray-600)', fontWeight: 600 }}>Description</h4>
                <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.7 }}>{recipe.description}</p>
              </div>
            )}
            {recipe.creator && (
              <div style={{ gridColumn: '1 / -1', paddingTop: 12, borderTop: '1px solid var(--color-gray-100)', fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>
                Created by {recipe.creator.name} on {new Date(recipe.createdAt).toLocaleDateString('en-IN')}
                {recipe.updatedAt !== recipe.createdAt && ` · Updated ${new Date(recipe.updatedAt).toLocaleDateString('en-IN')}`}
              </div>
            )}
          </div>
        )}

        {/* INGREDIENTS */}
        {activeTab === 'ingredients' && (
          <RecipeIngredientsTable
            ingredients={recipe.ingredients || []}
            warehouseId={recipe.warehouseId}
            disabled={!canEdit}
            onAdd={canEdit ? addIngredient : undefined}
            onUpdate={canEdit ? updateIngredient : undefined}
            onRemove={canEdit ? removeIngredient : undefined}
          />
        )}

        {/* STEPS */}
        {activeTab === 'steps' && (
          <RecipeStepsEditor
            steps={recipe.steps || []}
            disabled
          />
        )}

        {/* COSTING */}
        {activeTab === 'costing' && (
          <RecipeCostSummary
            costing={costingData}
            standardPax={recipe.standardPax}
            disabled
          />
        )}

        {/* SCALE */}
        {activeTab === 'scale' && (
          <RecipeScaleCalculator
            recipe={recipe}
            scaleResult={scaleResult}
            scaleLoading={scaleLoading}
            onScale={async ({ targetPax }) => {
              const result = await scaleRecipe({ targetPax });
              setScaleResult(result?.data || result);
            }}
          />
        )}

        {/* WORKFLOW */}
        {activeTab === 'workflow' && (
          <RecipeApprovalPanel
            recipe={recipe}
            onSubmitReview={() => submitReview()}
            onApprove={() => approveRecipe()}
            onReject={(data) => rejectRecipe(data)}
            onActivate={() => changeStatus({ status: 'ACTIVE' })}
            onDeactivate={() => changeStatus({ status: 'INACTIVE' })}
            onArchive={() => changeStatus({ status: 'ARCHIVED' })}
            onNewVersion={(data) => createVersion(data)}
            submitLoading={submitRevLoading}
            approveLoading={approveLoading}
            rejectLoading={rejectLoading}
            statusLoading={statusLoading}
            newVersionLoading={versionLoading}
          />
        )}
      </div>
    </div>
  );
}
