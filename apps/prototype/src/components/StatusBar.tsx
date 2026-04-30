export function StatusBar() {
  return (
    <div className="statusbar" aria-hidden="true">
      <span>9:41</span>
      <span className="icons">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v3H2zM6 14h2v6H6zM10 11h2v9h-2zM14 8h2v12h-2zM18 5h2v15h-2z"/></svg>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C7.5 4 3.5 5.7.5 8.5L2 10c2.6-2.4 6-3.9 10-3.9s7.4 1.5 10 3.9l1.5-1.5C20.5 5.7 16.5 4 12 4zM5.5 12C7.4 10.2 9.6 9 12 9s4.6 1.2 6.5 3l1.4-1.4C17.6 8.4 14.9 7 12 7s-5.6 1.4-7.9 3.6L5.5 12zM12 15a3 3 0 100 6 3 3 0 000-6z"/></svg>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8h16v8H3zm17 2h2v4h-2z" stroke="currentColor" strokeWidth="1" fill="currentColor"/></svg>
      </span>
    </div>
  );
}
