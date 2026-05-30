/**
 * 게시판 "실시간 TOP" / "주간 TOP" 랭킹 점수 계산 단일 출처.
 *
 * board-list-screen 안에 흩어져 있던 정렬식을 모아두는 모듈. 두 모드 모두
 * 좋아요·댓글·조회수를 가중치로 합산해 하나의 score 로 줄이는 통합 점수 모델이며,
 * 모드별 차이는 "가중치" 와 "시간 감쇠 적용 여부" 두 가지뿐이다.
 *
 *   실시간(live):  좋아요×4 + 댓글×3 + 조회수×0.1  ➜  (hours + 1)^2 로 강하게 감쇠
 *   주간(weekly):  좋아요×2 + 댓글×8 + 조회수×0.15 ➜  감쇠 없음 (7일 누적)
 *
 * - 실시간은 "즉각 반응"이라 좋아요 가중치를 크게 잡고, 24h 안에 강하게 사그라들도록
 *   2제곱 감쇠를 둔다 — Hacker News 의 1.8 보다 더 가파른 곡선.
 * - 주간은 "토론 깊이"라 댓글 가중치가 압도적으로 크고, 7일 안에서는 신선도 차이를 두지
 *   않아 누적 engagement 만으로 줄세운다.
 *
 * 점수와 함께 breakdown 을 같이 돌려주므로, UI 에서 "왜 이 글이 1위인가" 를 그대로
 * 보여줄 수 있다 (헤더의 ⓘ 안내, 카드 옆 보조 라벨 등).
 */

import type { Post } from "@/shared/mock/data";

/**
 * 실시간 TOP 가중치. 즉각 반응(좋아요) 강조 + 강한 시간 감쇠.
 * UI 안내에 그대로 쓸 수 있도록 export — 가중치 변경 시 안내문도 자동 갱신.
 */
export const LIVE_WEIGHTS = {
  likes: 4,
  comments: 3,
  views: 0.1,
} as const;

/**
 * 주간 TOP 가중치. 토론(댓글) 강조 + 시간 감쇠 없음.
 */
export const WEEKLY_WEIGHTS = {
  likes: 2,
  comments: 8,
  views: 0.15,
} as const;

/** 주간 TOP 에 포함시킬 최대 기간 — 7일을 분 단위로 (7d × 24h × 60m). */
export const WEEK_MINUTES = 7 * 24 * 60;

/** 표시 개수 상한 — TOP 리스트는 길어도 30개 까지. */
export const TOP_LIMIT = 30;

/** 점수 계산에 필요한 "실효 카운트" — 작성자/사용자 활동을 합친 최신 값. */
export type EffectiveCounts = {
  likes: number;
  comments: number;
  views: number;
  /** 작성된 지 몇 시간 전인지 — 시간 감쇠 입력. */
  hours: number;
};

/** 점수와 함께 어떻게 그 점수가 나왔는지 보여주기 위한 분해값. */
export type ScoreBreakdown = EffectiveCounts & {
  /** 가중치 합산만 한 값 (감쇠 전). */
  engagement: number;
  /** 최종 점수 (실시간은 engagement / (hours+1)^2, 주간은 engagement 그대로). */
  score: number;
};

/**
 * "방금 전 / N분 전 / N시간 전 / N일 전 / N주 전" 같은 한국어 상대시간 라벨을
 * 분 단위 숫자로 환산. 매칭이 안 되면 +Infinity 를 돌려 정렬에서 자연스럽게 뒤로 밀린다.
 *
 * 모듈 외부에서도 "주간 7일 필터" 등에 사용할 수 있도록 export.
 */
export function parseTimeAgoMinutes(timeAgo: string): number {
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

/**
 * 실시간 TOP 점수.
 *   score = (likes×4 + comments×3 + views×0.1) / (hours + 1)^2
 */
export function computeLiveScore(counts: EffectiveCounts): ScoreBreakdown {
  const engagement =
    counts.likes * LIVE_WEIGHTS.likes +
    counts.comments * LIVE_WEIGHTS.comments +
    counts.views * LIVE_WEIGHTS.views;
  const score = engagement / Math.pow(counts.hours + 1, 2);
  return { ...counts, engagement, score };
}

/**
 * 주간 TOP 점수.
 *   score = likes×2 + comments×8 + views×0.15
 * 시간 감쇠 없음 — 호출자는 사전에 7일 윈도우로 필터링해서 넣어야 한다.
 */
export function computeWeeklyScore(counts: EffectiveCounts): ScoreBreakdown {
  const engagement =
    counts.likes * WEEKLY_WEIGHTS.likes +
    counts.comments * WEEKLY_WEIGHTS.comments +
    counts.views * WEEKLY_WEIGHTS.views;
  return { ...counts, engagement, score: engagement };
}

/**
 * 게시글 한 건에 대한 실효 카운트.
 *
 * - likes: post.likes + (현재 사용자가 좋아요 눌렀으면 +1)
 * - comments: 호출자에게서 받은 getCommentCount(post) 결과 — POST_COMMENTS + 사용자 댓글
 * - views: 호출자에게서 받은 getViews(post) 결과 — baseline + 증분
 * - hours: post.timeAgo 를 시간 단위로 변환
 *
 * 좋아요 / 조회수 / 댓글이 변할 때마다 React 가 알아서 재계산하도록, store 구독은
 * 호출 측(use*-Set / useViewCounts / useUserComments)에서 한다.
 */
export function effectiveCountsFor(
  post: Post,
  ctx: {
    likedSet: Set<string>;
    getCommentCount: (p: Post) => number;
    getViews: (p: Post) => number;
  },
): EffectiveCounts {
  return {
    // post.likes 는 patchLikes 로 본인 좋아요가 이미 반영된 값 — 추가 +1 은 이중 카운트.
    // (상세/리스트 카드와 동일하게 단일 출처 사용)
    likes: post.likes,
    comments: ctx.getCommentCount(post),
    views: ctx.getViews(post),
    hours: parseTimeAgoMinutes(post.timeAgo) / 60,
  };
}

/**
 * 실시간 TOP — posts 를 받아 정렬·상위 TOP_LIMIT 개만 잘라 돌려준다.
 */
export function rankLive(
  posts: Post[],
  ctx: {
    likedSet: Set<string>;
    getCommentCount: (p: Post) => number;
    getViews: (p: Post) => number;
  },
): Post[] {
  return [...posts]
    .map((p) => ({ p, s: computeLiveScore(effectiveCountsFor(p, ctx)).score }))
    .sort((a, b) => b.s - a.s)
    .slice(0, TOP_LIMIT)
    .map((x) => x.p);
}

/**
 * 주간 TOP — 7일 이내 글만 모아 가중치 합산으로 정렬. 동점일 때 댓글 많은 쪽 우선.
 */
export function rankWeekly(
  posts: Post[],
  ctx: {
    likedSet: Set<string>;
    getCommentCount: (p: Post) => number;
    getViews: (p: Post) => number;
  },
): Post[] {
  return [...posts]
    .filter((p) => parseTimeAgoMinutes(p.timeAgo) <= WEEK_MINUTES)
    .map((p) => ({
      p,
      breakdown: computeWeeklyScore(effectiveCountsFor(p, ctx)),
    }))
    .sort((a, b) => {
      if (b.breakdown.score !== a.breakdown.score) {
        return b.breakdown.score - a.breakdown.score;
      }
      return b.breakdown.comments - a.breakdown.comments;
    })
    .slice(0, TOP_LIMIT)
    .map((x) => x.p);
}
