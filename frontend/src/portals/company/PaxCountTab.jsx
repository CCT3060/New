import { useState, useEffect, useCallback, useRef } from 'react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n, decimals = 3) {
  if (n == null || isNaN(n)) return '—';
  const v = parseFloat(n);
  return v % 1 === 0 ? v.toString() : v.toFixed(decimals).replace(/\.?0+$/, '');
}

function UOMBadge({ unit }) {
  const color = {
    kg: '#059669', g: '#0284c7', l: '#7c3aed', ml: '#db2777',
    pcs: '#d97706', nos: '#d97706',
  }[unit?.toLowerCase()] || '#64748b';
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}33`,
      padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
    }}>{unit || '—'}</span>
  );
}

export default function PaxCountTab() {
  const { companyFetch } = useCompanyAuth();

  const [recipes, setRecipes]     = useState([]);
  const [recSearch, setRecSearch] = useState('');
  const [selectedRec, setSelectedRec] = useState(null);

  const [pax, setPax]           = useState('');
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const debounceRef = useRef(null);

  // load recipe list once
  useEffect(() => {
    companyFetch('/pax/recipes')
      .then(d => setRecipes(d.recipes || []))
      .catch(() => {});
  }, []);

  const filteredRecipes = recipes.filter(r =>
    r.recipeName?.toLowerCase().includes(recSearch.toLowerCase()) ||
    r.recipeCode?.toLowerCase().includes(recSearch.toLowerCase())
  );

  const doScale = useCallback(async (recipeId, targetPax) => {
    if (!recipeId || !targetPax || targetPax <= 0) { setResult(null); return; }
    setLoading(true);
    setError('');
    try {
      const data = await companyFetch(`/pax/scale/${recipeId}?pax=${targetPax}`);
      setResult(data);
    } catch (e) {
      setError(e.message || 'Failed to scale recipe');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [companyFetch]);

  const handlePaxChange = (val) => {
    setPax(val);
    clearTimeout(debounceRef.current);
    if (!selectedRec) return;
    const n = parseInt(val, 10);
    if (!n || n <= 0) { setResult(null); setError(n < 0 ? 'Pax must be a positive number' : ''); return; }
    setError('');
    debounceRef.current = setTimeout(() => doScale(selectedRec.id, n), 300);
  };

  const handleSelectRecipe = (r) => {
    setSelectedRec(r);
    setRecSearch(r.recipeName);
    setResult(null);
    const n = parseInt(pax, 10);
    if (n > 0) setTimeout(() => doScale(r.id, n), 0);
  };

  const handleQuickPax = (val) => {
    setPax(val);
    if (!selectedRec) return;
    doScale(selectedRec.id, val);
  };

  const section = { fontWeight: 700, fontSize: '0.78rem', color: '#64748b', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' };
  const card = { background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontSize: '1.15rem' }}>⚖ Pax Count Scaling</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.84rem' }}>Select a recipe, enter headcount — get real-time scaled ingredient quantities.</p>
      </div>

      {/* ── Controls Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Recipe Picker */}
        <div style={card}>
          <div style={section}>1. Select Recipe</div>
          <div style={{ position: 'relative' }}>
            <input
              value={recSearch}
              onChange={e => { setRecSearch(e.target.value); setSelectedRec(null); setResult(null); }}
              placeholder="Search recipe name or code…"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {recSearch && !selectedRec && filteredRecipes.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                {filteredRecipes.slice(0, 15).map(r => (
                  <div key={r.id} onClick={() => handleSelectRecipe(r)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#0f172a' }}>{r.recipeName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.recipeCode} · Base: {r.standardPax} pax</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedRec && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1.5px solid #bbf7d0' }}>
              <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem' }}>✓ {selectedRec.recipeName}</div>
              <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 2 }}>
                {selectedRec.recipeCode} · Base pax: <strong>{selectedRec.standardPax}</strong> · {selectedRec.category}
              </div>
            </div>
          )}
        </div>

        {/* Pax Input */}
        <div style={card}>
          <div style={section}>2. Enter Target Pax</div>
          <input
            type="number"
            min="1"
            value={pax}
            onChange={e => handlePaxChange(e.target.value)}
            placeholder="e.g. 250"
            style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${error ? '#f87171' : '#cbd5e1'}`, borderRadius: 8, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
          />
          {error && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: 6 }}>{error}</div>}
          {/* Quick Select */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {[25, 50, 100, 150, 200, 500].map(n => (
              <button key={n} onClick={() => handleQuickPax(n)} style={{
                padding: '5px 12px', borderRadius: 6, border: '1.5px solid #e2e8f0',
                background: parseInt(pax) === n ? '#064e3b' : '#f8fafc',
                color: parseInt(pax) === n ? '#fff' : '#475569',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: '0.9rem' }}>Calculating scaled quantities…</div>
      )}

      {result && !loading && (
        <div style={card}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{result.recipeName}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>
                Base: <strong>{result.standardPax} pax</strong>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>→</span>
                Target: <strong style={{ color: '#059669', fontSize: '0.88rem' }}>{result.targetPax} pax</strong>
                <span style={{ marginLeft: 10, background: '#ede9fe', color: '#7c3aed', padding: '1px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                  ×{result.scaleFactor}
                </span>
              </div>
            </div>
            {result.costEstimate && (
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Ingredient Cost', val: `₹${fmt(result.costEstimate.ingredientCost, 2)}`, color: '#059669', bg: '#f0fdf4' },
                  { label: 'Total Est. Cost', val: `₹${fmt(result.costEstimate.estimatedTotalCost, 2)}`, color: '#7c3aed', bg: '#ede9fe' },
                  { label: 'Cost/Pax', val: `₹${fmt(result.costEstimate.costPerPax, 2)}`, color: '#0284c7', bg: '#f0f9ff' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, color: s.color, fontSize: '0.95rem' }}>{s.val}</div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ingredients Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Ingredient', 'Base Qty', 'Base Unit', 'Wastage %', 'Scaled Gross Qty', 'Net Qty', 'UOM', 'Line Cost'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === '#' ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.scaledIngredients.map((ing, i) => (
                  <tr key={ing.inventoryItemId || i}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#94a3b8', fontSize: '0.78rem' }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{ing.itemName}</div>
                      {ing.itemCode && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{ing.itemCode}</div>}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569', fontSize: '0.84rem' }}>
                      {fmt(parseFloat(ing.grossQty) / result.scaleFactor)}
                    </td>
                    <td style={{ padding: '10px 12px' }}><UOMBadge unit={ing.grossUnit} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#f59e0b', fontWeight: 600, fontSize: '0.82rem' }}>
                      {ing.wastagePercent > 0 ? `${ing.wastagePercent}%` : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>{fmt(ing.grossQty)}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', marginLeft: 4 }}>{ing.grossUnit}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#374151', fontSize: '0.84rem' }}>
                      {fmt(ing.netQty)} <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{ing.netUnit}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}><UOMBadge unit={ing.grossUnit} /></td>
                    <td style={{ padding: '10px 12px', color: '#7c3aed', fontWeight: 600, fontSize: '0.84rem' }}>
                      {ing.lineCost > 0 ? `₹${fmt(ing.lineCost, 2)}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                  <td colSpan={5} style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>
                    Total — {result.scaledIngredients.length} ingredients for {result.targetPax} pax
                  </td>
                  <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#7c3aed', fontSize: '0.88rem' }}>
                    {result.costEstimate ? `₹${fmt(result.costEstimate.ingredientCost, 2)} ingredient cost` : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!loading && !result && selectedRec && pax && !error && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Enter a valid pax count to see scaled quantities</div>
      )}

      {!selectedRec && !loading && (
        <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, border: '1.5px dashed #e2e8f0', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚖</div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select a recipe above to start scaling</div>
          <div style={{ fontSize: '0.78rem', marginTop: 4 }}>All ingredient quantities will scale proportionally to your pax count</div>
        </div>
      )}
    </div>
  );
}
