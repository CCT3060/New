/**
 * MenuPlanCalendarPage
 * A drag-and-drop weekly calendar for planning meals.
 * - Left panel: searchable, draggable recipe cards
 * - Calendar grid: 7 day columns × 6 meal type rows
 * - Drop a recipe onto any cell → auto-creates a plan & adds recipe
 * - Drag existing recipe card between cells → moves it
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { useWeekMenuPlans, useDropOnSlot, useMoveItem, useDeleteMenuPlanItem } from '../hooks/useMenuPlanner';
import { useRecipeLookup } from '../hooks/useMenuPlanner';
import DraggableRecipeCard from '../components/DraggableRecipeCard';
import CalendarCell from '../components/CalendarCell';
import MealTypeBadge from '../components/MealTypeBadge';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { menuPlanApi } from '../services/menu-planner.api';
import { useQueryClient } from '@tanstack/react-query';
import { MENU_PLAN_KEYS } from '../hooks/useMenuPlanner';

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'BEVERAGE', 'DESSERT'];

const MEAL_ICONS = {
  BREAKFAST: '🌅',
  LUNCH: '☀️',
  DINNER: '🌙',
  SNACK: '🍎',
  BEVERAGE: '☕',
  DESSERT: '🍰',
};

const FOOD_TYPE_ICONS = { VEG: '🥦', NON_VEG: '🍗', EGG: '🥚', VEGAN: '🌱' };

// Get week boundaries (Mon-Sun)
function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function toISODate(d) {
  return format(d, 'yyyy-MM-dd');
}

export default function MenuPlanCalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const warehouseId = user?.warehouseId || '';
  const canManage = ['ADMIN', 'OPS_MANAGER', 'KITCHEN_MANAGER'].includes(user?.role);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  );
  const [activeItem, setActiveItem] = useState(null); // currently dragging
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeMealFilter, setRecipeMealFilter] = useState('');
  const [pendingDrop, setPendingDrop] = useState(null); // { date, mealType } awaiting warehouseId

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const planDateFrom = toISODate(weekDays[0]);
  const planDateTo = toISODate(weekDays[6]);

  const { data: weekData, isLoading: weekLoading } = useWeekMenuPlans(planDateFrom, planDateTo, warehouseId || undefined);
  const { data: recipeData } = useRecipeLookup({ search: recipeSearch, mealType: recipeMealFilter, limit: 100 });
  const { mutateAsync: dropOnSlot } = useDropOnSlot();
  const { mutateAsync: moveItem } = useMoveItem();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Build lookup: plansByKey[date][mealType] = plan
  const plansByKey = useMemo(() => {
    const map = {};
    const plans = weekData?.menuPlans || [];
    plans.forEach((plan) => {
      const dateStr = toISODate(parseISO(plan.planDate));
      if (!map[dateStr]) map[dateStr] = {};
      map[dateStr][plan.mealType] = plan;
    });
    return map;
  }, [weekData]);

  // Enrich plans with full item data from detail cache when available
  const getItemsForSlot = useCallback(
    (dateStr, mealType) => {
      const plan = plansByKey[dateStr]?.[mealType];
      if (!plan) return { items: [], planId: null };
      // items come from the list endpoint with _count only — we store them on the plan object
      // For calendar view the list API returns plans without items; we use a separate enriched structure
      return { items: plan.items || [], planId: plan.id };
    },
    [plansByKey]
  );

  const handleDragStart = (event) => {
    setActiveItem(event.active.data.current);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const dragData = active.data.current;
    const dropData = over.data.current;

    if (!dropData?.date || !dropData?.mealType) return;

    const targetDate = dropData.date;
    const targetMealType = dropData.mealType;

    if (!warehouseId) {
      toast.warning('Your account has no warehouse assigned. Cannot create menu plans.');
      return;
    }

    try {
      if (dragData.type === 'recipe') {
        // Dragging from the recipe sidebar panel
        await dropOnSlot({
          planDate: targetDate,
          mealType: targetMealType,
          warehouseId,
          recipeId: dragData.recipe.id,
          servings: 1,
        });
      } else if (dragData.type === 'item') {
        // Dragging an existing item from one slot to another
        const sourceDate = dragData.date;
        const sourceMealType = dragData.mealType;
        if (sourceDate === targetDate && sourceMealType === targetMealType) return;

        await moveItem({
          itemId: dragData.item.id,
          sourcePlanId: dragData.planId,
          targetDate,
          targetMealType,
          warehouseId,
        });
      }
    } catch {
      // error shown by mutation onError
    }
  };

  const handleRemoveItem = async (planId, itemId) => {
    try {
      await menuPlanApi.removeItem(planId, itemId);
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.all });
      toast.success('Recipe removed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const recipes = recipeData?.recipes || [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 100px)' }}>
        {/* ── Left: Recipe Panel ─────────────────────────────────────────── */}
        <aside
          style={{
            width: 240,
            minWidth: 240,
            background: '#fff',
            borderRight: '1px solid var(--color-gray-200)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 12px',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 10 }}>
              📦 Recipes
            </h3>
            <input
              className="form-control"
              style={{ marginBottom: 8, fontSize: '0.8rem', padding: '6px 10px' }}
              placeholder="Search recipes..."
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
            />
            <select
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              value={recipeMealFilter}
              onChange={(e) => setRecipeMealFilter(e.target.value)}
            >
              <option value="">All meal types</option>
              {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', marginBottom: 10 }}>
            Drag a recipe onto a calendar slot →
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {recipes.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)', textAlign: 'center', marginTop: 20 }}>
                No approved recipes found
              </p>
            )}
            {recipes.map((recipe) => (
              <DraggableRecipeCard key={recipe.id} recipe={recipe} type="recipe" />
            ))}
          </div>
        </aside>

        {/* ── Right: Calendar Grid ────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* Week Nav */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: '#fff',
              borderBottom: '1px solid var(--color-gray-200)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
              ← Prev Week
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-gray-800)' }}>
                Menu Planner — Weekly Calendar
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                {format(weekDays[0], 'd MMM')} – {format(weekDays[6], 'd MMM yyyy')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                Today
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
                Next Week →
              </button>
              <div style={{ width: 1, height: 20, background: 'var(--color-gray-200)', margin: '0 4px' }} />
              <button className="btn btn-sm btn-outline" title="Switch to List view" onClick={() => navigate('/menu-planner/list')}>
                ☰ List
              </button>
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 0 20px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--color-gray-50)' }}>
                  {/* Meal type header col */}
                  <th
                    style={{
                      width: 100,
                      padding: '10px 12px',
                      borderRight: '1px solid var(--color-gray-200)',
                      borderBottom: '2px solid var(--color-gray-300)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-gray-500)',
                      textTransform: 'uppercase',
                      position: 'sticky',
                      left: 0,
                      background: 'var(--color-gray-50)',
                      zIndex: 5,
                    }}
                  >
                    Meal
                  </th>
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <th
                        key={day.toISOString()}
                        style={{
                          padding: '10px 8px',
                          borderBottom: '2px solid var(--color-gray-300)',
                          borderRight: '1px solid var(--color-gray-200)',
                          textAlign: 'center',
                          minWidth: 130,
                          background: isToday ? 'var(--color-primary-light)' : 'var(--color-gray-50)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: isToday ? 'var(--color-primary)' : 'var(--color-gray-700)',
                          }}
                        >
                          {format(day, 'EEE')}
                        </div>
                        <div
                          style={{
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            color: isToday ? 'var(--color-primary)' : 'var(--color-gray-800)',
                            lineHeight: 1.2,
                          }}
                        >
                          {format(day, 'd')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>
                          {format(day, 'MMM')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map((mealType) => (
                  <tr key={mealType}>
                    {/* Meal type label */}
                    <td
                      style={{
                        padding: '8px 10px',
                        borderRight: '1px solid var(--color-gray-200)',
                        borderBottom: '1px solid var(--color-gray-100)',
                        verticalAlign: 'top',
                        position: 'sticky',
                        left: 0,
                        background: '#fff',
                        zIndex: 4,
                        minWidth: 100,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '1.2rem' }}>{MEAL_ICONS[mealType]}</span>
                        <MealTypeBadge mealType={mealType} />
                      </div>
                    </td>

                    {weekDays.map((day) => {
                      const dateStr = toISODate(day);
                      const { items, planId } = getItemsForSlot(dateStr, mealType);
                      const plan = plansByKey[dateStr]?.[mealType];

                      return (
                        <CalendarCell
                          key={`${dateStr}-${mealType}`}
                          date={dateStr}
                          mealType={mealType}
                          planId={planId}
                          items={items}
                          plan={plan}
                          canManage={canManage}
                          onRemoveItem={handleRemoveItem}
                          isToday={isSameDay(day, new Date())}
                          weekLoading={weekLoading}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drag Overlay — card that follows cursor */}
      <DragOverlay>
        {activeItem ? (
          <DragOverlayCard item={activeItem} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DragOverlayCard({ item }) {
  const recipe = item.type === 'recipe' ? item.recipe : item.item?.recipe;
  if (!recipe) return null;
  return (
    <div
      style={{
        background: '#fff',
        border: '2px solid var(--color-primary)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--color-gray-800)',
        maxWidth: 200,
        cursor: 'grabbing',
        opacity: 0.95,
      }}
    >
      <div style={{ marginBottom: 2 }}>
        {FOOD_TYPE_ICONS[recipe.foodType] || ''} {recipe.recipeName}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-gray-500)', fontFamily: 'var(--font-mono)' }}>
        {recipe.recipeCode}
      </div>
    </div>
  );
}
