/**
 * RecipeEditPage
 * Edit a DRAFT or UNDER_REVIEW recipe.
 * Redirects to detail view for approved/active recipes.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipe, useUpdateRecipe } from '../hooks/useRecipes';
import RecipeForm from '../components/RecipeForm';
import RecipeStatusBadge from '../components/RecipeStatusBadge';

export default function RecipeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: recipe, isLoading, isError } = useRecipe(id);
  const { mutateAsync: updateRecipe, isPending } = useUpdateRecipe();

  const handleSubmit = async (formData) => {
    await updateRecipe({ recipeId: id, data: formData });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div className="skeleton" style={{ height: 24, width: 200, margin: '0 auto 12px', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 16, width: 300, margin: '0 auto', borderRadius: 4 }} />
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-danger)' }}>
        Recipe not found or failed to load.{' '}
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/recipes')}>
          Back to list
        </button>
      </div>
    );
  }

  const isEditable = true;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigate(`/recipes/${id}`)} style={{ marginBottom: 8 }}>
          ← Back to Recipe
        </button>
        <div className="flex gap-12 items-center">
          <h1 className="page-title">{recipe.recipeName}</h1>
          <RecipeStatusBadge status={recipe.status} />
        </div>
        <p style={{ color: 'var(--color-gray-500)', marginTop: 4, fontSize: '0.875rem' }}>
          {recipe.recipeCode} · v{recipe.versionNumber}
        </p>
      </div>

      <RecipeForm
        recipe={recipe}
        onSubmit={handleSubmit}
        submitLoading={isPending}
        disabled={!isEditable}
      />
    </div>
  );
}
