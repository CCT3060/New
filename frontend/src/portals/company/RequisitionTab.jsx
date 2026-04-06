import { useState } from 'react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';

const MEAL_COLORS = {
  BREAKFAST: '#f59e0b', LUNCH: '#10b981', DINNER: '#6366f1',
  SNACK: '#f97316', BEVERAGE: '#06b6d4', DESSERT: '#ec4899',
};

function isoWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RequisitionTab() {
  const { companyFetch } = useCompanyAuth();
  const [defaultFrom, defaultTo] = isoWeekDates();

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo]   = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleGenerate = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const d = await companyFetch(`/pax/requisition?from=${from}&to=${to}`);
      setResult(d);
    } catch (e) {
      setError(e.message || 'Failed to generate requisition');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const header = ['Item Code', 'Ingredient Name', 'Total Gross Qty', 'Total Net Qty', 'Unit'];
    const rows = result.items.map(i => [
      i.itemCode, `"${i.itemName}"`, i.totalGrossQty, i.totalNetQty, i.unit,
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `requisition-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPax = result
    ? result.recipeBreakdown.reduce((s, r) => s + r.paxCount, 0)
    : 0;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontSize: '1.2rem' }}>
          📦 Ingredient Requisition
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
          Generate a total ingredient list from pax counts entered in the PAX Count Matrix.
        </p>
      </div>

      {/* Controls */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0',
        padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center',
        gap: 16, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }} />
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem' }} />
        </div>
        <button
          onClick={handleGenerate} disabled={loading}
          style={{
            padding: '8px 22px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.85rem',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #065f46, #10b981)',
            color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Generating…' : 'Generate Requisition'}
        </button>
        {result && result.items.length > 0 && (
          <button
            onClick={handleExportCSV}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #10b981', background: '#f0fdf4', color: '#059669', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Export CSV
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Date Range', value: `${fmtDate(result.from)} → ${fmtDate(result.to)}`, color: '#0284c7', bg: '#f0f9ff' },
              { label: 'Total PAX', value: totalPax, color: '#059669', bg: '#f0fdf4' },
              { label: 'Recipe Entries', value: result.recipeBreakdown.length, color: '#7c3aed', bg: '#ede9fe' },
              { label: 'Ingredients', value: result.items.length, color: '#d97706', bg: '#fffbeb' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '14px 18px', border: `1.5px solid ${s.color}22` }}>
                <div style={{ fontWeight: 800, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {result.items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗒️</div>
              <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No ingredients found</p>
              <p style={{ color: '#64748b', fontSize: '0.84rem' }}>
                No pax counts entered or recipes have no ingredients configured for this date range.
              </p>
            </div>
          )}

          {result.items.length > 0 && (
            <>
              {/* Ingredients table */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Total Ingredients Required</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                      Aggregated across all pax entries for {fmtDate(result.from)} – {fmtDate(result.to)}
                    </p>
                  </div>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                    {result.items.length} items
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#1e293b' }}>
                        {['#', 'Item Code', 'Ingredient Name', 'Gross Qty', 'Net Qty', 'Unit'].map(h => (
                          <th key={h} style={{
                            padding: '10px 14px', color: '#fff', fontWeight: 700,
                            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                            textAlign: h === '#' ? 'center' : h.includes('Qty') ? 'right' : 'left',
                            borderRight: '1px solid #334155',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item, idx) => (
                        <tr key={item.inventoryItemId || idx}
                          style={{ borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <td style={{ padding: '9px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '9px 14px' }}>
                            {item.itemCode
                              ? <span style={{ background: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace' }}>{item.itemCode}</span>
                              : <span style={{ color: '#cbd5e1' }}>—</span>}
                          </td>
                          <td style={{ padding: '9px 14px', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{item.itemName}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            {item.totalGrossQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                          </td>
                          <td style={{ padding: '9px 14px', textAlign: 'right', color: '#475569', fontSize: '0.82rem' }}>
                            {item.totalNetQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                          </td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>
                              {item.unit || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>Total Ingredients: {result.items.length}</td>
                        <td colSpan={3} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: '0.72rem' }}>
                          Gross qty = raw quantity including wastage allowance &nbsp;·&nbsp; Net qty = usable quantity after wastage
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Recipe Breakdown (collapsible) */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <button
                  onClick={() => setShowBreakdown(v => !v)}
                  style={{
                    width: '100%', padding: '14px 20px', background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', borderBottom: showBreakdown ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Recipe Breakdown</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>View pax count per recipe per unit</div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{showBreakdown ? '▲ Collapse' : '▼ Expand'}</span>
                </button>
                {showBreakdown && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#0f4c75' }}>
                          {['Date', 'Meal', 'Recipe', 'Unit', 'Pax Count', 'Std Pax', 'Scale Factor', 'Ingredients'].map(h => (
                            <th key={h} style={{
                              padding: '9px 12px', color: '#fff', fontWeight: 700,
                              fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                              textAlign: ['Pax Count', 'Std Pax', 'Scale Factor', 'Ingredients'].includes(h) ? 'center' : 'left',
                              borderRight: '1px solid #1e6091',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.recipeBreakdown.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                          >
                            <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                background: (MEAL_COLORS[r.mealType] || '#94a3b8') + '20',
                                color: MEAL_COLORS[r.mealType] || '#64748b',
                                padding: '2px 8px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700,
                              }}>{r.mealType}</span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a', fontSize: '0.83rem' }}>{r.recipeName}</td>
                            <td style={{ padding: '8px 12px', fontSize: '0.82rem', color: '#374151' }}>{r.unitName}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#065f46', fontSize: '0.88rem' }}>{r.paxCount}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>{r.standardPax}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>
                                ×{r.scaleFactor}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#7c3aed', fontWeight: 700, fontSize: '0.82rem' }}>
                              {r.ingredientCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
