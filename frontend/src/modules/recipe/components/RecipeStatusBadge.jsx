const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', className: 'badge-draft' },
  UNDER_REVIEW: { label: 'Under Review', className: 'badge-under-review' },
  APPROVED: { label: 'Approved', className: 'badge-approved' },
  ACTIVE: { label: 'Active', className: 'badge-active' },
  INACTIVE: { label: 'Inactive', className: 'badge-inactive' },
  ARCHIVED: { label: 'Archived', className: 'badge-archived' },
};

export default function RecipeStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'badge-draft' };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
