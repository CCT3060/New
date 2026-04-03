/**
 * RecipeCreatePage - Drag-and-drop recipe builder
 * Left: searchable ingredients sidebar | Right: recipe fields + ingredient table
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAllInventoryItems, useCreateRecipe, useWarehouses } from '../hooks/useRecipes';
import { recipeApi } from '../services/recipe.api';

const fmtCost = (n) =>
  `Rs. ${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FOOD_TYPES = ['VEG', 'NON_VEG', 'EGG', 'VEGAN'];
const FOOD_TYPE_COLORS = { VEG: '#16a34a', NON_VEG: '#dc2626', EGG: '#d97706', VEGAN: '#059669' };

const ErrorMsg = ({ msg }) =>
  msg ? <p style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: 3 }}>{msg}</p> : null;

export default function RecipeCreatePage() {
  const navigate = useNavigate();
  const dragItem = useRef(null);

  const [search, setSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [fields, setFields] = useState({
    recipeName: '',
    foodType: 'VEG',
    standardPax: 4,
    yieldQty: '',
    yieldUnit: 'kg',
    warehouseId: '',
  });

  const [ingredients, setIngredients] = useState([]);

  const { data: allItemsData, isLoading: itemsLoading } = useAllInventoryItems();
  const allItems = allItemsData?.items ?? (Array.isArray(allItemsData) ? allItemsData : []);
  const { mutateAsync: createRecipe } = useCreateRecipe();

  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData?.warehouses ?? warehousesData ?? [];

  const filteredItems = allItems.filter(
    (item) =>
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase())
  );

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
    if (!fields.standardPax || parseInt(fields.standardPax) < 1)
      e.standardPax = 'Standard pax must be at least 1';
    if (!fields.yieldQty || parseFloat(fields.yieldQty) <= 0)
      e.yieldQty = 'Yield quantity must be a positive number';
    if (!fields.yieldUnit.trim()) e.yieldUnit = 'Yield unit is required';
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

      const payload = {
        recipeCode: code,
        recipeName: fields.recipeName.trim(),
        foodType: fields.foodType,
        standardPax: parseInt(fields.standardPax) || 4,
        yieldQty: parseFloat(fields.yieldQty),
        yieldUnit: fields.yieldUnit.trim(),
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
          foodType: 'VEG',
          standardPax: 4,
          yieldQty: '',
          yieldUnit: 'kg',
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
        width: 260,
        background: '#fff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#64748b', marginBottom: 10, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            Ingredients
          </div>
          <input
            type="text"
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <p style={{ padding: '8px 16px 4px', fontSize: '0.72rem', color: '#94a3b8' }}>
          Drag item into the recipe area below
        </p>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {itemsLoading && (
            <p style={{ padding: 16, color: '#94a3b8', fontSize: '0.8rem' }}>Loading...</p>
          )}
          {!itemsLoading && filteredItems.length === 0 && (
            <p style={{ padding: 16, color: '#94a3b8', fontSize: '0.8rem' }}>No items found</p>
          )}
          {filteredItems.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              title="Drag to add"
              style={{
                padding: '10px 16px',
                cursor: 'grab',
                borderBottom: '1px solid #f1f5f9',
                userSelect: 'none',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#1e293b' }}>
                {item.itemName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                {item.unit} &nbsp;&middot;&nbsp; {fmtCost(item.costPerUnit)}/unit
              </div>
            </div>
          ))}
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

          {/* Row 1: Name, Food Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 14, marginBottom: 14 }}>
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
              <label style={labelStyle}>Food Type <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={fields.foodType}
                onChange={(e) => setField('foodType', e.target.value)}
                style={{ ...inputStyle('foodType'), color: FOOD_TYPE_COLORS[fields.foodType] || 'inherit', fontWeight: 600 }}
              >
                {FOOD_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
              <ErrorMsg msg={errors.foodType} />
            </div>
          </div>

          {/* Row 2: Warehouse, Pax, Yield Qty, Yield Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Warehouse / Kitchen <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
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
              <input
                type="text"
                placeholder="kg / litre / pcs"
                value={fields.yieldUnit}
                onChange={(e) => setField('yieldUnit', e.target.value)}
                style={inputStyle('yieldUnit')}
              />
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
