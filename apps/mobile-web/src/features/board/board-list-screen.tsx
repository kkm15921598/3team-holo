import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_CATEGORIES,
  CATEGORY_SHORT,
  COMMENTS,
  ME,
  POST_COMMENTS,
  type Post,
} from "@/shared/mock/data";
import { postsStore } from "./posts-store";
import { getAvatarUrl } from "@/features/chat/avatars";
import { ME_PERSONA } from "@/features/home/home-faces";
import { getProfile } from "@/shared/stores/profile-store";
import { getAuthorGender } from "@/shared/lib/author-gender";
import { useLikedSet } from "@/shared/stores/likes-store";
import { useUserComments } from "@/shared/stores/comments-store";
import { useJoinedSet } from "@/shared/stores/joined-store";
import { calcJoined } from "./meetup-utils";

// 내 게시글이면 profile-store 의 얼굴, 아니면 닉네임 해시 face
function avatarFor(nickname: string): string {
  if (nickname === ME.nickname) {
    return getProfile().profileFace ?? ME_PERSONA.face;
  }
  return getAvatarUrl(nickname);
}

/**
 * 게시글 상세에서 실제 렌더링되는 댓글 수 — board-detail 의 totalComments 와 일치시킨다.
 * mock(POST_COMMENTS / COMMENTS) + 사용자가 작성한 댓글/대댓글 합산.
 */
function buildCommentCounter(
  userCounts: Map<string, number>,
): (postId: string) => number {
  return (postId) => {
    const mockCount = (POST_COMMENTS[postId] ?? COMMENTS).length;
    return mockCount + (userCounts.get(postId) ?? 0);
  };
}

const DRAG_THRESHOLD = 4;

/**
 * "방금 전 / N분 전 / N시간 전 / N일 전" 등을 분 단위 수치로 환산.
 * 실시간 TOP 정렬에서 "최신"을 가중치로 쓰기 위함.
 */
