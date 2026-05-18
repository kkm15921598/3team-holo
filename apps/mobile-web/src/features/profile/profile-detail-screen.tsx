import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { type ChatRoom, TITLES_META, POST_COMMENTS } from "@/shared/mock/data";
import { BADGES as BADGE_LIB } from "@/badge";
import { getAvatarUrl } from "@/features/chat/avatars";
import { addRoom, getRooms } from "@/features/chat/rooms-store";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriendByNickname,
  sendFriendRequest,
  useFriends,
  useReceivedRequests,
  useSentRequests,
} from "@/features/mypage/friends-store";
import { awardXp } from "@/shared/stores/xp-store";
import { RoomSceneView, randomRoomFurniture } from "@/features/home/home-illustrations";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { markReported } from "@/shared/stores/reported-users-store";
import { markBlocked } from "@/shared/stores/blocked-nicknames-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { getEquippedBadgeSrc } from "@/shared/stores/profile-store";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import { useMyroomItems } from "@/features/myroom/myroom-store";
import { ME_PERSONA } from "@/features/home/home-faces";
import { postsStore } from "@/features/board/posts-store";
import { useUserComments } from "@/shared/stores/comments-store";
import { useActivityState } from "@/shared/stores/activity-store";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * 다른 사용자 프로필 — 닉네임 해시로 결정론적으로 빌드.
 * 칭호는 실제 TITLES_META 풀(가입 칭호 제외, 41 중 일반·희귀·전설)에서 선택,
 * 뱃지는 BADGE_LIB(26종 전체) 에서 선택하여 마이페이지의 뱃지·칭호 시스템과 일관성 확보.
 *
 * 게시글/댓글 카운트는 실제 데이터(postsCount, commentsCount)를 인자로 받아
 * Stat 클릭 시 보이는 리스트 길이와 정확히 일치하도록 한다.
 */
function buildOtherUser(
  nickname: string,
  postsCount: number,
  commentsCount: number,
) {
  const h = hashString(nickname);
  // starter(가입 칭호)는 모두가 가진 거라 다른 사용자 프로필에 노출하긴 어색 → 제외
  const TITLE_POOL = TITLES_META.filter((t) => t.tier !== "starter");
  const title = TITLE_POOL[h % TITLE_POOL.length]?.name ?? "#홀로_입주자";
  const badge = BADGE_LIB[(h >>> 3) % BADGE_LIB.length];
  return {
    nickname,
    level: 1 + (h % 30),
    title,
    badgeId: badge?.id ?? "badge_24",
    badgeSrc: badge?.src,
    badgeName: badge?.name ?? "",
    postsCount,
    commentsCount,
    daysActive: 1 + ((h >>> 5) % 60),
  };
}

