import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BOARD_CATEGORIES, CATEGORY_SHORT, type Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { useUserComments } from "@/shared/stores/comments-store";
import { useActivityState } from "@/shared/stores/activity-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { isMyPost } from "@/features/board/author-identity";
import { useViewedEntries } from "@/shared/stores/viewed-posts-store";

/**
 * 활동 요약 카드에 노출할 한 줄 카피를 데이터 상태에 따라 분기 생성.
 *
 * - 데이터 충분(최근 본 글 + 댓글 모두 있음): "요즘 {카테고리} 이야기에 관심이 많아요. {게시판명}에서 이웃들과 가장 자주 소통했어요."
 * - 최근 본 글만 있음: "최근에는 {카테고리} 게시글을 자주 둘러봤어요. 관심 있는 이야기를 더 모아갈게요."
 * - 댓글만 있음: "{게시판명}에서 댓글 활동이 활발해요. 이웃들과 소통을 이어가고 있어요."
 * - 활동이 거의 없음: 시작을 권하는 환영 문구.
 *
 * 카테고리 라벨은 BOARD_CATEGORIES 에서, 짧은 라벨(자유/맛집 등)은 CATEGORY_SHORT 에서 가져오고,
 * 카테고리 id ↔ label / shortLabel 둘 다 노출 후보로 두되 자연스러운 문장이 되도록 label 을 우선 사용.
 */
type Summary = {
  /** 두 줄 헤드라인 — 카드의 메인 카피. */
  headline: string;
  /** 어떤 데이터로 만든 카피인지 캡션 — "최근 본 글 기준 · 댓글 활동 기준" 같은 출처 표시. */
  caption: string;
};

function buildActivitySummary(opts: {
  topViewedCategoryId: string | null;
  topCommentedCategoryId: string | null;
}): Summary {
  const labelOf = (id: string | null): string | null => {
    if (!id) return null;
    const c = BOARD_CATEGORIES.find((c) => c.id === id);
    return c ? c.label : null;
  };
  const shortLabelOf = (id: string | null): string | null => {
    if (!id) return null;
    return CATEGORY_SHORT[id] ?? labelOf(id);
  };

  const viewedLabel = shortLabelOf(opts.topViewedCategoryId);
  const commentedBoard = labelOf(opts.topCommentedCategoryId);

  // 데이터 충분 — 관심 카테고리 + 활동 게시판 둘 다 잡힘.
  if (viewedLabel && commentedBoard) {
    return {
      headline: `요즘 ${viewedLabel} 이야기에 관심이 많아요.\n${commentedBoard}에서 이웃들과 자주 소통했어요.`,
      caption: "최근 본 글 기준 · 댓글 활동 기준",
    };
  }
  // 최근 본 글만 있음
  if (viewedLabel) {
    return {
      headline: `최근에는 ${viewedLabel} 게시글을 자주 둘러봤어요.\n관심 있는 이야기를 더 모아갈게요.`,
      caption: "최근 본 글 기준",
    };
  }
  // 댓글만 있음
  if (commentedBoard) {
    return {
      headline: `${commentedBoard}에서 댓글 활동이 활발해요.\n이웃들과 소통을 이어가고 있어요.`,
      caption: "댓글 활동 기준",
    };
  }
  // 활동이 거의 없음
  return {
    headline:
      "아직 활동 기록이 많지 않아요.\n관심 있는 글을 둘러보며 첫 활동을 시작해보세요.",
    caption: "활동을 시작해보세요",
  };
}

/** id → 카운트 Map 중 최다 카운트의 id 를 돌려준다. 동률은 먼저 들어온 순. 비었으면 null. */
function topCategoryId(counts: Map<string, number>): string | null {
  let bestId: string | null = null;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN) {
      bestN = n;
      bestId = id;
    }
  }
  return bestId;
}

