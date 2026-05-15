import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotificationSettings,
  subscribeNotificationSettings,
  getReadIds,
  markRead,
  markAllRead,
} from "@/shared/stores/notification-settings-store";
import {
  markAllDynRead,
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
  /** 정렬 우선순위 — 작을수록 위에 표시. 정적 mock 용 */
  order: number;
  read: boolean;
  link: string;
  /** 동적 알림 여부 — 읽음 처리 라우팅 분기에 사용 */
  dynamic?: boolean;
};

// 정적 알림 (mock 데모용 — 친구 관련은 동적 store 가 담당하므로 제외)
const STATIC_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "comment",
    title: "댓글 알림",
    body: "홀로빌리지님이 내 글에 댓글을 달았어요. \"저도 같이 하고 싶어요!\"",
    time: "방금 전",
    order: 1,
    read: false,
    link: "/board/1",
  },
  {
    id: "n2",
    type: "like",
    title: "좋아요 알림",
    body: "단무지팬님이 내 글 \"점심 번개 같이 해요\"에 좋아요를 눌렀어요.",
    time: "5분 전",
    order: 5,
    read: false,
    link: "/board/1",
  },
  {
    id: "n4",
    type: "chat",
    title: "채팅 알림",
    body: "스터디카페 채팅방에 새 메시지가 도착했어요. \"내일 몇 시에 오세요?\"",
    time: "30분 전",
    order: 30,
    read: true,
    link: "/chat",
  },
  {
    id: "n5",
    type: "meeting",
    title: "모임 알림",
    body: "\"강아지 산책 친구\" 모임에 새 멤버가 합류했어요.",
    time: "1시간 전",
    order: 60,
    read: true,
    link: "/board/3",
  },
  {
    id: "n6",
    type: "event",
    title: "이벤트 알림",
    body: "오늘의 출석 체크를 완료하고 포인트를 받아가세요! 🎁",
    time: "오전 9:00",
    order: 120,
    read: true,
    link: "/event/attendance",
  },
];

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
  const [readSet, setReadSet] = useState(() => getReadIds());
  const dynNotifications = useDynNotifications();

  useEffect(() =>
    subscribeNotificationSettings(() => {
      setNSettings(getNotificationSettings());
      setReadSet(new Set(getReadIds()));
    }),
  []);

  const handleNotificationClick = (n: Notification) => {
    if (n.dynamic) markDynRead(n.id);
    else markRead(n.id);
    onClose();
    navigate(n.link);
  };
  const handleMarkAllRead = () => {
    markAllRead(STATIC_NOTIFICATIONS.map((n) => n.id));
    markAllDynRead();
  };

  // 동적 친구 알림 → 공통 Notification 형식으로 매핑
  const dynItems: Notification[] = dynNotifications.map((d) => ({
    id: d.id,
    type: "friend",
    title: d.title,
    body: d.body,
    time: d.time,
    order: -d.createdAt, // 최신이 위
    read: d.read,
    link: d.link,
    dynamic: true,
  }));

  // 설정에 따라 보여줄 알림 필터링 — friend 토글이 꺼져 있으면 동적 알림도 숨김
  const merged: Notification[] = nSettings.master
    ? [...dynItems, ...STATIC_NOTIFICATIONS].filter(
        (n) => nSettings[TYPE_TO_SETTING[n.type]],
      )
    : [];

  // 정렬 — 동적은 createdAt(음수)이 가장 작아 위에 옴, 정적은 order 값으로 그 다음
  merged.sort((a, b) => a.order - b.order);

  const items = merged.map((n) => ({
    ...n,
    read: n.dynamic ? n.read : n.read || readSet.has(n.id),
  }));

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
