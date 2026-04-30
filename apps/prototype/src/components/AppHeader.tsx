import { Icon } from './Icon';

export function AppHeader({ withDot = true }: { withDot?: boolean }) {
  return (
    <header className="app-header">
      <div className="logo-text">HOLO</div>
      <div className="app-header-actions">
        <button className="icon-btn" aria-label="검색">
          <Icon name="search" />
        </button>
        <button className="icon-btn" aria-label="알림">
          <Icon name="bell" />
          {withDot && <span className="dot" />}
        </button>
        <button className="icon-btn" aria-label="추천">
          <Icon name="sparkles" />
        </button>
      </div>
    </header>
  );
}
