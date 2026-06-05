const styles = {
  COMPLETED: 'bg-success-50 text-success-600 ring-success-500/20',
  PENDING: 'bg-warning-50 text-warning-600 ring-warning-500/20',
  FAILED: 'bg-danger-50 text-danger-600 ring-danger-500/20',
};

export default function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${styles[s] || styles.PENDING}`}>
      {s}
    </span>
  );
}
