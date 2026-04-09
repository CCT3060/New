import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import { toast } from 'react-toastify';

/* ─────────────────────────────── Styles ─────────────────────────── */
const card = { background: '#fff', borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1.5px solid #f1f5f9' };
const lbl = { fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 };
const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const inpFocus = { borderColor: '#059669' };
const th = { padding: '10px 14px', background: '#f8fafc', fontWeight: 700, color: '#374151', fontSize: '0.75rem', textAlign: 'left', borderBottom: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' };
const td = { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '0.83rem', color: '#374151', verticalAlign: 'middle' };

const CATEGORIES = ['Vegetable', 'Fruit', 'Meat', 'Seafood', 'Dairy', 'Grain', 'Spice', 'Oil & Fat', 'Condiment', 'Beverage', 'Bakery', 'Frozen', 'Dry Goods', 'Packaging', 'General'];
const UNITS = ['kg', 'g', 'mg', 'L', 'mL', 'piece', 'dozen', 'pack', 'box', 'tsp', 'tbsp', 'cup', 'bunch'];

/* ─────────────────────────────── Small helpers ──────────────────── */
function Badge({ color = '#059669', bg = '#f0fdf4', children }) {
  return <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>{children}</span>;
}

function FocusInput({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...inp, ...(focused ? inpFocus : {}), ...(style || {}) }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

function FocusSelect({ style, children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{ ...inp, ...(focused ? inpFocus : {}), ...(style || {}) }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    >
      {children}
    </select>
  );
}

function Modal({ onClose, title, children, wide }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 32, width: wide ? 680 : 480, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 22, fontSize: '1.1rem', marginTop: 0 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function IngredientsTab() {
  const { companyFetch } = useCompanyAuth();

  /* ── view mode: 'list' | 'scale' ── */
  const [view, setView] = useState('list');

  /* ── Ingredient master list ── */
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  /* ── Add / Edit form ── */
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ itemCode: '', itemName: '', category: 'General', unit: 'kg', costPerUnit: '', currentStock: '', minimumStock: '', storeId: '' });
  const [saving, setSaving] = useState(false);

  /* ── Recipe-scale calculator ── */
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [targetPax, setTargetPax] = useState(100);
  const [targetYield, setTargetYield] = useState('');
  const [scaleResult, setScaleResult] = useState(null);
  const [scaling, setScaling] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');

  /* ═══════════ LOAD DATA ═════════════ */
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await companyFetch('/ingredients');
      setItems(data.items || []);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  }, [companyFetch]);

  const loadWarehouses = useCallback(async () => {
    try {
      const data = await companyFetch('/ingredients/stores');
      const list = data.stores || [];
      setStores(list);
      if (list.length > 0) setForm(f => ({ ...f, storeId: list[0].id }));
    } catch (e) { /* silent */ }
  }, [companyFetch]);

  const loadRecipes = useCallback(async () => {
    setRecipesLoading(true);
    try {
      const data = await companyFetch('/pax/recipes');
      setRecipes(data.recipes || []);
    } catch (e) { toast.error(e.message); }
    setRecipesLoading(false);
  }, [companyFetch]);

  useEffect(() => {
    loadItems();
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (view === 'scale' && recipes.length === 0) loadRecipes();
  }, [view]);

  /* ═══════════ INGREDIENT CRUD ═════════════ */
  const openNew = () => {
    setForm({ itemCode: '', itemName: '', category: 'General', unit: 'kg', costPerUnit: '', currentStock: 0, minimumStock: 0, storeId: stores[0]?.id || '' });
    setEditItem(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({
      itemCode: item.itemCode, itemName: item.itemName, category: item.category || 'General',
      unit: item.unit, costPerUnit: item.costPerUnit, currentStock: item.currentStock ?? 0,
      minimumStock: item.minimumStock ?? 0, storeId: item.storeId || stores[0]?.id || '',
    });
    setEditItem(item);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.itemCode || !form.itemName || !form.unit) { toast.error('Item code, name, and unit are required'); return; }
    if (!form.storeId) { toast.error('Store is required'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        costPerUnit: parseFloat(form.costPerUnit) || 0,
        currentStock: parseFloat(form.currentStock) || 0,
        minimumStock: parseFloat(form.minimumStock) || 0,
      };
      if (editItem) {
        await companyFetch(`/ingredients/${editItem.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Ingredient updated');
      } else {
        await companyFetch('/ingredients', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Ingredient added successfully');
      }
      setShowForm(false);
      loadItems();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  };

  /* ═══════════ SCALE CALCULATOR ═════════════ */
  const handleScale = async () => {
    if (!selectedRecipe) { toast.error('Select a recipe first'); return; }
    if (!targetPax || targetPax <= 0) { toast.error('Pax must be > 0'); return; }
    setScaling(true);
    setScaleResult(null);
    try {
      const params = new URLSearchParams({ pax: targetPax });
      if (targetYield && parseFloat(targetYield) > 0) params.set('yieldQty', targetYield);
      const data = await companyFetch(`/ingredients/recipe-scale/${selectedRecipe.id}?${params}`);
      setScaleResult(data);
    } catch (err) { toast.error(err.message); }
    setScaling(false);
  };

  /* Auto-recalc when pax/yield change and a recipe is already selected */
  useEffect(() => {
    if (!selectedRecipe) return;
    const timer = setTimeout(() => { handleScale(); }, 500);
    return () => clearTimeout(timer);
  }, [targetPax, targetYield, selectedRecipe]);

  /* ═══════════ FILTERED LIST ═════════════ */
  const filtered = useMemo(() => {
    let list = items;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.itemName.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q));
    }
    if (filterCat) list = list.filter(i => i.category === filterCat);
    return list;
  }, [items, search, filterCat]);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch) return recipes;
    const q = recipeSearch.toLowerCase();
    return recipes.filter(r => r.recipeName.toLowerCase().includes(q) || r.recipeCode.toLowerCase().includes(q));
  }, [recipes, recipeSearch]);

  /* distinct categories for filter */
  const usedCategories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))].sort(), [items]);

  /* ═══════════ RENDER ═════════════ */
  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.35rem' }}>Ingredients</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Manage your ingredient master list and calculate quantities for any recipe
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 9, padding: 3, gap: 2 }}>
            {[
              { key: 'list', icon: '🗂', label: 'Master List' },
              { key: 'scale', icon: '⚖️', label: 'Recipe Scale' },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key)} style={{
                padding: '7px 16px', borderRadius: 7, border: 'none',
                background: view === v.key ? '#fff' : 'transparent',
                fontWeight: view === v.key ? 700 : 500, fontSize: '0.81rem',
                color: view === v.key ? '#059669' : '#64748b',
                cursor: 'pointer',
                boxShadow: view === v.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
          {view === 'list' && (
            <button onClick={openNew} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
              + Add Ingredient
            </button>
          )}
        </div>
      </div>

      {/* ══════════════ MASTER LIST VIEW ══════════════ */}
      {view === 'list' && (
        <div style={card}>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Items', value: items.length, color: '#059669', bg: '#f0fdf4' },
              { label: 'Active', value: items.filter(i => i.isActive).length, color: '#0284c7', bg: '#f0f9ff' },
              { label: 'Categories', value: usedCategories.length, color: '#7c3aed', bg: '#ede9fe' },
              { label: 'Stores', value: stores.length, color: '#d97706', bg: '#fffbeb' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                <span style={{ fontWeight: 800, color: s.color, fontSize: '1.4rem', lineHeight: 1 }}>{s.value}</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 3 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <FocusInput
              placeholder="🔍  Search by name or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: '1 1 200px', minWidth: 180 }}
            />
            <FocusSelect value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 180 }}>
              <option value="">All Categories</option>
              {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </FocusSelect>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>⏳</div>Loading ingredients…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🧂</div>
              <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No ingredients found</div>
              <div style={{ fontSize: '0.8rem' }}>Click <strong>+ Add Ingredient</strong> to start building your ingredient master list</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr>
                    {['Item Code', 'Ingredient Name', 'Category', 'Unit', 'Cost / Unit (₹)', 'Current Stock', 'Store', 'Status', 'Actions'].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={td}>
                        <span style={{ background: '#f0fdf4', color: '#059669', padding: '2px 9px', borderRadius: 5, fontSize: '0.73rem', fontWeight: 700, fontFamily: 'monospace' }}>{item.itemCode}</span>
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{item.itemName}</td>
                      <td style={td}>{item.category ? <Badge color="#7c3aed" bg="#ede9fe">{item.category}</Badge> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      <td style={td}><Badge color="#0284c7" bg="#f0f9ff">{item.unit}</Badge></td>
                      <td style={{ ...td, fontWeight: 700, color: '#059669' }}>
                        ₹{parseFloat(item.costPerUnit ?? 0).toFixed(2)}
                      </td>
                      <td style={{ ...td, color: '#374151' }}>
                        {parseFloat(item.currentStock ?? 0).toFixed(3)} {item.unit}
                      </td>
                      <td style={{ ...td, fontSize: '0.78rem', color: '#64748b' }}>{item.store?.name || item.warehouse?.name || '—'}</td>
                      <td style={td}>
                        <span style={{ background: item.isActive ? '#f0fdf4' : '#fef2f2', color: item.isActive ? '#059669' : '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={td}>
                        <button onClick={() => openEdit(item)} style={{ padding: '5px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginRight: 6 }}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                Showing {filtered.length} of {items.length} items
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ RECIPE SCALE VIEW ══════════════ */}
      {view === 'scale' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* ── Left panel: recipe selector + controls ── */}
          <div style={{ ...card, flex: '0 0 320px', minWidth: 280 }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>⚖️ Scale Calculator</h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
              Select a recipe, set your target pax and yield — the ingredient quantities will update instantly.
            </p>

            {/* Recipe search + select */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Search Recipe</label>
              <FocusInput
                placeholder="🔍  Type recipe name…"
                value={recipeSearch}
                onChange={e => setRecipeSearch(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 18, maxHeight: 260, overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: 8 }}>
              {recipesLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Loading recipes…</div>
              ) : filteredRecipes.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No recipes found</div>
              ) : (
                filteredRecipes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRecipe(r); setScaleResult(null); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                      border: 'none', borderBottom: '1px solid #f1f5f9',
                      background: selectedRecipe?.id === r.id ? '#ecfdf5' : '#fff',
                      cursor: 'pointer',
                      borderLeft: selectedRecipe?.id === r.id ? '3px solid #059669' : '3px solid transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (selectedRecipe?.id !== r.id) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (selectedRecipe?.id !== r.id) e.currentTarget.style.background = '#fff'; }}
                  >
                    <div style={{ fontWeight: 600, color: selectedRecipe?.id === r.id ? '#065f46' : '#0f172a', fontSize: '0.83rem' }}>{r.recipeName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                      {r.recipeCode} · {r.mealType} · Std: {r.standardPax} pax · Yield: {r.yieldQty} {r.yieldUnit}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* ── Controls ── */}
            {selectedRecipe && (
              <>
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 14px', marginBottom: 14, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.83rem' }}>{selectedRecipe.recipeName}</div>
                  <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 3 }}>
                    Standard: {selectedRecipe.standardPax} pax · {selectedRecipe.yieldQty} {selectedRecipe.yieldUnit}
                  </div>
                </div>

                {/* Target Pax */}
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Target Pax (people) *</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setTargetPax(Math.max(1, targetPax - 10))} style={{ width: 34, height: 34, borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>-</button>
                    <FocusInput
                      type="number" min="1" value={targetPax}
                      onChange={e => setTargetPax(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}
                    />
                    <button onClick={() => setTargetPax(targetPax + 10)} style={{ width: 34, height: 34, borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>+</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {[50, 100, 150, 200, 500].map(n => (
                      <button key={n} onClick={() => setTargetPax(n)} style={{
                        padding: '4px 12px', borderRadius: 20, border: '1.5px solid',
                        borderColor: targetPax === n ? '#059669' : '#e2e8f0',
                        background: targetPax === n ? '#ecfdf5' : '#fff',
                        color: targetPax === n ? '#059669' : '#64748b',
                        fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                      }}>{n}</button>
                    ))}
                  </div>
                </div>

                {/* Target Yield override */}
                <div style={{ marginBottom: 18 }}>
                  <label style={lbl}>Override Yield Qty (optional)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <FocusInput
                      type="number" min="0" step="0.01"
                      placeholder={`Standard: ${selectedRecipe.yieldQty} ${selectedRecipe.yieldUnit}`}
                      value={targetYield}
                      onChange={e => setTargetYield(e.target.value)}
                    />
                    {targetYield && (
                      <button onClick={() => setTargetYield('')} style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>✕</button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
                    Leave empty to scale by pax only. Enter a yield value to apply an additional yield-based multiplier.
                  </div>
                </div>

                <button
                  onClick={handleScale}
                  disabled={scaling}
                  style={{ width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: scaling ? '#94a3b8' : 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 700, cursor: scaling ? 'not-allowed' : 'pointer', fontSize: '0.9rem', letterSpacing: '0.01em' }}
                >
                  {scaling ? '⏳ Calculating…' : '⚖️ Calculate Ingredients'}
                </button>
              </>
            )}
          </div>

          {/* ── Right panel: results ── */}
          <div style={{ flex: '1 1 400px', minWidth: 320 }}>
            {!selectedRecipe && (
              <div style={{ ...card, textAlign: 'center', padding: '60px 40px' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>🍽️</div>
                <div style={{ fontWeight: 700, color: '#374151', fontSize: '1rem', marginBottom: 8 }}>Select a Recipe to Scale</div>
                <div style={{ color: '#94a3b8', fontSize: '0.83rem', lineHeight: 1.6 }}>
                  Choose a recipe from the left panel, set your target pax count, and see exactly which ingredients and quantities you need.
                </div>
              </div>
            )}

            {selectedRecipe && scaling && (
              <div style={{ ...card, textAlign: 'center', padding: '60px 40px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>⏳</div>
                <div style={{ color: '#64748b' }}>Calculating scaled quantities…</div>
              </div>
            )}

            {selectedRecipe && !scaling && scaleResult && (
              <div style={card}>
                {/* Result header */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h2 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{scaleResult.recipeName}</h2>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 3 }}>{scaleResult.recipeCode}</div>
                    </div>
                    <button
                      onClick={() => {
                        const rows = scaleResult.scaledIngredients.map(i =>
                          `${i.itemCode},${i.itemName},${i.grossQty},${i.grossUnit},${i.wastagePercent}%,${i.netQty},${i.netUnit},₹${i.lineCost}`
                        ).join('\n');
                        const csv = `Recipe,${scaleResult.recipeName}\nPax,${scaleResult.targetPax}\nScale Factor,${scaleResult.scaleFactor}\n\nItem Code,Ingredient,Gross Qty,Unit,Wastage,Net Qty,Net Unit,Line Cost\n${rows}`;
                        const a = document.createElement('a');
                        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                        a.download = `${scaleResult.recipeCode}_${scaleResult.targetPax}pax.csv`;
                        a.click();
                        toast.success('CSV exported!');
                      }}
                      style={{ padding: '7px 16px', borderRadius: 7, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}
                    >
                      ⬇️ Export CSV
                    </button>
                  </div>

                  {/* Scale summary pills */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <ScalePill label="Target Pax" value={`${scaleResult.targetPax} pax`} color="#059669" bg="#f0fdf4" />
                    <ScalePill label="Standard Pax" value={`${scaleResult.standardPax} pax`} color="#64748b" bg="#f8fafc" />
                    <ScalePill label="Pax Scale" value={`× ${scaleResult.scaleFactor}`} color="#0284c7" bg="#f0f9ff" />
                    {scaleResult.yieldScaleFactor && (
                      <ScalePill label="Yield Scale" value={`× ${scaleResult.yieldScaleFactor}`} color="#7c3aed" bg="#ede9fe" />
                    )}
                    <ScalePill label="Est. Cost" value={`₹${scaleResult.costEstimate?.estimatedTotalCost?.toFixed(2) || '—'}`} color="#d97706" bg="#fffbeb" />
                    <ScalePill label="Cost / Pax" value={`₹${scaleResult.costEstimate?.costPerPax?.toFixed(2) || '—'}`} color="#dc2626" bg="#fef2f2" />
                  </div>

                  {scaleResult.targetYieldQty && (
                    <div style={{ marginTop: 10, background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 8, padding: '8px 14px', fontSize: '0.78rem', color: '#7c3aed' }}>
                      🌾 Yield override active: Standard {scaleResult.standardYieldQty} {scaleResult.yieldUnit} → Target {scaleResult.targetYieldQty} {scaleResult.yieldUnit} (×{scaleResult.yieldScaleFactor})
                    </div>
                  )}
                </div>

                {/* Ingredients table */}
                {scaleResult.scaledIngredients?.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
                    <div>This recipe has no ingredients configured yet.</div>
                    <div style={{ fontSize: '0.78rem', marginTop: 6 }}>Add ingredients to the recipe first, then use the scale calculator.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                      <thead>
                        <tr>
                          <th style={th}>#</th>
                          <th style={th}>Ingredient</th>
                          <th style={{ ...th, textAlign: 'right' }}>Gross Qty</th>
                          <th style={{ ...th, textAlign: 'center' }}>Unit</th>
                          <th style={{ ...th, textAlign: 'center' }}>Wastage</th>
                          <th style={{ ...th, textAlign: 'right' }}>Net Qty</th>
                          <th style={{ ...th, textAlign: 'right' }}>Line Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scaleResult.scaledIngredients.map((ing, idx) => (
                          <tr key={ing.inventoryItemId} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ ...td, color: '#94a3b8', fontSize: '0.75rem' }}>{idx + 1}</td>
                            <td style={td}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{ing.itemName}</div>
                              <div style={{ fontSize: '0.69rem', color: '#94a3b8', fontFamily: 'monospace' }}>{ing.itemCode}</div>
                            </td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                              {parseFloat(ing.grossQty).toFixed(3)}
                            </td>
                            <td style={{ ...td, textAlign: 'center' }}><Badge color="#0284c7" bg="#f0f9ff">{ing.grossUnit}</Badge></td>
                            <td style={{ ...td, textAlign: 'center', color: ing.wastagePercent > 0 ? '#d97706' : '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                              {ing.wastagePercent > 0 ? `${ing.wastagePercent}%` : '—'}
                            </td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                              {parseFloat(ing.netQty).toFixed(3)}
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 4 }}>{ing.netUnit}</span>
                            </td>
                            <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>
                              {parseFloat(ing.lineCost).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f0fdf4' }}>
                          <td colSpan={5} style={{ ...td, fontWeight: 700, color: '#065f46', fontSize: '0.85rem' }}>
                            Total ({scaleResult.scaledIngredients.length} ingredients · {scaleResult.targetPax} pax)
                          </td>
                          <td style={{ ...td, textAlign: 'right' }} />
                          <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                            ₹{scaleResult.scaledIngredients.reduce((s, i) => s + parseFloat(i.lineCost), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ ADD / EDIT MODAL ══════════════ */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editItem ? `Edit: ${editItem.itemName}` : 'Add New Ingredient'} wide>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
              <div>
                <label style={lbl}>Item Code *</label>
                <FocusInput
                  value={form.itemCode}
                  onChange={e => setForm(f => ({ ...f, itemCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. VEG-TOM-001"
                />
                <div style={{ fontSize: '0.69rem', color: '#94a3b8', marginTop: 3 }}>Unique identifier. Auto-uppercased.</div>
              </div>
              <div>
                <label style={lbl}>Ingredient Name *</label>
                <FocusInput
                  value={form.itemName}
                  onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
                  placeholder="e.g. Fresh Tomatoes"
                />
              </div>
              <div>
                <label style={lbl}>Category *</label>
                <FocusSelect value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </FocusSelect>
              </div>
              <div>
                <label style={lbl}>Unit of Measure *</label>
                <FocusSelect value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </FocusSelect>
              </div>
              <div>
                <label style={lbl}>Cost per Unit (₹) *</label>
                <FocusInput
                  type="number" min="0" step="0.01"
                  value={form.costPerUnit}
                  onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={lbl}>Store *</label>
                <FocusSelect value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))}>
                  <option value="">— Select store —</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </FocusSelect>
                {stores.length === 0 && <div style={{ fontSize: '0.69rem', color: '#f59e0b', marginTop: 3 }}>⚠ No stores found. Add a store in the Stores tab first.</div>}
              </div>
              <div>
                <label style={lbl}>Current Stock</label>
                <FocusInput
                  type="number" min="0" step="0.001"
                  value={form.currentStock}
                  onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))}
                  placeholder="0"
                />
                <div style={{ fontSize: '0.69rem', color: '#94a3b8', marginTop: 3 }}>In {form.unit || 'units'}</div>
              </div>
              <div>
                <label style={lbl}>Minimum Stock Level</label>
                <FocusInput
                  type="number" min="0" step="0.001"
                  value={form.minimumStock}
                  onChange={e => setForm(f => ({ ...f, minimumStock: e.target.value }))}
                  placeholder="0"
                />
                <div style={{ fontSize: '0.69rem', color: '#94a3b8', marginTop: 3 }}>Reorder alert threshold</div>
              </div>
            </div>

            {/* Cost preview */}
            {form.costPerUnit > 0 && (
              <div style={{ marginTop: 18, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '10px 16px' }}>
                <div style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>💡 Cost preview</div>
                <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: 4 }}>
                  100 {form.unit}: <strong>₹{(parseFloat(form.costPerUnit) * 100).toFixed(2)}</strong> &nbsp;|&nbsp;
                  1000 {form.unit}: <strong>₹{(parseFloat(form.costPerUnit) * 1000).toFixed(2)}</strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : editItem ? 'Update Ingredient' : 'Add Ingredient'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ── Small helper component ── */
function ScalePill({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '6px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontWeight: 800, color, fontSize: '0.9rem', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: 2 }}>{label}</span>
    </div>
  );
}