function parseTimeAgoMinutes(timeAgo: string): number {
  if (!timeAgo) return Number.POSITIVE_INFINITY;
  if (/방금/.test(timeAgo)) return 0;
  const m = timeAgo.match(/(\d+)\s*(분|시간|일|주)/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  switch (m[2]) {
    case "분":
      return n;
    case "시간":
      return n * 60;
    case "일":
      return n * 60 * 24;
    case "주":
      return n * 60 * 24 * 7;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

const TOP_LIMIT = 10;
const WEEK_MINUTES = 60 * 24 * 7;

export function BoardListScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = (searchParams.get("q") ?? "").trim();
  const topMode = searchParams.get("top"); // "live" | "weekly" | null
  const isTopView = topMode === "live" || topMode === "weekly";
  // URL 의 ?cat=<id> 파라미터로 카테고리 진입 (board-main 카테고리 카드에서 사용)
  const catParam = searchParams.get("cat");
  const isValidCat = BOARD_CATEGORIES.some((c) => c.id === catParam);
  const genderParam = searchParams.get("gender"); // "M" | "F" | null
  const [activeCat, setActiveCat] = useState<string>(
    isValidCat ? (catParam as string) : "all",
  );
  const [posts, setPosts] = useState<Post[]>(postsStore.getPosts());
  const likedSet = useLikedSet();
  const joinedSet = useJoinedSet();
  const userComments = useUserComments();
  const getCommentCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of userComments) {
      counts.set(c.postId, (counts.get(c.postId) ?? 0) + 1);
    }
    return buildCommentCounter(counts);
  }, [userComments]);

  // URL 의 cat 파라미터가 바뀌면 (예: 다른 카테고리로 다시 진입) activeCat 동기화
  useEffect(() => {
    if (isValidCat && catParam && catParam !== activeCat) {
      setActiveCat(catParam);
    }
    // activeCat 의존성 제외 — 내부 탭 클릭으로 변경된 값은 URL 에서 되돌리지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catParam, isValidCat]);

  useEffect(() => {
    return postsStore.subscribe(() => setPosts(postsStore.getPosts()));
  }, []);

  const clearKeyword = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const clearTop = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("top");
    setSearchParams(next, { replace: true });
  };

  const tabsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!tabsRef.current) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: tabsRef.current.scrollLeft,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || !tabsRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      dragRef.current.moved = true;
      tabsRef.current.scrollLeft = dragRef.current.startScroll - dx;
    }
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const handleTabClick = (catId: string) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setActiveCat(catId);
  };

  const visible = useMemo(() => {
    // ── 실시간 TOP / 주간 TOP 모드 ─────────────────────────────
    // 카테고리 탭/검색 키워드는 무시하고 전체 글에서 정렬·상위 N개만 노출
    if (topMode === "live") {
      // 최근성 가중치 + 좋아요/댓글 합산으로 "지금 뜨거운" 글 산정
      return [...posts]
        .map((p) => {
          const minutes = parseTimeAgoMinutes(p.timeAgo);
          // 최근일수록 큰 가중치 (24시간 이상은 1)
          const recency = minutes <= 60 * 24 ? 60 * 24 - minutes : 1;
          const score = p.likes * 4 + p.comments * 3 + recency * 0.05;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_LIMIT)
        .map((x) => x.p);
    }
    if (topMode === "weekly") {
      // 최근 7일 이내 글 중 좋아요+댓글이 많은 순서
      return [...posts]
        .filter((p) => parseTimeAgoMinutes(p.timeAgo) <= WEEK_MINUTES)
        .sort((a, b) => b.likes + b.comments - (a.likes + a.comments))
        .slice(0, TOP_LIMIT);
    }

    // ── 기본 모드 (카테고리 / 검색) ─────────────────────────
    let list = activeCat === "all" ? posts : posts.filter((p) => p.category === activeCat);
    if (keyword) {
      const lq = keyword.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(lq) ||
          p.description.toLowerCase().includes(lq) ||
          p.authorNickname.toLowerCase().includes(lq),
      );
    }
    // 성별 필터 — 검색 화면에서 "남자"/"여자" 만 단일 선택된 경우 URL ?gender=M|F 로 전달됨
    if (genderParam === "M" || genderParam === "F") {
      list = list.filter((p) => getAuthorGender(p.authorNickname) === genderParam);
    }
    return list;
  }, [posts, activeCat, keyword, topMode, genderParam]);

  return (
    <main className="flex flex-1 flex-col">
      {isTopView ? (
        // 실시간 TOP / 주간 TOP 전용 헤더 — 카테고리 탭 대신 표시
        <div
          className={`flex items-center gap-2 border-b px-3 py-3 ${
            topMode === "live"
              ? "border-holo-top-live-bd bg-holo-top-live-bg"
              : "border-holo-lilac-deep bg-holo-lilac-card"
          }`}
        >
          <button
            type="button"
            aria-label="뒤로"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center"
          >
            <BackIcon />
          </button>
          <div className="flex flex-1 flex-col">
            <span className="text-[15px] font-bold text-holo-ink">
              {topMode === "live" ? "실시간 TOP" : "주간 TOP"}
            </span>
            <span
              className={`text-[11px] ${
                topMode === "live" ? "text-holo-error" : "text-holo-purple-mid"
              }`}
            >
              {topMode === "live"
                ? "지금 이 순간 가장 뜨거운 글"
                : "이번 주 가장 많이 본 글"}
            </span>
          </div>
          <button
            type="button"
            onClick={clearTop}
            className="text-[12px] text-holo-purple-mid underline"
          >
            전체보기
          </button>
        </div>
      ) : (
        <div
          ref={tabsRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="overflow-x-auto px-4 py-2 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", cursor: "grab" }}
        >
          <div className="flex w-max gap-2">
            {BOARD_CATEGORIES.map((c) => {
              const on = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleTabClick(c.id)}
                  className={`shrink-0 rounded-[20px] px-4 py-1.5 text-[16px] font-medium ${
                    on ? "bg-holo-lilac-card text-holo-purple-mid" : "text-holo-ink-3"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {keyword && !isTopView && (
        <div className="flex items-center justify-between border-b border-holo-line bg-holo-lilac-soft/40 px-4 py-2 text-[12px] text-holo-ink-2">
          <span>
            <span className="font-semibold text-holo-purple-mid">‘{keyword}’</span> 검색 결과 {visible.length}건
          </span>
          <button
            type="button"
            onClick={clearKeyword}
            className="text-[12px] text-holo-purple-mid underline"
          >
            검색 지우기
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-[14px] text-holo-ink-3">
          {isTopView ? (
            <span>표시할 글이 없습니다.</span>
          ) : keyword ? (
            <>
              <span>‘{keyword}’에 대한 검색 결과가 없습니다.</span>
              <span className="text-[12px]">다른 검색어로 다시 시도해 보세요.</span>
            </>
          ) : (
            <span>게시글이 없습니다.</span>
          )}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {visible.map((p, i) => (
            <PostCard
              key={p.id}
              post={p}
              rank={isTopView ? i + 1 : undefined}
              liked={likedSet.has(p.id)}
              commentCount={getCommentCount(p.id)}
              joined={joinedSet.has(p.id)}
            />
          ))}
        </ul>
      )}

      <Link
        to="/board/write"
        aria-label="글쓰기"
        className="fixed bottom-[88px] right-1/2 z-10 flex h-[50px] w-[50px] translate-x-[160px] items-center justify-center rounded-full bg-holo-gradient text-white shadow-md"
      >
        <PlusIcon />
      </Link>
    </main>
  );
}

function PostCard({
  post,
  rank,
  liked = false,
  commentCount,
  joined = false,
}: {
  post: Post;
  rank?: number;
  liked?: boolean;
  commentCount: number;
  joined?: boolean;
}) {
  // 자유게시판/추천해요는 상태 블록을 숨기되, 자리는 비워둠 → 탭 이동 시 카드 높이가 동일하게 유지됨
  const isSimple =
    post.category === "recommend" || post.category === "free";
  // 제목 앞 카테고리 배지 — 자유게시판/추천해요 글에서 노출 ("자유" / "추천")
  const showCategoryBadge =
    post.category === "free" || post.category === "recommend";

  const { capacity, baseJoined } = calcJoined(post);
  // 게시글 상세와 동일한 계산식: baseJoined + (현재 사용자 참여 여부)
  const joinedCount = Math.min(capacity, baseJoined + (joined ? 1 : 0));
  const shortLabel = CATEGORY_SHORT[post.category] ?? "";

  return (
    <li className="border-b border-holo-line">
      <Link to={`/board/${post.id}`} className="flex items-stretch gap-3 px-4 py-3">
        {rank !== undefined && <RankBadge rank={rank} />}
        <div className="flex shrink-0 flex-col items-center">
          <img
            src={avatarFor(post.authorNickname)}
            alt={post.authorNickname}
            className="h-12 w-12 rounded-full bg-holo-yellow-room object-cover"
            draggable={false}
          />
          {/* 좌측 컬럼 하단으로 밀어 우측 컬럼 끝의 > 화살표와 같은 줄에 정렬되도록 함.
              gap-2(8px)로 모집중 텍스트가 pill과 적당히 떨어져 위로 올라가 보이게 함 */}
          <div className="mt-auto flex flex-col items-center gap-2">
            {/* 보이지 않더라도 invisible로 자리를 차지해 카드 높이를 일정하게 유지 */}
            <div className={isSimple ? "invisible" : ""}>
              <StatusText status={post.status} />
            </div>
            <div className={isSimple ? "invisible" : ""}>
              <FractionPill status={post.status} text={`${joinedCount}/${capacity}`} />
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2">
            {showCategoryBadge && shortLabel && (
              <CategoryBadge label={shortLabel} variant={post.category} />
            )}
            <span className="text-[15px] font-semibold text-holo-ink">
              {post.title}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-holo-ink-3">
            {post.description}
          </p>
          <p className="mt-1 text-[11px] text-holo-ink-3">
            {post.authorNickname} · {post.timeAgo}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-holo-ink-3">
            <span className="flex items-center gap-1">
              <HeartIcon filled={liked} /> {post.likes + (liked ? 1 : 0)}
            </span>
            <span className="flex items-center gap-1">
              <CommentIcon /> {commentCount}
            </span>
            <ChevronRight />
          </div>
        </div>
      </Link>
    </li>
  );
}

function CategoryBadge({ label, variant }: { label: string; variant?: string }) {
  // 자유게시판 글은 회색 톤, 그 외(추천해요 등)는 라일락/보라색 톤 배지
  const styles =
    variant === "free"
      ? "bg-holo-line-3 text-holo-ink-3"
      : "bg-holo-lilac-soft text-holo-purple-mid";
  return (
    <span className={`shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium ${styles}`}>
      {label}
    </span>
  );
}

/** TOP 화면에서 게시글 좌측에 표시되는 순위 배지.
 *  1·2·3 위는 메달 색(금/은/동), 4위 이상은 회색 톤. */
function RankBadge({ rank }: { rank: number }) {
  const isMedal = rank <= 3;
  const style: Record<number, string> = {
    1: "bg-gradient-to-b from-[#FFD66B] to-[#E6A100] text-white shadow-[0_2px_6px_rgba(230,161,0,0.35)]",
    2: "bg-gradient-to-b from-[#D7DBE2] to-[#9CA3AF] text-white shadow-[0_2px_6px_rgba(156,163,175,0.35)]",
    3: "bg-gradient-to-b from-[#E8A073] to-[#B86B3C] text-white shadow-[0_2px_6px_rgba(184,107,60,0.35)]",
  };
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full text-[13px] font-bold ${
        isMedal ? style[rank] : "bg-holo-surface-2 text-holo-ink-2"
      }`}
      aria-label={`${rank}위`}
    >
      {rank}
    </span>
  );
}

/** 모집중/모집완료 pill — 모집중 = 연한 초록, 모집완료 = 연한 빨강 */
export function StatusBadge({ status }: { status: "모집중" | "모집완료" }) {
  const styles =
    status === "모집중"
      ? "bg-holo-success text-[#3F7E25]"
      : "bg-holo-full text-[#C53030]";
  return (
    <span
      className={`inline-block rounded-[5px] px-[9px] pt-[5px] pb-[4px] text-[11px] font-semibold leading-none ${styles}`}
    >
      {status}
    </span>
  );
}

function StatusText({ status }: { status: "모집중" | "모집완료" }) {
  return (
    <span className="block text-[11px] font-medium leading-none text-[#000000]">
      {status}
    </span>
  );
}

function FractionPill({
  status,
  text,
}: {
  status: "모집중" | "모집완료";
  text: string;
}) {
  const styles =
    status === "모집중"
      ? "bg-holo-success text-[#3F7E25]"
      : "bg-holo-full text-[#C53030]";
  return (
    <span className={`block rounded-full px-2 py-[3px] text-[10px] font-semibold leading-none ${styles}`}>
      {text}
    </span>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "#FF9A9A" : "none"}
      stroke="#FF9A9A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
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
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ml-auto">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
