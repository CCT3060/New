/**
 * DraggableRecipeCard
 * A recipe card that can be dragged from the sidebar panel onto calendar cells.
 * Also used for existing items inside calendar cells (type = 'item').
 */
import { useDraggable } from '@dnd-kit/core';
import MealTypeBadge from './MealTypeBadge';

const FOOD_TYPE_ICONS = { VEG: '🥦', NON_VEG: '🍗', EGG: '🥚', VEGAN: '🌱' };

export default function DraggableRecipeCard({ recipe, type = 'recipe', item, planId, date, mealType, onRemove, compact = false }) {
  const id = type === 'recipe' ? `recipe-${recipe.id}` : `item-${item?.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: type === 'recipe'
      ? { type: 'recipe', recipe }
      : { type: 'item', item, recipe, planId, date, mealType },
  });

  const displayRecipe = recipe;

  if (compact) {
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
          padding: '4px 8px',
          borderRadius: 6,
          background: isDragging ? 'var(--color-primary-light)' : '#f8fafc',
          border: `1px solid ${isDragging ? 'var(--color-primary)' : 'var(--color-gray-200)'}`,
          fontSize: '0.75rem',
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0.5 : 1,
          userSelect: 'none',
          touchAction: 'none',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: '0.85rem' }}>{FOOD_TYPE_ICONS[displayRecipe?.foodType] || ''}</span>
        <span style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayRecipe?.recipeName}
        </span>
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-gray-400)',
              padding: '0 2px',
              fontSize: '0.8rem',
              lineHeight: 1,
              flexShrink: 0,
            }}
            title="Remove"
            onPointerDown={(e) => e.stopPropagation()} // don't start drag when clicking remove
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: '1rem' }}>{FOOD_TYPE_ICONS[displayRecipe?.foodType] || ''}</span>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayRecipe?.recipeName}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <MealTypeBadge mealType={displayRecipe?.mealType} />
        <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', fontFamily: 'var(--font-mono)' }}>
          {displayRecipe?.recipeCode}
        </span>
      </div>
    </div>
  );
}
