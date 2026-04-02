/**
 * RecipeApprovalPanel
 * Role-aware workflow action buttons for recipe lifecycle management.
 */
import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const STATUS_LABELS = {
  DRAFT: { label: 'Draft', color: 'var(--color-gray-400)' },
  UNDER_REVIEW: { label: 'Under Review', color: 'var(--color-warning)' },
  APPROVED: { label: 'Approved', color: 'var(--color-info)' },
  ACTIVE: { label: 'Active', color: 'var(--color-success)' },
  INACTIVE: { label: 'Inactive', color: 'var(--color-gray-500)' },
  ARCHIVED: { label: 'Archived', color: 'var(--color-gray-400)' },
};

export default function RecipeApprovalPanel({
  recipe,
  onSubmitReview,
  onApprove,
  onReject,
  onActivate,
  onDeactivate,
  onArchive,
  onNewVersion,
  submitLoading,
  approveLoading,
  rejectLoading,
  statusLoading,
  newVersionLoading,
}) {
  const { user } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');

  if (!recipe || !user) return null;

  const status = recipe.status;
  const role = user.role;

  const isAdmin = role === 'ADMIN';
  const isOps = role === 'OPS_MANAGER' || isAdmin;
  const isApprover = role === 'APPROVER' || isAdmin;

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    await onReject({ note: rejectNote });
    setShowRejectModal(false);
    setRejectNote('');
  };

  const handleNewVersion = async () => {
    if (!changeSummary.trim()) return;
    await onNewVersion({ changeSummary });
    setShowNewVersionModal(false);
    setChangeSummary('');
  };

  // Build action buttons based on current status + role
  const actions = [];

  // DRAFT → submit for review (OPS_MANAGER or ADMIN)
  if (status === 'DRAFT' && isOps) {
    actions.push(
      <button key="submit" type="button" className="btn btn-primary" onClick={onSubmitReview} disabled={submitLoading}>
        {submitLoading ? 'Submitting...' : '📤 Submit for Review'}
      </button>
    );
  }

  // UNDER_REVIEW → approve or reject (APPROVER or ADMIN)
  if (status === 'UNDER_REVIEW' && isApprover) {
    actions.push(
      <button key="approve" type="button" className="btn btn-success" onClick={onApprove} disabled={approveLoading}>
        {approveLoading ? 'Approving...' : '✓ Approve'}
      </button>
    );
    actions.push(
      <button key="reject" type="button" className="btn btn-danger" onClick={() => setShowRejectModal(true)}>
        ✗ Reject
      </button>
    );
  }

  // APPROVED → activate (ADMIN or OPS_MANAGER)
  if (status === 'APPROVED' && isOps) {
    actions.push(
      <button key="activate" type="button" className="btn btn-success" onClick={onActivate} disabled={statusLoading}>
        {statusLoading ? '...' : '▶ Activate'}
      </button>
    );
  }

  // ACTIVE → deactivate (ADMIN)
  if (status === 'ACTIVE' && isAdmin) {
    actions.push(
      <button key="deactivate" type="button" className="btn btn-outline" onClick={onDeactivate} disabled={statusLoading}>
        {statusLoading ? '...' : '⏸ Deactivate'}
      </button>
    );
  }

  // INACTIVE → archive (ADMIN)
  if (status === 'INACTIVE' && isAdmin) {
    actions.push(
      <button key="archive" type="button" className="btn btn-outline" style={{ color: 'var(--color-gray-500)' }}
        onClick={onArchive} disabled={statusLoading}>
        {statusLoading ? '...' : '📦 Archive'}
      </button>
    );
  }

  // APPROVED or ACTIVE → create new version (OPS_MANAGER or ADMIN)
  if ((status === 'APPROVED' || status === 'ACTIVE') && isOps) {
    actions.push(
      <button key="version" type="button" className="btn btn-outline" onClick={() => setShowNewVersionModal(true)}>
        🔀 New Version
      </button>
    );
  }

  const statusInfo = STATUS_LABELS[status] || {};

  return (
    <>
      <div className="card approval-panel">
        <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
          <div>
            <h3 style={{ fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 4 }}>Workflow Status</h3>
            <div className="flex gap-8 items-center">
              <span style={{ fontWeight: 700, color: statusInfo.color, fontSize: '0.9375rem' }}>
                {statusInfo.label}
              </span>
              {recipe.versionNumber && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                  v{recipe.versionNumber}
                </span>
              )}
            </div>
          </div>
          {recipe.approvedAt && (
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
              <div>Approved by {recipe.approver?.name || 'Unknown'}</div>
              <div>{new Date(recipe.approvedAt).toLocaleDateString('en-IN')}</div>
            </div>
          )}
        </div>

        {actions.length > 0 ? (
          <div className="flex gap-8 flex-wrap">{actions}</div>
        ) : (
          <p style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem', margin: 0 }}>
            No actions available for your role at this stage.
          </p>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Recipe</h3>
              <button type="button" className="modal-close" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Rejection Reason <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  className="form-control"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Explain why this recipe is being rejected..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleReject}
                disabled={rejectLoading || !rejectNote.trim()}>
                {rejectLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Version Modal */}
      {showNewVersionModal && (
        <div className="modal-overlay" onClick={() => setShowNewVersionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Version</h3>
              <button type="button" className="modal-close" onClick={() => setShowNewVersionModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert" style={{ background: 'var(--color-info-light, #eff6ff)', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: '0.875rem', color: 'var(--color-info-dark, #1e40af)' }}>
                This will create a new DRAFT version of this recipe. The current version will remain {status.toLowerCase()} until the new version is approved and activated.
              </div>
              <div className="form-group">
                <label className="form-label">
                  Change Summary <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  className="form-control"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="What changes are being made in this version?"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowNewVersionModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleNewVersion}
                disabled={newVersionLoading || !changeSummary.trim()}>
                {newVersionLoading ? 'Creating...' : 'Create New Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
