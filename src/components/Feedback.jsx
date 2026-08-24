import Icon from './Icon';

export function FullScreenLoader() {
  return (
    <div className="full-screen-loader" aria-live="polite" aria-label="Loading AgroConnect">
      <div className="loader-mark" />
      <p>Loading marketplace</p>
    </div>
  );
}

export function ListingsSkeleton({ count = 6 }) {
  return (
    <div className="listing-grid" aria-label="Loading listings" aria-busy="true">
      {Array.from({ length: count }, (_, index) => <div className="listing-card skeleton-card" key={index}><span /><span /><span /><span /></div>)}
    </div>
  );
}

export function EmptyState({ title, detail, action }) {
  return (
    <section className="empty-state">
      <Icon name="box" size={28} />
      <h2>{title}</h2>
      <p>{detail}</p>
      {action}
    </section>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast toast-${toast.tone}`} role="status">{toast.message}</div>;
}

export function FieldError({ error }) {
  return error ? <p className="field-error" role="alert">{error}</p> : null;
}
