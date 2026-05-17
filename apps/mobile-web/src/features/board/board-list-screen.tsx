import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_CATEGORIES,
  CATEGORY_SHORT,
  POST_COMMENTS,
  type Post,
} from "@/shared/mock/data";
import { postsStore } from "./posts-store";
import { getAvatarUrl } from "@/features/chat/avatars";
import { ME_PERSONA } from "@/features/home/home-faces";
import { getProfile } from "@/shared/stores/profile-store";
import { useProfile } from "@/shared/hooks/use-profile";
import {
  getAuthorGender,
  getAuthorAgeAtPost,
  ageRangeForFilterLabel,
} from "@/shared/lib/author-gender";
import { useLikedSet } from "@/shared/stores/likes-store";
import { useUserComments } from "@/shared/stores/comments-store";
import { useJoinedSet } from "@/shared/stores/joined-store";
import {
  getTotalViews,
  useViewCounts,
} from "@/shared/stores/view-count-store";
import { useGeolocation, distanceMeters } from "@/shared/hooks/use-geolocation";
import { calcJoined } from "./meetup-utils";

/**
 * 게시판에 노출되는 글의 거리 필터 반경 (위치가 있는 글에만 적용).
 * 위치가 없는 글(자유/추천 등)은 무관하게 항상 노출.
 */
const BOARD_NEARBY_RADIUS_M = 10000;

// 내 게시글이면 profile-store 의 얼굴, 아니면 닉네임 해시 face.
// "내 게시글" 여부는 현재 로그인한 계정의 닉네임(profile-store)과 비교한다 —
// ME.nickname 은 데모용 고정값이라 테스트 계정으로 로그인하면 어긋난다.
function avatarFor(nickname: string): string {
  const profile = getProfile();
  if (nickname === profile.nickname) {
    return profile.profileFace ?? ME_PERSONA.face;
  }
  return getAvatarUrl(nickname);
}

/**
 * 게시글 카드에 표시되는 댓글 수.
 * 게시글 상세(board-detail-screen)의 totalComments 와 동일한 식으로 계산:
 *   POST_COMMENTS[post.id] 길이 + 사용자가 작성한 댓글/대댓글 수.
 * post.comments(롱테일 분포 mock 값)는 더 이상 사용하지 않음 — 리스트/상세 카운트 불일치 방지.
 */