export function ProfileDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const nickname = id ? decodeURIComponent(id) : "샬랄라 움밤바";

  // 내 프로필 데이터 (실제 store) — isMe 분기에서 가짜 buildOtherUser 대신 사용.
  const myProfile = useProfile();
  const myStats = useAccountStats();
  const myroomItems = useMyroomItems();
  const userComments = useUserComments();
  // 접속일수 — activity-store 의 activeDates.length 를 단일 진실 소스로 사용.
  // 내 활동 화면(activity-screen) 과 항상 같은 값이 노출된다.
  const myActivity = useActivityState();
  // URL 닉네임이 현재 로그인 계정의 닉네임과 같으면 "내 프로필 보기" 모드.
  const isMe = nickname === myProfile.nickname;

  // 내 게시글/댓글 수 — 실제 활동 데이터에서 집계.
  // (페이지 진입 시점의 스냅샷 — 페이지가 짧게 노출되는 화면이라 라이브 갱신 불필요)
  const myPostsCount = useMemo(
    () =>
      postsStore
        .getPosts()
        .filter((p) => p.authorNickname === myProfile.nickname).length,
    [myProfile.nickname],
  );
  const myCommentsCount = userComments.length;

  // 내 프로필 표시용 user 객체 — buildOtherUser 와 동일한 shape 로 만들어 렌더 분기를 줄임.
  const meUser = useMemo(() => {
    const equippedBadge = BADGE_LIB.find(
      (b) => b.id === myProfile.equippedBadgeId,
    );
    return {
      nickname: myProfile.nickname,
      level: myStats.level,
      title: myProfile.title,
      badgeId: equippedBadge?.id ?? "",
      badgeSrc: equippedBadge?.src ?? getEquippedBadgeSrc() ?? undefined,
      badgeName: equippedBadge?.name ?? "",
      postsCount: myPostsCount,
      commentsCount: myCommentsCount,
      // 접속일수 — activity-store 의 누적 활동 일수. 내 활동 화면과 일치하도록 동일 소스 사용.
      daysActive: Math.max(1, myActivity.activeDates.length),
    };
  }, [
    myProfile.nickname,
    myProfile.title,
    myProfile.equippedBadgeId,
    myStats.level,
    myPostsCount,
    myCommentsCount,
    myActivity.activeDates.length,
  ]);

  // 친구(다른 사용자) 게시글·댓글 카운트 — Stat 클릭 시 리스트와 동일한 집계 로직.
  // postsStore 변경(새 글 등록 등) 시에도 갱신되도록 구독.
  const [postsTick, setPostsTick] = useState(0);
  useEffect(() => {
    return postsStore.subscribe(() => setPostsTick((t) => t + 1));
  }, []);
  const otherPostsCount = useMemo(() => {
    void postsTick;
    return postsStore.getPosts().filter((p) => p.authorNickname === nickname)
      .length;
  }, [nickname, postsTick]);
  const otherCommentsCount = useMemo(() => {
    // friend-comments-screen 과 동일한 집계: POST_COMMENTS 에서 그 닉네임이 댓글을 단 unique 게시글 수
    const postIds = new Set<string>();
    for (const [postId, comments] of Object.entries(POST_COMMENTS)) {
      if (comments.some((c) => c.nickname === nickname)) {
        postIds.add(postId);
      }
    }
    return postIds.size;
  }, [nickname]);

  const otherUser = useMemo(
    () => buildOtherUser(nickname, otherPostsCount, otherCommentsCount),
    [nickname, otherPostsCount, otherCommentsCount],
  );
  const user = isMe ? meUser : otherUser;

  const friends = useFriends();
  const sentRequests = useSentRequests();
  const receivedRequests = useReceivedRequests();

  const isFriend = useMemo(
    () => friends.some((f) => f.nickname === nickname),
    [friends, nickname],
  );
  const sentRequest = useMemo(
    () => sentRequests.find((r) => r.nickname === nickname) ?? null,
    [sentRequests, nickname],
  );
  const receivedRequest = useMemo(
    () => receivedRequests.find((r) => r.nickname === nickname) ?? null,
    [receivedRequests, nickname],
  );

  /** 친구 버튼 상태 — 친구 / 보낸 요청 / 받은 요청 / 없음 */
  type FriendButtonState = "friend" | "sent" | "received" | "none";
  const buttonState: FriendButtonState = isFriend
    ? "friend"
    : sentRequest
      ? "sent"
      : receivedRequest
        ? "received"
        : "none";

  const otherRoom = useMemo(
    () => randomRoomFurniture(nickname, user.level),
    [nickname, user.level],
  );
  // 내 프로필이면 실제 마이룸 가구 배치를 보여주고, 그 외엔 닉네임 해시 기반 랜덤룸.
  const roomItems = isMe ? myroomItems : otherRoom;

  const [confirm, setConfirm] = useState<{
    message: ReactNode;
    description?: ReactNode;
    confirmLabel?: string;
    /** true 면 단일 "확인" 버튼만 노출 (안내 다이얼로그) */
    singleAction?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const askSendRequest = () =>
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님에게 친구 요청을 보낼까요?
        </>
      ),
      confirmLabel: "요청 보내기",
      onConfirm: () => {
        sendFriendRequest(nickname);
        setConfirm(null);
      },
    });

  const askCancelRequest = () => {
    if (!sentRequest) return;
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님에게 보낸 친구 요청을 취소할까요?
        </>
      ),
      confirmLabel: "요청 취소",
      onConfirm: () => {
        cancelFriendRequest(sentRequest.id);
        setConfirm(null);
      },
    });
  };

  const handleAcceptRequest = () => {
    if (!receivedRequest) return;
    const result = acceptFriendRequest(receivedRequest.id);
    if (result.ok) {
      awardXp("friend");
    } else if (result.reason === "max-reached") {
      setConfirm({
        message: "친구 정원이 가득 찼어요.",
        description: "최대 30명까지 추가할 수 있어요.",
        confirmLabel: "확인",
        singleAction: true,
        onConfirm: () => setConfirm(null),
      });
    }
  };

  const handleDeclineRequest = () => {
    if (!receivedRequest) return;
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님의 친구 요청을 거절할까요?
        </>
      ),
      confirmLabel: "거절",
      onConfirm: () => {
        declineFriendRequest(receivedRequest.id);
        setConfirm(null);
      },
    });
  };

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
    if (buttonState === "friend") {
      askRemoveFriend();
      return;
    }
    if (buttonState === "sent") {
      askCancelRequest();
      return;
    }
    if (buttonState === "received") {
      handleAcceptRequest();
      return;
    }
    askSendRequest();
  };

  const askBlock = () =>
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님을 차단하시겠습니까?
        </>
      ),
      description: "차단하면 더 이상 게시글·메시지를 받을 수 없어요.",
      confirmLabel: "차단",
      onConfirm: () => {
        setConfirm(null);
        // 차단된 닉네임은 영속 set 에 남겨, 이웃 추천 등 노출 후보에서 제외되도록 한다.
        markBlocked(nickname);
        navigate(-1);
      },
    });

  const askReport = () =>
    setConfirm({
      message: (
        <>
          <strong>{nickname}</strong>님을 신고하시겠습니까?
        </>
      ),
      description: "운영팀에서 검토 후 조치해드려요.",
      confirmLabel: "신고",
      onConfirm: () => {
        setConfirm(null);
        // 신고된 닉네임은 영속 set 에 남겨, 이웃 추천 등 노출 후보에서 제외되도록 한다.
        markReported(nickname);
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
          <RoomSceneView items={roomItems} />
        </div>
      </section>

      <section className="absolute left-0 right-0 top-[306px] z-20 flex flex-col items-center px-4">
        <img
          src={
            isMe
              ? myProfile.profileFace ?? ME_PERSONA.face
              : getAvatarUrl(user.nickname)
          }
          alt=""
          className="h-[88px] w-[88px] rounded-full border-4 border-white bg-holo-yellow-room object-cover"
        />

        <span className="mt-3 rounded-[4px] bg-holo-gradient-soft px-2 py-0.5 text-[12px] font-semibold text-white">
          Lv.{user.level}
        </span>

        <p className="mt-2 text-[20px] font-semibold text-holo-ink">
          {user.nickname}
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-[14px] text-holo-ink-2">
          <span>{user.title}</span>
          {user.badgeSrc && (
            <img
              src={user.badgeSrc}
              alt={user.badgeName}
              className="h-5 w-5 object-contain"
            />
          )}
        </p>

        <div className="mt-6 flex w-full items-center">
          <Stat
            label="게시글"
            value={user.postsCount}
            to={
              isMe
                ? "/mypage/posts"
                : `/profile/${encodeURIComponent(nickname)}/posts`
            }
          />
          <span className="h-8 w-px bg-holo-line" />
          <Stat
            label="댓글"
            value={user.commentsCount}
            to={
              isMe
                ? "/mypage/comments"
                : `/profile/${encodeURIComponent(nickname)}/comments`
            }
          />
          <span className="h-8 w-px bg-holo-line" />
          <Stat label="접속일수" value={user.daysActive} />
        </div>

        <div className="mt-7 flex w-full gap-2">
          {isMe ? (
            // 내 프로필 모드 — 친구/채팅 버튼 자리에 "프로필 편집" 단독 버튼만 노출
            <button
              type="button"
              onClick={() => navigate("/mypage/edit")}
              className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-holo-pill bg-holo-purple-mid text-[15px] font-semibold text-white"
            >
              프로필 편집
            </button>
          ) : buttonState === "received" ? (
            <div className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={handleFriendButton}
                className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-holo-pill bg-holo-purple-mid text-[15px] font-semibold text-white"
              >
                <UserPlusIcon /> 요청 수락
              </button>
              <button
                type="button"
                onClick={handleDeclineRequest}
                aria-label="요청 거절"
                className="flex h-[50px] w-[50px] items-center justify-center rounded-holo-pill border border-holo-line text-holo-ink-2"
              >
                <UserMinusIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFriendButton}
              className={`flex h-[50px] flex-1 items-center justify-center gap-2 rounded-holo-pill text-[15px] font-semibold text-white ${
                buttonState === "friend"
                  ? "bg-[#E95AA4]"
                  : buttonState === "sent"
                    ? "bg-holo-ink-4"
                    : "bg-holo-purple-mid"
              }`}
            >
              {buttonState === "friend" ? (
                <UserMinusIcon />
              ) : buttonState === "sent" ? (
                <ClockIcon />
              ) : (
                <UserPlusIcon />
              )}
              {buttonState === "friend"
                ? "친구 삭제"
                : buttonState === "sent"
                  ? "요청 보냄"
                  : "친구 요청"}
            </button>
          )}

          {!isMe && (
            <button
              type="button"
              onClick={goToChat}
              aria-label="1:1 채팅"
              className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-holo-pill border border-holo-purple-mid text-[15px] font-semibold text-holo-purple-mid"
            >
              <ChatBubbleIcon /> 1:1 채팅
            </button>
          )}
        </div>

        {/* 차단/신고 — 다른 사용자 프로필에만 표시. 내 프로필에서는 의미가 없어 숨김. */}
        {!isMe && (
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
        )}
      </section>

      <ConfirmModal
        open={confirm !== null}
        message={confirm?.message ?? null}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        singleAction={confirm?.singleAction}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </main>
  );
}

function Stat({
  label,
  value,
  to,
}: {
  label: string;
  value: number;
  to?: string;
}) {
  const inner = (
    <>
      <span className="text-[12px] text-holo-ink-2">{label}</span>
      <span className="mt-1 text-[20px] font-black text-holo-purple-mid">
        {value}
      </span>
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        className="flex flex-1 flex-col items-center active:opacity-70"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="flex flex-1 flex-col items-center">{inner}</div>
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

function ClockIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
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
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
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
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m5 5 14 14" />
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
      <path d="M4 22V4" />
      <path d="M4 4h13l-2 4 2 4H4" />
    </svg>
  );
}
