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
import { getUserComments } from "@/shared/stores/comments-store";
import { getLikedCount } from "@/shared/stores/likes-store";
import { getFriends } from "@/features/mypage/friends-store";
import { getProfile } from "@/shared/stores/profile-store";
import { pushRewardNotification } from "@/shared/stores/notifications-store";

type Metrics = {
  level: number;
  myPosts: number;
  myFreePosts: number;
  comments: number;
  likesGiven: number;
  friends: number;
};

type Rule =
  | { kind: "badge"; id: string; label: string; met: (m: Metrics) => boolean }
  | { kind: "title"; name: string; met: (m: Metrics) => boolean };

// data.ts 의 정의와 동일한 이름·기준치. (코드 직접 확인)
const RULES: Rule[] = [
  { kind: "badge", id: "badge_07", label: "다정한 이웃", met: (m) => m.comments >= 50 },
  { kind: "badge", id: "badge_23", label: "HOLO 수호신", met: (m) => m.level >= 30 },
  { kind: "title", name: "#동네_수다왕", met: (m) => m.myFreePosts >= 20 },
  { kind: "title", name: "#댓글_장인", met: (m) => m.comments >= 200 },
  { kind: "title", name: "#동네_프로참견러", met: (m) => m.comments >= 500 },
  { kind: "title", name: "#동네_인싸", met: (m) => m.friends >= 20 },
  { kind: "title", name: "#우리동네_전설", met: (m) => m.myPosts + m.comments >= 1000 },
  { kind: "title", name: "#인류애_충전기", met: (m) => m.likesGiven >= 1000 },
];

/** 현재 지표를 평가해 기준 충족한 배지/칭호를 발급(신규 발급 시 알림). */
export function evaluateAchievements(): void {
  const stats = getStats();
  if (typeof window === "undefined") return;
  // 로그인(계정 포인터) 전이면 평가 보류 — 닉네임/지표가 비어 오발급 방지.
  const nick = getProfile().nickname;
  if (!nick) return;

  const myPosts = postsStore.getPosts().filter((p) => p.authorNickname === nick);
  const m: Metrics = {
    level: stats.level,
    myPosts: myPosts.length,
    myFreePosts: myPosts.filter((p) => p.category === "free").length,
    comments: getUserComments().length,
    likesGiven: getLikedCount(),
    friends: getFriends().length,
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
