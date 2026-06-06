import { Link, useLocation, useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type UIEventHandler,
} from "react";
import {
  BOARD_CATEGORIES,
  CATEGORY_SHORT,
  type Post,
} from "@/shared/mock/data";
import { postsStore } from "./posts-store";
import { isMyPost } from "./author-identity";
import { getAvatarUrl } from "@/features/chat/avatars";
import { ME_PERSONA } from "@/features/home/home-faces";
import { getProfile } from "@/shared/stores/profile-store";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { useLikedSet } from "@/shared/stores/likes-store";
import { useBlockedNicknames } from "@/shared/stores/blocked-nicknames-store";
import { supabase } from "@/shared/lib/supabaseClient";
import { PostListSkeleton } from "@/shared/components/skeleton";
import { useUserComments } from "@/shared/stores/comments-store";
import {
  getTotalViews,
  useViewCounts,
} from "@/shared/stores/view-count-store";
import { useGeolocation, distanceMeters } from "@/shared/hooks/use-geolocation";
import { calcJoined, isMeetupEnded } from "./meetup-utils";
import { rankLive, rankWeekly } from "./top-ranking";
import { useBumpCount } from "@/shared/stores/bump-store";

/**
 * 게시판에 노출되는 글의 거리 필터 반경 (위치가 있는 글에만 적용).
 * 위치가 없는 글(자유/추천 등)은 무관하게 항상 노출.
 */
const BOARD_NEARBY_RADIUS_M = 10000;

// "내 게시글" 여부는 전화번호로 판별 — 닉네임은 변경될 수 있으므로 신뢰할 수 없음.
function avatarFor(post: { authorNickname: string; authorPhone?: string | null }): string {
  const myPhone = getCurrentAccount();
  if (myPhone && post.authorPhone === myPhone) {
    const profile = getProfile();
    return profile.profileFace ?? ME_PERSONA.face;
  }
  return getAvatarUrl(post.authorNickname);
}

/**
 * 게시글 카드에 표시되는 댓글 수.
 * Supabase 저장값(post.comments)을 기준으로 하고,
 * 아직 서버에 반영되지 않은 내 댓글이 있으면 그만큼 더해서 낙관적 업데이트.
 */
function buildCommentCounter(
  userCounts: Map<string, number>,
  serverCounts: Map<string, number>,
): (post: Post) => number {
  return (post) => {
    // base = Supabase comments 실집계(타인 댓글 포함). 로드 전이면 post.comments 로 폴백.
    // (이전엔 post.comments 만 썼는데 댓글 작성 시 그 값이 갱신되지 않아 타인 댓글이 0으로 누락됐다.)
    const base = serverCounts.get(post.id) ?? post.comments ?? 0;
    const myLocal = userCounts.get(post.id) ?? 0;
    // 내 로컬 댓글이 아직 base에 반영 안 됐을 수 있으므로 초과분만 추가
    return base + Math.max(0, myLocal - base);
  };
}

const DRAG_THRESHOLD = 4;

