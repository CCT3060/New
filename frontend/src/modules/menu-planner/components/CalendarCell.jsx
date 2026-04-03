/**
 * CalendarCell — a droppable cell in the weekly menu planner calendar.
 */
import { useDroppable } from '@dnd-kit/core';
import DraggableRecipeCard from './DraggableRecipeCard';

const MEAL_COLORS = {
  BREAKFAST: { bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
  LUNCH: { bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a' },
  DINNER: { bg: '#f0f9ff', border: '#bae6fd', dot: '#0284c7' },
  SNACK: { bg: '#fdf4ff', border: '#e9d5ff', dot: '#7c3aed' },
  BEVERAGE: { bg: '#fff7ed', border: '#fed7aa', dot: '#ea580c' },
  DESSERT: { bg: '#fdf2f8', border: '#fbcfe8', dot: '#db2777' },
};

export default function CalendarCell({ date, mealType, planId, items, plan, canManage, onRemoveItem, isToday, weekLoading, mealColor }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${date}-${mealType}`,
    data: { date, mealType },
  });

  const isEmpty = !items || items.length === 0;
  const colors = mealColor || MEAL_COLORS[mealType] || { bg: '#f8fafc', border: '#e2e8f0', dot: '#64748b' };

  return (
    <td
      ref={setNodeRef}
      style={{
        verticalAlign: 'top',
        borderRight: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
        minHeight: 90,
        padding: '6px',
        background: isOver
          ? '#eff6ff'
          : isToday
          ? '#fafbff'
          : '#fff',
        outline: isOver ? '2px dashed #2563eb' : 'none',
        outlineOffset: -2,
        transition: 'background 120ms, outline 120ms',
        position: 'relative',
      }}
    >
      {isOver && isEmpty && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', color: '#2563eb',
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.02em',
        }}>
          + Drop here
        </div>
      )}

      {isEmpty && !isOver && (
        <div style={{
          minHeight: 64, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#cbd5e1',
          fontSize: '0.65rem', userSelect: 'none', letterSpacing: '0.05em',
        }}>
          {weekLoading ? '···' : ''}
        </div>
      )}

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
            mealColors={colors}
            onRemove={canManage ? () => onRemoveItem(planId, item.id) : undefined}
          />
        ))}
      </div>
    </td>
  );
}
