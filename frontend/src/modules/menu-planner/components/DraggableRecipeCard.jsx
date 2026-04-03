/**
 * DraggableRecipeCard
 * A recipe card that can be dragged from the sidebar panel onto calendar cells.
 * Also used for existing items inside calendar cells (type = 'item').
 */
import { useDraggable } from '@dnd-kit/core';

const FOOD_BADGE = {
  VEG:     { bg: '#dcfce7', color: '#16a34a', label: 'V' },
  NON_VEG: { bg: '#fee2e2', color: '#dc2626', label: 'N' },
  EGG:     { bg: '#fef9c3', color: '#ca8a04', label: 'E' },
  VEGAN:   { bg: '#ddd6fe', color: '#7c3aed', label: 'VG' },
};

export default function DraggableRecipeCard({ recipe, type = 'recipe', item, planId, date, mealType, onRemove, compact = false, mealColors }) {
  const id = type === 'recipe' ? `recipe-${recipe.id}` : `item-${item?.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: type === 'recipe'
      ? { type: 'recipe', recipe }
      : { type: 'item', item, recipe, planId, date, mealType },
  });

  const displayRecipe = recipe;
  const food = FOOD_BADGE[displayRecipe?.foodType];

  if (compact) {
    const bg = mealColors?.bg || '#f8fafc';
    const border = mealColors?.border || '#e2e8f0';
    const dot = mealColors?.dot || mealColors?.color || '#64748b';
    // Compact version inside calendar cell
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          borderRadius: 7,
          background: isDragging ? '#eff6ff' : bg,
          border: `1px solid ${isDragging ? '#2563eb' : border}`,
          fontSize: '0.72rem',
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0.4 : 1,
          userSelect: 'none',
          touchAction: 'none',
          position: 'relative',
          boxShadow: isDragging ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }}>
          {displayRecipe?.recipeName}
        </span>
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: '0 2px', fontSize: '0.75rem',
              lineHeight: 1, flexShrink: 0,
            }}
            title="Remove"
            onPointerDown={(e) => e.stopPropagation()}
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // Full panel card (sidebar)
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${isDragging ? 'var(--color-primary)' : 'var(--color-gray-200)'}`,
        background: isDragging ? 'var(--color-primary-light)' : '#fff',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.45 : 1,
        userSelect: 'none',
        touchAction: 'none',
        boxShadow: isDragging ? 'none' : 'var(--shadow-sm)',
        transition: 'box-shadow 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>
          {displayRecipe?.recipeName}
        </span>
        {food && (
          <span style={{ background: food.bg, color: food.color, borderRadius: 4, padding: '1px 5px', fontSize: '0.63rem', fontWeight: 800, flexShrink: 0 }}>
            {food.label}
          </span>
        )}
      </div>
      <div>
        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>
          {displayRecipe?.recipeCode}
        </span>
      </div>
    </div>
  );
}
