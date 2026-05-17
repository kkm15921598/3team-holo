import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { POST_COMMENTS, type Post } from "@/shared/mock/data";
import { postsStore } from "./posts-store";
import { StatusBadge } from "./board-list-screen";
import { LocationMap } from "@/features/map/post-map";
import { getAvatarUrl } from "@/features/chat/avatars";
import { ME_PERSONA } from "@/features/home/home-faces";
import { useProfile } from "@/shared/hooks/use-profile";
import { calcJoined, ensureMeetupRoom, isMeetupPost } from "./meetup-utils";
import { togglePostLike, useLikedSet } from "@/shared/stores/likes-store";
import { joinPost, useJoinedSet } from "@/shared/stores/joined-store";
import { addComment, useUserComments } from "@/shared/stores/comments-store";
import { markPostViewed } from "@/shared/stores/viewed-posts-store";
import {
  getTotalViews,
  incrementViewCount,
  useViewCounts,
} from "@/shared/stores/view-count-store";
import { awardXp } from "@/shared/stores/xp-store";
import { pushMeetingJoined } from "@/shared/stores/notifications-store";
import { tryDailyEarn } from "@/features/myroom/myroom-store";

type CommentReply = {
  id: string;
  nickname: string;
  content: string;
  timeAgo: string;
  isAuthor?: boolean;
  hasMap?: boolean;
  hasPhoto?: boolean;
};

type CommentThread = {
  id: string;
  nickname: string;
  content: string;
  timeAgo: string;
  replies: CommentReply[];
};

// 자유 / 추천 게시판이라도 모임 메타데이터가 붙어 있으면 모임 레이아웃을 사용한다.
// 판정 규칙은 meetup-utils 의 isMeetupPost 와 동일 — 채팅방 생성 정책과 일치시킨다.

/**
 * "방금 전" / "10분 전" / "3시간 전" / "2일 전" / "1주 전" 같은 timeAgo 를
 * 현재 시각 기준으로 역산해 작성일 Date 로 변환.
 */
function parseTimeAgoToDate(timeAgo: string): Date {
  const now = new Date();
  if (!timeAgo || /방금/.test(timeAgo)) return now;
  const m = timeAgo.match(/(\d+)\s*(분|시간|일|주)/);
  if (!m) return now;
  const n = Number(m[1]);
  const out = new Date(now);
  switch (m[2]) {
    case "분":
      out.setMinutes(out.getMinutes() - n);
      break;
    case "시간":
      out.setHours(out.getHours() - n);
      break;
    case "일":
      out.setDate(out.getDate() - n);
      break;
    case "주":
      out.setDate(out.getDate() - n * 7);
      break;
  }
  return out;
}

