/**
 * RecipeStepsEditor
 * Manage ordered preparation steps for a recipe.
 */
import { useState } from 'react';

const STEP_TYPES = ['PREP', 'COOK', 'GARNISH', 'HOLD', 'PACK'];

const STEP_TYPE_LABELS = {
  PREP: 'Preparation',
  COOK: 'Cooking',
  GARNISH: 'Garnish / Plating',
  HOLD: 'Hold',
  PACK: 'Packing',
};

const defaultNewStep = {
  stepType: 'PREP',
  instruction: '',
  estimatedTimeMin: '',
  equipmentName: '',
  temperatureNote: '',
  qcCheckNote: '',
};

export default function RecipeStepsEditor({
  steps = [],
  disabled = false,
  onAdd,
  onUpdate,
  onRemove,
  addLoading,
  updateLoading,
  removeLoading,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStep, setNewStep] = useState({ ...defaultNewStep });
  const [editingId, setEditingId] = useState(null);
  const [editStep, setEditStep] = useState({});

  // Sort steps by stepNo
  const sortedSteps = [...steps].sort((a, b) => a.stepNo - b.stepNo);

  const handleAdd = async () => {
    if (!newStep.instruction.trim()) return;
    await onAdd({
      stepNo: sortedSteps.length + 1,
      stepType: newStep.stepType,
      instruction: newStep.instruction.trim(),
      estimatedTimeMin: newStep.estimatedTimeMin ? parseInt(newStep.estimatedTimeMin) : 0,
      equipmentName: newStep.equipmentName || null,
      temperatureNote: newStep.temperatureNote || null,
      qcCheckNote: newStep.qcCheckNote || null,
    });
    setNewStep({ ...defaultNewStep });
    setShowAddForm(false);
  };

  const startEdit = (step) => {
    setEditingId(step.id);
    setEditStep({
      stepType: step.stepType || 'PREP',
      instruction: step.instruction,
      estimatedTimeMin: step.estimatedTimeMin ?? '',
      equipmentName: step.equipmentName ?? '',
      temperatureNote: step.temperatureNote ?? '',
      qcCheckNote: step.qcCheckNote ?? '',
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditStep({}); };

  const saveEdit = async (step) => {
    await onUpdate({
      stepId: step.id,
      data: {
        stepType: editStep.stepType,
        instruction: editStep.instruction,
        estimatedTimeMin: editStep.estimatedTimeMin ? parseInt(editStep.estimatedTimeMin) : null,
        equipmentName: editStep.equipmentName || null,
        temperatureNote: editStep.temperatureNote || null,
        qcCheckNote: editStep.qcCheckNote || null,
      },
    });
    setEditingId(null);
  };

  const totalTime = sortedSteps.reduce((sum, s) => sum + (parseInt(s.estimatedTimeMin) || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
        <h3 style={{ fontWeight: 600, color: 'var(--color-gray-700)' }}>
          Preparation Steps
          <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--color-gray-500)', fontWeight: 400 }}>
            ({sortedSteps.length} steps{totalTime > 0 ? ` · ${totalTime} min total` : ''})
          </span>
        </h3>
        {!disabled && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            + Add Step
          </button>
        )}
      </div>

      <div className="steps-editor">
        {sortedSteps.length === 0 && !showAddForm && (
          <div className="text-center" style={{ padding: '24px', color: 'var(--color-gray-400)', border: '2px dashed var(--color-gray-200)', borderRadius: 8 }}>
            No steps defined. Click "Add Step" to begin.
          </div>
        )}

        {/* Existing steps */}
        {sortedSteps.map((step) => {
          const isEditing = editingId === step.id;
          return (
            <div key={step.id} className="step-row card" style={{ marginBottom: 12 }}>
              <div className="flex gap-12 items-start">
                {/* Step number */}
                <div className="step-number" style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                }}>
                  {step.stepNo}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <div className="grid-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Step Type</label>
                        <select className="form-control" value={editStep.stepType}
                          onChange={(e) => setEditStep((s) => ({ ...s, stepType: e.target.value }))}>
                          {STEP_TYPES.map((t) => <option key={t} value={t}>{STEP_TYPE_LABELS[t]}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">
                          Instruction <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <textarea
                          rows={3}
                          className="form-control"
                          value={editStep.instruction}
                          onChange={(e) => setEditStep((s) => ({ ...s, instruction: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Est. Time (min)</label>
                        <input type="number" min="1" className="form-control" value={editStep.estimatedTimeMin}
                          onChange={(e) => setEditStep((s) => ({ ...s, estimatedTimeMin: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Equipment</label>
                        <input type="text" className="form-control" value={editStep.equipmentName}
                          onChange={(e) => setEditStep((s) => ({ ...s, equipmentName: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Temperature Note</label>
                        <input type="text" className="form-control" placeholder="e.g. 180°C" value={editStep.temperatureNote}
                          onChange={(e) => setEditStep((s) => ({ ...s, temperatureNote: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">QC Check Note</label>
                        <input type="text" className="form-control" placeholder="What to check..." value={editStep.qcCheckNote}
                          onChange={(e) => setEditStep((s) => ({ ...s, qcCheckNote: e.target.value }))} />
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-sm btn-success" onClick={() => saveEdit(step)} disabled={updateLoading || !editStep.instruction.trim()}>
                          Save
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-8 items-center" style={{ marginBottom: 6 }}>
                        <span className="badge" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-600)', fontSize: '0.7rem' }}>
                          {STEP_TYPE_LABELS[step.stepType] || step.stepType}
                        </span>
                        {step.estimatedTimeMin && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                            ⏱ {step.estimatedTimeMin} min
                          </span>
                        )}
                        {step.equipmentName && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                            🔧 {step.equipmentName}
                          </span>
                        )}
                        {step.temperatureNote && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>
                            🌡 {step.temperatureNote}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, color: 'var(--color-gray-700)', lineHeight: 1.6 }}>{step.instruction}</p>
                      {step.qcCheckNote && (
                        <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--color-warning-light, #fef3c7)', borderRadius: 4, fontSize: '0.8125rem', color: 'var(--color-warning-dark, #78350f)' }}>
                          ✓ QC: {step.qcCheckNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!disabled && !isEditing && (
                  <div className="flex gap-8" style={{ flexShrink: 0 }}>
                    <button type="button" className="btn btn-sm btn-icon" title="Edit" onClick={() => startEdit(step)}>✏️</button>
                    <button type="button" className="btn btn-sm btn-icon" style={{ color: 'var(--color-danger)' }} title="Delete"
                      onClick={() => onRemove(step.id)} disabled={removeLoading}>🗑️</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add new step form */}
        {showAddForm && !disabled && (
          <div className="card" style={{ border: '2px solid var(--color-primary)', marginTop: 8 }}>
            <h4 style={{ marginBottom: 12, color: 'var(--color-primary)' }}>New Step #{sortedSteps.length + 1}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Step Type</label>
                <select className="form-control" value={newStep.stepType}
                  onChange={(e) => setNewStep((s) => ({ ...s, stepType: e.target.value }))}>
                  {STEP_TYPES.map((t) => <option key={t} value={t}>{STEP_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  Instruction <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder="Describe this step in detail..."
                  value={newStep.instruction}
                  onChange={(e) => setNewStep((s) => ({ ...s, instruction: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Est. Time (min)</label>
                <input type="number" min="1" className="form-control" placeholder="e.g. 10"
                  value={newStep.estimatedTimeMin}
                  onChange={(e) => setNewStep((s) => ({ ...s, estimatedTimeMin: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Equipment Name</label>
                <input type="text" className="form-control" placeholder="e.g. Wok, Pressure Cooker"
                  value={newStep.equipmentName}
                  onChange={(e) => setNewStep((s) => ({ ...s, equipmentName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Temperature Note</label>
                <input type="text" className="form-control" placeholder="e.g. Medium flame, 180°C"
                  value={newStep.temperatureNote}
                  onChange={(e) => setNewStep((s) => ({ ...s, temperatureNote: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">QC Check Note</label>
                <input type="text" className="form-control" placeholder="What quality aspect to verify..."
                  value={newStep.qcCheckNote}
                  onChange={(e) => setNewStep((s) => ({ ...s, qcCheckNote: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={handleAdd}
                  disabled={addLoading || !newStep.instruction.trim()}>
                  {addLoading ? 'Adding...' : 'Add Step'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
