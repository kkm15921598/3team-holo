import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getNotificationSettings,
  subscribeNotificationSettings,
  getReadIds,
} from "@/shared/stores/notification-settings-store";
import { useDynNotifications } from "@/shared/stores/notifications-store";

// 알림 타입별 초기 unread ID 목록 — 정적 mock 알림
// 친구 알림은 동적 store(useDynNotifications)에서 계산하므로 여기 포함하지 않는다.
const UNREAD_IDS_BY_TYPE: Record<string, string[]> = {
  comment: ["n1"],
  like: ["n2"],
  chat: [],
  meeting: [],
  event: [],
};

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
  const [readIds, setReadIds] = useState(() => getReadIds());
  const dynNotifications = useDynNotifications();

  useEffect(() =>
    subscribeNotificationSettings(() => {
      setNSettings(getNotificationSettings());
      setReadIds(new Set(getReadIds()));
    }),
  []);

  const staticUnread = nSettings.master
    ? Object.entries(UNREAD_IDS_BY_TYPE).reduce((sum, [type, ids]) => {
        if (!nSettings[type as keyof typeof nSettings]) return sum;
        return sum + ids.filter((id) => !readIds.has(id)).length;
      }, 0)
    : 0;

  const dynUnread =
    nSettings.master && nSettings.friend
      ? dynNotifications.filter((n) => !n.read).length
      : 0;

  const unreadCount = staticUnread + dynUnread;

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
