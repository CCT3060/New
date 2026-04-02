/**
 * RecipeIngredientsTable
 * Inline editable table for managing recipe ingredients.
 * Supports real-time net qty & line cost calculation.
 */
import { useState, useMemo } from 'react';
import { useInventoryItems } from '../hooks/useRecipes';

const calcNetQty = (grossQty, wastagePercent) => {
  if (!grossQty || isNaN(grossQty)) return 0;
  const gross = parseFloat(grossQty);
  const waste = parseFloat(wastagePercent) || 0;
  return parseFloat((gross - (gross * waste) / 100).toFixed(4));
};

const calcLineCost = (netQty, unitCost) => {
  return parseFloat((netQty * (parseFloat(unitCost) || 0)).toFixed(4));
};

const fmtNum = (n, decimals = 3) => {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return num.toFixed(decimals);
};

const fmtCurrency = (n) => {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function RecipeIngredientsTable({
  ingredients = [],
  warehouseId,
  disabled = false,
  onAdd,
  onUpdate,
  onRemove,
  addLoading,
  updateLoading,
  removeLoading,
}) {
  const { data: inventoryItems = [], isLoading: itemsLoading } = useInventoryItems(warehouseId);

  // Local state for the "Add new row" form
  const [newRow, setNewRow] = useState({
    inventoryItemId: '',
    grossQty: '',
    grossUnit: '',
    wastagePercent: 0,
    notes: '',
  });
  const [showAddRow, setShowAddRow] = useState(false);

  // Item lookup map
  const itemMap = useMemo(() => {
    return inventoryItems.reduce((m, item) => { m[item.id] = item; return m; }, {});
  }, [inventoryItems]);

  // Computed totals
  const totals = useMemo(() => {
    return ingredients.reduce(
      (acc, ing) => ({
        lineCost: acc.lineCost + parseFloat(ing.lineCost || 0),
      }),
      { lineCost: 0 }
    );
  }, [ingredients]);

  const handleNewRowChange = (field, value) => {
    setNewRow((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-fill unit from selected inventory item
      if (field === 'inventoryItemId' && value) {
        const item = itemMap[value];
        if (item) updated.grossUnit = item.unit;
      }
      return updated;
    });
  };

  const handleAddRow = async () => {
    if (!newRow.inventoryItemId || !newRow.grossQty) return;
    await onAdd({
      inventoryItemId: newRow.inventoryItemId,
      grossQty: parseFloat(newRow.grossQty),
      grossUnit: newRow.grossUnit,
      wastagePercent: parseFloat(newRow.wastagePercent) || 0,
      notes: newRow.notes,
    });
    setNewRow({ inventoryItemId: '', grossQty: '', grossUnit: '', wastagePercent: 0, notes: '' });
    setShowAddRow(false);
  };

  // For inline editing of existing rows
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});

  const startEdit = (ing) => {
    setEditingId(ing.id);
    setEditRow({
      grossQty: parseFloat(ing.grossQty),
      wastagePercent: parseFloat(ing.wastagePercent),
      notes: ing.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRow({});
  };

  const saveEdit = async (ing) => {
    await onUpdate({ ingredientId: ing.id, data: editRow });
    setEditingId(null);
  };

  const newRowNetQty = calcNetQty(newRow.grossQty, newRow.wastagePercent);
  const newRowItem = itemMap[newRow.inventoryItemId];
  const newRowLineCost = newRowItem ? calcLineCost(newRowNetQty, newRowItem.costPerUnit) : 0;

  // Don't show items already added
  const usedItemIds = new Set(ingredients.map((i) => i.inventoryItemId));
  const availableItems = inventoryItems.filter((item) => !usedItemIds.has(item.id));

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
        <h3 style={{ fontWeight: 600, color: 'var(--color-gray-700)' }}>
          Ingredients
          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--color-gray-500)', fontWeight: 400 }}>
            ({ingredients.length} items)
          </span>
        </h3>
        {!disabled && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setShowAddRow(true)}
            disabled={showAddRow || itemsLoading}
          >
            + Add Ingredient
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <table className="ingredient-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Ingredient</th>
              <th>Gross Qty</th>
              <th>Unit</th>
              <th>Wastage %</th>
              <th>Net Qty</th>
              <th>Unit Cost</th>
              <th>Line Cost</th>
              <th>Notes</th>
              {!disabled && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {ingredients.length === 0 && !showAddRow && (
              <tr>
                <td colSpan={10} className="text-center" style={{ padding: '24px', color: 'var(--color-gray-400)' }}>
                  No ingredients added yet. Click "Add Ingredient" to begin.
                </td>
              </tr>
            )}

            {ingredients.map((ing, idx) => {
              const isEditing = editingId === ing.id;
              const displayNetQty = isEditing
                ? calcNetQty(editRow.grossQty, editRow.wastagePercent)
                : parseFloat(ing.netQty);
              const displayLineCost = isEditing
                ? calcLineCost(calcNetQty(editRow.grossQty, editRow.wastagePercent), ing.unitCostSnapshot)
                : parseFloat(ing.lineCost);

              return (
                <tr key={ing.id}>
                  <td style={{ color: 'var(--color-gray-400)', fontSize: '0.8rem' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ing.inventoryItem?.itemName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                      {ing.inventoryItem?.itemCode}
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.001"
                        className="form-control"
                        style={{ width: 90 }}
                        value={editRow.grossQty}
                        onChange={(e) => setEditRow((r) => ({ ...r, grossQty: parseFloat(e.target.value) || 0 }))}
                      />
                    ) : (
                      <span className="font-mono">{fmtNum(ing.grossQty)}</span>
                    )}
                  </td>
                  <td>{ing.grossUnit}</td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="form-control"
                        style={{ width: 72 }}
                        value={editRow.wastagePercent}
                        onChange={(e) => setEditRow((r) => ({ ...r, wastagePercent: parseFloat(e.target.value) || 0 }))}
                      />
                    ) : (
                      <span>{parseFloat(ing.wastagePercent)}%</span>
                    )}
                  </td>
                  <td>
                    <span className="calc-field font-mono">{fmtNum(displayNetQty)}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ color: 'var(--color-gray-500)' }}>
                      {fmtCurrency(ing.unitCostSnapshot)}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {fmtCurrency(displayLineCost)}
                    </span>
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control"
                        style={{ width: 120 }}
                        value={editRow.notes}
                        onChange={(e) => setEditRow((r) => ({ ...r, notes: e.target.value }))}
                        placeholder="Optional"
                      />
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{ing.notes || '—'}</span>
                    )}
                  </td>
                  {!disabled && (
                    <td>
                      <div className="flex gap-8">
                        {isEditing ? (
                          <>
                            <button type="button" className="btn btn-sm btn-success" onClick={() => saveEdit(ing)} disabled={updateLoading}>
                              Save
                            </button>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn-sm btn-icon" title="Edit" onClick={() => startEdit(ing)}>✏️</button>
                            <button
                              type="button"
                              className="btn btn-sm btn-icon"
                              style={{ color: 'var(--color-danger)' }}
                              title="Remove"
                              onClick={() => onRemove(ing.id)}
                              disabled={removeLoading}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {/* Add New Row */}
            {showAddRow && !disabled && (
              <tr style={{ background: 'var(--color-primary-light)' }}>
                <td style={{ color: 'var(--color-gray-400)' }}>+</td>
                <td>
                  <select
                    className="form-control"
                    style={{ minWidth: 200 }}
                    value={newRow.inventoryItemId}
                    onChange={(e) => handleNewRowChange('inventoryItemId', e.target.value)}
                  >
                    <option value="">Select ingredient...</option>
                    {availableItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemName} ({item.unit})
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="form-control"
                    style={{ width: 90 }}
                    placeholder="0"
                    value={newRow.grossQty}
                    onChange={(e) => handleNewRowChange('grossQty', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: 70 }}
                    placeholder="unit"
                    value={newRow.grossUnit}
                    onChange={(e) => handleNewRowChange('grossUnit', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    className="form-control"
                    style={{ width: 72 }}
                    value={newRow.wastagePercent}
                    onChange={(e) => handleNewRowChange('wastagePercent', e.target.value)}
                  />
                </td>
                <td>
                  <span className="calc-field">{fmtNum(newRowNetQty)}</span>
                </td>
                <td>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: '0.8125rem' }}>
                    {newRowItem ? fmtCurrency(newRowItem.costPerUnit) : '—'}
                  </span>
                </td>
                <td>
                  <span className="font-mono" style={{ fontWeight: 600 }}>
                    {newRowItem ? fmtCurrency(newRowLineCost) : '—'}
                  </span>
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: 120 }}
                    placeholder="Notes..."
                    value={newRow.notes}
                    onChange={(e) => handleNewRowChange('notes', e.target.value)}
                  />
                </td>
                <td>
                  <div className="flex gap-8">
                    <button type="button" className="btn btn-sm btn-success" onClick={handleAddRow} disabled={addLoading || !newRow.inventoryItemId || !newRow.grossQty}>
                      {addLoading ? '...' : 'Add'}
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowAddRow(false)}>
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Totals row */}
            {ingredients.length > 0 && (
              <tr style={{ background: 'var(--color-gray-50)', borderTop: '2px solid var(--color-gray-200)' }}>
                <td colSpan={7} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-gray-600)', fontSize: '0.8125rem' }}>
                  Ingredient Cost Total:
                </td>
                <td>
                  <span className="font-mono" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {fmtCurrency(totals.lineCost)}
                  </span>
                </td>
                <td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
