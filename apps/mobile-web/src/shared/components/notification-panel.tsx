import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotificationSettings,
  subscribeNotificationSettings,
} from "@/shared/stores/notification-settings-store";
import {
  markDynRead,
  useDynNotifications,
} from "@/shared/stores/notifications-store";

type NotifType = "comment" | "like" | "friend" | "chat" | "meeting" | "event";

type Notification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  order: number;
  read: boolean;
  link: string;
};

const TYPE_EMOJI: Record<NotifType, string> = {
  comment: "💬",
  like: "❤️",
  friend: "🤝",
  chat: "📩",
  meeting: "👥",
  event: "🎉",
};

// 알림 타입 → 설정 키 매핑
const TYPE_TO_SETTING: Record<NotifType, keyof ReturnType<typeof getNotificationSettings>> = {
  comment: "comment",
  like: "like",
  friend: "friend",
  chat: "chat",
  meeting: "meeting",
  event: "event",
};

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [nSettings, setNSettings] = useState(getNotificationSettings);
  const dynNotifications = useDynNotifications();

  useEffect(() =>
    subscribeNotificationSettings(() => {
      setNSettings(getNotificationSettings());
    }),
  []);

  const handleNotificationClick = (n: Notification) => {
    markDynRead(n.id);
    onClose();
    navigate(n.link);
  };

  const handleMarkAllRead = () => {
    // 화면에 보이는(설정 토글 ON + 30일 이내) 항목만 읽음 처리.
    // markAllDynRead() 는 설정을 무시하고 전부 읽음으로 만들어, 꺼둔 종류의 알림을
    // 나중에 다시 켜도 이미 읽음으로 남는 문제가 있었다.
    items.filter((n) => !n.read).forEach((n) => markDynRead(n.id));
  };

  // 헤더 배지와 동일한 30일 컷오프 — 패널에만 없으면 오래된 미읽음이 패널에 남아
  // 배지(헤더)와 개수가 어긋나고 "모두 읽음"으로도 깔끔히 정리되지 않는다.
  const NOTIF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  // 동적 알림 → 공통 Notification 형식으로 매핑 (kind → NotifType 정확히 대응)
  const items: Notification[] = nSettings.master
    ? dynNotifications
        .filter((d) => Date.now() - d.createdAt <= NOTIF_MAX_AGE_MS)
        .map((d) => ({
          id: d.id,
          type:
            d.kind === "friend-received" || d.kind === "friend-accepted"
              ? ("friend" as const)
              : d.kind === "comment"
              ? ("comment" as const)
              : d.kind === "like"
              ? ("like" as const)
              : d.kind === "chat"
              ? ("chat" as const)
              : d.kind === "meeting-joined" || d.kind === "meeting-full"
              ? ("meeting" as const)
              : ("event" as const),
          title: d.title,
          body: d.body,
          time: d.time,
          order: -d.createdAt,
          read: d.read,
          link: d.link,
        }))
        .filter((n) => nSettings[TYPE_TO_SETTING[n.type]])
        .sort((a, b) => a.order - b.order)
    : [];

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <>
      {/* 오버레이 — Leaflet 내부 컨트롤(최대 z-1000) 보다 위에 올려 지도를 가리도록 함 */}
      <div className="fixed inset-0 z-[1100]" onClick={onClose} aria-hidden />

      {/* 패널 */}
      <div className="absolute left-0 right-0 top-14 z-[1101] mx-3 overflow-hidden rounded-[16px] bg-white shadow-[0_8px_32px_rgba(84,43,180,0.18)]">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-holo-line-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-holo-ink">알림</span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-holo-purple-mid px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button type="button" onClick={handleMarkAllRead} className="text-[12px] text-holo-ink-3">
              모두 읽음
            </button>
          )}
        </div>

        {/* 목록 */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="text-[28px]">🔕</span>
            <p className="text-[13px] text-holo-ink-3">
              {!nSettings.master ? "전체 알림이 꺼져 있어요" : "받을 알림이 없어요"}
            </p>
            {!nSettings.master && (
              <p className="text-[11px] text-holo-ink-4">알림설정에서 켤 수 있어요</p>
            )}
          </div>
        ) : (
          <ul className="max-h-[400px] overflow-y-auto divide-y divide-holo-line-3">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                    n.read ? "bg-white" : "bg-holo-lilac-card-2"
                  }`}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-holo-lilac-card text-[18px]">
                    {TYPE_EMOJI[n.type]}
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-holo-purple-mid">
                        {n.title}
                      </span>
                      <span className="text-[11px] text-holo-ink-4">{n.time}</span>
                    </div>
                    <p className="text-[13px] leading-[1.4] text-holo-ink-2 line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-holo-purple-mid" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* 하단 */}
        <div className="border-t border-holo-line-3 px-4 py-3 text-center">
          <button type="button" onClick={onClose} className="text-[13px] text-holo-ink-3">
            닫기
          </button>
        </div>
      </div>
    </>
  );
}
