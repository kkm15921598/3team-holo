import { Link } from "react-router-dom";

type AppHeaderProps = {
  showLogo?: boolean;
  showActions?: boolean;
  hasNotification?: boolean;
};

export function AppHeader({
  showLogo = true,
  showActions = true,
  hasNotification = true,
}: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-4">
      {showLogo ? (
        <Link to="/home" className="font-fredoka text-[28px] font-semibold leading-none text-holo-purple">
          HOLO
        </Link>
      ) : (
        <span />
      )}
      {showActions && (
        <div className="flex items-center gap-4 text-holo-ink-4">
          <Link to="/board/search" aria-label="검색">
            <SearchIcon />
          </Link>
          <button type="button" aria-label="알림" className="relative">
            <BellIcon />
            {hasNotification && (
              <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-holo-error" />
            )}
          </button>
          <button type="button" aria-label="AI 추천">
            <WandIcon />
          </button>
        </div>
      )}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function WandIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
      <path d="m4 20 9-9" />
      <path d="m18 16 1 1.5L20.5 18 19 19l-1 1.5L17 19l-1.5-1L17 17z" />
    </svg>
  );
}