function buildCommentCounter(
  userCounts: Map<string, number>,
): (post: Post) => number {
  return (post) => {
    const base = (POST_COMMENTS[post.id] ?? []).length;
    return base + (userCounts.get(post.id) ?? 0);
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

const TOP_LIMIT = 30;
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
  // 검색 화면(board-search-screen) 에서 넘어온 다중 선택 필터들 — 콤마 구분.
  // 게시판 유형(라벨) / 모임 유형 / 거리 / 나이대 가 각각 별도 파라미터로 들어온다.
  // 비어있으면 모두 빈 배열로 폴백 — 필터링/배너 모두 건너뜀.
  const parseCsv = (v: string | null) =>
    v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const typeFilters = parseCsv(searchParams.get("type"));
  const boardFilters = parseCsv(searchParams.get("board"));
  const distanceFilters = parseCsv(searchParams.get("distance"));
  const ageFilters = parseCsv(searchParams.get("age"));
  // 게시판 라벨(예: "게임파티") → 카테고리 id(예: "game") 역매핑 — 필터링용
  const boardLabelToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of BOARD_CATEGORIES) m.set(c.label, c.id);
    return m;
  }, []);
  const boardFilterIds = boardFilters
    .map((label) => boardLabelToId.get(label))
    .filter((id): id is string => Boolean(id));
  const hasAnyFilter =
    typeFilters.length > 0 ||
    boardFilters.length > 0 ||
    distanceFilters.length > 0 ||
    ageFilters.length > 0 ||
    genderParam === "M" ||
    genderParam === "F";
  const [activeCat, setActiveCat] = useState<string>(
    isValidCat ? (catParam as string) : "all",
  );
  const [posts, setPosts] = useState<Post[]>(postsStore.getPosts());
  const likedSet = useLikedSet();
  const joinedSet = useJoinedSet();
  const userComments = useUserComments();
  // 프로필(닉네임/얼굴) 변경 시 리스트의 내 글 아바타가 즉시 갱신되도록 구독
  useProfile();
  // 조회수 증분이 바뀌면 리스트도 갱신되도록 구독
  useViewCounts();
  // 거리 필터용 사용자 GPS — fix 가 없으면 거리 필터를 건너뛰고 전체 노출
  const userPos = useGeolocation();
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

  /**
   * 활성 카테고리 탭이 가로 스크롤 컨테이너 안에서 항상 보이도록 자동 스크롤.
   * 게임파티/같이 운동해요 같은 뒤쪽 카테고리로 진입하면 기본 scrollLeft=0 이라
   * 활성 탭이 화면 밖으로 숨어 있어서 사용자가 어디에 와 있는지 알기 어려웠다.
   * data-cat 어트리뷰트로 활성 버튼을 찾아 inline:"center" 로 가운데 정렬.
   */
  useEffect(() => {
    if (isTopView) return;
    const container = tabsRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLButtonElement>(
      `[data-cat="${activeCat}"]`,
    );
    if (!active) return;
    active.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
  }, [activeCat, isTopView]);

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

  /**
   * 검색 화면에서 넘어온 필터 파라미터(type/board/distance/age/gender) 모두 제거.
   * "필터 지우기" 버튼이 클릭됐을 때 호출 — keyword 와 cat 같은 다른 컨텍스트는 보존.
   */
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("type");
    next.delete("board");
    next.delete("distance");
    next.delete("age");
    next.delete("gender");
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
    // URL 의 ?cat= 도 같이 동기화.
    // 그렇지 않으면 게시글 상세에서 뒤로가기 시 BoardListScreen 이 다시 마운트되며
    // useState 초기값이 catParam 기반으로 평가되어 activeCat 이 "all" 로 리셋됨.
    // → 사용자가 "자유게시판" 탭에서 글을 보다가 뒤로가면 "전체" 탭으로 튕기는 버그.
    // 히스토리에 탭 클릭이 쌓이지 않도록 replace 로 갱신한다 (뒤로가기는 게시판→이전 화면).
    const next = new URLSearchParams(searchParams);
    if (catId === "all") {
      next.delete("cat");
    } else {
      next.set("cat", catId);
    }
    setSearchParams(next, { replace: true });
  };

  const visible = useMemo(() => {
    // ── 실시간 TOP / 주간 TOP 모드 ─────────────────────────────
    // 카테고리 탭/검색 키워드는 무시하고 전체 글에서 정렬·상위 N개만 노출.
    // 두 모드가 시각적으로 확실히 다른 리스트가 되도록 강조 신호를 분리:
    //  - 실시간: "방금 핫한 글" → 좋아요(즉각 반응) 가중치 ↑ + 강한 시간 감쇠
    //  - 주간:   "이 주의 베스트" → 댓글(토론 깊이) 가중치 ↑ + 시간 감쇠 없음
    if (topMode === "live") {
      // 실시간 TOP — HN 의 1.8 보다 더 가파른 ^2 감쇠.
      //   score = engagement / (hours + 1)^2
      //   engagement = 좋아요×4 + 댓글×3 + 조회수×0.1
      // - "방금~1시간 전" 글이 압도적으로 유리. 24h 지난 글은 사실상 노출 안 됨.
      // - 좋아요 가중치 ↑ : 즉각 반응 강조 (vs 주간은 댓글 강조)
      return [...posts]
        .map((p) => {
          const hours = parseTimeAgoMinutes(p.timeAgo) / 60;
          const views = getTotalViews(p);
          const engagement = p.likes * 4 + p.comments * 3 + views * 0.1;
          const score = engagement / Math.pow(hours + 1, 2);
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_LIMIT)
        .map((x) => x.p);
    }
    if (topMode === "weekly") {
      // 주간 TOP — 7일 누적 + 댓글 가중치 강조 + 감쇠 없음.
      //   score = 좋아요×2 + 댓글×8 + 조회수×0.15
      // - 댓글이 압도적으로 무거움 → 토론·댓글 활발한 글 위주.
      // - 7일 안에서 신규/오래된 차이 없이 누적값만 비교.
      // - 동점 시 댓글 많은 글 우선 (주간은 토론 깊이가 본질).
      return [...posts]
        .filter((p) => parseTimeAgoMinutes(p.timeAgo) <= WEEK_MINUTES)
        .sort((a, b) => {
          const scoreA = a.likes * 2 + a.comments * 8 + getTotalViews(a) * 0.15;
          const scoreB = b.likes * 2 + b.comments * 8 + getTotalViews(b) * 0.15;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.comments - a.comments;
        })
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
    // 게시판 유형 필터 (검색 화면 다중 선택) — 한 개 이상이면 카테고리 id 가 그 중 하나여야 통과
    if (boardFilterIds.length > 0) {
      const set = new Set(boardFilterIds);
      list = list.filter((p) => set.has(p.category));
    }
    // 모임 유형 필터 (단기성/장기성) — 다중 선택. 둘 다 고르면 사실상 필터 없음.
    if (typeFilters.length > 0 && typeFilters.length < 2) {
      const set = new Set(typeFilters);
      list = list.filter((p) => p.meetupType && set.has(p.meetupType));
    }
    // 나이대 필터 — "10대"/"20대"/"30대"/"40대 이상" 다중 선택. 선택된 범위 중 하나에라도
    // 작성자 나이(getAuthorAge 가 currentYear - birthYear 로 계산)가 들어가면 통과.
    if (ageFilters.length > 0) {
      const ranges = ageFilters
        .map(ageRangeForFilterLabel)
        .filter((r): r is [number, number] => r !== null);
      if (ranges.length > 0) {
        list = list.filter((p) => {
          // 작성 시점 나이 — 글이 한 번 쓰이면 작성자가 나이를 먹어도 버킷은 고정.
          // (19살에 쓴 글은 작성자가 20세가 돼도 "10대 필터" 에 그대로 남는다)
          const age = getAuthorAgeAtPost(p.authorNickname, p.timeAgo);
          return ranges.some(([lo, hi]) => age >= lo && age <= hi);
        });
      }
    }
    // 거리 필터 — 위치 있는 글은 10km 이내만, 위치 없는 글(자유/추천)은 전부 노출.
    // GPS fix 가 아직 없으면 (userPos === null) 필터 건너뛰고 전체 노출.
    if (userPos) {
      list = list.filter((p) => {
        if (!p.location) return true; // 자유/추천 등 위치 없는 글은 항상 통과
        return (
          distanceMeters(userPos, p.location) <= BOARD_NEARBY_RADIUS_M
        );
      });
    }
    return list;
  }, [
    posts,
    activeCat,
    keyword,
    topMode,
    genderParam,
    userPos,
    boardFilterIds,
    typeFilters,
    ageFilters,
  ]);

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
                : "이번 주 가장 인기있던 글"}
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
                  data-cat={c.id}
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

      {/* 필터 검색 배너 — 검색 화면에서 다중 선택 필터로 진입했을 때 어떤 필터가 적용됐는지 노출.
          게시판/유형/거리/나이대/성별을 칩으로 한눈에 보여주고, "필터 지우기" 로 전체 해제. */}
      {hasAnyFilter && !isTopView && (
        <div className="flex flex-col gap-2 border-b border-holo-line bg-holo-lilac-soft/40 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-holo-ink-2">
              <span className="font-semibold text-holo-purple-mid">필터</span> 검색 결과 {visible.length}건
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] text-holo-purple-mid underline"
            >
              필터 지우기
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {boardFilters.map((label) => (
              <FilterChip key={`b-${label}`} label={label} />
            ))}
            {typeFilters.map((label) => (
              <FilterChip key={`t-${label}`} label={label} />
            ))}
            {distanceFilters.map((label) => (
              <FilterChip key={`d-${label}`} label={label} />
            ))}
            {ageFilters.map((label) => (
              <FilterChip key={`a-${label}`} label={label} />
            ))}
            {genderParam === "M" && <FilterChip label="남자" />}
            {genderParam === "F" && <FilterChip label="여자" />}
          </div>
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
              commentCount={getCommentCount(p)}
              joined={joinedSet.has(p.id)}
              // '전체' 탭에서만 모든 카테고리 배지를 노출 (TOP/검색은 기존 동작 유지)
              showAllCategoryBadges={!isTopView && activeCat === "all"}
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
  showAllCategoryBadges = false,
}: {
  post: Post;
  rank?: number;
  liked?: boolean;
  commentCount: number;
  joined?: boolean;
  /**
   * '전체' 탭처럼 여러 카테고리가 섞여 노출되는 화면에서 true.
   * true 면 모든 카테고리 글의 제목 앞에 짧은 카테고리 배지(추천/소분/산책 등)를 표시한다.
   * 개별 카테고리 탭에서는 이미 탭 자체가 카테고리를 나타내므로 중복 회피를 위해 false 로 둔다.
   */
  showAllCategoryBadges?: boolean;
}) {
  // 자유게시판/추천해요는 상태 블록을 숨기되, 자리는 비워둠 → 탭 이동 시 카드 높이가 동일하게 유지됨
  const isSimple =
    post.category === "recommend" || post.category === "free";
  // 제목 앞 카테고리 배지 — '전체' 탭(showAllCategoryBadges)에서만 노출.
  // 개별 카테고리 탭은 탭 자체가 카테고리를 표시하므로 중복 정보 회피를 위해 숨김.
  const showCategoryBadge = showAllCategoryBadges;

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
            <span aria-label={`조회 ${getTotalViews(post)}`}>
              조회 {getTotalViews(post).toLocaleString()}
            </span>
            <ChevronRight />
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * 카테고리별 배지 색상 팔레트.
 * '전체' 탭처럼 여러 카테고리가 섞여 보이는 화면에서 한눈에 구분할 수 있도록
 * 각 카테고리마다 파스텔 톤의 배경/텍스트 컬러를 부여한다.
 * - 채도는 낮춰서 라일락 톤(앱 메인 컬러)과 조화를 이루게 함
 * - 텍스트는 진한 톤으로 잡아 작은 글자(11px) 가독성 확보
 */
const CATEGORY_BADGE_STYLES: Record<string, string> = {
  // 자유: 회색 — 카테고리 구분이 약한 잡담성 글
  free: "bg-holo-line-3 text-holo-ink-3",
  // 추천: 라일락/보라 (앱 메인 컬러)
  recommend: "bg-holo-lilac-soft text-holo-purple-mid",
  // 소분/공구: 하늘색 — 거래·나눔 톤
  share: "bg-[#DBEAFE] text-[#1D4ED8]",
  // 게임: 핑크 — 활기찬 톤
  game: "bg-[#FCE7F3] text-[#BE185D]",
  // 운동: 초록 — 산책·운동의 자연스러운 톤
  sport: "bg-[#DCFCE7] text-[#15803D]",
  // 영화·드라마: 인디고 — 어두운 톤의 시청 콘텐츠 느낌
  media: "bg-[#E0E7FF] text-[#4338CA]",
  // 맛집·먹거리: 오렌지 — 식욕 자극 톤
  food: "bg-[#FFEDD5] text-[#C2410C]",
  // 도와주세요: 레드 — 긴급·주목 톤
  help: "bg-[#FEE2E2] text-[#B91C1C]",
};

function CategoryBadge({ label, variant }: { label: string; variant?: string }) {
  // 정의되지 않은 카테고리는 기본 라일락 톤으로 폴백
  const styles =
    (variant && CATEGORY_BADGE_STYLES[variant]) ??
    "bg-holo-lilac-soft text-holo-purple-mid";
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

/** 필터 검색 배너에 나란히 늘어놓는 필터 칩 — 라일락 톤 둥근 pill */
function FilterChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-holo-purple-mid ring-1 ring-holo-lilac-deep/60">
      {label}
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
