/**
 * RecipeScaleCalculator
 * Scales recipe ingredients to a target pax and shows a requisition-ready output.
 */
import { useState } from 'react';

const fmtNum = (n, d = 3) => {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return num.toFixed(d);
};

export default function RecipeScaleCalculator({
  recipe,
  onScale,
  scaleResult,
  scaleLoading,
}) {
  const [targetPax, setTargetPax] = useState('');

  const handleScale = () => {
    const pax = parseInt(targetPax);
    if (!pax || pax < 1) return;
    onScale({ targetPax: pax });
  };

  const scaleFactor = scaleResult
    ? parseFloat(scaleResult.scaleFactor)
    : null;

  return (
    <div>
      <h3 style={{ fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 16 }}>
        Scale Calculator
      </h3>

      {/* Input */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-12 items-end">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Standard Pax</label>
            <input
              type="number"
              className="form-control"
              value={recipe?.standardPax ?? ''}
              readOnly
              style={{ width: 100, background: 'var(--color-gray-50)', cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ padding: '0 8px', paddingBottom: 8, color: 'var(--color-gray-400)', fontSize: '1.25rem' }}>→</div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Target Pax</label>
            <input
              type="number"
              min="1"
              className="form-control"
              style={{ width: 120 }}
              value={targetPax}
              onChange={(e) => setTargetPax(e.target.value)}
              placeholder="e.g. 150"
              onKeyDown={(e) => e.key === 'Enter' && handleScale()}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ marginBottom: 1 }}
            onClick={handleScale}
            disabled={scaleLoading || !targetPax}
          >
            {scaleLoading ? 'Calculating...' : '⚖ Scale Recipe'}
          </button>
        </div>

        {scaleFactor !== null && (
          <div style={{ marginTop: 12, padding: '6px 12px', background: 'var(--color-primary-light, #eff6ff)', borderRadius: 6, fontSize: '0.875rem', color: 'var(--color-primary)' }}>
            Scale factor: <strong>{scaleFactor.toFixed(4)}x</strong>
            {' '}({recipe?.standardPax} → {scaleResult.targetPax} pax)
          </div>
        )}
      </div>

      {/* Scaled results */}
      {scaleResult && scaleResult.ingredients && (
        <div>
          <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
            <h4 style={{ fontWeight: 600, color: 'var(--color-gray-600)' }}>
              Scaled Ingredient Requisition
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-gray-400)', marginLeft: 8 }}>
                for {scaleResult.targetPax} pax
              </span>
            </h4>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                const csv = [
                  'Ingredient,Gross Qty,Unit,Net Qty,Wastage %',
                  ...scaleResult.ingredients.map((ing) =>
                    `${ing.itemName},${ing.scaledGrossQty},${ing.grossUnit},${ing.scaledNetQty},${ing.wastagePercent}`
                  ),
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${recipe?.recipeCode || 'recipe'}_${scaleResult.targetPax}pax.csv`;
                a.click();
              }}
            >
              ⬇ Export CSV
            </button>
          </div>

          <div className="table-wrapper">
            <table className="ingredient-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ingredient</th>
                  <th>Gross Qty (scaled)</th>
                  <th>Unit</th>
                  <th>Wastage %</th>
                  <th>Net Qty (scaled)</th>
                </tr>
              </thead>
              <tbody>
                {scaleResult.ingredients.map((ing, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--color-gray-400)', fontSize: '0.8rem' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{ing.itemName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)' }}>{ing.itemCode}</div>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600 }}>
                        {fmtNum(ing.scaledGrossQty)}
                      </span>
                    </td>
                    <td>{ing.grossUnit}</td>
                    <td>{parseFloat(ing.wastagePercent)}%</td>
                    <td>
                      <span className="font-mono calc-field">{fmtNum(ing.scaledNetQty)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
