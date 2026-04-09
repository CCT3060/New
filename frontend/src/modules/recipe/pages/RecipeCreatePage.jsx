/**
 * RecipeCreatePage - Drag-and-drop recipe builder
 * Left: searchable ingredients sidebar | Right: recipe fields + ingredient table
 */
import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAllInventoryItems, useCreateRecipe, useWarehouses } from '../hooks/useRecipes';
import { recipeApi } from '../services/recipe.api';

const fmtCost = (n) =>
  `₹${parseFloat(n || 0).toFixed(2)}`;

const CAT_COLORS = {
  Vegetable: '#16a34a', Vegetables: '#16a34a', Fruit: '#ea580c', Meat: '#dc2626',
  Seafood: '#0284c7', Dairy: '#7c3aed', Grain: '#d97706', Spice: '#db2777',
  Spices: '#db2777', Oil: '#ca8a04', Condiment: '#059669', Condiments: '#059669',
  Herbs: '#15803d', Default: '#64748b',
};
const catColor = (c) => CAT_COLORS[c] || CAT_COLORS.Default;

const FOOD_TYPES = ['VEG', 'NON VEG', 'EGG', 'VEGAN'];
const FOOD_TYPE_COLORS = { VEG: '#16a34a', 'NON VEG': '#dc2626', EGG: '#d97706', VEGAN: '#059669' };

const RECIPE_CATEGORIES = [
  'Breakfast', 'Starters', 'Main Course', 'Side Dish', 'Rice & Biryani',
  'Breads', 'Soups', 'Salads', 'Desserts', 'Beverages',
  'Snacks', 'Condiments', 'Dairy', 'General', 'Dal', 'Curries', 'Rice Dishes',
  'Light Meals', 'Other',
];

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'BEVERAGE', 'DESSERT'];

const YIELD_UNITS = ['kg', 'g', 'litre', 'ml', 'pcs', 'portion', 'serving', 'cup', 'tbsp', 'tsp', 'nos', 'batch', 'tray', 'Custom...'];

