/**
 * MenuPlanCalendarPage - Full-featured weekly meal planner
 * - Kitchen Bank sidebar: search + meal-type filter tabs + draggable recipe list
 * - Weekly calendar grid: drag recipes onto day/meal slots
 * - Toolbar: prev/next week, today, clear week, duplicate to next week, CSV export, PDF report
 * - Smart Shuffle: auto-fill empty slots with matching recipes
 */
import { useState, useMemo, useCallback } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO,
  startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from 'date-fns';
import {
  useWeekMenuPlans, useDropOnSlot, useMoveItem,
  useRecipeLookup, useClearRange, useDuplicateWeek, MENU_PLAN_KEYS,
} from '../hooks/useMenuPlanner';
import DraggableRecipeCard from '../components/DraggableRecipeCard';
import CalendarCell from '../components/CalendarCell';
import MenuReportModal from '../components/MenuReportModal';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { menuPlanApi } from '../services/menu-planner.api';
import { useQueryClient } from '@tanstack/react-query';

// ── Constants ──────────────────────────────────────────────────────────────
const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'BEVERAGE', 'DESSERT'];
const MEAL_LABEL = {
  BREAKFAST: 'BREAKFAST', LUNCH: 'LUNCH', SNACK: 'SNACKS',
  DINNER: 'DINNER', BEVERAGE: 'BEVERAGE', DESSERT: 'DESSERT',
};
const MEAL_COLORS = {
  BREAKFAST: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  LUNCH:     { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  SNACK:     { color: '#8b5cf6', bg: '#fdf4ff', border: '#e9d5ff' },
  DINNER:    { color: '#3b82f6', bg: '#eff6ff', border: '#bae6fd' },
  BEVERAGE:  { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  DESSERT:   { color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
};
const FOOD_BADGE = {
  VEG:     { bg: '#dcfce7', color: '#16a34a', label: 'V' },
  NON_VEG: { bg: '#fee2e2', color: '#dc2626', label: 'N' },
  EGG:     { bg: '#fef9c3', color: '#ca8a04', label: 'E' },
  VEGAN:   { bg: '#ddd6fe', color: '#7c3aed', label: 'VG' },
};
// SIDEBAR_TABS removed — sidebar shows all recipes without meal filter

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
function toISODate(d) { return format(d, 'yyyy-MM-dd'); }

// ── Shared styles ──────────────────────────────────────────────────────────
const navBtnStyle = {
  padding: '6px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0',
  background: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#374151',
};
const mealHeaderTh = {
  padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0',
  borderRight: '1px solid #e2e8f0', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8',
  letterSpacing: '0.06em', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 6,
};
const dayHeaderTh = {
  padding: '8px 4px', textAlign: 'center', borderRight: '1px solid #f1f5f9', minWidth: 110,
};
const mealLabelTd = {
  padding: '6px 4px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'middle', textAlign: 'center', position: 'sticky', left: 0,
  background: '#fafafa', zIndex: 4, minWidth: 90,
};

// ── Action Button ──────────────────────────────────────────────────────────
function ABtn({ title, onClick, icon, label, color, disabled }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      style={{
        padding: '6px 10px', borderRadius: 7, border: `1.5px solid ${color}30`,
        background: `${color}12`, color, cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
        opacity: disabled ? 0.6 : 1, transition: 'all 0.15s',
      }}
    >
      <span>{icon}</span> <span>{label}</span>
    </button>
  );
}

// ── Drag ghost card ─────────────────────────────────────────────────────────
function DragGhostCard({ item }) {
  const recipe = item.type === 'recipe' ? item.recipe : item.item?.recipe;
  if (!recipe) return null;
  const food = FOOD_BADGE[recipe.foodType];
  return (
    <div style={{
      background: '#fff', border: '2px solid #6366f1', borderRadius: 8, padding: '7px 12px',
      boxShadow: '0 8px 24px rgba(99,102,241,0.25)', fontSize: '0.78rem', fontWeight: 700,
      color: '#0f172a', maxWidth: 220, cursor: 'grabbing', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {food && (
        <span style={{ background: food.bg, color: food.color, borderRadius: 4, padding: '1px 5px', fontSize: '0.65rem', fontWeight: 800 }}>
          {food.label}
        </span>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {recipe.recipeName}
      </span>
    </div>
  );
}

// ── Confirm modal ──────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: '8px 18px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            {loading ? 'Clearing...' : 'Clear All'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MenuPlanCalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = ['ADMIN', 'OPS_MANAGER', 'KITCHEN_MANAGER'].includes(user?.role);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeItem, setActiveItem] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'day' | 'week' | 'month'
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // For day view
  const dayDateStr = toISODate(selectedDay);

  // For month view
  const monthStart = useMemo(() => startOfMonth(weekStart), [weekStart]);
  const monthEnd = useMemo(() => endOfMonth(weekStart), [weekStart]);
  const monthDays = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  // planDateFrom/planDateTo adapts to the view
  const planDateFrom = useMemo(() => {
    if (viewMode === 'day') return dayDateStr;
    if (viewMode === 'month') return toISODate(monthStart);
    return toISODate(weekDays[0]);
  }, [viewMode, dayDateStr, monthStart, weekDays]);
  const planDateTo = useMemo(() => {
    if (viewMode === 'day') return dayDateStr;
    if (viewMode === 'month') return toISODate(monthEnd);
    return toISODate(weekDays[6]);
  }, [viewMode, dayDateStr, monthEnd, weekDays]);

  const { data: weekData, isLoading: weekLoading } = useWeekMenuPlans(planDateFrom, planDateTo);
  const { data: recipeData, isLoading: recipesLoading } = useRecipeLookup({
    search: recipeSearch,
    limit: 200,
  });
  const { mutateAsync: dropOnSlot } = useDropOnSlot();
  const { mutateAsync: moveItem } = useMoveItem();
  const { mutateAsync: clearRange, isPending: clearing } = useClearRange();
  const { mutateAsync: dupWeek, isPending: duplicating } = useDuplicateWeek();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Build plansByKey[dateStr][mealType] = plan
  const plansByKey = useMemo(() => {
    const map = {};
    (weekData?.menuPlans || []).forEach((plan) => {
      const dateStr = toISODate(parseISO(plan.planDate));
      if (!map[dateStr]) map[dateStr] = {};
      map[dateStr][plan.mealType] = plan;
    });
    return map;
  }, [weekData]);

  const getSlot = useCallback((dateStr, mealType) => {
    const plan = plansByKey[dateStr]?.[mealType];
    if (!plan) return { items: [], planId: null };
    return { items: plan.items || [], planId: plan.id };
  }, [plansByKey]);

  // ── Drag handlers ──────────────────────────────────────────────────────
  const handleDragStart = (event) => setActiveItem(event.active.data.current);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;
    const dragData = active.data.current;
    const dropData = over.data.current;
    if (!dropData?.date || !dropData?.mealType) return;
    try {
      if (dragData.type === 'recipe') {
        await dropOnSlot({ planDate: dropData.date, mealType: dropData.mealType, recipeId: dragData.recipe.id, servings: 1 });
      } else if (dragData.type === 'item') {
        if (dragData.date === dropData.date && dragData.mealType === dropData.mealType) return;
        await moveItem({ itemId: dragData.item.id, sourcePlanId: dragData.planId, targetDate: dropData.date, targetMealType: dropData.mealType });
      }
    } catch { /* toast shown by mutation onError */ }
  };

  const handleRemoveItem = async (planId, itemId) => {
    try {
      await menuPlanApi.removeItem(planId, itemId);
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.all });
    } catch (err) { toast.error(err.message); }
  };

  // ── Toolbar actions ────────────────────────────────────────────────────
  const handleClearWeek = async () => {
    setConfirmClear(false);
    await clearRange({ dateFrom: planDateFrom, dateTo: planDateTo });
  };

  const handleDuplicateWeek = async () => {
    const nextWeekFrom = toISODate(addWeeks(weekDays[0], 1));
    await dupWeek({ sourceFrom: planDateFrom, sourceTo: planDateTo, targetFrom: nextWeekFrom });
  };

  // ── View navigation helpers ────────────────────────────────────────────
  const handlePrev = () => {
    if (viewMode === 'day') setSelectedDay(d => addDays(d, -1));
    else if (viewMode === 'month') setWeekStart(w => startOfWeek(subMonths(w, 1), { weekStartsOn: 1 }));
    else setWeekStart(w => subWeeks(w, 1));
  };
  const handleNext = () => {
    if (viewMode === 'day') setSelectedDay(d => addDays(d, 1));
    else if (viewMode === 'month') setWeekStart(w => startOfWeek(addMonths(w, 1), { weekStartsOn: 1 }));
    else setWeekStart(w => addWeeks(w, 1));
  };
  const handleToday = () => {
    const today = new Date();
    setSelectedDay(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  };

  const viewTitle = useMemo(() => {
    if (viewMode === 'day') return format(selectedDay, 'EEEE, d MMM yyyy');
    if (viewMode === 'month') return format(monthStart, 'MMMM yyyy');
    return `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM yyyy')}`;
  }, [viewMode, selectedDay, monthStart, weekDays]);

  const handleSmartShuffle = async () => {
    const recipes = recipeData?.recipes || [];
    if (!recipes.length) { toast.warning('No recipes available for shuffle'); return; }
    let added = 0;
    for (const day of weekDays) {
      const dateStr = toISODate(day);
      for (const mealType of MEAL_TYPES) {
        const { items } = getSlot(dateStr, mealType);
        if (items.length === 0) {
          const matching = recipes.filter(r => r.mealType === mealType);
          const pool = matching.length ? matching : recipes;
          const pick = pool[Math.floor(Math.random() * pool.length)];
          try {
            await dropOnSlot({ planDate: dateStr, mealType, recipeId: pick.id, servings: 1 });
            added++;
          } catch { /* ignore duplicates */ }
        }
      }
    }
    if (added > 0) toast.success(`Smart Shuffle added ${added} recipe(s)`);
    else toast.info('All slots already filled');
  };

  const handleExportCSV = () => {
    const plans = weekData?.menuPlans || [];
    if (!plans.length) { toast.warning('No plans to export'); return; }
    const rows = [['Date', 'Day', 'Meal Type', 'Recipe Code', 'Recipe Name', 'Food Type', 'Servings', 'Std Pax']];
    plans.forEach((plan) => {
      const dateStr = format(parseISO(plan.planDate), 'dd-MM-yyyy');
      const dayName = format(parseISO(plan.planDate), 'EEEE');
      (plan.items || []).forEach((item) => {
        rows.push([
          dateStr, dayName, plan.mealType,
          item.recipe?.recipeCode || '', item.recipe?.recipeName || '',
          item.recipe?.foodType || '', item.servings,
          item.recipe?.standardPax || '',
        ]);
      });
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-${planDateFrom}-to-${planDateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recipes = recipeData?.recipes || [];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#f1f5f9' }}>

        {/* ═══ KITCHEN BANK SIDEBAR ═══════════════════════════════════════ */}
        <aside style={{
          width: 270, minWidth: 270, background: '#fff',
          borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: '1rem' }}>&#127869;</span>
              <span style={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.1em', color: '#0f172a', textTransform: 'uppercase' }}>
                Kitchen Bank
              </span>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['recipes', 'lookup'] })}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', lineHeight: 1, padding: 2 }}
                title="Refresh recipe list"
              >&#8635;</button>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}>&#128269;</span>
              <input
                style={{ width: '100%', padding: '7px 10px 7px 26px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                placeholder="Search recipes..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Recipe list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 16px' }}>
            <p style={{ fontSize: '0.62rem', color: '#cbd5e1', textAlign: 'center', margin: '0 0 8px' }}>
              Drag onto a calendar slot
            </p>
            {recipesLoading && (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', marginTop: 16 }}>Loading...</p>
            )}
            {!recipesLoading && recipes.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', marginTop: 16 }}>
                No approved recipes found
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recipes.map((recipe) => (
                <DraggableRecipeCard key={recipe.id} recipe={recipe} type="recipe" />
              ))}
            </div>
          </div>
        </aside>

        {/* ═══ CALENDAR AREA ══════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 8, padding: '9px 14px',
            background: '#fff', borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minHeight: 52,
          }}>
            {/* LEFT: period dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={viewMode === 'day' ? 'today' : viewMode === 'week' ? 'week' : 'month'}
                onChange={(e) => {
                  const v = e.target.value;
                  const today = new Date();
                  if (v === 'today') {
                    setSelectedDay(today);
                    setViewMode('day');
                  } else if (v === 'week') {
                    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                    setViewMode('week');
                  } else {
                    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                    setViewMode('month');
                  }
                }}
                style={{
                  padding: '6px 32px 6px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                  fontSize: '0.82rem', fontWeight: 600, background: '#fff', color: '#0f172a',
                  cursor: 'pointer', outline: 'none', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* CENTER: date title */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{viewTitle}</span>
            </div>

            {/* RIGHT: action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {canManage && (
              <ABtn title="Duplicate this week to next week" disabled={duplicating} onClick={handleDuplicateWeek} icon="&#9112;" label="Duplicate" color="#0284c7" />
            )}
            {canManage && (
              <ABtn title="Clear all plans this week" onClick={() => setConfirmClear(true)} icon="&#128465;" label="Clear" color="#dc2626" />
            )}
            <ABtn title="Export weekly plan as CSV" onClick={handleExportCSV} icon="&#128196;" label="CSV" color="#16a34a" />
            <ABtn title="View detailed report and print/export PDF" onClick={() => setShowReport(true)} icon="&#128209;" label="Report" color="#7c3aed" />
            {canManage && (
              <button
                onClick={handleSmartShuffle}
                style={{
                  padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                }}
              >
                &#9889; Smart Shuffle
              </button>
            )}
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflow: 'auto' }}>

            {/* ─── WEEK VIEW ─── */}
            {viewMode === 'week' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 90 }} />
                  {weekDays.map(d => <col key={d.toISOString()} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th style={mealHeaderTh}>MEAL</th>
                    {weekDays.map((day) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <th key={day.toISOString()} style={{
                          ...dayHeaderTh,
                          background: isToday ? '#eff6ff' : '#f8fafc',
                          borderBottom: `2px solid ${isToday ? '#3b82f6' : '#e2e8f0'}`,
                        }}>
                          <button
                            onClick={() => { setSelectedDay(day); setViewMode('day'); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'center', width: '100%' }}
                          >
                            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: isToday ? '#2563eb' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {format(day, 'EEE')}
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isToday ? '#2563eb' : '#0f172a', lineHeight: 1.1 }}>
                              {format(day, 'd')}
                            </div>
                            <div style={{ fontSize: '0.63rem', color: '#94a3b8' }}>{format(day, 'MMM')}</div>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {MEAL_TYPES.map((mealType) => {
                    const mc = MEAL_COLORS[mealType];
                    return (
                      <tr key={mealType}>
                        <td style={{ ...mealLabelTd, borderLeft: `3px solid ${mc.color}` }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: mc.color, margin: '0 auto 3px' }} />
                          <div style={{ fontSize: '0.57rem', fontWeight: 800, color: mc.color, letterSpacing: '0.05em' }}>
                            {MEAL_LABEL[mealType]}
                          </div>
                        </td>
                        {weekDays.map((day) => {
                          const dateStr = toISODate(day);
                          const { items, planId } = getSlot(dateStr, mealType);
                          return (
                            <CalendarCell
                              key={`${dateStr}-${mealType}`}
                              date={dateStr} mealType={mealType} planId={planId} items={items}
                              canManage={canManage} onRemoveItem={handleRemoveItem}
                              isToday={isSameDay(day, new Date())} weekLoading={weekLoading}
                              mealColor={mc}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ─── DAY VIEW ─── */}
            {viewMode === 'day' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 110 }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th style={mealHeaderTh}>MEAL</th>
                    <th style={{
                      ...dayHeaderTh,
                      background: isSameDay(selectedDay, new Date()) ? '#eff6ff' : '#f8fafc',
                      borderBottom: `2px solid ${isSameDay(selectedDay, new Date()) ? '#3b82f6' : '#e2e8f0'}`,
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSameDay(selectedDay, new Date()) ? '#2563eb' : '#64748b', textTransform: 'uppercase' }}>
                        {format(selectedDay, 'EEEE')}
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isSameDay(selectedDay, new Date()) ? '#2563eb' : '#0f172a', lineHeight: 1.1 }}>
                        {format(selectedDay, 'd')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{format(selectedDay, 'MMMM yyyy')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MEAL_TYPES.map((mealType) => {
                    const mc = MEAL_COLORS[mealType];
                    const { items, planId } = getSlot(dayDateStr, mealType);
                    return (
                      <tr key={mealType}>
                        <td style={{ ...mealLabelTd, borderLeft: `3px solid ${mc.color}` }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: mc.color, margin: '0 auto 3px' }} />
                          <div style={{ fontSize: '0.57rem', fontWeight: 800, color: mc.color, letterSpacing: '0.05em' }}>
                            {MEAL_LABEL[mealType]}
                          </div>
                        </td>
                        <CalendarCell
                          date={dayDateStr} mealType={mealType} planId={planId} items={items}
                          canManage={canManage} onRemoveItem={handleRemoveItem}
                          isToday={isSameDay(selectedDay, new Date())} weekLoading={weekLoading}
                          mealColor={mc}
                        />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ─── MONTH VIEW ─── */}
            {viewMode === 'month' && (() => {
              // Build a 7-column grid: pad start with empty days
              const startDow = monthDays[0].getDay(); // 0=Sun
              const padStart = (startDow + 6) % 7; // Mon-first offset
              const totalCells = padStart + monthDays.length;
              const weeks = Math.ceil(totalCells / 7);
              const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              return (
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                    {daysOfWeek.map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {Array.from({ length: weeks * 7 }).map((_, cellIdx) => {
                      const dayIdx = cellIdx - padStart;
                      if (dayIdx < 0 || dayIdx >= monthDays.length) {
                        return <div key={cellIdx} style={{ minHeight: 80, borderRadius: 8, background: '#f8fafc' }} />;
                      }
                      const day = monthDays[dayIdx];
                      const dateStr = toISODate(day);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isSameDay(day, selectedDay);
                      const dayPlans = MEAL_TYPES.map(mt => {
                        const { items } = getSlot(dateStr, mt);
                        return items.length > 0 ? { mealType: mt, count: items.length } : null;
                      }).filter(Boolean);
                      return (
                        <div
                          key={cellIdx}
                          onClick={() => { setSelectedDay(day); setViewMode('day'); }}
                          style={{
                            minHeight: 80, borderRadius: 8, padding: 6, cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : '#fff',
                            border: `1.5px solid ${isToday ? '#3b82f6' : isSelected ? '#bfdbfe' : '#e2e8f0'}`,
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={(e) => { if (!isToday && !isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={(e) => { if (!isToday && !isSelected) e.currentTarget.style.background = '#fff'; }}
                        >
                          <div style={{
                            fontSize: '0.78rem', fontWeight: 700, marginBottom: 4,
                            background: isToday ? '#2563eb' : 'transparent',
                            color: isToday ? '#fff' : '#0f172a',
                            width: 22, height: 22, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {format(day, 'd')}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {dayPlans.slice(0, 3).map(({ mealType, count }) => {
                              const mc = MEAL_COLORS[mealType];
                              return (
                                <div key={mealType} style={{
                                  fontSize: '0.58rem', fontWeight: 600, padding: '1px 5px',
                                  borderRadius: 4, background: mc.bg, color: mc.color,
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {MEAL_LABEL[mealType]} &middot; {count}
                                </div>
                              );
                            })}
                            {dayPlans.length > 3 && (
                              <div style={{ fontSize: '0.58rem', color: '#94a3b8', paddingLeft: 5 }}>+{dayPlans.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* Drag ghost overlay */}
      <DragOverlay>
        {activeItem && <DragGhostCard item={activeItem} />}
      </DragOverlay>

      {/* Confirm clear modal */}
      {confirmClear && (
        <ConfirmModal
          message={`Clear all plans for ${format(weekDays[0], 'd MMM')} - ${format(weekDays[6], 'd MMM yyyy')}? This cannot be undone.`}
          onConfirm={handleClearWeek}
          onCancel={() => setConfirmClear(false)}
          loading={clearing}
        />
      )}

      {/* Report / PDF modal */}
      {showReport && (
        <MenuReportModal dateFrom={planDateFrom} dateTo={planDateTo} onClose={() => setShowReport(false)} />
      )}
    </DndContext>
  );
}
