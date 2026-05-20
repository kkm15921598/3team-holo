import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getNotificationSettings,
  subscribeNotificationSettings,
} from "@/shared/stores/notification-settings-store";
import { useDynNotifications } from "@/shared/stores/notifications-store";

type AppHeaderProps = {
  showLogo?: boolean;
  showActions?: boolean;
  hasNotification?: boolean;
};

export function AppHeader({
  showLogo = true,
  showActions = true,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnSearch = location.pathname.startsWith("/board/search");
  const [nSettings, setNSettings] = useState(getNotificationSettings);
  const dynNotifications = useDynNotifications();

  useEffect(() =>
    subscribeNotificationSettings(() => {
      setNSettings(getNotificationSettings());
    }),
  []);

  // 동적(실제) 알림 미읽음 수 — kind 별로 설정 토글에 정확히 매핑
  const unreadCount = !nSettings.master
    ? 0
    : dynNotifications.filter((d) => {
        if (d.read) return false;
        let key: keyof typeof nSettings;
        if (d.kind === "friend-received" || d.kind === "friend-accepted") key = "friend";
        else if (d.kind === "comment") key = "comment";
        else if (d.kind === "like") key = "like";
        else if (d.kind === "chat") key = "chat";
        else if (d.kind === "meeting-joined" || d.kind === "meeting-full") key = "meeting";
        else key = "event";
        return nSettings[key];
      }).length;

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between px-4">

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

          {/* 검색 — 검색 화면이 열려 있으면 닫기, 아니면 열기 */}
          <button
            type="button"
            aria-label={isOnSearch ? "검색 닫기" : "검색"}
            onClick={() => {
              if (isOnSearch) navigate(-1);
              else navigate("/board/search");
            }}
          >
            <img
              src="/icons/top_search.svg"
              className="h-[22px] w-[22px] object-contain"
              alt=""
            />
          </button>

          {/* 알림 — 클릭 시 알림 페이지로 이동 */}
          <button
            type="button"
            aria-label="알림"
            className="relative"
            onClick={() => navigate("/notifications")}
          >
            <img
              src="/icons/top_bell.svg"
              className="h-[22px] w-[22px] object-contain"
              alt=""
            />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-holo-error px-[3px] text-[9px] font-bold text-white leading-none">
                {unreadCount}
              </span>
            )}
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
