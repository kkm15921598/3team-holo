import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type ChatRoom } from "@/shared/mock/data";
import { getAvatarUrl } from "@/features/chat/avatars";
import { addRoom, getRooms } from "@/features/chat/rooms-store";
import {
  addFriendByNickname,
  removeFriendByNickname,
  useFriends,
} from "@/features/mypage/friends-store";
import { RoomSceneView, randomRoomFurniture } from "@/features/home/home-illustrations";
import { ConfirmModal } from "@/shared/components/confirm-modal";

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

  const friends = useFriends();
  const isFriend = useMemo(
    () => friends.some((f) => f.nickname === nickname),
    [friends, nickname],
  );

  const friendRoom = useMemo(
    () => randomRoomFurniture(nickname, user.level),
    [nickname, user.level],
  );

  const [confirm, setConfirm] = useState<{
    message: ReactNode;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const askAddFriend = () =>
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님을 친구로 추가하시겠습니까?
        </>
      ),
      confirmLabel: "추가",
      onConfirm: () => {
        addFriendByNickname(nickname);
        setConfirm(null);
      },
    });

  const askRemoveFriend = () =>
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님을 친구 목록에서 삭제하시겠습니까?
        </>
      ),
      confirmLabel: "삭제",
      onConfirm: () => {
        removeFriendByNickname(nickname);
        setConfirm(null);
      },
    });

  const handleFriendButton = () => {
    if (isFriend) {
      askRemoveFriend();
      return;
    }

    askAddFriend();
  };

  const askBlock = () =>
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님을 차단하시겠습니까?
          <br />
          <span className="text-[13px] font-normal text-holo-ink-2">
            차단하면 더 이상 게시글·메시지를 받을 수 없어요.
          </span>
        </>
      ),
      onConfirm: () => {
        setConfirm(null);
        // TODO: 실제 차단 처리 — 모의 데이터에서는 별도 동작 없음
        navigate(-1);
      },
    });

  const askReport = () =>
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님을 신고하시겠습니까?
          <br />
          <span className="text-[13px] font-normal text-holo-ink-2">
            운영팀에서 검토 후 조치해드려요.
          </span>
        </>
      ),
      onConfirm: () => {
        setConfirm(null);
        // TODO: 실제 신고 처리
        navigate(-1);
      },
    });

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
    <main className="no-scrollbar relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
      <section className="relative rounded-b-[40px] bg-holo-hero pb-12">
        <button
          type="button"
          aria-label="닫기"
          onClick={() => navigate(-1)}
          className="absolute right-4 top-4 z-10 text-holo-ink"
        >
          <CloseIcon />
        </button>

        <div className="flex h-[340px] w-full items-start justify-center pt-[10px]">
          <RoomSceneView items={friendRoom} />
        </div>
      </section>

      <section className="absolute left-0 right-0 top-[306px] z-20 flex flex-col items-center px-4">
        <img
          src={getAvatarUrl(user.nickname)}
          alt=""
          className="h-[88px] w-[88px] rounded-full border-4 border-white bg-holo-yellow-room object-cover"
        />

        <span className="mt-3 rounded-[4px] bg-holo-gradient-soft px-2 py-0.5 text-[12px] font-semibold text-white">
          Lv.{user.level}
        </span>

        <p className="mt-2 text-[20px] font-semibold text-holo-ink">
          {user.nickname}
        </p>

        <p className="mt-1 text-[14px] text-holo-ink-2">
          {user.title} <span>{user.badgeIcon}</span>
        </p>

        <div className="mt-6 flex w-full items-center">
          <Stat label="게시글" value={user.postsCount} />
          <span className="h-8 w-px bg-holo-line" />
          <Stat label="댓글" value={user.commentsCount} />
          <span className="h-8 w-px bg-holo-line" />
          <Stat label="접속일수" value={user.daysActive} />
        </div>

        <div className="mt-7 flex w-full gap-2">
          <button
            type="button"
            onClick={handleFriendButton}
            className={`flex h-[50px] flex-1 items-center justify-center gap-2 rounded-holo-pill text-[15px] font-semibold text-white ${
              isFriend ? "bg-[#E95AA4]" : "bg-holo-purple-mid"
            }`}
          >
            {isFriend ? <UserMinusIcon /> : <UserPlusIcon />}
            {isFriend ? "친구 삭제" : "친구추가"}
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

        <div className="mt-6 flex w-full items-center justify-around pb-5 text-[14px] text-holo-ink-3">
          <button
            type="button"
            className="flex items-center gap-1"
            onClick={askBlock}
          >
            <BlockIcon /> 차단하기
          </button>

          <button
            type="button"
            className="flex items-center gap-1"
            onClick={askReport}
          >
            <FlagIcon /> 신고하기
          </button>
        </div>
      </section>

      <ConfirmModal
        open={confirm !== null}
        message={confirm?.message ?? null}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="text-[12px] text-holo-ink-2">{label}</span>
      <span className="mt-1 text-[20px] font-black text-holo-purple-mid">
        {value}
      </span>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.6-7 7-7s7 3 7 7" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

function UserMinusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.6-7 7-7s7 3 7 7" />
      <path d="M16 11h6" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 21V4l14 4-7 3 7 4z" />
    </svg>
  );
}
