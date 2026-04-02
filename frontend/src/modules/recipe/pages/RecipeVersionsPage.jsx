/**
 * RecipeVersionsPage
 * Full version history table for a recipe lineage.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipe, useRecipeVersions } from '../hooks/useRecipes';
import RecipeStatusBadge from '../components/RecipeStatusBadge';

export default function RecipeVersionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: recipeData } = useRecipe(id);
  const { data, isLoading, isError } = useRecipeVersions(id);

  const recipe = recipeData?.recipe;
  const versions = data?.versions || [];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-sm btn-ghost"
          onClick={() => navigate(`/recipes/${id}`)} style={{ marginBottom: 8 }}>
          ← Back to Recipe
        </button>
        <h1 className="page-title">
          Version History
          {recipe && <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: '1rem', marginLeft: 12 }}>
            — {recipe.recipeName}
          </span>}
        </h1>
      </div>

      {isError && (
        <div style={{ color: 'var(--color-danger)', padding: 20 }}>
          Failed to load version history.
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
                <th>Change Summary</th>
                <th>Created By</th>
                <th>Approved By</th>
                <th>Created At</th>
                <th>Is Current</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}>
                      <div className="skeleton" style={{ height: 16, borderRadius: 4 }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!isLoading && versions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)' }}>
                    No version history available.
                  </td>
                </tr>
              )}

              {!isLoading && versions.map((v) => (
                <tr key={v.id} style={{ background: v.isCurrentVersion ? 'var(--color-primary-light, #eff6ff)' : undefined }}>
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>v{v.versionNumber}</span>
                  </td>
                  <td><RecipeStatusBadge status={v.status} /></td>
                  <td>
                    <span style={{ color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>
                      {v.changeSummary || '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>{v.creator?.name || '—'}</td>
                  <td style={{ fontSize: '0.875rem' }}>{v.approver?.name || '—'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>
                    {new Date(v.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td>
                    {v.isCurrentVersion ? (
                      <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.875rem' }}>
                        ✓ Current
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/recipes/${v.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
