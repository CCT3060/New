import React, { useState, useEffect, useRef, useMemo } from 'react';
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

// ─── Inline pax cell editor (staging model) ──────────────────────────────────
// onStage: stages the value locally; actual save happens on Submit All
function PaxCell({ entry, pendingValue, unitId, recipeId, date, mealType, onStage }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]   = useState('');
  const [uom, setUom]   = useState('pax');
  const inputRef = useRef(null);

  // pendingValue wins over saved entry for display
  const displayPax = pendingValue != null ? pendingValue.paxCount : (entry?.paxCount > 0 ? entry.paxCount : null);
  const displayUom = pendingValue != null ? pendingValue.uom : (entry?.uom || 'pax');
  const isPending  = pendingValue != null && (entry?.paxCount !== pendingValue.paxCount || entry?.uom !== pendingValue.uom);

  const openEdit = () => {
    setVal(displayPax != null ? String(displayPax) : '');
    setUom(displayUom || 'pax');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleStage = () => {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) return;
    onStage({ date, recipeId, mealType, unitId, paxCount: n, uom });
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleStage();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <td style={{ padding: '4px 6px', background: '#fffbeb', minWidth: 110 }}>
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
            onClick={handleStage}
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

  // Show value (pending = amber, saved = normal) — clicking re-opens edit
  if (displayPax != null) {
    return (
      <td
        onClick={openEdit}
        style={{
          padding: '6px 10px', textAlign: 'center', cursor: 'pointer', verticalAlign: 'middle',
          background: isPending ? '#fffbeb' : 'transparent',
          transition: 'background 0.2s',
        }}
        title={isPending ? 'Unsaved — click Submit to save' : 'Click to edit'}
      >
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isPending ? '#b45309' : '#0f172a' }}>
          {displayPax}
        </div>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', color: isPending ? '#d97706' : '#64748b', marginTop: 1 }}>
          {displayUom}{isPending ? ' ●' : ''}
        </div>
      </td>
    );
  }

  // Empty — show + button
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

  // Chart expand
  const [chartExpandedDay, setChartExpandedDay] = useState(null);
  const [chartVisible, setChartVisible] = useState(false); // only shown after first submit

  // Pending (staged) entries — saved only when user clicks Submit
  const [pendingEntries, setPendingEntries] = useState({});

  // Requisition
  const [reqResult,  setReqResult]  = useState(null);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError,   setReqError]   = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleStageEntry = (entryData) => {
    const key = `${entryData.date}-${entryData.recipeId}-${entryData.mealType}-${entryData.unitId}`;
    setPendingEntries(prev => ({ ...prev, [key]: entryData }));
  };

  const handleSubmitAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.values(pendingEntries).map(e =>
          companyFetch('/pax/entry', { method: 'PUT', body: JSON.stringify(e) })
        )
      );
      setPendingEntries({});
      await loadMatrix();
      // Auto-generate requisition and show chart
      setReqLoading(true); setReqError(''); setReqResult(null);
      try {
        const d = await companyFetch(`/pax/requisition?from=${from}&to=${to}`);
        setReqResult(d);
      } catch (e) {
        setReqError(e.message || 'Failed to generate requisition');
      } finally {
        setReqLoading(false);
      }
      setChartVisible(true);
      setTimeout(() => {
        document.getElementById('pax-chart-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (e) {
      alert('Submit failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Requisition
  const handleGenerateRequisition = async () => {
    setReqLoading(true); setReqError(''); setReqResult(null);
    try {
      const d = await companyFetch(`/pax/requisition?from=${from}&to=${to}`);
      setReqResult(d);
      setTimeout(() => {
        document.getElementById('pax-requisition-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e) {
      setReqError(e.message || 'Failed to generate requisition');
    } finally {
      setReqLoading(false);
    }
  };

  const handleExportReqCSV = () => {
    if (!reqResult) return;
    const header = ['Item Code', 'Ingredient Name', 'Total Gross Qty', 'Total Net Qty', 'Unit'];
    const rows = reqResult.items.map(i => [i.itemCode, `"${i.itemName}"`, i.totalGrossQty, i.totalNetQty, i.unit]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `requisition-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

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

  useEffect(() => { loadMatrix(); setChartVisible(false); setReqResult(null); }, [from, to]);

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
      // Auto-refresh requisition if it's already open
      if (reqResult) {
        const d = await companyFetch(`/pax/requisition?from=${from}&to=${to}`);
        setReqResult(d);
      }
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

  // ─── Chart data ─────────────────────────────────────────────────────────────
  const UNIT_PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#f97316','#ec4899'];
  const chartData = useMemo(() => {
    if (!data || !data.rows.length || !data.units.length) return [];
    return data.rows.map(row => {
      const unitTotals = {};
      for (const mg of row.mealGroups) {
        for (const rec of mg.recipes) {
          for (const [uid, entry] of Object.entries(rec.entries)) {
            unitTotals[uid] = (unitTotals[uid] || 0) + (entry?.paxCount || 0);
          }
        }
      }
      const total = Object.values(unitTotals).reduce((s, v) => s + v, 0);
      const mealTotals = {};
      for (const mg of row.mealGroups) {
        let s = 0;
        for (const rec of mg.recipes)
          for (const e of Object.values(rec.entries)) s += e?.paxCount || 0;
        mealTotals[mg.mealType] = s;
      }
      return { date: row.date, dayLabel: row.dayLabel, unitTotals, total, mealTotals };
    }); // all days shown — not filtered by total > 0
  }, [data]);

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
          <button
            onClick={handleGenerateRequisition} disabled={reqLoading || !data}
            style={{ padding: '7px 16px', background: reqLoading ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: reqLoading || !data ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}
          >{reqLoading ? 'Generating…' : '📦 View Requisition'}</button>
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
                    <React.Fragment key={row.date}>
                      {/* Date group header */}
                      <tr>
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
                          <React.Fragment key={`${row.date}-${mg.mealType}`}>
                            {/* Meal type sub-header */}
                            <tr>
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
                                  {units.map(u => {
                                    const pk = `${row.date}-${rec.recipeId}-${mg.mealType}-${u.id}`;
                                    return (
                                      <PaxCell
                                        key={u.id}
                                        entry={rec.entries[u.id]}
                                        pendingValue={pendingEntries[pk]}
                                        unitId={u.id}
                                        recipeId={rec.recipeId}
                                        date={row.date}
                                        mealType={mg.mealType}
                                        onStage={handleStageEntry}
                                      />
                                    );
                                  })}
                                  <td style={{ ...tdBase, textAlign: 'center', fontWeight: 800, color: total > 0 ? '#065f46' : '#94a3b8', background: total > 0 ? '#f0fdf4' : 'transparent', fontSize: '0.88rem' }}>
                                    {total > 0 ? total : '—'}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Add recipe row */}
                            <tr>
                              <td colSpan={3 + units.length + 1} style={{ padding: '4px 28px', borderBottom: '1px solid #f1f5f9' }}>
                                <button
                                  onClick={() => setAddModal({ date: row.date, mealType: mg.mealType })}
                                  style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: '2px 0' }}
                                >
                                  + Add recipe to {mg.mealType.toLowerCase()}
                                </button>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))
                      }

                      {/* Add meal type row */}
                      <tr>
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
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── PAX Chart — editable & dynamic ─────────────────────────────────── */}
      {chartVisible && !loading && data && data.rows.length > 0 && units.length > 0 && (
        <div id="pax-chart-section" style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: '24px 28px', marginTop: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {/* Chart header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>PAX Distribution Chart</h3>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.75rem' }}>Click a row to expand and edit · click + to add a recipe</p>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {units.map((u, i) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: UNIT_PALETTE[i % UNIT_PALETTE.length] }} />
                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>{u.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {(() => {
            const maxTotal = Math.max(...chartData.map(r => r.total), 1);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {chartData.map(row => {
                  const isExpanded = chartExpandedDay === row.date;
                  const dataRow = data.rows.find(r => r.date === row.date);
                  return (
                    <div key={row.date} style={{ borderRadius: 8, overflow: 'hidden', border: isExpanded ? '1.5px solid #6366f1' : '1.5px solid transparent', transition: 'border-color 0.15s', marginBottom: 2 }}>

                      {/* ── Bar row ── */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px', cursor: 'pointer', background: isExpanded ? '#eef2ff' : 'transparent', borderRadius: isExpanded ? '6px 6px 0 0' : 6, userSelect: 'none' }}
                        onClick={() => setChartExpandedDay(prev => prev === row.date ? null : row.date)}
                      >
                        {/* Date label */}
                        <div style={{ width: 110, flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isExpanded ? '#4f46e5' : '#1e293b' }}>
                            {new Date(row.date + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{row.dayLabel}</div>
                        </div>

                        {/* Bar or empty placeholder */}
                        {row.total > 0 ? (
                          <div style={{ flex: 1, height: 28, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                            {units.map((u, i) => {
                              const v = row.unitTotals[u.id] || 0;
                              const pct = (v / maxTotal) * 100;
                              if (pct === 0) return null;
                              return (
                                <div key={u.id} title={`${u.name}: ${v} pax`}
                                  style={{
                                    width: `${pct}%`, background: UNIT_PALETTE[i % UNIT_PALETTE.length],
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                                    transition: 'width 0.4s ease', overflow: 'hidden', whiteSpace: 'nowrap',
                                    minWidth: pct > 8 ? undefined : 0,
                                  }}
                                >
                                  {pct > 8 ? v : ''}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ flex: 1, height: 28, border: '1.5px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 14 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>No pax count added yet — click + to add</span>
                          </div>
                        )}

                        {/* Total */}
                        <div style={{ width: 44, textAlign: 'right', fontWeight: 800, fontSize: '0.82rem', color: row.total > 0 ? '#065f46' : '#94a3b8', flexShrink: 0 }}>
                          {row.total > 0 ? row.total : '—'}
                        </div>

                        {/* + button */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const firstMeal = dataRow?.mealGroups[0]?.mealType || 'BREAKFAST';
                            setAddModal({ date: row.date, mealType: firstMeal });
                          }}
                          style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', border: '1.5px dashed #94a3b8', background: 'transparent', cursor: 'pointer', fontSize: '1rem', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor='#6366f1'; e.currentTarget.style.color='#6366f1'; e.currentTarget.style.background='#eef2ff'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor='#94a3b8'; e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.background='transparent'; }}
                          title="Add recipe / pax count"
                        >+</button>

                        {/* Expand indicator */}
                        <span style={{ color: '#94a3b8', fontSize: '0.6rem', flexShrink: 0, width: 10 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {/* ── Expanded inline edit panel ── */}
                      {isExpanded && dataRow && (() => {
                        const sortedMG = dataRow.mealGroups.slice().sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType));
                        return (
                          <div style={{ padding: '12px 16px 10px', background: '#f8faff', borderTop: '1px solid #e2e8f0' }}>
                            {sortedMG.map(mg => (
                              <div key={mg.mealType} style={{ marginBottom: 10 }}>
                                {/* Meal type label */}
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: MEAL_COLORS[mg.mealType] || '#64748b', marginBottom: 5 }}>
                                  ◈ {mg.mealType}
                                </div>
                                {/* Recipe × unit table */}
                                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ padding: '5px 12px', textAlign: 'left', fontSize: '0.65rem', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Recipe</th>
                                        {units.map(u => (
                                          <th key={u.id} style={{ padding: '5px 10px', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0', minWidth: 90 }}>{u.name}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {mg.recipes.map(rec => (
                                        <tr key={rec.recipeId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '4px 12px', fontSize: '0.79rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{rec.recipeName}</td>
                                          {units.map(u => {
                                            const pk = `${row.date}-${rec.recipeId}-${mg.mealType}-${u.id}`;
                                            return (
                                              <PaxCell
                                                key={u.id}
                                                entry={rec.entries[u.id]}
                                                pendingValue={pendingEntries[pk]}
                                                unitId={u.id}
                                                recipeId={rec.recipeId}
                                                date={row.date}
                                                mealType={mg.mealType}
                                                onStage={handleStageEntry}
                                              />
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                {/* Add recipe to this meal type */}
                                <button
                                  onClick={() => setAddModal({ date: row.date, mealType: mg.mealType })}
                                  style={{ marginTop: 5, background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, padding: '2px 0' }}
                                >+ Add recipe to {mg.mealType.toLowerCase()}</button>
                              </div>
                            ))}
                            {/* Add new meal types */}
                            {MEAL_ORDER.filter(mt => !dataRow.mealGroups.find(mg => mg.mealType === mt)).length > 0 && (
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                                {MEAL_ORDER
                                  .filter(mt => !dataRow.mealGroups.find(mg => mg.mealType === mt))
                                  .map(mt => (
                                    <button key={mt}
                                      onClick={() => setAddModal({ date: row.date, mealType: mt })}
                                      style={{ background: 'none', border: '1px dashed #cbd5e1', color: '#94a3b8', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, padding: '2px 10px', borderRadius: 6 }}
                                    >+ {mt}</button>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── Inline Requisition Section ──────────────────────────────────────── */}
      {(reqLoading || reqError || reqResult) && (
        <div id="pax-requisition-section" style={{ marginTop: 32 }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>📦 Ingredient Requisition</h3>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                Ingredients required per recipe based on pax counts · {fmtDate(from)} – {fmtDate(to)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {reqResult && reqResult.items.length > 0 && (
                <button onClick={handleExportReqCSV}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #7c3aed', background: '#f5f3ff', color: '#7c3aed', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  Export CSV
                </button>
              )}
              <button onClick={handleGenerateRequisition} disabled={reqLoading}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                ↺ Refresh
              </button>
              <button onClick={() => { setReqResult(null); setReqError(''); }}
                style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                ✕ Close
              </button>
            </div>
          </div>

          {reqLoading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b', background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>⏳</div>
              Calculating ingredient requirements…
            </div>
          )}

          {reqError && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626' }}>
              {reqError}
            </div>
          )}

          {reqResult && !reqLoading && (
            <>
              {/* Summary strip */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                {[
                  { label: 'Total PAX', value: reqResult.recipeBreakdown.reduce((s, r) => s + r.paxCount, 0), color: '#059669', bg: '#f0fdf4' },
                  { label: 'Recipe Entries', value: reqResult.recipeBreakdown.length, color: '#7c3aed', bg: '#ede9fe' },
                  { label: 'Unique Ingredients', value: reqResult.items.length, color: '#d97706', bg: '#fffbeb' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 20px', border: `1.5px solid ${s.color}22`, minWidth: 110 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {reqResult.recipeBreakdown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px', background: '#fff', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗒️</div>
                  <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No ingredients found</p>
                  <p style={{ color: '#64748b', fontSize: '0.82rem' }}>Enter pax counts in the matrix above, then click View Requisition.</p>
                </div>
              ) : (
                <>
                  {/* ── Recipe-wise ingredient cards ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                    {reqResult.recipeBreakdown.map((recipe, ri) => (
                      <div key={ri} style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        {/* Recipe header */}
                        <div style={{
                          padding: '12px 18px',
                          background: `linear-gradient(135deg, ${(MEAL_COLORS[recipe.mealType] || '#6366f1')}18, ${(MEAL_COLORS[recipe.mealType] || '#6366f1')}08)`,
                          borderBottom: '1px solid #e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              background: MEAL_COLORS[recipe.mealType] || '#6366f1',
                              color: '#fff', padding: '2px 9px', borderRadius: 5,
                              fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                            }}>{recipe.mealType}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{recipe.recipeName}</span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>—</span>
                            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>{recipe.unitName}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#065f46' }}>{recipe.paxCount}</div>
                              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Pax Count</div>
                            </div>
                            <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0284c7' }}>{recipe.standardPax}</div>
                              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Std Pax</div>
                            </div>
                            <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#7c3aed' }}>×{recipe.scaleFactor}</div>
                              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Scale</div>
                            </div>
                            <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#d97706' }}>
                                {new Date(recipe.date + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                              </div>
                              <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Date</div>
                            </div>
                          </div>
                        </div>

                        {/* Ingredient list */}
                        {recipe.ingredients && recipe.ingredients.length > 0 ? (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                  {['#', 'Item Code', 'Ingredient', 'Gross Qty', 'Gross Unit', 'Wastage %', 'Net Qty', 'Net Unit'].map(h => (
                                    <th key={h} style={{
                                      padding: '7px 12px', color: '#374151', fontWeight: 700,
                                      fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                      borderBottom: '1.5px solid #e2e8f0',
                                      textAlign: ['Gross Qty', 'Net Qty', 'Wastage %'].includes(h) ? 'right' : h === '#' ? 'center' : 'left',
                                    }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {recipe.ingredients.map((ing, ii) => (
                                  <tr key={ing.inventoryItemId || ii}
                                    style={{ borderBottom: '1px solid #f1f5f9' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                  >
                                    <td style={{ padding: '6px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.7rem' }}>{ii + 1}</td>
                                    <td style={{ padding: '6px 12px' }}>
                                      {ing.itemCode
                                        ? <span style={{ background: '#fffbeb', color: '#d97706', padding: '1px 7px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace' }}>{ing.itemCode}</span>
                                        : <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '6px 12px', fontWeight: 600, color: '#0f172a', fontSize: '0.83rem' }}>{ing.itemName}</td>
                                    <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                                      {ing.grossQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                                    </td>
                                    <td style={{ padding: '6px 12px' }}>
                                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 7px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{ing.grossUnit || '—'}</span>
                                    </td>
                                    <td style={{ padding: '6px 12px', textAlign: 'right', color: '#f97316', fontSize: '0.78rem', fontWeight: 600 }}>
                                      {ing.wastagePercent > 0 ? `${ing.wastagePercent}%` : '—'}
                                    </td>
                                    <td style={{ padding: '6px 12px', textAlign: 'right', color: '#475569', fontSize: '0.82rem', fontWeight: 600 }}>
                                      {ing.netQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                                    </td>
                                    <td style={{ padding: '6px 12px' }}>
                                      <span style={{ background: '#f0fdf4', color: '#059669', padding: '1px 7px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{ing.netUnit || ing.grossUnit || '—'}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: '#f8fafc', borderTop: '1.5px solid #e2e8f0' }}>
                                  <td colSpan={8} style={{ padding: '7px 12px', color: '#64748b', fontSize: '0.7rem' }}>
                                    {recipe.ingredients.length} ingredients &nbsp;·&nbsp; Gross = raw qty (incl. wastage) &nbsp;·&nbsp; Net = usable qty after wastage
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            No ingredients configured for this recipe.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ── Consolidated totals table ── */}
                  {reqResult.items.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                      <div style={{ padding: '12px 18px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.82rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Grand Total — All Ingredients
                        </span>
                        <span style={{ background: 'rgba(255,255,255,0.15)', color: '#e2e8f0', padding: '2px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700 }}>
                          {reqResult.items.length} unique items
                        </span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['#', 'Item Code', 'Ingredient Name', 'Total Gross Qty', 'Total Net Qty', 'Unit'].map(h => (
                                <th key={h} style={{
                                  padding: '8px 14px', background: '#f8fafc', color: '#374151',
                                  fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase',
                                  letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0',
                                  textAlign: ['Total Gross Qty', 'Total Net Qty'].includes(h) ? 'right' : h === '#' ? 'center' : 'left',
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reqResult.items.map((item, idx) => (
                              <tr key={item.inventoryItemId || idx}
                                style={{ borderBottom: '1px solid #f1f5f9' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                                onMouseLeave={e => e.currentTarget.style.background = ''}
                              >
                                <td style={{ padding: '7px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ padding: '7px 14px' }}>
                                  {item.itemCode
                                    ? <span style={{ background: '#fffbeb', color: '#d97706', padding: '2px 7px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace' }}>{item.itemCode}</span>
                                    : <span style={{ color: '#cbd5e1' }}>—</span>}
                                </td>
                                <td style={{ padding: '7px 14px', fontWeight: 600, color: '#0f172a', fontSize: '0.84rem' }}>{item.itemName}</td>
                                <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '0.86rem' }}>
                                  {item.totalGrossQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                                </td>
                                <td style={{ padding: '7px 14px', textAlign: 'right', color: '#475569', fontSize: '0.82rem' }}>
                                  {item.totalNetQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                                </td>
                                <td style={{ padding: '7px 14px' }}>
                                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>
                                    {item.unit || '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
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

      {/* ─── Sticky Submit Bar ──────────────────────────────────────────────── */}
      {Object.keys(pendingEntries).length > 0 && (
        <div style={{
          position: 'sticky', bottom: 16, zIndex: 200,
          display: 'flex', justifyContent: 'center', marginTop: 28, pointerEvents: 'none',
        }}>
          <div style={{
            pointerEvents: 'auto',
            background: '#fff', borderRadius: 14, padding: '14px 28px',
            boxShadow: '0 8px 32px rgba(99,102,241,0.22)', border: '1.5px solid #6366f1',
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#4f46e5' }}>
                {Object.keys(pendingEntries).length} unsaved {Object.keys(pendingEntries).length === 1 ? 'entry' : 'entries'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1 }}>Submit to save and auto-generate chart &amp; requisition</div>
            </div>
            <button
              onClick={() => setPendingEntries({})}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >Discard</button>
            <button
              onClick={handleSubmitAll}
              disabled={saving}
              style={{
                padding: '9px 28px', borderRadius: 8, border: 'none',
                background: saving ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#fff', fontWeight: 800, fontSize: '0.88rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 3px 12px rgba(99,102,241,0.4)',
                transition: 'all 0.15s',
              }}
            >{saving ? 'Saving…' : '✔ Submit All'}</button>
          </div>
        </div>
      )}
    </div>
  );
}


const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