// Hook to fetch company kitchens as warehouses (uses company_token from localStorage)
function useCompanyWarehouses() {
  const [companyWarehouses, setCompanyWarehouses] = useState([]);
  useMemo(() => {
    const token = localStorage.getItem('company_token');
    if (!token) return;
    fetch('/api/company/warehouses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && Array.isArray(d.data?.warehouses)) setCompanyWarehouses(d.data.warehouses); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return companyWarehouses;
}

const ErrorMsg = ({ msg }) =>
  msg ? <p style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: 3 }}>{msg}</p> : null;

export default function RecipeCreatePage() {
  const navigate = useNavigate();
  const dragItem = useRef(null);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [fields, setFields] = useState({
    recipeName: '',
    category: 'General',
    customCategory: '',
    mealType: 'BREAKFAST',
    customMealType: '',
    foodType: 'VEG',
    customFoodType: '',
    standardPax: 100,
    yieldQty: '',
    yieldUnit: 'kg',
    customYieldUnit: '',
    warehouseId: '',
  });

  const [ingredients, setIngredients] = useState([]);

  const { data: allItemsData, isLoading: itemsLoading } = useAllInventoryItems();
  const allItems = allItemsData?.items ?? (Array.isArray(allItemsData) ? allItemsData : []);
  const { mutateAsync: createRecipe } = useCreateRecipe();

  const { data: warehousesData } = useWarehouses();
  const kitchenWarehouses = warehousesData?.warehouses ?? warehousesData ?? [];
  const companyKitchens = useCompanyWarehouses();
  // Merge company kitchens with kitchen warehouses (dedupe by id)
  const warehouses = useMemo(() => {
    const all = [...(companyKitchens || []), ...(kitchenWarehouses || [])];
    const seen = new Set();
    return all.filter(w => { if (seen.has(w.id)) return false; seen.add(w.id); return true; });
  }, [companyKitchens, kitchenWarehouses]);

  const categories = useMemo(() => [...new Set(allItems.map(i => i.category).filter(Boolean))].sort(), [allItems]);

  const filteredItems = useMemo(() => allItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !search || item.itemName.toLowerCase().includes(q) || item.itemCode.toLowerCase().includes(q);
    const matchCat = !catFilter || item.category === catFilter;
    return matchSearch && matchCat;
  }), [allItems, search, catFilter]);

  const setField = (key, value) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // -- Drag handlers --
  const handleDragStart = (e, item) => {
    dragItem.current = item;
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const item = dragItem.current;
    if (!item) return;
    if (ingredients.find((i) => i.inventoryItemId === item.id)) {
      toast.info(`${item.itemName} is already added`);
      return;
    }
    setIngredients((prev) => [
      ...prev,
      {
        inventoryItemId: item.id,
        name: item.itemName,
        grossQty: 1,
        unit: item.unit,
        costPerUnit: parseFloat(item.costPerUnit) || 0,
      },
    ]);
    dragItem.current = null;
  };

  const updateQty = (id, qty) =>
    setIngredients((prev) =>
      prev.map((i) => (i.inventoryItemId === id ? { ...i, grossQty: qty } : i))
    );

  const removeIngredient = (id) =>
    setIngredients((prev) => prev.filter((i) => i.inventoryItemId !== id));

  const totalCost = ingredients.reduce(
    (sum, i) => sum + (parseFloat(i.costPerUnit) || 0) * (parseFloat(i.grossQty) || 0),
    0
  );

  // -- Validation --
  const validate = () => {
    const e = {};
    if (!fields.recipeName.trim()) e.recipeName = 'Recipe name is required';
    if (!fields.foodType) e.foodType = 'Food type is required';
    if (fields.foodType === 'Custom...' && !fields.customFoodType.trim()) e.foodType = 'Custom food type is required';
    if (!fields.standardPax || parseInt(fields.standardPax) < 1)
      e.standardPax = 'Standard pax must be at least 1';
    if (!fields.yieldQty || parseFloat(fields.yieldQty) <= 0)
      e.yieldQty = 'Yield quantity must be a positive number';
    if (!fields.yieldUnit.trim()) e.yieldUnit = 'Yield unit is required';
    if (fields.yieldUnit === 'Custom...' && !fields.customYieldUnit.trim()) e.yieldUnit = 'Custom yield unit value is required';
    if (fields.category === 'Custom...' && !fields.customCategory.trim()) e.category = 'Custom category value is required';
    if (fields.mealType === 'Custom...' && !fields.customMealType.trim()) e.mealType = 'Custom meal type value is required';
    return e;
  };

  // -- Save --
  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the highlighted fields before saving');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const code = `REC-${fields.recipeName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .slice(0, 18)}-${Date.now().toString().slice(-4)}`;

      const effectiveFoodType = fields.foodType === 'Custom...' ? (fields.customFoodType.trim() || 'VEG') : fields.foodType;
      const effectiveYieldUnit = fields.yieldUnit === 'Custom...' ? (fields.customYieldUnit.trim() || 'portion') : fields.yieldUnit;
      const effectiveCategory = fields.category === 'Custom...' ? (fields.customCategory.trim() || 'General') : fields.category;
      const effectiveMealType = fields.mealType === 'Custom...' ? (fields.customMealType.trim().toUpperCase() || 'LUNCH') : fields.mealType;

      const payload = {
        recipeCode: code,
        recipeName: fields.recipeName.trim(),
        category: effectiveCategory || 'General',
        mealType: effectiveMealType || 'BREAKFAST',
        foodType: effectiveFoodType,
        standardPax: parseInt(fields.standardPax) || 100,
        yieldQty: parseFloat(fields.yieldQty),
        yieldUnit: effectiveYieldUnit,
        status: 'ACTIVE',
      };
      if (fields.warehouseId) payload.warehouseId = fields.warehouseId;

      const recipe = await createRecipe(payload);

      if (recipe?.id) {
        for (const ing of ingredients) {
          try {
            await recipeApi.addIngredient(recipe.id, {
              inventoryItemId: ing.inventoryItemId,
              grossQty: parseFloat(ing.grossQty) || 1,
              grossUnit: ing.unit,
              wastagePercent: 0,
            });
          } catch (ingErr) {
            toast.error(`Failed to add ${ing.name}: ${ingErr.message}`);
          }
        }
        toast.success('Recipe saved! You can add another recipe.');
        // Reset form so user can immediately add another recipe
        setFields({
          recipeName: '',
          category: 'General',
          customCategory: '',
          mealType: 'BREAKFAST',
          customMealType: '',
          foodType: 'VEG',
          customFoodType: '',
          standardPax: 100,
          yieldQty: '',
          yieldUnit: 'kg',
          customYieldUnit: '',
          warehouseId: '',
        });
        setIngredients([]);
        setErrors({});
        setSearch('');
      }
    } catch (err) {
      // Parse backend field-level validation errors
      const backendErrors = err.errors || [];
      if (backendErrors.length > 0) {
        const fieldErrors = {};
        backendErrors.forEach((e) => {
          if (e.field) fieldErrors[e.field] = e.message;
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }
      }
      toast.error(err.message || 'Failed to save recipe. Check the form for errors.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '7px 10px',
    border: `1.5px solid ${errors[field] ? '#dc2626' : '#e2e8f0'}`,
    borderRadius: 7,
    fontSize: '0.85rem',
    outline: 'none',
    background: errors[field] ? '#fff5f5' : '#fff',
    boxSizing: 'border-box',
  });

  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden', background: '#f8fafc' }}>

      {/* -- LEFT SIDEBAR: Ingredients -- */}
      <div style={{
        width: 270,
        background: '#fff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            🧂 Ingredients ({allItems.length})
          </div>
          <input
            type="text"
            placeholder="🔍 Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', marginBottom: 7 }}
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ padding: '6px 14px 4px', fontSize: '0.69rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>↕ Drag to add</span>
          {filteredItems.length > 0 && <span style={{ marginLeft: 'auto', color: '#cbd5e1' }}>{filteredItems.length} shown</span>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {itemsLoading && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>⏳ Loading ingredients…</div>
            </div>
          )}
          {!itemsLoading && allItems.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🧂</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>No ingredients found</div>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Add ingredients in the Ingredients tab first</div>
            </div>
          )}
          {!itemsLoading && allItems.length > 0 && filteredItems.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              No ingredients match your search
            </div>
          )}
          {filteredItems.map((item) => {
            const alreadyAdded = ingredients.some(i => i.inventoryItemId === item.id);
            return (
              <div
                key={item.id}
                draggable={!alreadyAdded}
                onDragStart={(e) => { if (!alreadyAdded) handleDragStart(e, item); }}
                onClick={() => {
                  if (alreadyAdded) { toast.info(`${item.itemName} already added`); return; }
                  setIngredients(prev => [...prev, {
                    inventoryItemId: item.id, name: item.itemName,
                    grossQty: 1, unit: item.unit, costPerUnit: parseFloat(item.costPerUnit) || 0,
                  }]);
                  toast.success(`${item.itemName} added`);
                }}
                title={alreadyAdded ? 'Already added' : 'Click or drag to add'}
                style={{
                  padding: '9px 14px',
                  cursor: alreadyAdded ? 'default' : 'grab',
                  borderBottom: '1px solid #f8fafc',
                  userSelect: 'none',
                  transition: 'background 100ms',
                  opacity: alreadyAdded ? 0.45 : 1,
                  background: alreadyAdded ? '#f8fafc' : undefined,
                }}
                onMouseEnter={(e) => { if (!alreadyAdded) e.currentTarget.style.background = '#f0fdf4'; }}
                onMouseLeave={(e) => { if (!alreadyAdded) e.currentTarget.style.background = ''; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  {item.category && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: catColor(item.category), flexShrink: 0, display: 'inline-block' }} />
                  )}
                  <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.itemName}
                  </span>
                  {alreadyAdded && <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{item.unit}</span>
                  <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>{fmtCost(item.costPerUnit)}/{item.unit}</span>
                </div>
                {item.category && (
                  <span style={{ fontSize: '0.62rem', color: catColor(item.category), opacity: 0.8 }}>{item.category}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* -- RIGHT MAIN AREA -- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          padding: '12px 24px',
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <button
            type="button"
            onClick={() => navigate('/recipes')}
            style={{ padding: '6px 14px', border: '1.5px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
          >
            &larr; Back
          </button>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>New Recipe</span>
            <span style={{ marginLeft: 12, fontSize: '0.8rem', color: '#94a3b8' }}>
              Fill in the details and drag ingredients from the left panel
            </span>
          </div>
        </div>

        {/* Recipe fields */}
        <div style={{ padding: '16px 24px 14px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>

          {/* Row 1: Name, Category, Food Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>
                Recipe Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Veg Pulao"
                value={fields.recipeName}
                onChange={(e) => setField('recipeName', e.target.value)}
                style={inputStyle('recipeName')}
              />
              <ErrorMsg msg={errors.recipeName} />
            </div>
            <div>
              <label style={labelStyle}>Category <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={fields.category}
                onChange={(e) => setField('category', e.target.value)}
                style={inputStyle('category')}
              >
                {RECIPE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="Custom...">Custom...</option>
              </select>
              {fields.category === 'Custom...' && (
                <input
                  type="text"
                  placeholder="e.g. Thali, Fusion..."
                  value={fields.customCategory}
                  onChange={(e) => setField('customCategory', e.target.value)}
                  style={{ ...inputStyle('customCategory'), marginTop: 5 }}
                />
              )}
              <ErrorMsg msg={errors.category} />
            </div>
            <div>
              <label style={labelStyle}>Food Type <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={fields.foodType}
                onChange={(e) => setField('foodType', e.target.value)}
                style={{ ...inputStyle('foodType'), color: FOOD_TYPE_COLORS[fields.foodType] || '#0f172a', fontWeight: 600 }}
              >
                {FOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="Custom...">Custom...</option>
              </select>
              {fields.foodType === 'Custom...' && (
                <input
                  type="text"
                  placeholder="e.g. Jain, Keto..."
                  value={fields.customFoodType}
                  onChange={(e) => setField('customFoodType', e.target.value)}
                  style={{ ...inputStyle('customFoodType'), marginTop: 5 }}
                />
              )}
              <ErrorMsg msg={errors.foodType} />
            </div>
          </div>

          {/* Row 2: Meal Type, Kitchen, Pax, Yield Qty, Yield Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Meal Type <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={fields.mealType}
                onChange={(e) => setField('mealType', e.target.value)}
                style={inputStyle('mealType')}
              >
                {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="Custom...">Custom...</option>
              </select>
              {fields.mealType === 'Custom...' && (
                <input
                  type="text"
                  placeholder="e.g. TEATIME, BRUNCH..."
                  value={fields.customMealType}
                  onChange={(e) => setField('customMealType', e.target.value)}
                  style={{ ...inputStyle('customMealType'), marginTop: 5 }}
                />
              )}
              <ErrorMsg msg={errors.mealType} />
            </div>
            <div>
              <label style={labelStyle}>Kitchen <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
              <select
                value={fields.warehouseId}
                onChange={(e) => setField('warehouseId', e.target.value)}
                style={inputStyle('warehouseId')}
              >
                <option value="">-- Auto assign --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ''}</option>
                ))}
              </select>
              <ErrorMsg msg={errors.warehouseId} />
            </div>
            <div>
              <label style={labelStyle}>Standard Pax <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="number"
                min="1"
                value={fields.standardPax}
                onChange={(e) => setField('standardPax', e.target.value)}
                style={inputStyle('standardPax')}
              />
              <ErrorMsg msg={errors.standardPax} />
            </div>
            <div>
              <label style={labelStyle}>Yield Qty <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 25"
                value={fields.yieldQty}
                onChange={(e) => setField('yieldQty', e.target.value)}
                style={inputStyle('yieldQty')}
              />
              <ErrorMsg msg={errors.yieldQty} />
            </div>
            <div>
              <label style={labelStyle}>Yield Unit <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={fields.yieldUnit}
                onChange={(e) => setField('yieldUnit', e.target.value)}
                style={inputStyle('yieldUnit')}
              >
                {YIELD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {fields.yieldUnit === 'Custom...' && (
                <input
                  type="text"
                  placeholder="e.g. batch, tray..."
                  value={fields.customYieldUnit}
                  onChange={(e) => setField('customYieldUnit', e.target.value)}
                  style={{ ...inputStyle('customYieldUnit'), marginTop: 5 }}
                />
              )}
              <ErrorMsg msg={errors.yieldUnit} />
            </div>
          </div>
        </div>

        {/* Drop zone / ingredient table */}
        <div
          style={{ flex: 1, overflowY: 'auto', padding: 24 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {ingredients.length === 0 ? (
            <div style={{
              border: `2px dashed ${isDragOver ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: 12,
              padding: '70px 24px',
              textAlign: 'center',
              color: isDragOver ? '#2563eb' : '#94a3b8',
              background: isDragOver ? 'rgba(37,99,235,0.04)' : 'transparent',
              transition: 'all 0.2s',
              cursor: 'default',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>+</div>
              <p style={{ fontWeight: 600, fontSize: '1rem' }}>Drag ingredients here</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>
                Search and drag items from the left panel to build your ingredient list
              </p>
            </div>
          ) : (
            <div style={{
              border: `2px dashed ${isDragOver ? '#2563eb' : 'transparent'}`,
              borderRadius: 12,
              transition: 'border-color 0.2s',
            }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse', background: '#fff',
                borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'Ingredient', 'Quantity', 'Unit', 'Cost / Unit', 'Total Cost', ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '11px 16px',
                        textAlign: (h === 'Quantity' || h === 'Unit') ? 'center' : (h === 'Cost / Unit' || h === 'Total Cost') ? 'right' : 'left',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => {
                    const rowCost = (parseFloat(ing.costPerUnit) || 0) * (parseFloat(ing.grossQty) || 0);
                    return (
                      <tr key={ing.inventoryItemId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: '#1e293b', fontSize: '0.875rem' }}>{ing.name}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={ing.grossQty}
                            onChange={(e) => updateQty(ing.inventoryItemId, e.target.value)}
                            style={{ width: 80, textAlign: 'center', padding: '4px 8px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: '0.875rem', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>{ing.unit}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#475569', fontSize: '0.875rem' }}>{fmtCost(ing.costPerUnit)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{fmtCost(rowCost)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeIngredient(ing.inventoryItemId)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}
                            title="Remove"
                          >
                            x
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '14px 16px', fontWeight: 700, color: '#475569', textAlign: 'right', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Ingredient Cost
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: '#2563eb' }}>
                      {fmtCost(totalCost)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              {isDragOver && (
                <div style={{ textAlign: 'center', padding: 12, color: '#2563eb', fontSize: '0.85rem', fontWeight: 500 }}>
                  Drop to add ingredient
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
            {ingredients.length > 0 && (
              <span> &nbsp;&middot;&nbsp; Total: <strong style={{ color: '#2563eb' }}>{fmtCost(totalCost)}</strong></span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate('/recipes')}
              style={{ padding: '8px 18px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: 8,
                background: saving ? '#93c5fd' : '#2563eb',
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              {saving ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
