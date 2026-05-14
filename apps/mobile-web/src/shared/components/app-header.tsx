import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { NotificationPanel } from "./notification-panel";
import {
  getNotificationSettings,
  subscribeNotificationSettings,
  getReadIds,
} from "@/shared/stores/notification-settings-store";

// 알림 타입별 초기 unread ID 목록
const UNREAD_IDS_BY_TYPE: Record<string, string[]> = {
  comment: ["n1"],
  like: ["n2"],
  friend: ["n3"],
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
  const [open, setOpen] = useState(false);
  const [nSettings, setNSettings] = useState(getNotificationSettings);
  const [readIds, setReadIds] = useState(() => getReadIds());

  useEffect(() =>
    subscribeNotificationSettings(() => {
      setNSettings(getNotificationSettings());
      setReadIds(new Set(getReadIds()));
    }),
  []);

  const unreadCount = nSettings.master
    ? Object.entries(UNREAD_IDS_BY_TYPE).reduce((sum, [type, ids]) => {
        if (!nSettings[type as keyof typeof nSettings]) return sum;
        return sum + ids.filter((id) => !readIds.has(id)).length;
      }, 0)
    : 0;

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
            className="relative"
            onClick={() => setOpen((v) => !v)}
          >
            <img
              src="/icons/top_bell.svg"
              className="h-[22px] w-[22px] object-contain"
              alt=""
            />
            {unreadCount > 0 && !open && (
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

      {/* 알림 패널 */}
      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </header>
  );
}
