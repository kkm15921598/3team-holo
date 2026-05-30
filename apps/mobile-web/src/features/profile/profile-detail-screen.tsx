import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { type ChatRoom } from "@/shared/mock/data";
import { BADGES as BADGE_LIB } from "@/badge";
import { getAvatarUrl } from "@/features/chat/avatars";
import { addRoom, getRooms } from "@/features/chat/rooms-store";
import { dmRoomIdFor, lookupPhoneByNickname } from "@/features/chat/dm-utils";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import {
  acceptFriendRequest,
  blockFriendById,
  cancelFriendRequest,
  declineFriendRequest,
  getFriends,
  removeFriendByNickname,
  sendFriendRequest,
  useFriends,
  useReceivedRequests,
  useSentRequests,
} from "@/features/mypage/friends-store";
import { awardXp } from "@/shared/stores/xp-store";
import { RoomSceneView } from "@/features/home/home-illustrations";
import { type PlacedFurniture } from "@/features/myroom/myroom-data";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { markReported } from "@/shared/stores/reported-users-store";
import { markBlocked } from "@/shared/stores/blocked-nicknames-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { getEquippedBadgeSrc, isMyNickname } from "@/shared/stores/profile-store";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import { useMyroomItems } from "@/features/myroom/myroom-store";
import { ME_PERSONA } from "@/features/home/home-faces";
import { postsStore } from "@/features/board/posts-store";
import { isMyPost } from "@/features/board/author-identity";
import { useUserComments } from "@/shared/stores/comments-store";
import { useActivityState } from "@/shared/stores/activity-store";
import { supabase } from "@/shared/lib/supabaseClient";

/** URL 파라미터 안전 디코드 — 잘못된 % 인코딩이면 throw 대신 원문/폴백을 돌려준다. */
function safeDecodeParam(s: string | undefined, fallback: string): string {
  if (!s) return fallback;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

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
  levelOverride?: number,
  titleOverride?: string,
) {
  const h = hashString(nickname);
  // 칭호/뱃지는 실제 값을 우선 사용. 없으면 가짜(해시 임의 배정) 대신 기본값으로 — 이전엔
  // 닉네임 해시로 임의 칭호/뱃지를 배정해 "내가 모르는 칭호"가 친구 프로필에 떠 혼란을 줬다.
  const title = titleOverride || "#홀로_입주자";
  const badge = BADGE_LIB.find((b) => b.id === "badge_24") ?? BADGE_LIB[0];
  return {
    nickname,
    level: levelOverride ?? (1 + (h % 30)),
    title,
    badgeId: badge?.id ?? "badge_24",
    badgeSrc: badge?.src,
    badgeName: badge?.name ?? "",
    postsCount,
    commentsCount,
    // 타인의 실제 접속일수는 추적 불가 → 가짜 숫자 대신 0(화면에선 "-" 로 표시).
    daysActive: 0,
  };
}

