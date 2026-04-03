/**
 * MenuReportModal - Full weekly/daily menu report with Print (PDF) and CSV export.
 * Props: dateFrom (yyyy-MM-dd), dateTo (yyyy-MM-dd), onClose
 */
import { useMenuReport } from '../hooks/useMenuPlanner';
import { format } from 'date-fns';

const FOOD_BADGE = {
  VEG:     { bg: '#dcfce7', color: '#16a34a', label: 'V' },
  NON_VEG: { bg: '#fee2e2', color: '#dc2626', label: 'N' },
  EGG:     { bg: '#fef9c3', color: '#ca8a04', label: 'E' },
  VEGAN:   { bg: '#ddd6fe', color: '#7c3aed', label: 'VG' },
};

const MEAL_COLOR = {
  BREAKFAST: '#f59e0b',
  LUNCH:     '#10b981',
  SNACK:     '#8b5cf6',
  DINNER:    '#3b82f6',
  BEVERAGE:  '#f97316',
  DESSERT:   '#ec4899',
};

function fmt2(n) { return (Number(n) || 0).toFixed(2); }

function parseDateLocal(dateStr) {
  // Parse date string as local date to avoid timezone shifting
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function MenuReportModal({ dateFrom, dateTo, onClose }) {
  const { data, isLoading, isError } = useMenuReport(dateFrom, dateTo, true);

  const handlePrint = () => window.print();

  const handleCSV = () => {
    const summary = data?.ingredientSummary;
    if (!summary?.length) return;
    const rows = [['Item Code', 'Ingredient', 'Unit', 'Total Net Qty', 'Total Gross Qty', 'Est. Cost']];
    summary.forEach((ing) => {
      rows.push([
        ing.itemCode || '',
        ing.itemName || '',
        ing.unit || '',
        fmt2(ing.totalNetQty),
        fmt2(ing.totalGrossQty),
        fmt2(ing.totalLineCost),
      ]);
    });
    const totalCost = summary.reduce((s, i) => s + (i.totalLineCost || 0), 0);
    rows.push(['', 'TOTAL', '', '', '', fmt2(totalCost)]);

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-ingredients-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group plans by date string
  const byDate = {};
  (data?.plans || []).forEach((plan) => {
    const d = plan.planDate ? plan.planDate.substring(0, 10) : '';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(plan);
  });
  const sortedDates = Object.keys(byDate).sort();

  const totalCost = (data?.ingredientSummary || []).reduce((s, i) => s + (i.totalLineCost || 0), 0);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-backdrop { position: relative !important; background: none !important; padding: 0 !important; }
          .report-card { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
          .report-scroll { max-height: none !important; overflow: visible !important; }
          body * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="report-backdrop"
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '32px 16px', overflowY: 'auto',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="report-card"
          style={{
            background: '#fff', borderRadius: 14, width: '100%', maxWidth: 900,
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden',
          }}
        >
          {/* ── Header (no-print) ── */}
          <div
            className="no-print"
            style={{
              display: 'flex', alignItems: 'center', padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Menu Plan Report
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {dateFrom} &mdash; {dateTo}
              </p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleCSV}
                disabled={!data?.ingredientSummary?.length}
                style={{
                  padding: '7px 14px', borderRadius: 7, border: '1.5px solid #16a34a',
                  background: '#f0fdf4', color: '#16a34a', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.78rem', opacity: !data?.ingredientSummary?.length ? 0.5 : 1,
                }}
              >
                Download CSV
              </button>
              <button
                onClick={handlePrint}
                style={{
                  padding: '7px 14px', borderRadius: 7, border: '1.5px solid #6366f1',
                  background: '#eff0ff', color: '#6366f1', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.78rem',
                }}
              >
                Print / PDF
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '7px 14px', borderRadius: 7, border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#374151', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.78rem',
                }}
              >
                Close
              </button>
            </div>
          </div>

          {/* ── Print-only header ── */}
          <div style={{ display: 'none' }}>
            <div className="print-header" style={{ textAlign: 'center', padding: '20px 0 10px' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Menu Plan Report</h1>
              <p style={{ margin: '4px 0 0', color: '#475569' }}>{dateFrom} &mdash; {dateTo}</p>
            </div>
          </div>

          {/* ── Body ── */}
          <div
            className="report-scroll"
            style={{ padding: '20px 24px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
          >
            {/* Loading state */}
            {isLoading && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                Loading report data...
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#dc2626', fontSize: '0.9rem' }}>
                Failed to load report. Please close and try again.
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && sortedDates.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                No plans found for the selected date range.
              </div>
            )}

            {/* ── Per-Day sections ── */}
            {sortedDates.map((dateStr) => (
              <div key={dateStr} style={{ marginBottom: 32, pageBreakInside: 'avoid' }}>
                <h3
                  style={{
                    margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0f172a',
                    borderBottom: '2px solid #e2e8f0', paddingBottom: 8,
                  }}
                >
                  {format(parseDateLocal(dateStr), 'EEEE, dd MMMM yyyy')}
                </h3>

                {byDate[dateStr].map((plan) => (
                  <div key={plan.id} style={{ marginBottom: 18, marginLeft: 8 }}>
                    {/* Meal type heading */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span
                        style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: MEAL_COLOR[plan.mealType] || '#64748b', flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.07em', textTransform: 'uppercase',
                          color: MEAL_COLOR[plan.mealType] || '#64748b',
                        }}
                      >
                        {plan.mealType === 'SNACK' ? 'SNACKS' : plan.mealType}
                      </span>
                    </div>

                    {/* Recipes */}
                    {plan.items.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 16 }}>
                        — No recipes added —
                      </p>
                    ) : (
                      plan.items.map((item) => {
                        const recipe = item.recipe;
                        const scaleFactor =
                          item.servings && recipe.standardPax > 0
                            ? item.servings / recipe.standardPax
                            : 1;
                        const food = FOOD_BADGE[recipe.foodType];
                        const ingredients = recipe.ingredients || [];
                        const recipeTotalCost = ingredients.reduce(
                          (s, ing) => s + parseFloat(ing.lineCost || 0) * scaleFactor, 0
                        );

                        return (
                          <div
                            key={item.id}
                            style={{
                              marginLeft: 16, marginBottom: 14,
                              border: '1px solid #e2e8f0', borderRadius: 8,
                              padding: '12px 16px', background: '#fafafa',
                              pageBreakInside: 'avoid',
                            }}
                          >
                            {/* Recipe header row */}
                            <div
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                marginBottom: 8, flexWrap: 'wrap',
                              }}
                            >
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                {recipe.recipeName}
                              </span>
                              {food && (
                                <span
                                  style={{
                                    background: food.bg, color: food.color,
                                    borderRadius: 4, padding: '1px 6px',
                                    fontSize: '0.65rem', fontWeight: 800,
                                  }}
                                >
                                  {food.label}
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: '0.68rem', color: '#64748b',
                                  fontFamily: 'monospace', marginLeft: 2,
                                }}
                              >
                                {recipe.recipeCode}
                              </span>
                              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#475569' }}>
                                Servings: <b>{item.servings}</b>
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                                Std Pax: <b>{recipe.standardPax}</b>
                              </span>
                            </div>

                            {/* Ingredients table */}
                            {ingredients.length > 0 ? (
                              <table
                                style={{
                                  width: '100%', borderCollapse: 'collapse',
                                  fontSize: '0.73rem',
                                }}
                              >
                                <thead>
                                  <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 700, color: '#475569' }}>
                                      Ingredient
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: '#475569' }}>
                                      Net Qty
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: '#475569' }}>
                                      Gross Qty
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: '#475569' }}>
                                      Unit
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, color: '#475569' }}>
                                      Est. Cost
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ingredients.map((ing, idx) => (
                                    <tr
                                      key={ing.id}
                                      style={{
                                        borderBottom: '1px solid #f1f5f9',
                                        background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                                      }}
                                    >
                                      <td style={{ padding: '4px 8px', color: '#374151' }}>
                                        {ing.inventoryItem?.itemName || '—'}
                                      </td>
                                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#374151' }}>
                                        {fmt2(parseFloat(ing.netQty || 0) * scaleFactor)}
                                      </td>
                                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#374151' }}>
                                        {fmt2(parseFloat(ing.grossQty || 0) * scaleFactor)}
                                      </td>
                                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#6b7280' }}>
                                        {ing.netUnit || ing.grossUnit || '—'}
                                      </td>
                                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#374151' }}>
                                        {fmt2(parseFloat(ing.lineCost || 0) * scaleFactor)}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Recipe subtotal */}
                                  <tr style={{ background: '#f8fafc', borderTop: '1.5px solid #e2e8f0' }}>
                                    <td colSpan={4} style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#374151', fontSize: '0.72rem' }}>
                                      Recipe Total
                                    </td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                      {fmt2(recipeTotalCost)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            ) : (
                              <p style={{ fontSize: '0.73rem', color: '#94a3b8', margin: '4px 0 0' }}>
                                No ingredients recorded for this recipe.
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* ── Ingredient Summary ── */}
            {data?.ingredientSummary?.length > 0 && (
              <div style={{ marginTop: 32, pageBreakBefore: 'always' }}>
                <h3
                  style={{
                    margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0f172a',
                    borderBottom: '2px solid #e2e8f0', paddingBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  Consolidated Ingredient Summary
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>
                    ({data.ingredientSummary.length} item{data.ingredientSummary.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#fff' }}>
                      <th style={{ textAlign: 'left', padding: '9px 10px', fontWeight: 700 }}>Item Code</th>
                      <th style={{ textAlign: 'left', padding: '9px 10px', fontWeight: 700 }}>Ingredient</th>
                      <th style={{ textAlign: 'right', padding: '9px 10px', fontWeight: 700 }}>Total Net Qty</th>
                      <th style={{ textAlign: 'right', padding: '9px 10px', fontWeight: 700 }}>Total Gross Qty</th>
                      <th style={{ textAlign: 'right', padding: '9px 10px', fontWeight: 700 }}>Unit</th>
                      <th style={{ textAlign: 'right', padding: '9px 10px', fontWeight: 700 }}>Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ingredientSummary.map((ing, idx) => (
                      <tr
                        key={ing.inventoryItemId}
                        style={{
                          background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#475569' }}>
                          {ing.itemCode}
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a' }}>
                          {ing.itemName}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: '#374151' }}>
                          {fmt2(ing.totalNetQty)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: '#374151' }}>
                          {fmt2(ing.totalGrossQty)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: '#6b7280' }}>
                          {ing.unit}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>
                          {fmt2(ing.totalLineCost)}
                        </td>
                      </tr>
                    ))}
                    {/* Grand total */}
                    <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0', fontWeight: 800 }}>
                      <td colSpan={5} style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        Total Estimated Cost
                      </td>
                      <td
                        style={{
                          padding: '9px 10px', textAlign: 'right',
                          fontWeight: 800, color: '#16a34a', fontSize: '0.92rem',
                        }}
                      >
                        {fmt2(totalCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