export function ActivityScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const userComments = useUserComments();
  const activity = useActivityState();
  const viewed = useViewedEntries();
  const [allPosts, setAllPosts] = useState<Post[]>(postsStore.getPosts());

  useEffect(() => {
    return postsStore.subscribe(() => setAllPosts(postsStore.getPosts()));
  }, []);

  // 실제 사용자가 작성한 글 / 댓글 수 — 전화번호 우선(닉네임 변경/과거 닉네임 포함).
  const postsCount = useMemo(
    () => allPosts.filter((p) => isMyPost(p)).length,
    [allPosts, profile.nickname],
  );
  // '댓글 단 고유 글 수' — /mypage/comments 리스트(postId 중복 제거) 및 프로필 stat 과 단위 통일.
  const commentsCount = useMemo(
    () => new Set(userComments.map((c) => c.postId)).size,
    [userComments],
  );
  const activeDays = activity.activeDates.length;
  // 최근 본 글 카운트 — 게시판에서 이미 삭제된 글은 viewed 에 남아있어도
  // recent-posts-screen 에서 노출되지 않으니, 현재 살아있는 글만 카운트.
  const recentViewedCount = useMemo(() => {
    const aliveIds = new Set(allPosts.map((p) => p.id));
    return viewed.filter((v) => aliveIds.has(v.id)).length;
  }, [viewed, allPosts]);

  // 최근 본 글의 카테고리 분포 / 댓글을 단 글의 카테고리 분포 — 활동 요약 카피의 입력.
  const summary = useMemo(() => {
    const postById = new Map(allPosts.map((p) => [p.id, p] as const));
    // 최근 본 글 카테고리 집계
    const viewedCounts = new Map<string, number>();
    for (const entry of viewed) {
      const cat = postById.get(entry.id)?.category;
      if (!cat) continue;
      viewedCounts.set(cat, (viewedCounts.get(cat) ?? 0) + 1);
    }
    // 사용자가 댓글 단 글의 카테고리 집계 — 가장 댓글 활동이 많았던 게시판이 가중치 높음.
    const commentedCounts = new Map<string, number>();
    for (const c of userComments) {
      const cat = postById.get(c.postId)?.category;
      if (!cat) continue;
      commentedCounts.set(cat, (commentedCounts.get(cat) ?? 0) + 1);
    }
    return buildActivitySummary({
      topViewedCategoryId: topCategoryId(viewedCounts),
      topCommentedCategoryId: topCategoryId(commentedCounts),
    });
  }, [allPosts, viewed, userComments]);

  return (
    <main className="flex flex-1 flex-col px-4 pb-4">
      <header className="flex h-12 shrink-0 items-center">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">내 활동</span>
      </header>

      {/* 활동 요약 — 라일락 그라데이션 카드 + 동적 카피 + 하단 stats row */}
      <section className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#F4EEFF] via-[#EFE5FF] to-[#E6D7FF] p-[1px] shadow-[0_4px_16px_rgba(116,72,221,0.10)]">
        <div className="rounded-[17px] bg-white/85 p-4 backdrop-blur">
          {/* 상단 — 보라색 차트 아이콘 + "활동 요약" */}
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-holo-lilac-card-2 text-holo-purple-mid">
              <TrendUpIcon />
            </span>
            <span className="text-[14px] font-semibold text-holo-ink">
              활동 요약
            </span>
            <span className="ml-auto text-holo-purple-mid/70" aria-hidden>
              <SparkleIcon />
            </span>
          </div>
          {/* 동적 헤드라인 — 줄바꿈을 \n 으로 처리. */}
          <p className="mt-3 whitespace-pre-line text-[14px] font-medium leading-relaxed text-holo-ink">
            {summary.headline}
          </p>
          {/* 데이터 출처 캡션 */}
          <p className="mt-2 text-[11px] text-holo-ink-3">{summary.caption}</p>
          {/* 하단 stats — 글/댓글/접속일 — 가로 한 줄 */}
          <div className="mt-3 flex items-center gap-3 border-t border-holo-line-3 pt-3 text-[12px] text-holo-ink-2">
            <SummaryStat icon={<PencilIcon />} color="text-holo-purple-mid">
              글 <span className="font-semibold text-holo-ink">{postsCount}</span>개
            </SummaryStat>
            <span aria-hidden className="text-holo-line-2">·</span>
            <SummaryStat icon={<BubbleIcon />} color="text-[#D6488A]">
              댓글{" "}
              <span className="font-semibold text-holo-ink">{commentsCount}</span>개
            </SummaryStat>
            <span aria-hidden className="text-holo-line-2">·</span>
            <SummaryStat icon={<ClockIcon />} color="text-[#C97A1F]">
              접속{" "}
              <span className="font-semibold text-holo-ink">{activeDays}</span>일
            </SummaryStat>
          </div>
        </div>
      </section>

      {/* 활동 목록 — 아이콘 + 라벨 + 카운트 + 화살표 */}
      <ul className="mt-4 flex flex-col gap-2">
        <ActivityRow
          to="/mypage/posts"
          icon={<PencilIcon />}
          iconBg="bg-[#EFE5FF]"
          iconColor="text-holo-purple-mid"
          label="내가 쓴 글"
          count={postsCount}
        />
        <ActivityRow
          to="/mypage/comments"
          icon={<BubbleIcon />}
          iconBg="bg-[#FFE7F0]"
          iconColor="text-[#D6488A]"
          label="내가 쓴 댓글"
          count={commentsCount}
        />
        <ActivityRow
          to="/mypage/recent"
          icon={<ClockIcon />}
          iconBg="bg-[#FFF0DA]"
          iconColor="text-[#C97A1F]"
          label="최근 본 글"
          count={recentViewedCount}
        />
      </ul>

      {/* CTA — 좌측: 텍스트 (수직 중앙) / 우측: 일러스트 + 버튼 (수직 중앙).
          양쪽 컬럼을 items-center 로 정렬해 카드 안 여백이 균등해 보이도록 함. */}
      <Link
        to="/mypage/neighborhood"
        className="mt-3 flex items-center gap-3 overflow-hidden rounded-[18px] bg-gradient-to-br from-holo-lilac-card-2 to-[#F1E6FF] p-5 shadow-[0_4px_16px_rgba(116,72,221,0.10)] transition active:scale-[0.99]"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[17px] font-bold leading-snug text-holo-ink">
            나와 닮은 이웃을
            <br />
            만나볼까요?
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-holo-ink-3">
            AI 추천을 통해
            <br />
            새로운 이웃을 만나보세요!
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <NeighborhoodIllustration />
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-holo-gradient px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-[0_2px_6.9px_rgba(84,43,180,0.35)]">
            이웃찾기
            <ArrowRightSmall />
          </span>
        </div>
      </Link>
    </main>
  );
}

