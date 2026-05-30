/**
 * 배지/칭호 자동 발급 평가기.
 *
 * 배경: 배지·칭호 정의는 data.ts 에 있으나, 대부분 "기준 충족 시 발급" 트리거가 없어
 * 영영 못 받는 죽은 항목이었다. 여기서는 앱이 실제로 추적하는 전역 지표(레벨/내 글 수/
 * 자유글 수/내 댓글 수/내가 누른 좋아요 수/친구 수)로 판정 가능한 것만 자동 발급한다.
 *
 * (카테고리별 모임 횟수·연속 출석·새벽 활동 등은 추적 데이터가 없어 여기서 다루지 않는다.)
 *
 * recordBadge/TitleAcquired 는 이미 보유 시 no-op(멱등)이라 여러 번 호출해도 안전하다.
 */
import {
  getStats,
  recordBadgeAcquired,
  recordTitleAcquired,
} from "@/shared/stores/account-stats-store";
import { postsStore } from "@/features/board/posts-store";
import { isMyPost } from "@/features/board/author-identity";
import { getUserComments } from "@/shared/stores/comments-store";
import { getLikedCount } from "@/shared/stores/likes-store";
import { getFriends } from "@/features/mypage/friends-store";
import { getProfile } from "@/shared/stores/profile-store";
import { pushRewardNotification } from "@/shared/stores/notifications-store";
import { TITLES_META } from "@/shared/mock/data";

/** 8개 게시판 카테고리 키. */
const BOARD_CATS = ["food", "free", "game", "help", "media", "recommend", "share", "sport"] as const;

/** 칭호 tier 별 이름 목록 — 메타(누적) 칭호 판정에 사용. */
const COMMON_TITLES = TITLES_META.filter((t) => t.tier === "common").map((t) => t.name);
const RARE_TITLES = TITLES_META.filter((t) => t.tier === "rare").map((t) => t.name);

type Metrics = {
  level: number;
  myPosts: number;
  comments: number;
  likesGiven: number;
  friends: number;
  /** 카테고리별 내 글 수 (food/free/game/help/media/recommend/share/sport) */
  byCat: Record<string, number>;
  /** 글을 올린 적 있는 서로 다른 게시판 수(8개 중) */
  boardsActive: number;
  /** 보유한 '일반(common)' 칭호 개수 */
  commonTitlesOwned: number;
  /** 일반+희귀 칭호를 모두 보유했는가 */
  hasAllCommonRare: boolean;
};

type Rule =
  | { kind: "badge"; id: string; label: string; met: (m: Metrics) => boolean }
  | { kind: "title"; name: string; met: (m: Metrics) => boolean };

/**
 * 칭호 발급 규칙 — data.ts TITLES_META 의 condition 문구와 1:1로 일치해야 한다.
 * 원래 일부 칭호는 추적 불가한 조건(받은 좋아요·채택·새벽활동·인기글·수정삭제 등)이라
 * 영영 못 받는 죽은 항목이었다. 앱이 실제로 추적하는 지표(카테고리별 글 수·댓글·좋아요·
 * 친구·게시판 다양성·보유 칭호)로 전부 달성 가능하도록 재정의했다.
 * (recordTitle/BadgeAcquired 는 멱등이라 중복 호출 안전.)
 */
