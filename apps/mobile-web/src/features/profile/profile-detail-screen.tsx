import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FRIENDS, type ChatRoom } from "@/shared/mock/data";
import { getAvatarUrl } from "@/features/chat/avatars";
import { addRoom, getRooms } from "@/features/chat/rooms-store";

// 닉네임 기반 안정 해시 (avatars.ts와 동일 로직)
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

const TITLE_POOL = ["#미식가", "#반찬_요정", "#집밥_나눔왕", "#동네_명사", "#골목_대장", "#수다왕"];
const BADGE_POOL = ["🍩", "🥗", "🍰", "🌟", "🎯", "🏆"];

function buildOtherUser(nickname: string) {
  const h = hashString(nickname);
  // 닉네임 기반 일관된 임의 값 (>>> 로 unsigned 보장)
  return {
    nickname,
    level: 1 + (h % 30),
    title: TITLE_POOL[h % TITLE_POOL.length],
    badgeIcon: BADGE_POOL[(h >>> 3) % BADGE_POOL.length],
    postsCount: 1 + (h % 80),
    commentsCount: 5 + ((h >>> 2) % 150),
    daysActive: 1 + ((h >>> 5) % 60),
  };
}

export function ProfileDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const nickname = id ? decodeURIComponent(id) : "샬랄라 움밤바";
  const user = useMemo(() => buildOtherUser(nickname), [nickname]);
  const isFriend = FRIENDS.some((f) => f.nickname === nickname);

  // 이 유저와의 1:1 채팅방으로 이동 (없으면 새로 생성)
  const goToChat = () => {
    const existing = getRooms().find(
      (r) => !r.isGroup && r.name === nickname,
    );
    if (existing) {
      navigate(`/chat/${existing.id}`);
      return;
    }
    const newId = `dm-${Date.now()}`;
    const newRoom: ChatRoom = {
      id: newId,
      name: nickname,
      subtitle: "1:1",
      isGroup: false,
      memberCount: 2,
      lastMessage: "(대화를 시작해보세요)",
      lastTime: "방금",
      unread: 0,
      online: false,
    };
    addRoom(newRoom);
    navigate(`/chat/${newId}`);
  };

  return (
    <main className="flex flex-1 flex-col">
      <section className="relative overflow-hidden rounded-b-[28px] bg-holo-hero pb-12">
        <button
          type="button"
          aria-label="닫기"
          onClick={() => navigate(-1)}
          className="absolute right-4 top-4 z-10 text-holo-ink"
        >
          <CloseIcon />
        </button>
        <img
          src="/illustrations/home-hero.png"
          alt=""
          className="h-[260px] w-full object-cover"
          aria-hidden
        />
      </section>

      <section className="-mt-12 flex flex-col items-center px-4">
        <img
          src={getAvatarUrl(user.nickname)}
          alt=""
          className="h-[88px] w-[88px] rounded-full border-4 border-white bg-holo-yellow-room object-cover"
        />
        <span className="mt-3 rounded-[4px] bg-holo-gradient-soft px-2 py-0.5 text-[12px] font-semibold text-white">
          Lv.{user.level}
        </span>
        <p className="mt-2 text-[20px] font-semibold text-holo-ink">{user.nickname}</p>
        <p className="mt-1 text-[14px] text-holo-ink-2">
          {user.title} <span>{user.badgeIcon}</span>
        </p>

        <div className="mt-6 flex w-full items-center justify-around">
          <Stat label="게시글" value={user.postsCount} />
          <span className="h-8 w-px bg-holo-line" />
          <Stat label="댓글" value={user.commentsCount} />
          <span className="h-8 w-px bg-holo-line" />
          <Stat label="접속일수" value={user.daysActive} />
        </div>

        <div className="mt-7 flex w-full gap-2">
          <button
            type="button"
            disabled={isFriend}
            className={`flex h-[50px] flex-1 items-center justify-center gap-2 rounded-holo-pill text-[15px] font-semibold text-white ${
              isFriend ? "bg-holo-ink-3" : "bg-holo-purple-mid"
            }`}
          >
            <UserPlusIcon /> {isFriend ? "이미 친구" : "친구추가"}
          </button>
          <button
            type="button"
            onClick={goToChat}
            aria-label="1:1 채팅"
            className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-holo-pill border border-holo-purple-mid text-[15px] font-semibold text-holo-purple-mid"
          >
            <ChatBubbleIcon /> 1:1 채팅
          </button>
        </div>

        <div className="mt-6 flex w-full items-center justify-around text-[14px] text-holo-ink-3">
          <button type="button" className="flex items-center gap-1">
            <BlockIcon /> 차단하기
          </button>
          <button type="button" className="flex items-center gap-1">
            <FlagIcon /> 신고하기
          </button>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[12px] text-holo-ink-2">{label}</span>
      <span className="mt-1 text-[20px] font-black text-holo-purple-mid">{value}</span>
    </div>
  );
}
function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.6-7 7-7s7 3 7 7" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}
function ChatBubbleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V4l14 4-7 3 7 4z" />
    </svg>
  );
}