// 점수 계산식 / 가중치 / 시간 환산은 top-ranking.ts 단일 출처로 옮겼다.
// 이 파일은 그 결과를 받아 정렬·필터링·렌더링만 책임진다.

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
  const blockedSet = useBlockedNicknames();
  const userComments = useUserComments();
  // 프로필(닉네임/얼굴) 변경 시 리스트의 내 글 아바타가 즉시 갱신되도록 구독.
  // 닉네임 변경/계정 전환 시 "내 글 거리 예외" 메모도 재계산되도록 deps 에 사용한다.
  const profile = useProfile();
  // 조회수 증분이 바뀌면 리스트도 갱신되도록 구독
  useViewCounts();
  // 거리 필터용 사용자 GPS — fix 가 없으면 거리 필터를 건너뛰고 전체 노출
  const userPos = useGeolocation();
  // Supabase comments 테이블의 글별 실제 댓글 수(타인 포함) — 마운트 시 1회 로드.
  const [serverCommentCounts, setServerCommentCounts] = useState<Map<string, number>>(
    () => new Map(),
  );
  useEffect(() => {
    supabase
      .from("comments")
      .select("post_id")
      .then(({ data, error }) => {
        if (error || !data) return;
        const m = new Map<string, number>();
        for (const row of data as { post_id: unknown }[]) {
          const pid = String(row.post_id);
          m.set(pid, (m.get(pid) ?? 0) + 1);
        }
        setServerCommentCounts(m);
      });
  }, []);
  // users 테이블의 실제 성별(닉네임→"M"|"F") — 성별 검색 필터를 닉네임 해시(가짜)가
  // 아니라 본인인증으로 저장된 실데이터로 수행하기 위해 마운트 시 1회 로드.
  // 한글 "남"/"여" 표기도 정규화한다.
  const [genderByNick, setGenderByNick] = useState<Map<string, "M" | "F">>(
    () => new Map(),
  );
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("users")
      .select("nickname, gender")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const m = new Map<string, "M" | "F">();
        for (const row of data as { nickname: unknown; gender: unknown }[]) {
          const nick = typeof row.nickname === "string" ? row.nickname : "";
          const raw = typeof row.gender === "string" ? row.gender : "";
          const g: "M" | "F" | null =
            raw === "F" || raw.includes("여")
              ? "F"
              : raw === "M" || raw.includes("남")
                ? "M"
                : null;
          if (nick && g) m.set(nick, g);
        }
        setGenderByNick(m);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const getCommentCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of userComments) {
      counts.set(c.postId, (counts.get(c.postId) ?? 0) + 1);
    }
    return buildCommentCounter(counts, serverCommentCounts);
  }, [userComments, serverCommentCounts]);

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
    // 카테고리 탭 / 검색 키워드는 무시하고 전체 글에서 점수 기준 상위 N개만 노출.
    // 점수 계산식 자체는 top-ranking.ts 의 rankLive / rankWeekly 가 단일 출처.
    // 사용자가 누른 좋아요·작성한 댓글·증가한 조회수까지 반영되도록 ctx 를 넘긴다 —
    // 카드의 표시값과 랭킹이 일치한다.
    const rankCtx = {
      likedSet,
      getCommentCount,
      getViews: getTotalViews,
    };
    // 차단한 작성자의 글은 모든 모드에서 제외 (전체/카테고리/검색/TOP).
    const notBlocked = (arr: Post[]) =>
      blockedSet.size > 0 ? arr.filter((p) => !blockedSet.has(p.authorNickname)) : arr;
    if (topMode === "live") return notBlocked(rankLive(posts, rankCtx));
    if (topMode === "weekly") return notBlocked(rankWeekly(posts, rankCtx));

    // ── 기본 모드 (카테고리 / 검색) ─────────────────────────
    let list = activeCat === "all" ? posts : posts.filter((p) => p.category === activeCat);
    list = notBlocked(list);
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
      list = list.filter((p) => {
        // 실제 users.gender(닉네임→성별 맵)로 필터. 아직 로드 안 됐거나
        // 매핑 없는 작성자는 임의 제외하지 않고 통과(가짜 성별 산출 금지).
        const g = genderByNick.get(p.authorNickname);
        return g ? g === genderParam : true;
      });
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
    // 나이대 필터 — 작성자의 실제 나이(생년) 데이터가 저장되지 않아 신뢰 가능한 출처가 없다.
    // 이전엔 닉네임 해시로 만든 가짜 나이로 걸러 잘못된 결과를 보여줬다. 실제 생년이 연동되기
    // 전까지는 나이대 필터로 글을 숨기지 않는다(가짜 필터링 제거). UI(ageFilters)는 유지 —
    // 추후 users 에 생년 저장 시 이 자리에서 실제 값으로 거르면 된다.
    if (ageFilters.length > 0) {
      // no-op: 실데이터 없음 → 나이로 숨기지 않음.
    }
    // 거리 필터 — 위치 있는 글에만 적용. 위치 없는 글(자유/추천)은 항상 통과.
    // GPS fix 가 아직 없으면 (userPos === null) 필터 건너뛰고 전체 노출.
    // 사용자가 검색에서 고른 거리 범위(1km 이하 / 1km~5km / 5km~10km)를 실제로 반영한다.
    // (이전엔 선택을 무시하고 항상 10km 고정이었음)
    if (userPos) {
      // 내가 쓴 글은 거리와 무관하게 항상 보이게 한다. (내 글 위치가 현재 GPS 에서 10km
      //  밖이면 — 다른 동네에서 올렸거나 GPS 가 이동한 경우 — 리스트에서 사라지던 문제.
      //  채팅방은 남는데 게시판엔 안 보이던 증상의 원인.)
      const DIST_RANGES: Record<string, [number, number]> = {
        "1km 이하": [0, 1000],
        "1km~5km": [1000, 5000],
        "5km~10km": [5000, 10000],
      };
      const ranges = distanceFilters
        .map((label) => DIST_RANGES[label])
        .filter(Boolean) as [number, number][];
      list = list.filter((p) => {
        // 내 글은 거리와 무관하게 항상 통과. 닉네임 단독 비교는 닉네임 변경 후 옛 글을
        // 못 알아봐 사라지게 하므로, 전화번호 우선 + 옛 닉네임까지 보는 isMyPost 사용.
        if (isMyPost(p)) return true;
        if (!p.location) return true; // 위치 없는 글은 항상 통과
        const d = distanceMeters(userPos, p.location);
        // 선택된 범위가 있으면 그중 하나라도 들어야 통과, 없으면 기본 반경(10km) 이내.
        if (ranges.length > 0) {
          return ranges.some(([lo, hi]) => d >= lo && d <= hi);
        }
        return d <= BOARD_NEARBY_RADIUS_M;
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
    distanceFilters,
    // users.gender 실데이터 로드가 끝나면 성별 필터 결과가 갱신되도록 deps 에 추가.
    genderByNick,
    // 랭킹이 사용자의 실시간 좋아요·댓글에 즉각 반응하도록 deps 에 추가.
    // 조회수는 useViewCounts() 가 위쪽에서 호출돼 컴포넌트 자체가 매번 리렌더되므로 따로 deps 에 둘 필요 없음.
    likedSet,
    getCommentCount,
    blockedSet,
    // 닉네임 변경/계정 전환 시 "내 글 거리 예외"(isMyPost)가 재평가되도록 추가.
    profile,
  ]);

  // ── 스크롤 위치 복원 ─────────────────────────────────────────
  // 게시글 상세로 진입했다가 뒤로 돌아왔을 때(POP), 사용자가 보고 있던 위치 그대로
  // 게시판 리스트가 보이도록 sessionStorage 에 스크롤 오프셋을 영속화한다.
  // 단, 하단 탭 클릭(PUSH) 으로 새로 진입한 경우엔 복원하지 않고 상단부터 보여준다.
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollKey = `holo:board-list-scroll:${location.pathname}${location.search}`;
  const listRef = useRef<HTMLUListElement>(null);

  // 마운트 / URL 키 변경 시 저장된 스크롤 위치를 복원.
  //
  // ── 진단 + retry 로직 ───────────────────────────────────────────────
  // 실제 스크롤이 ul 에서 일어나는지, 부모 요소에서 일어나는지 확인 불확실해서
  // ul 과 closest scrollable 부모 양쪽 모두에 대해 시도. 콘솔에 디버그 로그도
  // 남겨 사용자가 DevTools 에서 확인할 수 있게 함.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // POP 만 (브라우저 뒤로/앞으로) 저장된 위치 복원. 탭 클릭(PUSH/REPLACE) 으로
    // 들어온 경우엔 무조건 상단부터 보여준다.
    if (navigationType !== "POP") {
      el.scrollTop = 0;
      return;
    }
    let saved = 0;
    try {
      const raw = window.sessionStorage.getItem(scrollKey);
      if (raw != null) {
        const n = Number(raw);
        if (Number.isFinite(n)) saved = n;
      }
    } catch {
      // ignore
    }
    // 실제 스크롤되는 요소 찾기 — ul 자체가 안 스크롤되면 가장 가까운 overflow:auto 부모.
    const findScrollable = (start: HTMLElement): HTMLElement => {
      let cur: HTMLElement | null = start;
      while (cur) {
        const s = getComputedStyle(cur);
        if (
          (s.overflowY === "auto" || s.overflowY === "scroll") &&
          cur.scrollHeight > cur.clientHeight
        ) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return start;
    };

    if (saved === 0) {
      el.scrollTop = 0;
      return;
    }
    const scroller = findScrollable(el);
    scroller.scrollTop = saved;
    if (scroller !== el) el.scrollTop = saved;

    let rafId = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 60;
    let userScrolled = false;
    const onUserScroll = () => {
      userScrolled = true;
    };
    scroller.addEventListener("wheel", onUserScroll, { passive: true });
    scroller.addEventListener("touchmove", onUserScroll, { passive: true });

    const tryRestore = () => {
      if (userScrolled) return;
      const elNow = listRef.current;
      if (!elNow || attempts >= MAX_ATTEMPTS) return;
      attempts++;
      const s = findScrollable(elNow);
      const maxScroll = s.scrollHeight - s.clientHeight;
      if (maxScroll >= saved && s.scrollTop !== saved) {
        s.scrollTop = saved;
      }
      if (s.scrollTop < saved) {
        rafId = requestAnimationFrame(tryRestore);
      }
    };
    rafId = requestAnimationFrame(tryRestore);

    return () => {
      cancelAnimationFrame(rafId);
      scroller.removeEventListener("wheel", onUserScroll);
      scroller.removeEventListener("touchmove", onUserScroll);
    };
  }, [scrollKey, visible.length]);

  const handleListScroll: UIEventHandler<HTMLUListElement> = (e) => {
    const top = e.currentTarget.scrollTop;
    try {
      window.sessionStorage.setItem(scrollKey, String(top));
    } catch {
      // ignore (quota / private mode)
    }
  };

  // 부모(TabLayout content div) 가 실제 스크롤하는 케이스 대비 — 마운트 시 ul 의
  // 가장 가까운 overflow:auto 조상에도 스크롤 리스너를 단다.
  useEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    let scroller: HTMLElement | null = ul.parentElement;
    while (scroller) {
      const s = getComputedStyle(scroller);
      if (
        (s.overflowY === "auto" || s.overflowY === "scroll") &&
        scroller.scrollHeight > scroller.clientHeight
      ) {
        break;
      }
      scroller = scroller.parentElement;
    }
    if (!scroller || scroller === ul) return;
    const onScroll = () => {
      try {
        window.sessionStorage.setItem(scrollKey, String(scroller!.scrollTop));
      } catch {
        // ignore
      }
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller!.removeEventListener("scroll", onScroll);
  }, [scrollKey]);

  // 언마운트 직전(예: 글 상세로 이동) 에 마지막 스크롤 위치를 한 번 더 저장.
  useEffect(() => {
    return () => {
      const el = listRef.current;
      if (!el) return;
      // ul + 부모 스크롤러 양쪽 모두 확인해 가장 큰 값 저장
      let maxScrollTop = el.scrollTop;
      let cur: HTMLElement | null = el.parentElement;
      while (cur) {
        const s = getComputedStyle(cur);
        if (s.overflowY === "auto" || s.overflowY === "scroll") {
          if (cur.scrollTop > maxScrollTop) maxScrollTop = cur.scrollTop;
        }
        cur = cur.parentElement;
      }
      try {
        window.sessionStorage.setItem(scrollKey, String(maxScrollTop));
      } catch {
        // ignore
      }
    };
  }, [scrollKey]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
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
            className="rounded-full border border-holo-purple-mid bg-white px-3 py-1.5 text-[12px] font-semibold text-holo-purple-mid shadow-sm active:opacity-80"
          >
            전체보기
          </button>
        </div>
      ) : (
        // 뒤로가기 + 카테고리 탭. 좌측에 뒤로 버튼을 고정하고 그 오른쪽은 가로 스크롤되는 탭.
        <div className="flex items-center border-b border-holo-line-2">
          <button
            type="button"
            aria-label="뒤로"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <BackIcon />
          </button>
          <div
            ref={tabsRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex-1 overflow-x-auto px-2 py-2 [&::-webkit-scrollbar]:hidden"
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

      {!postsStore.isLoaded() && posts.length === 0 ? (
        // 첫 로드 중에는 빈 화면/"게시글 없음" 대신 스켈레톤을 보여준다(로딩↔빈상태 구분).
        <PostListSkeleton />
      ) : visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-[14px] text-holo-ink-3">
          {isTopView ? (
            <span>표시할 글이 없습니다.</span>
          ) : keyword ? (
            <>
              <span>‘{keyword}’에 대한 검색 결과가 없습니다.</span>
              <span className="text-[12px]">다른 검색어로 다시 시도해 보세요.</span>
            </>
          ) : (
            // 온보딩형 빈 상태 — 첫 사용자가 바로 행동할 수 있도록 안내 + 글쓰기 CTA.
            <div className="flex flex-col items-center gap-1.5 px-8 text-center">
              <span className="text-[34px]">📝</span>
              <span className="text-[15px] font-semibold text-holo-ink-2">
                아직 게시글이 없어요
              </span>
              <span className="text-[12px] text-holo-ink-3">
                우리 동네 첫 이야기를 남겨보세요
              </span>
              <Link
                to="/board/write"
                className="mt-3 rounded-holo-pill bg-holo-purple-mid px-6 py-2 text-[13px] font-semibold text-white"
              >
                글쓰기
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul
          ref={listRef}
          onScroll={handleListScroll}
          className="no-scrollbar flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((p, i) => (
            <PostCard
              key={p.id}
              post={p}
              rank={isTopView ? i + 1 : undefined}
              liked={likedSet.has(p.id)}
              commentCount={getCommentCount(p)}
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
  showAllCategoryBadges = false,
}: {
  post: Post;
  rank?: number;
  liked?: boolean;
  commentCount: number;
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
  // baseJoined 는 participants 로 이미 본인을 포함하므로 joined 플래그로 +1 하지 않는다(이중 카운트 방지).
  const joinedCount = Math.min(capacity, baseJoined);
  // 상태 배지(색/라벨) — 정원이 차면 빨강 '모집완료'. 정원 기반을 1차 출처로 쓰되
  // (옛 stale post.status 로 '5/5'인데 '모집중' 어긋남 방지), 방장이 수동 마감한
  // post.status="모집완료" 도 함께 반영해 상세화면과 일치시킨다.
  // 일정이 지난 모임은 모집 상태와 무관하게 회색 '종료' — 목록에서 지난 모임이
  // '모집중'(초록)으로 떠 아직 참여 가능한 것처럼 보이던 문제 방지.
  const displayStatus: "모집중" | "모집완료" | "종료" = isMeetupEnded(post)
    ? "종료"
    : joinedCount >= capacity || post.status === "모집완료"
      ? "모집완료"
      : "모집중";
  const shortLabel = CATEGORY_SHORT[post.category] ?? "";

  return (
    <li className="border-b border-holo-line">
      <Link to={`/board/${post.id}`} className="flex items-stretch gap-3 px-4 py-3">
        {rank !== undefined && <RankBadge rank={rank} />}
        <div className="flex shrink-0 flex-col items-center">
          <img
            src={avatarFor(post)}
            alt={post.authorNickname}
            className="h-12 w-12 rounded-full bg-holo-yellow-room object-cover"
            draggable={false}
          />
          {/* 좌측 컬럼 하단으로 밀어 우측 컬럼 끝의 > 화살표와 같은 줄에 정렬되도록 함.
              gap-2(8px)로 모집중 텍스트가 pill과 적당히 떨어져 위로 올라가 보이게 함 */}
          <div className="mt-auto flex flex-col items-center gap-2">
            {/* 보이지 않더라도 invisible로 자리를 차지해 카드 높이를 일정하게 유지 */}
            <div className={isSimple ? "invisible" : ""}>
              <StatusText status={displayStatus} />
            </div>
            <div className={isSimple ? "invisible" : ""}>
              <FractionPill status={displayStatus} text={`${joinedCount}/${capacity}`} />
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
              <HeartIcon filled={liked} /> {post.likes}
            </span>
            <span className="flex items-center gap-1">
              <CommentIcon /> {commentCount}
            </span>
            <span aria-label={`조회 ${getTotalViews(post)}`}>
              조회 {getTotalViews(post).toLocaleString()}
            </span>
            <BumpCountChip postId={post.id} />
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

/**
 * 게시글 카드의 통계 행에 표시되는 끌어올리기 횟수 칩.
 * 한 번도 끌어올린 적 없으면 렌더링하지 않아 다른 카드와 정렬에 영향이 없다.
 */
function BumpCountChip({ postId }: { postId: string }) {
  const count = useBumpCount(postId);
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-holo-purple-mid"
      aria-label={`끌어올리기 ${count}회`}
    >
      <BumpArrow /> 끌올 {count}회
    </span>
  );
}

function BumpArrow() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
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

/** 모집중/모집완료/종료 pill — 모집중 = 연한 초록, 모집완료 = 연한 빨강, 종료 = 회색 */
export function StatusBadge({ status }: { status: "모집중" | "모집완료" | "종료" }) {
  const styles =
    status === "종료"
      ? "bg-holo-line-3 text-holo-ink-3"
      : status === "모집중"
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

function StatusText({ status }: { status: "모집중" | "모집완료" | "종료" }) {
  // 종료된 모임은 글자도 회색 톤으로 — '비활성' 시각화.
  return (
    <span
      className={`block text-[11px] font-medium leading-none ${
        status === "종료" ? "text-holo-ink-3" : "text-[#000000]"
      }`}
    >
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
  status: "모집중" | "모집완료" | "종료";
  text: string;
}) {
  const styles =
    status === "종료"
      ? "bg-holo-line-3 text-holo-ink-3"
      : status === "모집중"
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
