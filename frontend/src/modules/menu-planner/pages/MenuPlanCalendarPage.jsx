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
  const warehouseId = user?.warehouseId || undefined; // optional — backend auto-assigns
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
          warehouseId: warehouseId || undefined,
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
          warehouseId: warehouseId || undefined,
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
            width: 250,
            minWidth: 250,
            background: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 12px',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Recipes
            </h3>
            <input
              style={{
                width: '100%', marginBottom: 8, fontSize: '0.8rem', padding: '7px 10px',
                border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', outline: 'none', boxSizing: 'border-box',
              }}
              placeholder="🔍 Search recipes..."
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
            />
            <select
              style={{
                width: '100%', fontSize: '0.8rem', padding: '7px 10px',
                border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', outline: 'none',
              }}
              value={recipeMealFilter}
              onChange={(e) => setRecipeMealFilter(e.target.value)}
            >
              <option value="">All meal types</option>
              {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 10, textAlign: 'center' }}>
            Drag onto a calendar slot →
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
              padding: '14px 20px',
              background: '#fff',
              borderBottom: '1px solid #e2e8f0',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <button
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
            >
              ← Prev
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                Weekly Menu Planner
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                {format(weekDays[0], 'd MMM')} – {format(weekDays[6], 'd MMM yyyy')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #2563eb', background: '#eff6ff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#2563eb' }}
              >
                Today
              </button>
              <button
                onClick={() => setWeekStart((w) => addWeeks(w, 1))}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
              >
                Next →
              </button>
              <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
              <button
                onClick={() => navigate('/menu-planner/list')}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b' }}
                title="Switch to List view"
              >
                ☰ List
              </button>
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 0 20px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th
                    style={{
                      width: 90,
                      padding: '10px 12px',
                      borderRight: '1px solid #e2e8f0',
                      borderBottom: '2px solid #e2e8f0',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      position: 'sticky',
                      left: 0,
                      background: '#f8fafc',
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
                          borderBottom: '2px solid #e2e8f0',
                          borderRight: '1px solid #f1f5f9',
                          textAlign: 'center',
                          minWidth: 130,
                          background: isToday ? '#eff6ff' : '#f8fafc',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isToday ? '#2563eb' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {format(day, 'EEE')}
                        </div>
                        <div style={{
                          fontSize: '1.25rem', fontWeight: 800,
                          color: isToday ? '#2563eb' : '#0f172a',
                          lineHeight: 1.2,
                        }}>
                          {format(day, 'd')}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{format(day, 'MMM')}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map((mealType) => (
                  <tr key={mealType}>
                    <td
                      style={{
                        padding: '8px 10px',
                        borderRight: '1px solid #e2e8f0',
                        borderBottom: '1px solid #f1f5f9',
                        verticalAlign: 'middle',
                        position: 'sticky',
                        left: 0,
                        background: '#f8fafc',
                        zIndex: 4,
                        minWidth: 90,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: '1.2rem' }}>{MEAL_ICONS[mealType]}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {mealType}
                        </span>
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
        border: '2px solid #2563eb',
        borderRadius: 10,
        padding: '9px 14px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        fontSize: '0.8rem',
        fontWeight: 700,
        color: '#0f172a',
        maxWidth: 200,
        cursor: 'grabbing',
        opacity: 0.95,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span>{FOOD_TYPE_ICONS[recipe.foodType] || '🍽️'}</span>
      <div>
        <div>{recipe.recipeName}</div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 400, marginTop: 2 }}>
          {recipe.recipeCode}
        </div>
      </div>
    </div>
  );
}
