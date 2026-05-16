import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getNotificationSettings,
  subscribeNotificationSettings,
  getReadIds,
} from "@/shared/stores/notification-settings-store";
import { useDynNotifications } from "@/shared/stores/notifications-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { postsStore } from "@/features/board/posts-store";
import { useRooms } from "@/features/chat/rooms-store";
import { useJoinedSet } from "@/shared/stores/joined-store";

/**
 * 정적 mock 알림의 unread 매핑.
 * notifications-list-screen 의 buildStaticNotifications 와 정합성을 맞추기 위해,
 * 각 알림이 "현재 사용자에게 보이는지" 도 함께 판정해야 한다.
 *
 * 각 항목: id / 타입(설정 토글 매핑) / read 기본값.
 */
const STATIC_NOTIFICATION_META = [
  { id: "n1", type: "comment", read: false }, // 댓글 알림 — 내 글이 있을 때만 노출
  { id: "n2", type: "like", read: false },    // 좋아요 알림 — 내 글이 있을 때만 노출
  { id: "n4", type: "chat", read: true },     // 채팅 알림 — rooms 에 id "3" 있을 때만 노출
  { id: "n5", type: "meeting", read: true },  // 모임 알림 — joinedSet 에 "3" 있을 때만 노출
  { id: "n6", type: "event", read: true },    // 이벤트 알림 — 항상 노출
] as const;

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
  const profile = useProfile();
  const rooms = useRooms();
  const joinedSet = useJoinedSet();

  // postsStore 변동(새 글 등록) 반영
  const [posts, setPosts] = useState(postsStore.getPosts);
  useEffect(() => {
    return postsStore.subscribe(() => setPosts(postsStore.getPosts()));
  }, []);

  useEffect(() =>
    subscribeNotificationSettings(() => {
      setNSettings(getNotificationSettings());
      setReadIds(new Set(getReadIds()));
    }),
  []);

  // 현재 사용자 상태 기반으로 "보이는 정적 알림"만 추려서 unread 카운트.
  const hasMyPost = useMemo(
    () => posts.some((p) => p.authorNickname === profile.nickname),
    [posts, profile.nickname],
  );
  const hasChatRoom3 = useMemo(() => rooms.some((r) => r.id === "3"), [rooms]);
  const hasJoinedPost3 = useMemo(() => joinedSet.has("3"), [joinedSet]);

  const isVisible = (id: string): boolean => {
    if (id === "n1" || id === "n2") return hasMyPost;
    if (id === "n4") return hasChatRoom3;
    if (id === "n5") return hasJoinedPost3;
    return true; // n6 등은 항상 표시
  };

  const staticUnread = !nSettings.master
    ? 0
    : STATIC_NOTIFICATION_META.reduce((sum, n) => {
        if (!isVisible(n.id)) return sum;
        if (!nSettings[n.type as keyof typeof nSettings]) return sum;
        const isRead = n.read || readIds.has(n.id);
        return sum + (isRead ? 0 : 1);
      }, 0);

  // 동적 알림은 kind 별로 다른 설정 토글에 매핑된다.
  const dynUnread = !nSettings.master
    ? 0
    : dynNotifications.filter((d) => {
        if (d.read) return false;
        const settingKey: keyof typeof nSettings =
          d.kind === "friend-received" || d.kind === "friend-accepted"
            ? "friend"
            : "event";
        return nSettings[settingKey];
      }).length;

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