const RULES: Rule[] = [
  // ── 배지 ──
  { kind: "badge", id: "badge_07", label: "다정한 이웃", met: (m) => m.comments >= 50 },
  { kind: "badge", id: "badge_23", label: "HOLO 수호신", met: (m) => m.level >= 30 },

  // ── 일반 칭호 (28) ──
  { kind: "title", name: "#동네_수다왕", met: (m) => m.byCat.free >= 20 },
  { kind: "title", name: "#댓글_장인", met: (m) => m.comments >= 200 },
  { kind: "title", name: "#추천_요정", met: (m) => m.byCat.recommend >= 10 },
  { kind: "title", name: "#맛집_네비게이터", met: (m) => m.byCat.food >= 10 },
  { kind: "title", name: "#집밥_나눔왕", met: (m) => m.byCat.food >= 15 },
  { kind: "title", name: "#배달비_절약러", met: (m) => m.byCat.share >= 5 },
  { kind: "title", name: "#공구의_주인공", met: (m) => m.byCat.share >= 10 },
  { kind: "title", name: "#소분_마스터", met: (m) => m.byCat.share >= 15 },
  { kind: "title", name: "#게임_길드장", met: (m) => m.byCat.game >= 5 },
  { kind: "title", name: "#랜선_파티원", met: (m) => m.byCat.game >= 10 },
  { kind: "title", name: "#홈트_동기부여", met: (m) => m.byCat.sport >= 10 },
  { kind: "title", name: "#운동메이트", met: (m) => m.byCat.sport >= 15 },
  { kind: "title", name: "#정주행_마스터", met: (m) => m.byCat.media >= 15 },
  { kind: "title", name: "#스포주의_전문가", met: (m) => m.byCat.media >= 25 },
  { kind: "title", name: "#벌레_해결사", met: (m) => m.byCat.help >= 5 },
  { kind: "title", name: "#전등교체_마법사", met: (m) => m.byCat.help >= 10 },
  { kind: "title", name: "#조립식가구_장인", met: (m) => m.byCat.help >= 15 },
  { kind: "title", name: "#못박기_달인", met: (m) => m.byCat.help >= 20 },
  { kind: "title", name: "#와이파이_구원자", met: (m) => m.byCat.help >= 25 },
  { kind: "title", name: "#분리수거_박사", met: (m) => m.comments >= 50 },
  { kind: "title", name: "#동네_보안관", met: (m) => m.comments >= 100 },
  { kind: "title", name: "#무료나눔_천사", met: (m) => m.byCat.share >= 20 },
  { kind: "title", name: "#슬기로운_혼삶", met: (m) => m.boardsActive >= 5 },
  { kind: "title", name: "#청소력_만렙", met: (m) => m.likesGiven >= 50 },
  { kind: "title", name: "#동네_인싸", met: (m) => m.friends >= 20 },
  { kind: "title", name: "#오늘은_내가요리사", met: (m) => m.byCat.food >= 20 },
  { kind: "title", name: "#냉장고_탐험가", met: (m) => m.byCat.food >= 5 },
  { kind: "title", name: "#프로_공구러", met: (m) => m.byCat.share >= 30 },

  // ── 희귀 칭호 (8) ──
  { kind: "title", name: "#새벽의_해결사", met: (m) => m.byCat.help >= 30 },
  { kind: "title", name: "#오늘도_삽질중", met: (m) => m.myPosts >= 30 },
  { kind: "title", name: "#동네_프로참견러", met: (m) => m.comments >= 500 },
  { kind: "title", name: "#생활치트키", met: (m) => m.boardsActive >= 8 },
  { kind: "title", name: "#에어프라이어_연금술사", met: (m) => m.byCat.food >= 30 },
  { kind: "title", name: "#멀티탭_지배자", met: (m) => m.byCat.help >= 40 },
  { kind: "title", name: "#비오기전_빨래수거", met: (m) => m.myPosts >= 50 },
  { kind: "title", name: "#쿠팡의_후예", met: (m) => m.byCat.share >= 40 },

  // ── 전설 칭호 (4) ──
  { kind: "title", name: "#자취의_신", met: (m) => m.commonTitlesOwned >= 15 },
  { kind: "title", name: "#우리동네_전설", met: (m) => m.myPosts + m.comments >= 1000 },
  { kind: "title", name: "#인류애_충전기", met: (m) => m.likesGiven >= 1000 },
  { kind: "title", name: "#HOLO_살림의신", met: (m) => m.hasAllCommonRare },
];

/** 현재 지표를 평가해 기준 충족한 배지/칭호를 발급(신규 발급 시 알림). */
export function evaluateAchievements(): void {
  const stats = getStats();
  if (typeof window === "undefined") return;
  // 로그인(계정 포인터) 전이면 평가 보류 — 닉네임/지표가 비어 오발급 방지.
  const nick = getProfile().nickname;
  if (!nick) return;

  const myPosts = postsStore.getPosts().filter((p) => isMyPost(p));
  const byCat: Record<string, number> = {};
  for (const c of BOARD_CATS) byCat[c] = 0; // 0 으로 초기화해 undefined 비교 방지
  for (const p of myPosts) {
    if (p.category in byCat) byCat[p.category] += 1;
  }
  const boardsActive = BOARD_CATS.filter((c) => byCat[c] > 0).length;
  const owned = new Set(stats.acquiredTitles);
  const commonTitlesOwned = COMMON_TITLES.filter((n) => owned.has(n)).length;
  const hasAllCommonRare =
    COMMON_TITLES.every((n) => owned.has(n)) && RARE_TITLES.every((n) => owned.has(n));

  const m: Metrics = {
    level: stats.level,
    myPosts: myPosts.length,
    comments: getUserComments().length,
    likesGiven: getLikedCount(),
    friends: getFriends().length,
    byCat,
    boardsActive,
    commonTitlesOwned,
    hasAllCommonRare,
  };

  for (const r of RULES) {
    if (!r.met(m)) continue;
    if (r.kind === "badge") {
      if (recordBadgeAcquired(r.id)) {
        pushRewardNotification(
          "🏅 새 배지 획득",
          `'${r.label}' 배지를 획득했어요!`,
          "/mypage/badges",
        );
      }
    } else {
      if (recordTitleAcquired(r.name)) {
        pushRewardNotification(
          "🎖️ 새 칭호 획득",
          `'${r.name}' 칭호를 획득했어요!`,
          "/mypage/titles",
        );
      }
    }
  }
}
