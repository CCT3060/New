/**
 * RecipeCreatePage — Drag-and-drop recipe builder
 * Left: searchable ingredients sidebar | Right: recipe fields + ingredient table
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useWarehouses, useAllInventoryItems, useCreateRecipe } from '../hooks/useRecipes';
import { recipeApi } from '../services/recipe.api';

const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RecipeCreatePage() {
  const navigate = useNavigate();
  const dragItem = useRef(null);

  const [search, setSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fields, setFields] = useState({
    recipeName: '',
    warehouseId: '',
    standardPax: 4,
    yieldQty: '',
    yieldUnit: 'kg',
  });

  const [ingredients, setIngredients] = useState([]);
  // Each: { inventoryItemId, name, grossQty, unit, costPerUnit }

  const { data: warehouses = [] } = useWarehouses();
  const { data: allItemsData, isLoading: itemsLoading } = useAllInventoryItems();
  const allItems = allItemsData?.items ?? (Array.isArray(allItemsData) ? allItemsData : []);
  const { mutateAsync: createRecipe } = useCreateRecipe();

  const filteredItems = allItems.filter((item) =>
    item.itemName.toLowerCase().includes(search.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(search.toLowerCase())
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
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
    setIngredients((prev) => prev.map((i) => (i.inventoryItemId === id ? { ...i, grossQty: qty } : i)));

  const removeIngredient = (id) =>
    setIngredients((prev) => prev.filter((i) => i.inventoryItemId !== id));

  const totalCost = ingredients.reduce(
    (sum, i) => sum + (parseFloat(i.costPerUnit) || 0) * (parseFloat(i.grossQty) || 0),
    0
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fields.recipeName.trim()) { toast.error('Recipe Name is required'); return; }
    if (!fields.warehouseId) { toast.error('Kitchen / Warehouse is required'); return; }
    if (!fields.yieldQty) { toast.error('Yield Qty is required'); return; }
    if (!fields.yieldUnit.trim()) { toast.error('Yield Unit is required'); return; }

    setSaving(true);
    try {
      const code = `REC-${fields.recipeName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 18)}-${Date.now().toString().slice(-4)}`;
      const recipe = await createRecipe({
        recipeCode: code,
        recipeName: fields.recipeName.trim(),
        warehouseId: fields.warehouseId,
        standardPax: parseInt(fields.standardPax) || 4,
        yieldQty: parseFloat(fields.yieldQty),
        yieldUnit: fields.yieldUnit.trim(),
        status: 'ACTIVE',
      });

      if (recipe?.id) {
        for (const ing of ingredients) {
          try {
            await recipeApi.addIngredient(recipe.id, {
              inventoryItemId: ing.inventoryItemId,
              grossQty: parseFloat(ing.grossQty) || 1,
              grossUnit: ing.unit,
              wastagePercent: 0,
            });
          } catch (err) {
            toast.error(`Failed to add ${ing.name}: ${err.message}`);
          }
        }
        navigate(`/recipes/${recipe.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden', background: 'var(--color-gray-50)' }}>

      {/* ── LEFT SIDEBAR: Ingredients ── */}
      <div style={{
        width: 270,
        background: '#fff',
        borderRight: '1px solid var(--color-gray-200)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--color-gray-100)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-gray-700)', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Ingredients
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {itemsLoading && (
            <p style={{ padding: 16, color: 'var(--color-gray-400)', fontSize: '0.8rem' }}>Loading...</p>
          )}
          {!itemsLoading && filteredItems.length === 0 && (
            <p style={{ padding: 16, color: 'var(--color-gray-400)', fontSize: '0.8rem' }}>No items found</p>
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
                borderBottom: '1px solid var(--color-gray-100)',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gray-50)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--color-gray-800)' }}>
                {item.itemName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                {item.unit} · {fmt(item.costPerUnit)}/unit
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT MAIN AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => navigate('/recipes')}>← Back</button>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-gray-800)' }}>New Recipe</span>
        </div>

        {/* Recipe fields row */}
        <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid var(--color-gray-100)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.8fr 0.8fr 0.8fr', gap: 14 }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Recipe Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Veg Pulao"
                value={fields.recipeName}
                onChange={(e) => setFields((f) => ({ ...f, recipeName: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Kitchen / Warehouse *</label>
              <select
                className="form-control"
                value={fields.warehouseId}
                onChange={(e) => setFields((f) => ({ ...f, warehouseId: e.target.value }))}
              >
                <option value="">Select kitchen...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Pax Count *</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={fields.standardPax}
                onChange={(e) => setFields((f) => ({ ...f, standardPax: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Yield Qty *</label>
              <input
                type="number"
                className="form-control"
                min="0"
                step="0.01"
                placeholder="25"
                value={fields.yieldQty}
                onChange={(e) => setFields((f) => ({ ...f, yieldQty: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Yield Unit *</label>
              <input
                type="text"
                className="form-control"
                placeholder="kg"
                value={fields.yieldUnit}
                onChange={(e) => setFields((f) => ({ ...f, yieldUnit: e.target.value }))}
              />
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
              border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'var(--color-gray-300)'}`,
              borderRadius: 12,
              padding: '70px 24px',
              textAlign: 'center',
              color: isDragOver ? 'var(--color-primary)' : 'var(--color-gray-400)',
              background: isDragOver ? 'rgba(59,130,246,0.04)' : 'transparent',
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⊕</div>
              <p style={{ fontWeight: 600, fontSize: '1rem' }}>Drag ingredients here</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Search & drag items from the left panel to build your ingredient list</p>
            </div>
          ) : (
            <div style={{
              border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'transparent'}`,
              borderRadius: 12,
              transition: 'border-color 0.2s',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-gray-50)', borderBottom: '2px solid var(--color-gray-200)' }}>
                    {['#', 'Ingredient Name', 'Qty', 'Unit', 'Cost / Unit', 'Total Cost', ''].map((h) => (
                      <th key={h} style={{
                        padding: '11px 16px',
                        textAlign: h === 'Qty' || h === 'Unit' ? 'center' : h === 'Cost / Unit' || h === 'Total Cost' ? 'right' : 'left',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        color: 'var(--color-gray-500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => {
                    const rowCost = (parseFloat(ing.costPerUnit) || 0) * (parseFloat(ing.grossQty) || 0);
                    return (
                      <tr key={ing.inventoryItemId} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--color-gray-400)', fontSize: '0.8rem' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--color-gray-800)', fontSize: '0.875rem' }}>{ing.name}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={ing.grossQty}
                            onChange={(e) => updateQty(ing.inventoryItemId, e.target.value)}
                            style={{ width: 80, textAlign: 'center', padding: '4px 8px', border: '1px solid var(--color-gray-200)', borderRadius: 4, fontSize: '0.875rem' }}
                          />
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>{ing.unit}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-gray-600)', fontSize: '0.875rem' }}>{fmt(ing.costPerUnit)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-gray-800)', fontSize: '0.9rem' }}>{fmt(rowCost)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeIngredient(ing.inventoryItemId)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                          >×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--color-gray-200)', background: 'var(--color-gray-50)' }}>
                    <td colSpan={5} style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-gray-600)', textAlign: 'right', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Ingredient Cost
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-primary)' }}>
                      {fmt(totalCost)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>

              {isDragOver && (
                <div style={{ textAlign: 'center', padding: 12, color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 500 }}>
                  Drop to add ingredient
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--color-gray-200)',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
            {ingredients.length > 0 && (
              <> &nbsp;·&nbsp; Total: <strong style={{ color: 'var(--color-gray-700)' }}>{fmt(totalCost)}</strong></>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/recipes')}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