/** YYYY.MM.DD 형식 (게시글 작성일 노출용) */
function formatPostDate(timeAgo: string): string {
  const d = parseTimeAgoToDate(timeAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function BoardDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [posts, setPosts] = useState<Post[]>(postsStore.getPosts());
  useEffect(() => {
    return postsStore.subscribe(() => setPosts(postsStore.getPosts()));
  }, []);
  const post = posts.find((p) => p.id === id) ?? posts[0];
  const profile = useProfile();

  // Mock-only display fields not present on the Post type.
  const place = post.place ?? post.location?.placeName ?? "미금역 사거리";
  const timeText = "26.4.2  19:00";
  const { capacity, baseJoined } = calcJoined(post);

  // Interactive state — 좋아요는 likes-store 에서 영속화된 상태를 사용
  const likedSet = useLikedSet();
  const liked = likedSet.has(post.id);
  // 참여 상태는 joined-store 에서 읽는다 — localStorage 영속화 + 한 번 참여하면 풀리지 않음
  const joinedSet = useJoinedSet();
  const joining = joinedSet.has(post.id);
  const [commentText, setCommentText] = useState("");
  // POST_COMMENTS 에 등록된 글만 더미 댓글이 보이고, 그 외엔 빈 배열 — 진짜 "댓글 0" 상태.
  const initialComments = POST_COMMENTS[post.id] ?? [];
  // 사용자가 작성한 댓글/대댓글은 store 에서 가져와 mock 과 합친다.
  const userComments = useUserComments();
  const comments = useMemo<CommentThread[]>(() => {
    const parents: CommentThread[] = initialComments.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      content: c.content,
      timeAgo: c.timeAgo,
      replies: [],
    }));
    const myForThisPost = userComments.filter((c) => c.postId === post.id);
    // 사용자가 단 일반 댓글들을 뒤에 붙인다.
    for (const c of myForThisPost) {
      if (!c.parentId) {
        parents.push({
          id: c.id,
          nickname: c.nickname,
          content: c.content,
          timeAgo: c.timeAgo,
          replies: [],
        });
      }
    }
    // 대댓글들을 부모 아래로 정렬해서 붙인다.
    for (const r of myForThisPost) {
      if (!r.parentId) continue;
      const parent = parents.find((p) => p.id === r.parentId);
      if (!parent) continue;
      parent.replies.push({
        id: r.id,
        nickname: r.nickname,
        content: r.content,
        timeAgo: r.timeAgo,
        isAuthor: r.isAuthor,
        hasMap: r.hasMap,
        hasPhoto: r.hasPhoto,
      });
    }
    return parents;
    // initialComments 는 mock 상수라 매 렌더마다 새 배열일 수 있어 의존성에 넣지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userComments, post.id]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyHasPhoto, setReplyHasPhoto] = useState(false);
  const [replyHasMap, setReplyHasMap] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFullAlert, setShowFullAlert] = useState(false);
  const [showJoinBanner, setShowJoinBanner] = useState(false);
  const [showNotJoinedAlert, setShowNotJoinedAlert] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // 게시글 진입 시 "최근 본 글" 에 기록 (마이페이지 목록의 원천) + 조회수 +1.
  // React 18 StrictMode 에서는 effect 가 mount-unmount-mount 로 두 번 실행되므로
  // 이미 카운트한 post.id 는 ref 에 기록해 중복 증가를 막는다.
  const viewedOnceRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!post?.id) return;
    if (viewedOnceRef.current.has(post.id)) return;
    viewedOnceRef.current.add(post.id);
    markPostViewed(post.id);
    incrementViewCount(post.id);
  }, [post?.id]);

  // 조회수 (baseline + 사용자 증분) — 증분이 변경되면 자동 재렌더
  useViewCounts();
  const views = getTotalViews(post);

  // Close dots menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // free / recommend 인데도 모임 정보가 붙어있으면 모임 게시글로 본다.
  // 자유 / 추천이면서 모임 메타데이터도 없는 글만 단순 레이아웃.
  const isSimple = !isMeetupPost(post);
  const likes = liked ? post.likes + 1 : post.likes;
  const joined = Math.min(capacity, baseJoined + (joining ? 1 : 0));
  const displayStatus: "모집중" | "모집완료" =
    joined >= capacity ? "모집완료" : "모집중";
  // 실제 렌더링되는 댓글 + 대댓글 수 — post.comments(mock 카운트) 가 아니라
  // 화면에 보이는 항목과 일치시킨다.
  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + c.replies.length,
    0,
  );
  const hasCommentText = commentText.trim().length > 0;
  const hasReplyText = replyText.trim().length > 0;
  // "내 글" 여부는 현재 로그인 계정 닉네임(profile-store)과 비교한다.
  const isMine = post.authorNickname === profile.nickname;

  const handleSendComment = () => {
    if (!hasCommentText) return;
    addComment({
      id: `c-${Date.now()}`,
      postId: post.id,
      nickname: profile.nickname,
      content: commentText.trim(),
      timeAgo: "방금 전",
    });
    awardXp("comment");
    // 댓글 작성 보상 — 하루 최대 10회(=10P) 까지 적립
    tryDailyEarn("comment", 10, 1, {
      title: "댓글 작성",
      note: post.title,
    });
    setCommentText("");
  };

  const handleSendReply = (parentId: string) => {
    if (!hasReplyText && !replyHasPhoto && !replyHasMap) return;
    addComment({
      id: `r-${Date.now()}`,
      postId: post.id,
      parentId,
      nickname: profile.nickname,
      content: replyText.trim(),
      timeAgo: "방금 전",
      isAuthor: profile.nickname === post.authorNickname,
      hasMap: replyHasMap,
      hasPhoto: replyHasPhoto,
    });
    awardXp("comment");
    // 대댓글도 댓글로 카운트 — 같은 daily cap 공유
    tryDailyEarn("comment", 10, 1, {
      title: "댓글 작성",
      note: post.title,
    });
    // Keep replyingTo open so the user can add multiple replies in a row.
    setReplyText("");
    setReplyHasPhoto(false);
    setReplyHasMap(false);
  };

  const handleJoinClick = () => {
    // 이미 참여 중이면 더 이상 토글되지 않음 — 풀리지 않게 무시
    if (joining) return;
    // 모집 정원이 다 찼으면 안내
    if (baseJoined >= capacity) {
      setShowFullAlert(true);
      return;
    }
    joinPost(post.id);
    ensureMeetupRoom(post);
    awardXp("join");
    // 모임 참여 알림 — 알림 패널에서 그 모임으로 바로 이동할 수 있도록 한 줄 발행.
    pushMeetingJoined(post.title, post.id);
    setShowJoinBanner(true);
  };

  const handleEdit = () => {
    navigate("/board/write", {
      state: {
        postId: post.id,
        postCategory: post.category,
        title: post.title,
        content: post.description,
        meetupType: post.meetupType,
        eventDate: post.eventDate,
        peopleCount: post.peopleCount,
        place: post.place ?? place,
        postLocation: post.location ?? null,
      },
    });
  };

  const handleDelete = () => {
    postsStore.remove([post.id]);
    navigate("/board/list");
  };

  const menuItems = isMine
    ? [
        { key: "edit", label: "수정하기", Icon: EditIcon, onClick: handleEdit },
        { key: "delete", label: "삭제하기", Icon: TrashIcon, onClick: handleDelete },
      ]
    : [
        { key: "refresh", label: "새로고침", Icon: RefreshIcon, onClick: () => {} },
        { key: "report", label: "신고", Icon: ReportIcon, onClick: () => {} },
        { key: "block", label: "차단", Icon: BlockIcon, onClick: () => {} },
        { key: "share", label: "URL 공유", Icon: ShareIcon, onClick: () => {} },
      ];

  return (
    <main className="flex flex-1 flex-col">
      {showJoinBanner && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-[14px] bg-white px-3 py-2 shadow-holo-card">
          <span className="text-[20px]" aria-hidden>🎉</span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-holo-ink">
              모임이 만들어졌어요!
            </p>
            <p className="truncate text-[11px] text-holo-ink-3">
              '{post.title}' 채팅방으로 초대합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              // 배너가 어떻게든 남아있더라도 실제 참여 상태가 아니면 진입 차단
              if (!joining) {
                setShowNotJoinedAlert(true);
                return;
              }
              const roomId = ensureMeetupRoom(post);
              // 자유/추천 단순 게시글은 모임 채팅방을 만들지 않는다 — null 이면 진입 차단.
              if (!roomId) return;
              navigate(`/chat/${roomId}`);
            }}
            className="shrink-0 rounded-full border border-holo-purple-mid px-3 py-1 text-[11px] font-medium text-holo-purple-mid"
          >
            채팅방으로 이동
          </button>
          <button
            type="button"
            aria-label="배너 닫기"
            onClick={() => setShowJoinBanner(false)}
            className="text-holo-ink-3"
          >
            <XIcon />
          </button>
        </div>
      )}
      <article className="mx-4 mt-2 flex flex-1 flex-col rounded-holo-card border border-holo-lilac-soft bg-white p-4">
        {/* Author row */}
        <div className="flex items-center gap-2">
          <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          {/* 아바타 + Lv + 닉네임 영역 — 본인이 아니면 클릭 시 상대 프로필로 이동 */}
          <button
            type="button"
            disabled={isMine}
            onClick={() => {
              if (isMine) return;
              navigate(`/profile/${encodeURIComponent(post.authorNickname)}`);
            }}
            aria-label={isMine ? undefined : `${post.authorNickname} 프로필 보기`}
            className="flex items-center gap-2 disabled:cursor-default"
          >
            <img
              src={
                post.authorNickname === profile.nickname
                  ? (profile.profileFace ?? ME_PERSONA.face)
                  : getAvatarUrl(post.authorNickname)
              }
              alt={post.authorNickname}
              className="ml-1 h-9 w-9 shrink-0 rounded-full bg-holo-yellow-room object-cover"
              draggable={false}
            />
            <span className="rounded-[4px] bg-holo-gradient px-2 py-0.5 text-[11px] font-semibold text-white">
              Lv.{post.authorLevel}
            </span>
            <span className="text-[14px] font-semibold text-holo-ink">
              {post.authorNickname}
            </span>
          </button>

          <div ref={menuRef} className="relative z-[1000] ml-auto">
            <button
              type="button"
              aria-label="더보기"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((p) => !p)}
              className="text-holo-ink-3"
            >
              <DotsIcon />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-[1001] mt-1 w-[150px] overflow-hidden rounded-[12px] border border-holo-lilac-soft bg-white shadow-holo-card">
                {menuItems.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink ${
                      i > 0 ? "border-t border-holo-line" : ""
                    }`}
                  >
                    <item.Icon />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 h-px w-full bg-holo-surface-3" />

        {/* Meta row — 작성일 · 상대시간(좌) / 조회수(우 정렬) */}
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-holo-ink-3">
          <span>{formatPostDate(post.timeAgo)}</span>
          <span className="text-holo-line-2" aria-hidden>
            ·
          </span>
          <span>{post.timeAgo}</span>
          <span className="ml-auto" aria-label={`조회 ${views}`}>
            조회 {views.toLocaleString()}
          </span>
        </div>

        {/* Title row */}
        <div className="mt-2 flex items-center gap-2">
          {!isSimple && <StatusBadge status={displayStatus} />}
          <span className="text-[16px] font-semibold text-holo-ink">
            {post.title}
          </span>
        </div>

        {/* Meetup-only blocks: place/time, description, map, stats */}
        {!isSimple && (
          <>
            <div className="mt-2 flex gap-4 text-[13px]">
              <div className="flex flex-col gap-[3px] font-semibold text-holo-ink">
                <span>장소</span>
                <span>시간</span>
              </div>
              <div className="flex flex-col gap-[3px] text-holo-ink-2">
                <span>{place}</span>
                <span>{timeText}</span>
              </div>
            </div>

            <p className="mt-[15px] text-[13px] text-holo-ink-2">
              {post.description}
            </p>

            {/* 자유게시판/추천해요 외 카테고리는 항상 실제 지도를 표시한다.
                위치 데이터가 없는 경우엔 동네 기본 좌표(미금역 인근)로 폴백한다. */}
            <div className="mt-3 overflow-hidden rounded-[10px] border border-holo-line-2">
              <LocationMap
                location={
                  post.location ?? {
                    lat: 37.3504,
                    lng: 127.1094,
                    placeName: place,
                  }
                }
                className="h-[180px]"
              />
            </div>

            <div className="mt-3 flex items-center gap-[15px] text-holo-ink-2">
              <button
                type="button"
                aria-label={liked ? "좋아요 취소" : "좋아요"}
                aria-pressed={liked}
                onClick={() => togglePostLike(post.id)}
                className="flex items-center gap-1"
              >
                <HeartIcon filled={liked} />
                <span className="text-[14px] font-medium">{likes}</span>
              </button>
              <span className="flex items-center gap-1">
                <CommentIcon />
                <span className="text-[14px] font-medium">{totalComments}</span>
              </span>
              <span className="flex items-center gap-1">
                <ParticipantIcon />
                <span className="text-[14px] font-medium">
                  {joined}/{capacity}
                </span>
              </span>
              {isMine ? (
                // 내가 작성한 모임은 호스트이므로 "함께하기" 버튼 대신 호스트 표시.
                <span
                  className="ml-auto flex items-center gap-1 rounded-full border border-[#7448DD] bg-[#F4EEFF] px-4 py-1 text-[14px] font-semibold text-[#7448DD]"
                  aria-label="내가 만든 모임 (호스트)"
                >
                  <CheckMark color="#7448DD" />
                  내 모임
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={joining ? "함께하기 취소" : "함께하기"}
                  aria-pressed={joining}
                  onClick={handleJoinClick}
                  className={`ml-auto flex items-center gap-1 rounded-full border px-4 py-1 text-[14px] font-semibold transition-colors ${
                    joining
                      ? "border-[#7448DD] text-[#7448DD]"
                      : "border-holo-line-2 text-holo-ink-2"
                  }`}
                >
                  <CheckMark color={joining ? "#7448DD" : "#A8A8A8"} />
                  {joining ? "모임 참여중" : "함께하기"}
                </button>
              )}
            </div>
          </>
        )}

        {/* Simple-only: description + heart/comment stats row */}
        {isSimple && (
          <>
            <p className="mt-2 text-[13px] text-holo-ink-2">{post.description}</p>
            <div className="mt-3 flex items-center gap-[15px] text-holo-ink-2">
              <button
                type="button"
                aria-label={liked ? "좋아요 취소" : "좋아요"}
                aria-pressed={liked}
                onClick={() => togglePostLike(post.id)}
                className="flex items-center gap-1"
              >
                <HeartIcon filled={liked} />
                <span className="text-[14px] font-medium">{likes}</span>
              </button>
              <span className="flex items-center gap-1">
                <CommentIcon />
                <span className="text-[14px] font-medium">{totalComments}</span>
              </span>
            </div>
          </>
        )}

        {/* Comments — every comment is wrapped with 20px top/bottom padding and a bottom divider line.
            simple 카테고리(자유/추천)는 stats row 와 댓글 사이 간격을 16px 로 좁힌다. */}
        <div
          className={`${
            isSimple ? "mt-4" : "mt-3"
          } h-px w-full bg-holo-surface-3`}
        />

        <ul>
          {comments.map((c) => {
            const isReplying = replyingTo === c.id;
            return (
              <Fragment key={c.id}>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo((prev) => (prev === c.id ? null : c.id));
                      setReplyText("");
                      setReplyHasPhoto(false);
                      setReplyHasMap(false);
                    }}
                    className="w-full py-3 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (c.nickname === profile.nickname) return;
                          navigate(`/profile/${encodeURIComponent(c.nickname)}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            if (c.nickname === profile.nickname) return;
                            navigate(`/profile/${encodeURIComponent(c.nickname)}`);
                          }
                        }}
                        className="text-[13px] font-semibold text-holo-ink hover:underline"
                      >
                        {c.nickname}
                      </span>
                      <span className="text-[11px] text-holo-ink-3">
                        {c.timeAgo}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-holo-ink-2">
                      {c.content}
                    </p>
                  </button>

                  {/* Replies — indented with arrow + vertical line */}
                  {c.replies.map((r) => (
                    <div key={r.id} className="border-l-2 border-holo-lilac-soft pl-3 pb-3 ml-2">
                      <div className="flex items-start gap-1">
                        <ReplyArrowIcon />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              role="link"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (r.nickname === profile.nickname) return;
                                navigate(`/profile/${encodeURIComponent(r.nickname)}`);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  if (r.nickname === profile.nickname) return;
                                  navigate(`/profile/${encodeURIComponent(r.nickname)}`);
                                }
                              }}
                              className="text-[13px] font-semibold text-holo-ink hover:underline"
                            >
                              {r.nickname}
                            </span>
                            {r.isAuthor && (
                              <span className="rounded-[4px] border border-holo-purple-mid px-1.5 py-0.5 text-[10px] font-medium text-holo-purple-mid">
                                작성자
                              </span>
                            )}
                            <span className="ml-auto text-[11px] text-holo-ink-3">
                              {r.timeAgo}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] text-holo-ink-2">
                            {r.content}
                          </p>
                          {(r.hasPhoto || r.hasMap) && (
                            <div className="mt-2 flex flex-col gap-2">
                              {r.hasPhoto && (
                                <div className="h-[110px] w-full max-w-[200px] rounded-[10px] bg-holo-line-3" />
                              )}
                              {r.hasMap && (
                                <img
                                  src="/illustrations/map.png"
                                  alt="첨부 지도"
                                  className="h-[110px] w-full max-w-[200px] rounded-[10px] border border-holo-line-2 object-cover"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Inline reply input — supports photo / map attachments. */}
                  {isReplying && (
                    <div className="ml-2 border-l-2 border-holo-lilac-soft pl-3 pb-3">
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <input
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="답글 작성하기"
                            className="h-[40px] w-full rounded-full bg-holo-surface-2 px-4 pr-12 text-[13px] outline-none placeholder:text-holo-ink-3"
                          />
                          <button
                            type="button"
                            aria-label="답글 전송"
                            disabled={!hasReplyText && !replyHasPhoto && !replyHasMap}
                            onClick={() => handleSendReply(c.id)}
                            className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                              hasReplyText || replyHasPhoto || replyHasMap
                                ? "bg-[#7448DD] text-white"
                                : "bg-holo-line-3 text-holo-ink-2"
                            }`}
                          >
                            <SendIcon />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 text-[12px]">
                          <button
                            type="button"
                            onClick={() => setReplyHasPhoto((p) => !p)}
                            className={`flex items-center gap-1 ${
                              replyHasPhoto ? "text-holo-purple-mid" : "text-holo-ink-3"
                            }`}
                          >
                            <PhotoIcon /> 사진
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplyHasMap((p) => !p)}
                            className={`flex items-center gap-1 ${
                              replyHasMap ? "text-holo-purple-mid" : "text-holo-ink-3"
                            }`}
                          >
                            <PinIcon /> 지도
                          </button>
                        </div>
                        {(replyHasPhoto || replyHasMap) && (
                          <div className="flex flex-col gap-2">
                            {replyHasPhoto && (
                              <div className="h-[110px] w-full max-w-[200px] rounded-[10px] bg-holo-line-3" />
                            )}
                            {replyHasMap && (
                              <img
                                src="/illustrations/map.png"
                                alt="첨부 지도 미리보기"
                                className="h-[110px] w-full max-w-[200px] rounded-[10px] border border-holo-line-2 object-cover"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
                <div className="h-px w-full bg-holo-surface-3" />
              </Fragment>
            );
          })}
        </ul>

        {/* Main comment input */}
        <form
          className="mt-auto pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendComment();
          }}
        >
          <div className="relative">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              type="text"
              placeholder="댓글을 작성하기"
              className="h-[40px] w-full rounded-full bg-holo-surface-2 px-4 pr-12 text-[13px] outline-none placeholder:text-holo-ink-3"
            />
            <button
              type="submit"
              aria-label="전송"
              disabled={!hasCommentText}
              className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                hasCommentText ? "bg-[#7448DD] text-white" : "bg-holo-line-3 text-holo-ink-2"
              }`}
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </article>

      {/* 모집완료 alert */}
      {showFullAlert && (
        <div
          className="fixed left-1/2 top-0 z-50 flex h-[100dvh] w-full max-w-[360px] -translate-x-1/2 items-center justify-center bg-black/40 px-6"
          onClick={() => setShowFullAlert(false)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl bg-white p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] leading-relaxed text-holo-ink">
              모집 완료 된 게시글 입니다.
            </p>
            <button
              type="button"
              onClick={() => setShowFullAlert(false)}
              className="mt-4 w-full rounded-full bg-holo-purple-mid px-3 py-2 text-[13px] font-medium text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 미참여 상태에서 "채팅방으로 이동" 누른 경우 안내 */}
      {showNotJoinedAlert && (
        <div
          className="fixed left-1/2 top-0 z-50 flex h-[100dvh] w-full max-w-[360px] -translate-x-1/2 items-center justify-center bg-black/40 px-6"
          onClick={() => setShowNotJoinedAlert(false)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl bg-white p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] leading-relaxed text-holo-ink">
              모임에 참여하지 않았습니다.
            </p>
            <button
              type="button"
              onClick={() => setShowNotJoinedAlert(false)}
              className="mt-4 w-full rounded-full bg-holo-purple-mid px-3 py-2 text-[13px] font-medium text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="5" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="12" cy="19" r="1.2" />
    </svg>
  );
}
function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#FF9A9A" : "none"} stroke="#FF9A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C7BDFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
    </svg>
  );
}
function ParticipantIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#F4C952" />
      <circle cx="12" cy="9.5" r="3" fill="#FFFFFF" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function CheckMark({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11 21 3l-8 18-2-8z" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 6l12 12M6 18 18 6" />
    </svg>
  );
}
function ReplyArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-1">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h12a4 4 0 0 1 4 4v7" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3.5-7.07" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 22V4l16 6-16 6" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="m16 6-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  );
}
function PhotoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