export function ProfileDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // 잘못된 % 인코딩(예: %ZZ)이 든 URL 이면 decodeURIComponent 가 throw 해 화면이 통째로
  // 깨진다(앱 내부 링크는 안전하나 외부 공유/직접 입력 딥링크 대비). 실패 시 원문 사용.
  const nickname = safeDecodeParam(id, "샬랄라 움밤바");

  // 내 프로필 데이터 (실제 store) — isMe 분기에서 가짜 buildOtherUser 대신 사용.
  const myProfile = useProfile();
  const myStats = useAccountStats();
  const myroomItems = useMyroomItems();
  const userComments = useUserComments();
  // 접속일수 — activity-store 의 activeDates.length 를 단일 진실 소스로 사용.
  // 내 활동 화면(activity-screen) 과 항상 같은 값이 노출된다.
  const myActivity = useActivityState();
  // URL 닉네임이 현재 닉네임이거나 내가 과거에 쓰던 닉네임이면 "내 프로필 보기" 모드.
  // (닉네임 변경 전 쓴 옛 댓글의 옛 닉네임을 눌러도 내 최신 프로필로 연결되도록.)
  void myProfile.nickname; // 닉네임 변경 시 리렌더 트리거(useProfile 구독)
  const isMe = isMyNickname(nickname);

  // 내 게시글/댓글 수 — 실제 활동 데이터에서 집계.
  // (페이지 진입 시점의 스냅샷 — 페이지가 짧게 노출되는 화면이라 라이브 갱신 불필요)
  const myPostsCount = useMemo(
    () => postsStore.getPosts().filter((p) => isMyPost(p)).length,
    [myProfile.nickname],
  );
  // '댓글 단 고유 글 수' — 클릭해 들어가는 '내가 쓴 댓글' 리스트(postId 중복 제거)와 단위 통일.
  // (이전엔 userComments.length = 댓글 레코드 수라, 한 글에 3개 달면 프로필 3 / 리스트 1 로 어긋남)
  const myCommentsCount = new Set(userComments.map((c) => c.postId)).size;

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
  // 댓글 카운트: Supabase comments 테이블에서 해당 닉네임의 댓글 수 조회
  const [otherCommentsCount, setOtherCommentsCount] = useState(0);
  useEffect(() => {
    if (isMe) return;
    let cancelled = false;
    // '댓글 단 고유 글 수' — 클릭 시 여는 친구 댓글 리스트(post_id 중복 제거)와 단위 통일.
    // (이전엔 레코드 수라, 한 글에 여러 댓글 단 친구는 stat > 리스트 항목수로 어긋남)
    supabase
      .from("comments")
      .select("post_id")
      .eq("nickname", nickname)
      .then(({ data }) => {
        // 빠르게 다른 화면으로 이동하면 언마운트 후 setState 가 호출돼 경고/누수 — 가드.
        if (cancelled || !data) return;
        setOtherCommentsCount(new Set(data.map((r) => String(r.post_id))).size);
      });
    return () => {
      cancelled = true;
    };
  }, [nickname, isMe]);

  // 친구 프로필 레벨 — Supabase에서 실제 값을 조회. 로딩 중엔 해시 기반 임시값 사용.
  const [otherLevel, setOtherLevel] = useState<number | undefined>(undefined);
  const [otherTitle, setOtherTitle] = useState<string | undefined>(undefined);
  // 친구의 실제 마이룸 가구 배치 — undefined=로딩/미상, []=빈 방. 가짜 랜덤룸을 쓰지 않는다.
  const [otherFurniture, setOtherFurniture] = useState<PlacedFurniture[] | undefined>(
    undefined,
  );
  useEffect(() => {
    if (isMe) return;
    let cancelled = false;
    setOtherLevel(undefined); // 닉네임 변경 시 초기화
    setOtherTitle(undefined);
    setOtherFurniture(undefined);
    supabase
      .from("users")
      .select("level, title, placed_furniture")
      .eq("nickname", nickname)
      .maybeSingle()
      .then(({ data }) => {
        // 언마운트/닉네임 변경 후 늦게 도착한 응답이 새 상태를 덮어쓰지 않도록 가드.
        if (cancelled) return;
        if (data?.level != null) setOtherLevel(data.level as number);
        if (data?.title) setOtherTitle(data.title as string);
        // 실제 배치 가구가 있으면 그대로, 없으면 빈 방([]). 닉네임 해시 랜덤룸은 쓰지 않는다.
        setOtherFurniture(
          Array.isArray(data?.placed_furniture)
            ? (data!.placed_furniture as PlacedFurniture[])
            : [],
        );
      });
    return () => {
      cancelled = true;
    };
  }, [nickname, isMe]);

  const otherUser = useMemo(
    () => buildOtherUser(nickname, otherPostsCount, otherCommentsCount, otherLevel, otherTitle),
    [nickname, otherPostsCount, otherCommentsCount, otherLevel, otherTitle],
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

  // 내 프로필이면 실제 마이룸 가구, 친구면 Supabase 에서 조회한 실제 배치 가구.
  // (이전엔 닉네임 해시 기반 랜덤룸으로 "그 사람 방"을 지어냈다 — 실제 가구가 아니었음.)
  // 친구가 아직 방을 안 꾸몄거나 로딩 중이면 빈 방을 보여준다(가짜 가구 노출 금지).
  const roomItems = isMe ? myroomItems : otherFurniture ?? [];

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
        // 결과를 받아 실패(정원 초과/자기 자신)면 안내 — 이전엔 무조건 닫아서
        // 정원이 차도 아무 반응 없이 '왜 안 되지?' 하고 반복 클릭하게 됐다.
        const result = sendFriendRequest(nickname);
        if (result === "max-reached") {
          setConfirm({
            message: "친구 정원이 가득 찼어요.",
            description: "최대 30명까지 추가할 수 있어요.",
            confirmLabel: "확인",
            singleAction: true,
            onConfirm: () => setConfirm(null),
          });
        } else if (result === "self") {
          setConfirm({
            message: "자기 자신에게는 친구 요청을 보낼 수 없어요.",
            confirmLabel: "확인",
            singleAction: true,
            onConfirm: () => setConfirm(null),
          });
        } else {
          setConfirm(null);
        }
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
        // 친구였던 사람이면 친구 목록(_friends)에서 제거하고 차단 목록(_blocked)으로 이동
        // (friends-screen 의 차단 동작과 일관되게 — 이전엔 닉네임 set 만 갱신해 차단한 친구가
        //  '내 친구' 목록에 그대로 남고 친구 수도 안 줄었다).
        const f = getFriends().find((x) => x.nickname === nickname);
        if (f) blockFriendById(f.id);
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

  const goToChat = async () => {
    const existing = getRooms().find(
      (r) => !r.isGroup && r.name === nickname,
    );

    if (existing) {
      navigate(`/chat/${existing.id}`);
      return;
    }

    // 두 사용자가 같은 room_id 를 공유하도록 phone 기반 결정론적 ID 사용.
    // 친구의 phone 조회 실패 시(미가입자 등) 기존 방식으로 폴백.
    const myPhone = getCurrentAccount();
    const friendPhone = await lookupPhoneByNickname(nickname);
    const newId =
      myPhone && friendPhone
        ? dmRoomIdFor(myPhone, friendPhone)
        : `dm-${Date.now()}`;

    // 결정론적 ID 라 이미 만든 방이 있을 수 있음 — 중복 추가 방지
    const dup = getRooms().find((r) => r.id === newId);
    if (dup) {
      navigate(`/chat/${newId}`);
      return;
    }

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

        {/* 방명록 — 이웃 방에 도장+한 줄 남기기. 내 프로필에선 받은 방명록 보기. */}
        <button
          type="button"
          onClick={() =>
            navigate(`/profile/${encodeURIComponent(nickname)}/guestbook`)
          }
          className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-holo-pill bg-white/70 px-2.5 py-1 text-[12px] font-medium text-holo-ink-2 backdrop-blur active:opacity-70"
        >
          <GuestbookIcon /> 방명록
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
          {/* 접속일수는 내 활동 store(activeDates)로만 정확히 알 수 있다. 타인의 실제 접속일수는
              추적 불가라, 이전처럼 닉네임 해시로 가짜 숫자(1~60)를 보여주면 "2주 된 앱인데 41일"
              같은 모순이 생긴다. 친구 프로필에선 정직하게 "-" 로 표시. */}
          <Stat label="접속일수" value={isMe ? user.daysActive : "-"} />
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
  value: number | string;
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

function GuestbookIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
