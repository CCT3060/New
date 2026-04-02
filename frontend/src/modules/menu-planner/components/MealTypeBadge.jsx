const MEAL_TYPE_LABELS = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snack',
  BEVERAGE: 'Beverage',
  DESSERT: 'Dessert',
};

const MEAL_COLORS = {
  BREAKFAST: { bg: '#fef3c7', color: '#d97706' },
  LUNCH: { bg: '#dbeafe', color: '#1d4ed8' },
  DINNER: { bg: '#ede9fe', color: '#7c3aed' },
  SNACK: { bg: '#dcfce7', color: '#16a34a' },
  BEVERAGE: { bg: '#cffafe', color: '#0891b2' },
  DESSERT: { bg: '#fce7f3', color: '#db2777' },
};

export default function MealTypeBadge({ mealType }) {
  const label = MEAL_TYPE_LABELS[mealType] || mealType;
  const style = MEAL_COLORS[mealType] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: '0.75rem',
        fontWeight: 600,
        background: style.bg,
        color: style.color,
      }}
    >
      {label}
    </span>
  );
}
