import { useMemo, useState, useEffect } from "react";
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
  /** "방금 전" 등 표시용 라벨 */
  time: string;
  /** 정렬 / 그룹핑용 — 작을수록 최신. ms 단위. 정적 mock 은 createdAt 대신 order(분 단위)로 근사. */
  ageMs: number;
  read: boolean;
  link: string;
  /** 동적 알림이면 store 읽음 처리 분기에 사용 */
  dynamic?: boolean;
};

// 정적 mock 알림 — 실제 존재하는 게시글/채팅방/페이지로 연결되도록 데이터를 맞춤.
const STATIC_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "comment",
    title: "댓글 알림",
    // 게시글 id "1" = "점심 번개" — POST_COMMENTS["1"] 에 실제 댓글 존재
    body: "껍질은 달걀껍질님이 내 글 \"점심 번개\"에 댓글을 달았어요. \"저요! 저요!\"",
    time: "방금 전",
    ageMs: 30 * 1000,
    read: false,
    link: "/board/1",
  },
  {
    id: "n2",
    type: "like",
    title: "좋아요 알림",
    // 게시글 id "1" 의 실제 제목과 매칭
    body: "단무지팬님이 내 글 \"점심 번개\"에 좋아요를 눌렀어요.",
    time: "5분 전",
    ageMs: 5 * 60 * 1000,
    read: false,
    link: "/board/1",
  },
  {
    id: "n4",
    type: "chat",
    title: "채팅 알림",
    // 채팅방 id "3" = "동네 떡볶이 모임" (CHATROOMS 에 실재)
    body: "\"동네 떡볶이 모임\" 채팅방에 새 메시지가 도착했어요. \"맛있겠다 ㅋㅋㅋ\"",
    time: "30분 전",
    ageMs: 30 * 60 * 1000,
    read: true,
    link: "/chat/3",
  },
  {
    id: "n5",
    type: "meeting",
    title: "모임 알림",
    // 게시글 id "3" = "강아지 산책친구 구해요"
    body: "\"강아지 산책친구 구해요\" 모임에 새 멤버가 합류했어요.",
    time: "1시간 전",
    ageMs: 60 * 60 * 1000,
    read: true,
    link: "/board/3",
  },
  {
    id: "n6",
    type: "event",
    title: "이벤트 알림",
    body: "오늘의 출석 체크를 완료하고 포인트를 받아가세요! 🎁",
    time: "오전 9:00",
    ageMs: 8 * 60 * 60 * 1000,
    read: true,
    link: "/event/attendance",
  },
];

const TYPE_TO_SETTING: Record<NotifType, keyof ReturnType<typeof getNotificationSettings>> = {
  comment: "comment",
  like: "like",
  friend: "friend",
  chat: "chat",
  meeting: "meeting",
  event: "event",
};

