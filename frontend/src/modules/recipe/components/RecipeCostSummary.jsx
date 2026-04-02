/**
 * RecipeCostSummary
 * Displays ingredient cost + editable overhead costs.
 * Calculates live totalCost and costPerPax.
 */
import { useState, useEffect } from 'react';

const fmtCurrency = (n) => {
  const num = parseFloat(n);
  if (isNaN(num)) return '₹ 0.00';
  return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function RecipeCostSummary({
  costing,
  standardPax = 1,
  disabled = false,
  onRecalculate,
  onUpdateCost,
  recalculateLoading,
  updateLoading,
}) {
  const [overheads, setOverheads] = useState({
    fuelCost: 0,
    laborCost: 0,
    packagingCost: 0,
    otherCost: 0,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [customPax, setCustomPax] = useState('');

  // Sync from API data when costing changes
  useEffect(() => {
    if (costing) {
      setOverheads({
        fuelCost: parseFloat(costing.fuelCost) || 0,
        laborCost: parseFloat(costing.laborCost) || 0,
        packagingCost: parseFloat(costing.packagingCost) || 0,
        otherCost: parseFloat(costing.otherCost) || 0,
      });
      setIsDirty(false);
    }
  }, [costing]);

  const ingredientCost = parseFloat(costing?.ingredientCost) || 0;
  const totalOverhead = Object.values(overheads).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalCost = ingredientCost + totalOverhead;
  const effectivePax = parseInt(customPax) > 0 ? parseInt(customPax) : (parseInt(standardPax) || 1);
  const costPerPax = totalCost / effectivePax;

  const handleOverheadChange = (field, value) => {
    setOverheads((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    await onUpdateCost({
      fuelCost: parseFloat(overheads.fuelCost) || 0,
      laborCost: parseFloat(overheads.laborCost) || 0,
      packagingCost: parseFloat(overheads.packagingCost) || 0,
      otherCost: parseFloat(overheads.otherCost) || 0,
    });
    setIsDirty(false);
  };

  if (!costing && !disabled) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <p style={{ color: 'var(--color-gray-400)', marginBottom: 16 }}>
          No costing data available. Recalculate to generate costs from ingredients.
        </p>
        <button type="button" className="btn btn-primary" onClick={onRecalculate} disabled={recalculateLoading}>
          {recalculateLoading ? 'Calculating...' : '⟳ Calculate Costing'}
        </button>
      </div>
    );
  }

  return (
    <div className="cost-summary">
      <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 600, color: 'var(--color-gray-700)' }}>Recipe Costing</h3>
        {!disabled && (
          <div className="flex gap-8">
            {isDirty && (
              <button type="button" className="btn btn-sm btn-success" onClick={handleSave} disabled={updateLoading}>
                {updateLoading ? 'Saving...' : 'Save Overheads'}
              </button>
            )}
            <button type="button" className="btn btn-sm btn-outline" onClick={onRecalculate} disabled={recalculateLoading}>
              {recalculateLoading ? 'Recalculating...' : '⟳ Recalculate'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: cost breakdown table */}
        <div>
          <table className="cost-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="cost-label">Ingredient Cost</td>
                <td className="cost-value">
                  <span className="font-mono">{fmtCurrency(ingredientCost)}</span>
                </td>
              </tr>
              {[
                { key: 'fuelCost', label: 'Fuel / Gas' },
                { key: 'laborCost', label: 'Labor' },
                { key: 'packagingCost', label: 'Packaging' },
                { key: 'otherCost', label: 'Other' },
              ].map(({ key, label }) => (
                <tr key={key}>
                  <td className="cost-label">{label}</td>
                  <td className="cost-value">
                    {disabled ? (
                      <span className="font-mono">{fmtCurrency(overheads[key])}</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: 'var(--color-gray-400)' }}>₹</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          className="form-control font-mono"
                          style={{ width: 100, textAlign: 'right' }}
                          value={overheads[key]}
                          onChange={(e) => handleOverheadChange(key, e.target.value)}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--color-gray-200)' }}>
                <td className="cost-label" style={{ fontWeight: 600 }}>Total Overhead</td>
                <td className="cost-value">
                  <span className="font-mono" style={{ fontWeight: 600 }}>{fmtCurrency(totalOverhead)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: summary tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="cost-tile" style={{ padding: 20, background: 'var(--color-gray-50)', borderRadius: 8, border: '1px solid var(--color-gray-200)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', fontWeight: 500, marginBottom: 4 }}>
              TOTAL RECIPE COST
            </div>
            <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-800)' }}>
              {fmtCurrency(totalCost)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>
              for {effectivePax} pax
            </div>
          </div>

          {/* Manual pax input */}
          <div style={{ padding: '14px 16px', background: 'var(--color-gray-50)', borderRadius: 8, border: '1px solid var(--color-gray-200)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', fontWeight: 500, marginBottom: 6 }}>
              CALCULATE FOR PAX
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                className="form-control font-mono"
                style={{ width: 90, textAlign: 'center' }}
                placeholder={standardPax}
                value={customPax}
                onChange={(e) => setCustomPax(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                pax
              </span>
              {customPax && (
                <button
                  type="button"
                  onClick={() => setCustomPax('')}
                  style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  reset
                </button>
              )}
            </div>
            {customPax && parseInt(customPax) !== parseInt(standardPax) && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', marginTop: 4 }}>
                Standard: {standardPax} pax
              </div>
            )}
          </div>

          {parseInt(customPax) > 0 && (
            <div className="cost-tile" style={{ padding: 20, background: 'var(--color-gray-50)', borderRadius: 8, border: '1px solid var(--color-gray-200)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', fontWeight: 500, marginBottom: 4 }}>
                TOTAL COST FOR {customPax} PAX
              </div>
              <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gray-800)' }}>
                {fmtCurrency(costPerPax * parseInt(customPax))}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>
                {fmtCurrency(costPerPax)} × {customPax} pax
              </div>
            </div>
          )}

          <div className="cost-tile" style={{ padding: 20, background: 'var(--color-primary)', borderRadius: 8 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: 4 }}>
              COST PER PAX
            </div>
            <div className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>
              {fmtCurrency(costPerPax)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
              per serving
            </div>
          </div>

          {costing?.calculatedAt && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', paddingLeft: 2 }}>
              Last calculated: {new Date(costing.calculatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
