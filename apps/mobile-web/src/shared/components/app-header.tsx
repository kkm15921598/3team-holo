import { Link } from "react-router-dom";

type AppHeaderProps = {
  showLogo?: boolean;
  showActions?: boolean;
  hasNotification?: boolean;
};

export function AppHeader({
  showLogo = true,
  showActions = true,
}: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-4">

      {showLogo ? (
        <Link
          to="/home"
          className="font-fredoka text-[28px] font-semibold leading-none text-holo-purple"
        >
          HOLO
        </Link>
      ) : (
        <span />
      )}

      {showActions && (
        <div className="flex items-center gap-4">

          {/* 검색 */}
          <button type="button" aria-label="검색">
            <img
              src="/icons/top_search.svg"
              className="h-[22px] w-[22px] object-contain"
              alt=""
            />
          </button>

          {/* 알림 */}
          <button
            type="button"
            aria-label="알림"
          >
            <img
              src="/icons/top_bell.svg"
              className="h-[22px] w-[22px] object-contain"
              alt=""
            />
          </button>

          {/* 마이룸 */}
          <Link to="/myroom" aria-label="마이룸 꾸미기">
            <img
              src="/icons/top_myroom.svg"
              className="h-[22px] w-[22px] object-contain"
              alt=""
            />
          </Link>

        </div>
      )}
    </header>
  );
}