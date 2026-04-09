/**
 * MenuPlanCalendarPage - Full-featured weekly meal planner
 * - Kitchen Bank sidebar: search + meal-type filter tabs + draggable recipe list
 * - Weekly calendar grid: drag recipes onto day/meal slots
 * - Toolbar: prev/next week, today, clear week, duplicate to next week, CSV export, PDF report
 * - Smart Shuffle: auto-fill empty slots with matching recipes
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import {
  useWeekMenuPlans, useDropOnSlot, useMoveItem,
  useRecipeLookup, useDuplicateWeek,
} from '../hooks/useMenuPlanner';
import DraggableRecipeCard from '../components/DraggableRecipeCard';
import CalendarCell from '../components/CalendarCell';
import MenuReportModal from '../components/MenuReportModal';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { menuPlanApi } from '../services/menu-planner.api';

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
function ConfirmModal({ message, onConfirm, onCancel, loading, confirmLabel = 'Clear All', confirmColor = '#dc2626' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: '8px 18px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: confirmColor, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MenuPlanCalendarPage() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'OPS_MANAGER', 'KITCHEN_MANAGER'].includes(user?.role);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeItem, setActiveItem] = useState(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'date' | 'week' | 'range'
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  // Range mode
  const [rangeFrom, setRangeFrom] = useState(() => toISODate(new Date()));
  const [rangeTo, setRangeTo] = useState(() => toISODate(addDays(new Date(), 6)));
  const [addModal, setAddModal] = useState(null); // { date, mealType }
  const [addSearch, setAddSearch] = useState('');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const dateInputRef = useRef(null);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // For date (single-day) view
  const dayDateStr = toISODate(selectedDay);

  // planDateFrom/planDateTo adapts to the view mode
  const planDateFrom = useMemo(() => {
    if (viewMode === 'date') return dayDateStr;
    if (viewMode === 'range') return rangeFrom;
    return toISODate(weekDays[0]);
  }, [viewMode, dayDateStr, rangeFrom, weekDays]);
  const planDateTo = useMemo(() => {
    if (viewMode === 'date') return dayDateStr;
    if (viewMode === 'range') return rangeTo;
    return toISODate(weekDays[6]);
  }, [viewMode, dayDateStr, rangeTo, weekDays]);

  const { data: weekData, isLoading: weekLoading, refetch: weekDataRefetch } = useWeekMenuPlans(planDateFrom, planDateTo);
  const { data: recipeData, isLoading: recipesLoading, refetch: recipeRefetch } = useRecipeLookup({
    search: recipeSearch,
    limit: 200,
  });
  const { mutateAsync: dropOnSlot } = useDropOnSlot();
  const { mutateAsync: moveItem } = useMoveItem();
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
    if (!itemId) { toast.error('Cannot remove: missing item ID'); return; }
    try {
      // Use planId if available, otherwise use a placeholder — backend looks up by itemId alone
      await menuPlanApi.removeItem(planId || '_', itemId);
      weekDataRefetch();
    } catch (err) { toast.error(err.message); }
  };

  const handleClickAdd = (date, mealType) => {
    setAddSearch('');
    setAddModal({ date, mealType });
  };

  const handlePickRecipe = async (recipe) => {
    if (!addModal) return;
    try {
      await dropOnSlot({ planDate: addModal.date, mealType: addModal.mealType, recipeId: recipe.id, servings: 1 });
      toast.success(`Added ${recipe.recipeName}`);
    } catch { /* onError shows toast */ }
    // don't close modal — allow adding more recipes
  };

  const addModalRecipes = useMemo(() => {
    if (!addModal) return [];
    const r = recipeData?.recipes || [];
    const term = addSearch.trim().toLowerCase();
    if (!term) return r;
    return r.filter(rec =>
      rec.recipeName?.toLowerCase().includes(term) || rec.recipeCode?.toLowerCase().includes(term)
    );
  }, [addModal, recipeData, addSearch]);

  // ── Toolbar actions ────────────────────────────────────────────────────
  const handleDuplicateWeek = async () => {
    setConfirmDuplicate(false);
    const srcDays = viewMode === 'week'
      ? 7
      : Math.round((new Date(planDateTo) - new Date(planDateFrom)) / 86400000) + 1;
    const nextFrom = toISODate(addDays(new Date(planDateFrom + 'T12:00:00'), srcDays));
    await dupWeek({ sourceFrom: planDateFrom, sourceTo: planDateTo, targetFrom: nextFrom });
  };

  // ── View navigation helpers ────────────────────────────────────────────
  const handlePrev = () => {
    if (viewMode === 'date') setSelectedDay(d => addDays(d, -1));
    else setWeekStart(w => subWeeks(w, 1));
  };
  const handleNext = () => {
    if (viewMode === 'date') setSelectedDay(d => addDays(d, 1));
    else setWeekStart(w => addWeeks(w, 1));
  };
  const handleToday = () => {
    const today = new Date();
    setSelectedDay(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    if (viewMode === 'date') {
      // already set selectedDay above
    } else if (viewMode === 'range') {
      setRangeFrom(toISODate(today));
      setRangeTo(toISODate(addDays(today, 6)));
    }
  };

  const viewTitle = useMemo(() => {
    if (viewMode === 'date') return format(selectedDay, 'EEEE, d MMM yyyy');
    if (viewMode === 'range') return `${rangeFrom} → ${rangeTo}`;
    return `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM yyyy')}`;
  }, [viewMode, selectedDay, rangeFrom, rangeTo, weekDays]);

  const handleSmartShuffle = async () => {
    const recipes = recipeData?.recipes || [];
    if (!recipes.length) { toast.warning('No recipes available for shuffle'); return; }
    let added = 0;
    // Get the list of days from current view
    let days = [];
    if (viewMode === 'date') {
      days = [selectedDay];
    } else if (viewMode === 'range') {
      // enumerate range
      let cur = new Date(rangeFrom + 'T12:00:00');
      const end = new Date(rangeTo + 'T12:00:00');
      while (cur <= end) { days.push(new Date(cur)); cur = addDays(cur, 1); }
    } else {
      days = weekDays;
    }
    for (const day of days) {
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
                onClick={() => recipeRefetch?.()}
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
            display: 'flex',
            alignItems: 'center',
            gap: 8, padding: '9px 14px',
            background: '#fff', borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minHeight: 52, flexWrap: 'wrap',
          }}>
            {/* LEFT: view mode switcher + date pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
              {/* Mode tabs */}
              {[['date','📅 Date'],['week','📆 Week'],['range','📋 Range']].map(([mode, label]) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, border: '1.5px solid',
                    borderColor: viewMode === mode ? '#6366f1' : '#e2e8f0',
                    background: viewMode === mode ? '#eef2ff' : '#fff',
                    color: viewMode === mode ? '#4f46e5' : '#64748b',
                    fontWeight: viewMode === mode ? 700 : 500,
                    cursor: 'pointer', fontSize: '0.76rem',
                  }}>
                  {label}
                </button>
              ))}

              {/* Date picker — single date */}
              {viewMode === 'date' && (
                <input type="date" value={dayDateStr}
                  onChange={e => {
                    if (!e.target.value) return;
                    setSelectedDay(new Date(e.target.value + 'T12:00:00'));
                  }}
                  style={{ padding: '5px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }}
                />
              )}

              {/* Week picker — navigate with prev/next */}
              {viewMode === 'week' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={handlePrev} style={navBtnStyle}>‹</button>
                  <button onClick={handleToday} style={{ ...navBtnStyle, color: '#6366f1', borderColor: '#c7d2fe', fontWeight: 700 }}>Today</button>
                  <button onClick={handleNext} style={navBtnStyle}>›</button>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginLeft: 4 }}>{viewTitle}</span>
                </div>
              )}

              {/* Range picker — from/to date inputs */}
              {viewMode === 'range' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="date" value={rangeFrom}
                    onChange={e => e.target.value && setRangeFrom(e.target.value)}
                    style={{ padding: '5px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }}
                  />
                  <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>→</span>
                  <input type="date" value={rangeTo} min={rangeFrom}
                    onChange={e => e.target.value && setRangeTo(e.target.value)}
                    style={{ padding: '5px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }}
                  />
                </div>
              )}
            </div>

            {/* CENTER: title shown only for date/range */}
            {viewMode === 'date' && (
              <div style={{ textAlign: 'center', flex: '0 1 auto', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                {format(selectedDay, 'EEEE, d MMM yyyy')}
              </div>
            )}

            {/* RIGHT: action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {canManage && (
              <ABtn title="Duplicate this period to the next" disabled={duplicating} onClick={() => setConfirmDuplicate(true)} icon="⧉" label="Duplicate" color="#0284c7" />
            )}
            <ABtn title="Export plan as CSV" onClick={handleExportCSV} icon="📄" label="CSV" color="#16a34a" />
            <ABtn title="View detailed report" onClick={() => setShowReport(true)} icon="📑" label="Report" color="#7c3aed" />
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
                ⚡ Smart Shuffle
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
                              onClickAdd={handleClickAdd}
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

            {/* ─── DATE VIEW (single day) ─── */}
            {viewMode === 'date' && (
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
                          onClickAdd={handleClickAdd}
                          isToday={isSameDay(selectedDay, new Date())} weekLoading={weekLoading}
                          mealColor={mc}
                        />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ─── RANGE VIEW (multi-day table) ─── */}
            {viewMode === 'range' && (() => {
              // Enumerate days in range
              let rangeDays = [];
              try {
                let cur = new Date(rangeFrom + 'T12:00:00');
                const end = new Date(rangeTo + 'T12:00:00');
                while (cur <= end && rangeDays.length < 31) {
                  rangeDays.push(new Date(cur));
                  cur = addDays(cur, 1);
                }
              } catch { rangeDays = []; }
              if (!rangeDays.length) return <div style={{ padding: 32, textAlign:'center', color:'#94a3b8' }}>Select a valid date range above.</div>;
              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820, tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: 90 }} />
                    {rangeDays.map(d => <col key={d.toISOString()} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={mealHeaderTh}>MEAL</th>
                      {rangeDays.map((day) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <th key={day.toISOString()} style={{
                            ...dayHeaderTh,
                            background: isToday ? '#eff6ff' : '#f8fafc',
                            borderBottom: `2px solid ${isToday ? '#3b82f6' : '#e2e8f0'}`,
                          }}>
                            <button
                              onClick={() => { setSelectedDay(day); setViewMode('date'); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'center', width: '100%' }}
                            >
                              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: isToday ? '#2563eb' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {format(day, 'EEE')}
                              </div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isToday ? '#2563eb' : '#0f172a', lineHeight: 1.1 }}>
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
                          {rangeDays.map((day) => {
                            const dateStr = toISODate(day);
                            const { items, planId } = getSlot(dateStr, mealType);
                            return (
                              <CalendarCell
                                key={`${dateStr}-${mealType}`}
                                date={dateStr} mealType={mealType} planId={planId} items={items}
                                canManage={canManage} onRemoveItem={handleRemoveItem}
                                onClickAdd={handleClickAdd}
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
              );
            })()}

          </div>
        </div>
      </div>

      {/* Drag ghost overlay */}
      <DragOverlay>
        {activeItem && <DragGhostCard item={activeItem} />}
      </DragOverlay>

      {/* Confirm duplicate modal */}
      {confirmDuplicate && (
        <ConfirmModal
          message={`Duplicate all plans from ${planDateFrom} → ${planDateTo} to the next period? Existing plans in the target period will be skipped.`}
          onConfirm={handleDuplicateWeek}
          onCancel={() => setConfirmDuplicate(false)}
          loading={duplicating}
          confirmLabel="Duplicate"
          confirmColor="#0284c7"
        />
      )}

      {/* Report / PDF modal */}
      {showReport && (
        <MenuReportModal dateFrom={planDateFrom} dateTo={planDateTo} onClose={() => setShowReport(false)} />
      )}

      {/* Add recipe to slot modal */}
      {addModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setAddModal(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: 460, maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                Add Recipe — {MEAL_LABEL[addModal.mealType] || addModal.mealType}
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>
                {format(parseISO(addModal.date), 'EEEE, d MMM yyyy')}
              </p>
            </div>
            <input
              autoFocus
              placeholder="Search recipes..."
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, marginBottom: 12, fontSize: '0.84rem' }}
            />
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {addModalRecipes.map(r => {
                const food = FOOD_BADGE[r.foodType];
                // Check if recipe is already in this slot
                const slotItems = getSlot(addModal.date, addModal.mealType).items;
                const alreadyAdded = slotItems.some(i => i.recipeId === r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => !alreadyAdded && handlePickRecipe(r)}
                    style={{
                      padding: '9px 12px', borderRadius: 8, border: '1.5px solid #f1f5f9',
                      cursor: alreadyAdded ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      opacity: alreadyAdded ? 0.5 : 1,
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { if (!alreadyAdded) { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = ''; }}
                  >
                    {food && (
                      <span style={{ background: food.bg, color: food.color, borderRadius: 4, padding: '1px 5px', fontSize: '0.62rem', fontWeight: 800 }}>
                        {food.label}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{r.recipeName}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{r.recipeCode} · {r.category}</div>
                    </div>
                    {alreadyAdded
                      ? <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Added</span>
                      : <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 700 }}>+Add</span>
                    }
                  </div>
                );
              })}
              {addModalRecipes.length === 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>No recipes found</p>
              )}
            </div>
            <div style={{ marginTop: 14, textAlign: 'right' }}>
              <button onClick={() => setAddModal(null)} style={{ padding: '7px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
