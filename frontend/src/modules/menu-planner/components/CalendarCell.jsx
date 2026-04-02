/**
 * CalendarCell — a droppable cell in the weekly menu planner calendar.
 * Each cell represents a (date × mealType) slot.
 * Displays recipe items draggable within the cell and accepts drops.
 */
import { useDroppable } from '@dnd-kit/core';
import DraggableRecipeCard from './DraggableRecipeCard';

export default function CalendarCell({ date, mealType, planId, items, plan, canManage, onRemoveItem, isToday, weekLoading }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${date}-${mealType}`,
    data: { date, mealType },
  });

  const isEmpty = !items || items.length === 0;

  return (
    <td
      ref={setNodeRef}
      style={{
        verticalAlign: 'top',
        borderRight: '1px solid var(--color-gray-200)',
        borderBottom: '1px solid var(--color-gray-100)',
        minHeight: 80,
        padding: '6px',
        background: isOver
          ? 'rgba(29,78,216,0.06)'
          : isToday
          ? '#fafbff'
          : '#fff',
        outline: isOver ? '2px dashed var(--color-primary)' : 'none',
        outlineOffset: -2,
        transition: 'background 120ms, outline 120ms',
        position: 'relative',
      }}
    >
      {/* Drop hint when hovering */}
      {isOver && isEmpty && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            color: 'var(--color-primary)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          Drop here
        </div>
      )}

      {/* Empty placeholder */}
      {isEmpty && !isOver && (
        <div
          style={{
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-gray-300)',
            fontSize: '0.7rem',
            userSelect: 'none',
          }}
        >
          {weekLoading ? '...' : '—'}
        </div>
      )}

      {/* Recipe items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(items || []).map((item) => (
          <DraggableRecipeCard
            key={item.id}
            recipe={item.recipe}
            item={item}
            type="item"
            planId={planId}
            date={date}
            mealType={mealType}
            compact
            onRemove={canManage ? () => onRemoveItem(planId, item.id) : undefined}
          />
        ))}
      </div>
    </td>
  );
}
