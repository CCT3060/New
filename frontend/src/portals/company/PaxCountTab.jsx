import { useState, useEffect, useRef } from 'react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';

const UOM_OPTIONS = ['pax', 'kg', 'g', 'count', 'ltr', 'ml'];

const MEAL_ORDER = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'BEVERAGE', 'DESSERT'];
const MEAL_COLORS = {
  BREAKFAST: '#f59e0b',
  LUNCH:     '#10b981',
  DINNER:    '#6366f1',
  SNACK:     '#f97316',
  BEVERAGE:  '#06b6d4',
  DESSERT:   '#ec4899',
};

function isoWeekDates() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
}

// ─── Inline pax cell editor ───────────────────────────────────────────────────
function PaxCell({ entry, unitId, recipeId, date, mealType, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]   = useState('');
  const [uom, setUom]   = useState('pax');
  const inputRef = useRef(null);

  const hasEntry = entry && entry.paxCount > 0;

  const openEdit = () => {
    setVal(entry?.paxCount != null ? String(entry.paxCount) : '');
    setUom(entry?.uom || 'pax');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return;
    await onSave({ date, recipeId, mealType, unitId, paxCount: n, uom });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <td style={{ padding: '4px 6px', background: '#fffbeb', minWidth: 100 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="number" min="0" step="0.01"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ width: 60, padding: '2px 6px', border: '1.5px solid #f59e0b', borderRadius: 4, fontSize: '0.8rem' }}
          />
          <select
            value={uom}
            onChange={e => setUom(e.target.value)}
            style={{ padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.72rem', background: '#fff' }}
          >
            {UOM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <button
            onClick={handleSave} disabled={saving}
            style={{ padding: '2px 8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}
          >✓</button>
          <button
            onClick={() => setEditing(false)}
            style={{ padding: '2px 6px', background: '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}
          >✕</button>
        </div>
      </td>
    );
  }

  if (hasEntry) {
    return (
      <td
        onClick={openEdit}
        style={{ padding: '6px 10px', textAlign: 'center', cursor: 'pointer', verticalAlign: 'middle' }}
        title="Click to edit"
      >
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{entry.paxCount}</div>
        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{entry.uom}</div>
      </td>
    );
  }

  return (
    <td style={{ padding: '6px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
      <button
        onClick={openEdit}
        style={{
          width: 28, height: 28, borderRadius: '50%', border: '1.5px dashed #94a3b8',
          background: 'transparent', cursor: 'pointer', fontSize: '1rem', color: '#94a3b8',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='#6366f1'; e.currentTarget.style.color='#6366f1'; e.currentTarget.style.background='#eef2ff'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='#94a3b8'; e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.background='transparent'; }}
        title="Add pax count"
      >+</button>
    </td>
  );
}

// ─── Main PaxCountTab ─────────────────────────────────────────────────────────
export default function PaxCountTab() {
  const { companyFetch } = useCompanyAuth();
  const [defaultFrom, defaultTo] = isoWeekDates();

  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(defaultTo);

  const [data,    setData]    = useState(null);  // { units, rows }
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // For "Add Recipe to date" modal
  const [addModal, setAddModal] = useState(null); // { date, mealType }
  const [recipes,  setRecipes]  = useState([]);
  const [recSearch, setRecSearch] = useState('');

  const loadMatrix = async () => {
    setLoading(true); setError('');
    try {
      const d = await companyFetch(`/pax/matrix?from=${from}&to=${to}`);
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load PAX data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMatrix(); }, [from, to]);

  // Preload recipes for add-recipe modal
  useEffect(() => {
    companyFetch('/pax/recipes').then(d => setRecipes(d.recipes || [])).catch(() => {});
  }, []);

  const handleSaveEntry = async (entryData) => {
    setSaving(true);
    try {
      await companyFetch('/pax/entry', {
        method: 'PUT',
        body: JSON.stringify(entryData),
      });
      // Refresh matrix
      await loadMatrix();
    } catch (e) {
      alert('Save failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecipe = async (recipe, date, mealType) => {
    // Just add a pax entry shell — next click on + will allow entry
    await companyFetch('/pax/add-recipe', {
      method: 'POST',
      body: JSON.stringify({ date, recipeId: recipe.id, mealType }),
    });
    // Add to local data optimistically
    setData(prev => {
      if (!prev) return prev;
      const rows = prev.rows.map(r => {
        if (r.date !== date) return r;
        return {
          ...r,
          mealGroups: r.mealGroups.map(mg => {
            if (mg.mealType !== mealType) return mg;
            if (mg.recipes.find(x => x.recipeId === recipe.id)) return mg;
            return { ...mg, recipes: [...mg.recipes, { recipeId: recipe.id, recipeName: recipe.recipeName, category: recipe.category, mealType, entries: {} }] };
          }),
        };
      });
      // If date doesn't exist yet, add it
      const exists = rows.find(r => r.date === date);
      if (!exists) {
        const dayNames = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
        rows.push({
          date,
          dayLabel: dayNames[new Date(date).getDay()],
          mealGroups: [{ mealType, recipes: [{ recipeId: recipe.id, recipeName: recipe.recipeName, category: recipe.category, mealType, entries: {} }] }],
        });
        rows.sort((a, b) => a.date.localeCompare(b.date));
      }
      return { ...prev, rows };
    });
    setAddModal(null);
  };

  // CSV Export
  const handleExport = () => {
    if (!data) return;
    const { units, rows } = data;
    const header = ['Date', 'Meal Type', 'Recipe', 'Category', ...units.map(u => u.name), 'Total PAX'];
    const csvRows = [header.join(',')];
    for (const row of rows) {
      for (const mg of row.mealGroups) {
        for (const rec of mg.recipes) {
          const totals = units.map(u => rec.entries[u.id]?.paxCount || 0);
          const total = totals.reduce((s, v) => s + v, 0);
          csvRows.push([
            row.date, mg.mealType, `"${rec.recipeName}"`, rec.category,
            ...totals, total,
          ].join(','));
        }
      }
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `pax-count-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRecipes = recipes.filter(r =>
    r.recipeName?.toLowerCase().includes(recSearch.toLowerCase()) ||
    r.recipeCode?.toLowerCase().includes(recSearch.toLowerCase())
  );

  const units = data?.units || [];

  // Styles
  const th = { padding: '10px 12px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff', background: '#1e293b', borderRight: '1px solid #334155', whiteSpace: 'nowrap' };
  const thUnit = { ...th, background: '#0f4c75', textAlign: 'center' };
  const thTotal = { ...th, background: '#065f46', textAlign: 'center' };
  const tdBase = { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: '0.82rem' };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontSize: '1.2rem' }}>PAX Count Matrix</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>Unit-wise headcount for menu plan items</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }} />
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }} />
          </div>
          <button
            onClick={handleExport} disabled={!data || loading}
            style={{ padding: '7px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
          >Export CSV</button>
        </div>
      </div>

      {/* Error */}
      {error && <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading PAX data...</div>}

      {!loading && data && (
        <>
          {/* No units warning */}
          {units.length === 0 && (
            <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, color: '#92400e', marginBottom: 16 }}>
              No delivery units found for your company. Please add units in the Units tab first.
            </div>
          )}

          {/* No rows */}
          {data.rows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
              <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No menu items for this date range</p>
              <p style={{ color: '#64748b', fontSize: '0.84rem' }}>Create menu plans for delivery units, then PAX entries will appear here.</p>
            </div>
          )}

          {/* Matrix table */}
          {data.rows.length > 0 && units.length > 0 && (
            <div style={{ overflowX: 'auto', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, minWidth: 200, textAlign: 'left' }}>Operational Item</th>
                    <th style={{ ...th, minWidth: 90, textAlign: 'center' }}>Category</th>
                    <th style={{ ...th, minWidth: 60, textAlign: 'center' }}>UOM</th>
                    {units.map(u => <th key={u.id} style={{ ...thUnit, minWidth: 100 }}>{u.name}</th>)}
                    <th style={{ ...thTotal, minWidth: 90 }}>Total PAX</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(row => (
                    <>
                      {/* Date group header */}
                      <tr key={`date-${row.date}`}>
                        <td colSpan={3 + units.length + 1} style={{
                          padding: '10px 14px', background: '#f8fafc',
                          fontWeight: 800, fontSize: '0.82rem', color: '#1e293b',
                          borderTop: '2px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
                          letterSpacing: '0.04em',
                        }}>
                          {fmtDate(row.date)} — {row.dayLabel}
                        </td>
                      </tr>

                      {/* Meal type groups */}
                      {row.mealGroups
                        .slice()
                        .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType))
                        .map(mg => (
                          <>
                            {/* Meal type sub-header */}
                            <tr key={`mt-${row.date}-${mg.mealType}`}>
                              <td colSpan={3 + units.length + 1} style={{
                                padding: '6px 20px',
                                background: (MEAL_COLORS[mg.mealType] || '#94a3b8') + '18',
                                borderBottom: '1px solid #f1f5f9',
                              }}>
                                <span style={{
                                  fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em',
                                  color: MEAL_COLORS[mg.mealType] || '#64748b',
                                  textTransform: 'uppercase',
                                }}>◈ {mg.mealType}</span>
                              </td>
                            </tr>

                            {/* Recipe rows */}
                            {mg.recipes.map(rec => {
                              const totals = units.map(u => rec.entries[u.id]?.paxCount || 0);
                              const total = totals.reduce((s, v) => s + v, 0);
                              // UOM from first entry with a set uom, or default
                              const uomLabel = Object.values(rec.entries).find(e => e?.uom && e.uom !== 'pax')?.uom ||
                                               Object.values(rec.entries)[0]?.uom || 'pax';
                              return (
                                <tr key={`rec-${row.date}-${mg.mealType}-${rec.recipeId}`}
                                    style={{ borderBottom: '1px solid #f1f5f9' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                >
                                  <td style={{ ...tdBase, paddingLeft: 28, fontWeight: 600, color: '#0f172a' }}>
                                    {rec.recipeName}
                                    {total === units.map(u => rec.entries[u.id]?.paxCount || 0).filter(v => v > 0).length * (total / Math.max(units.map(u => rec.entries[u.id]?.paxCount || 0).filter(v => v > 0).length, 1)) && total > 0 && units.every(u => rec.entries[u.id]?.paxCount > 0) && (
                                      <span style={{ marginLeft: 8, fontSize: '0.65rem', background: '#dcfce7', color: '#16a34a', padding: '1px 7px', borderRadius: 10, fontWeight: 700, verticalAlign: 'middle' }}>Verified</span>
                                    )}
                                  </td>
                                  <td style={{ ...tdBase, textAlign: 'center' }}>
                                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                                      {rec.category || rec.mealType}
                                    </span>
                                  </td>
                                  <td style={{ ...tdBase, textAlign: 'center', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {uomLabel}
                                  </td>
                                  {units.map(u => (
                                    <PaxCell
                                      key={u.id}
                                      entry={rec.entries[u.id]}
                                      unitId={u.id}
                                      recipeId={rec.recipeId}
                                      date={row.date}
                                      mealType={mg.mealType}
                                      onSave={handleSaveEntry}
                                      saving={saving}
                                    />
                                  ))}
                                  <td style={{ ...tdBase, textAlign: 'center', fontWeight: 800, color: total > 0 ? '#065f46' : '#94a3b8', background: total > 0 ? '#f0fdf4' : 'transparent', fontSize: '0.88rem' }}>
                                    {total > 0 ? total : '—'}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Add recipe row */}
                            <tr key={`add-${row.date}-${mg.mealType}`}>
                              <td colSpan={3 + units.length + 1} style={{ padding: '4px 28px', borderBottom: '1px solid #f1f5f9' }}>
                                <button
                                  onClick={() => setAddModal({ date: row.date, mealType: mg.mealType })}
                                  style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: '2px 0' }}
                                >
                                  + Add recipe to {mg.mealType.toLowerCase()}
                                </button>
                              </td>
                            </tr>
                          </>
                        ))
                      }

                      {/* Add meal type row */}
                      <tr key={`add-meal-${row.date}`}>
                        <td colSpan={3 + units.length + 1} style={{ padding: '5px 14px', borderBottom: '2px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {MEAL_ORDER
                              .filter(mt => !row.mealGroups.find(mg => mg.mealType === mt))
                              .map(mt => (
                                <button key={mt}
                                  onClick={() => setAddModal({ date: row.date, mealType: mt })}
                                  style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}>
                                  + {mt}
                                </button>
                              ))
                            }
                          </div>
                        </td>
                      </tr>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Recipe Modal */}
      {addModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setAddModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px', width: 480, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1rem' }}>
                Add Recipe — {addModal.mealType}
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>{fmtDate(addModal.date)}</p>
            </div>
            <input
              autoFocus
              placeholder="Search recipes..."
              value={recSearch}
              onChange={e => setRecSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, marginBottom: 12, fontSize: '0.84rem' }}
            />
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredRecipes.map(r => (
                <div
                  key={r.id}
                  onClick={() => handleAddRecipe(r, addModal.date, addModal.mealType)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, border: '1.5px solid #f1f5f9',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#6366f1'; e.currentTarget.style.background='#eef2ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#f1f5f9'; e.currentTarget.style.background=''; }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{r.recipeName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.recipeCode} · {r.category}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: '#475569' }}>{r.mealType}</span>
                </div>
              ))}
              {filteredRecipes.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>No recipes found</p>}
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setAddModal(null)} style={{ padding: '7px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
