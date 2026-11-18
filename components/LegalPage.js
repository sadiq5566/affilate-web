export default function LegalPage({ title, updated, children }) {
  return (
    <div className="container page prose">
      <h1>{title}</h1>
      {updated && <p className="muted small">Last updated: {updated}</p>}
      {children}
    </div>
  );
}
