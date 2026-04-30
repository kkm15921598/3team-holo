import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type ScreenHeaderProps = {
  title?: string;
  showBack?: boolean;
  right?: ReactNode;
};

export function ScreenHeader({ title, showBack = false, right }: ScreenHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-gray-100 bg-white px-4">
      {showBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
          className="absolute left-2 flex h-10 w-10 items-center justify-center text-gray-700 active:scale-95"
        >
          <BackIcon />
        </button>
      )}

      {title ? (
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      ) : (
        <span className="font-fredoka text-2xl font-semibold tracking-tight text-holo-purple">
          HOLO
        </span>
      )}

      {right && <div className="absolute right-2 flex items-center">{right}</div>}
    </header>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