/**
 * 활동 요약 카드 하단의 가로 stats — "글 0개", "댓글 2개", "접속 1일" 처럼 한 줄에 압축 노출.
 */
function SummaryStat({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`flex h-4 w-4 items-center justify-center ${color}`}>
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}

function ActivityRow({
  to,
  icon,
  iconBg,
  iconColor,
  label,
  count,
}: {
  to: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  count?: number;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-[14px] bg-white px-4 py-3 ring-1 ring-holo-line-3 transition active:scale-[0.99] active:bg-holo-lilac-soft/40"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}
        >
          {icon}
        </span>
        <span className="flex-1 text-[14px] font-medium text-holo-ink">
          {label}
        </span>
        {count !== undefined && (
          <span className="text-[13px] font-semibold text-holo-purple-mid">
            {count}
          </span>
        )}
        <ChevronRightIcon />
      </Link>
    </li>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function BubbleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
/** 활동 요약 카드 좌상단 아이콘 — 우상향 추세선. */
function TrendUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}
/** 활동 요약 카드 우상단 데코 — 작은 반짝임. */
function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}
function ArrowRightSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

/**
 * CTA 카드 우측의 작은 일러스트 — 작은 집 / 창문 모양으로 "이웃 방" 컨셉.
 */
function NeighborhoodIllustration() {
  return (
    <svg
      width="80"
      height="70"
      viewBox="0 10 68 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <path d="M10 32 L22 22 L34 32 L34 56 L10 56 Z" fill="#C7BDFF" stroke="#7448DD" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="17" y="38" width="10" height="10" fill="#FFFFFF" stroke="#7448DD" strokeWidth="1.2" />
      <path d="M22 38 V48 M17 43 H27" stroke="#7448DD" strokeWidth="1" />
      <path d="M30 36 L44 24 L58 36 L58 58 L30 58 Z" fill="#FFFFFF" stroke="#7448DD" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="40" y="44" width="8" height="14" fill="#7448DD" rx="1.5" />
      <circle cx="46" cy="51" r="0.9" fill="#FFFFFF" />
      <rect x="33" y="40" width="5" height="5" fill="#FFE08A" stroke="#7448DD" strokeWidth="1" />
      <rect x="50" y="40" width="5" height="5" fill="#FFE08A" stroke="#7448DD" strokeWidth="1" />
      <path d="M44 16 C 42 12, 36 13, 36 18 C 36 22, 44 26, 44 26 C 44 26, 52 22, 52 18 C 52 13, 46 12, 44 16 Z" fill="#FF9AB8" stroke="#D6488A" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