type FilterTab = "all" | "friend" | "comment" | "meeting";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "friend", label: "친구" },
  { key: "comment", label: "댓글·좋아요" },
  { key: "meeting", label: "모임·채팅" },
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function NotificationsListScreen() {
  const navigate = useNavigate();
  const [nSettings, setNSettings] = useState(getNotificationSettings);
  const [readSet, setReadSet] = useState(() => getReadIds());
  const dynNotifications = useDynNotifications();
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() =>
    subscribeNotificationSettings(() => {
      setNSettings(getNotificationSettings());
      setReadSet(new Set(getReadIds()));
    }),
  []);

  // 동적 알림 → 공통 형식으로 매핑
  const dynItems: Notification[] = useMemo(
    () =>
      dynNotifications.map((d) => ({
        id: d.id,
        type: "friend" as const,
        title: d.title,
        body: d.body,
        time: d.time,
        ageMs: Date.now() - d.createdAt,
        read: d.read,
        link: d.link,
        dynamic: true,
      })),
    [dynNotifications],
  );

  // 설정 + 필터 적용
  const visible: Notification[] = useMemo(() => {
    if (!nSettings.master) return [];
    const merged = [...dynItems, ...STATIC_NOTIFICATIONS]
      .filter((n) => nSettings[TYPE_TO_SETTING[n.type]])
      .filter((n) => matchFilter(n.type, filter))
      .map((n) => ({
        ...n,
        read: n.dynamic ? n.read : n.read || readSet.has(n.id),
      }));
    merged.sort((a, b) => a.ageMs - b.ageMs);
    return merged;
  }, [nSettings, dynItems, readSet, filter]);

  const unreadCount = visible.filter((n) => !n.read).length;

  // 오늘/이전 으로 그룹핑 (당근앱 스타일)
  const grouped = useMemo(() => {
    const today: Notification[] = [];
    const earlier: Notification[] = [];
    for (const n of visible) {
      if (n.ageMs < ONE_DAY_MS) today.push(n);
      else earlier.push(n);
    }
    return { today, earlier };
  }, [visible]);

  const handleItemClick = (n: Notification) => {
    if (n.dynamic) markDynRead(n.id);
    else markRead(n.id);
    navigate(n.link);
  };

  const handleMarkAllRead = () => {
    markAllRead(STATIC_NOTIFICATIONS.map((n) => n.id));
    markAllDynRead();
  };

  return (
    <main className="flex flex-1 flex-col bg-[#F8F8FA]">
      {/* 헤더 */}
      <header className="flex h-12 shrink-0 items-center justify-between bg-white px-4">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <span className="text-[17px] font-bold text-holo-ink">알림</span>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[13px] font-medium text-holo-ink-2"
            >
              모두 읽음
            </button>
          )}
          <button
            type="button"
            aria-label="알림 설정"
            onClick={() => navigate("/mypage/notifications")}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* 필터 탭 */}
      <div className="no-scrollbar shrink-0 overflow-x-auto border-b border-holo-line-3 bg-white">
        <div className="flex w-max gap-2 px-4 py-2.5">
          {FILTER_TABS.map((t) => {
            const on = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition ${
                  on
                    ? "bg-holo-ink text-white"
                    : "bg-holo-surface-2 text-holo-ink-2"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 본문 */}
      {!nSettings.master ? (
        <EmptyState
          emoji="🔕"
          title="알림이 꺼져 있어요"
          subtitle="알림설정에서 다시 켤 수 있어요"
          action={{
            label: "알림설정 이동",
            onClick: () => navigate("/mypage/notifications"),
          }}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title="아직 받은 알림이 없어요"
          subtitle="새 활동이 생기면 여기에서 알려드릴게요"
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {grouped.today.length > 0 && (
            <Section title="오늘">
              {grouped.today.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onClick={() => handleItemClick(n)}
                />
              ))}
            </Section>
          )}
          {grouped.earlier.length > 0 && (
            <Section title="이전">
              {grouped.earlier.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onClick={() => handleItemClick(n)}
                />
              ))}
            </Section>
          )}
          <p className="py-6 text-center text-[12px] text-holo-ink-4">
            지난 30일간의 알림만 보여드려요
          </p>
        </div>
      )}
    </main>
  );
}

function matchFilter(type: NotifType, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "friend") return type === "friend";
  if (filter === "comment") return type === "comment" || type === "like";
  if (filter === "meeting")
    return type === "meeting" || type === "chat" || type === "event";
  return true;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-2 bg-white">
      <p className="px-4 pt-3 pb-2 text-[12px] font-semibold text-holo-ink-3">
        {title}
      </p>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

function NotificationRow({
  n,
  onClick,
}: {
  n: Notification;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition active:bg-holo-surface-2 ${
          n.read ? "" : "bg-holo-lilac-card-2/40"
        }`}
      >
        <NotifIcon type={n.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-holo-purple-mid">
              {n.title}
            </span>
            <span className="text-[11px] text-holo-ink-4">· {n.time}</span>
            {!n.read && (
              <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-holo-purple-mid" />
            )}
          </div>
          <p className="text-[14px] leading-[1.4] text-holo-ink line-clamp-2">
            {n.body}
          </p>
        </div>
      </button>
    </li>
  );
}

function NotifIcon({ type }: { type: NotifType }) {
  const bg: Record<NotifType, string> = {
    comment: "#E5DCF7",
    like: "#FFD7E1",
    friend: "#FCE7C8",
    chat: "#D9EAFF",
    meeting: "#D4F5D8",
    event: "#FFF1C2",
  };
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[18px]"
      style={{ backgroundColor: bg[type] }}
    >
      {type === "comment" && "💬"}
      {type === "like" && "❤️"}
      {type === "friend" && "🤝"}
      {type === "chat" && "📩"}
      {type === "meeting" && "👥"}
      {type === "event" && "🎉"}
    </span>
  );
}

function EmptyState({
  emoji,
  title,
  subtitle,
  action,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="text-[40px]">{emoji}</span>
      <p className="text-[15px] font-semibold text-holo-ink">{title}</p>
      <p className="text-[13px] text-holo-ink-3">{subtitle}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 rounded-full bg-holo-purple-mid px-4 py-2 text-[13px] font-semibold text-white"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
