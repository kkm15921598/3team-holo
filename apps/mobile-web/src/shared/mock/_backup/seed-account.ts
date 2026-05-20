/**
 * 테스트 계정 로그인 시 mock 데이터를 모든 store 에 일괄 시드한다.
 * - 통계(account-stats-store)
 * - 포인트(myroom-store)
 * - 좋아요(likes-store)
 * - 참여(joined-store)
 * - 최근 본 글(viewed-posts-store)
 * - 댓글(comments-store)
 * - 작성 글(postsStore.prepend)
 *
 * 다른 계정 로그인 시 같은 함수가 다시 호출되며 store 들을 덮어쓴다.
 * 일반(테스트가 아닌) 계정은 seedData 가 없어 아무 일도 일어나지 않는다.
 */
import { type Post } from "@/shared/mock/data";
import type { TestAccount } from "@/shared/mock/test-accounts";
import { setStats, resetStats } from "@/shared/stores/account-stats-store";
import { setLikedIds } from "@/shared/stores/likes-store";
import { setJoinedIds } from "@/shared/stores/joined-store";
import { setViewedIds } from "@/shared/stores/viewed-posts-store";
import { setComments } from "@/shared/stores/comments-store";
import { setPoints, clearPointHistory } from "@/features/myroom/myroom-store";
import { postsStore } from "@/features/board/posts-store";
import { ensureMeetupRoom } from "@/features/board/meetup-utils";
import { clearMeetupRooms } from "@/features/chat/rooms-store";
import {
  cumulativeXpForLevel,
  resetXp,
  setTotalXp,
  xpRequiredForLevel,
  seedAttendanceDates,
} from "@/shared/stores/xp-store";
import { resetVerification } from "@/shared/stores/verification-store";
import {
  resetActivityStore,
  setActivityState,
} from "@/shared/stores/activity-store";

/** Date → "YYYY-MM-DD" ISO 문자열 */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 가입일(start) 부터 오늘까지의 모든 날짜를 ISO 문자열 배열로 반환.
 * 가입일이 오늘 이후거나 같으면 [오늘] 만.
 */
function datesBetween(start: Date): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  if (cursor.getTime() > today.getTime()) return [ymd(today)];
  const out: string[] = [];
  while (cursor.getTime() <= today.getTime()) {
    out.push(ymd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * 이번 주 월요일 ~ 어제까지의 날짜 (오늘은 제외).
 * 테스트 계정의 "이번 주 출석체크 일부 완료" 상태를 시드할 때 사용.
 * 오늘이 월요일이면 빈 배열 — 사용자가 첫 출석을 직접 하도록 둔다.
 */
function thisWeekUpToYesterday(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 일=0, 월=1, ..., 토=6
  const offsetFromMonday = dow === 0 ? 6 : dow - 1; // 월=0, 화=1, ..., 일=6
  const out: string[] = [];
  for (let i = 0; i < offsetFromMonday; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (offsetFromMonday - i));
    out.push(ymd(d));
  }
  return out;
}

/** "YYYY.MM.DD" 형식의 joinedAt 을 Date 로 파싱. 형식이 어긋나면 오늘로 폴백. */
function parseJoinedAt(s: string): Date {
  const m = s?.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function seedAccount(account: TestAccount): void {
  // 계정 전환 시 이전 계정에서 누설될 수 있는 상태를 먼저 정리한다.
  // - 포인트 이용 내역 (이전 계정의 적립/차감 기록이 그대로 남는 문제)
  // - 위치 인증 (이전 계정의 verifiedRegion 이 새 계정에 그대로 노출되는 문제)
  // 두 항목 모두 localStorage 영속이라 이전 세션의 잔여 데이터를 명시적으로 지워야 한다.
  clearPointHistory();
  resetVerification();

  const seed = account.seedData;
  if (!seed) {
    // 시드 데이터 없는 계정 — 기본값으로 리셋만 한다.
    resetStats();
    setLikedIds([]);
    setJoinedIds([]);
    setViewedIds([]);
    setComments([]);
    resetXp();
    resetActivityStore();
    return;
  }

  // 획득한 뱃지에 대해 날짜 시드 — 가입일(joinedAt) ~ 오늘 사이로 균등하게 분포.
  // mock BADGES.date 는 무시 (그건 기본 ME 사용자의 가상 날짜라 테스트 계정 가입 스토리와 안 맞음).
  // index 0 = 가입 직후 획득, 마지막 index = 오늘 획득 으로 시간 순서가 자연스럽도록 한다.
  const acquiredBadgeDates: Record<string, string> = {};
  const joinedAt = parseJoinedAt(account.joinedAt);
  const today = new Date();
  // 가입 시점이 오늘과 같거나 미래면 0 으로 클램프 → 모두 오늘 획득
  const spanDays = Math.max(
    0,
    Math.floor((today.getTime() - joinedAt.getTime()) / 86400000),
  );
  const n = seed.acquiredBadgeIds.length;
  seed.acquiredBadgeIds.forEach((id, i) => {
    const offset = n <= 1 ? spanDays : Math.round((i * spanDays) / (n - 1));
    const d = new Date(joinedAt);
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    acquiredBadgeDates[id] = `${y}.${m}.${day}`;
  });

  // 통계 / 포인트
  setStats({
    level: seed.level,
    acquiredBadgeIds: seed.acquiredBadgeIds,
    acquiredTitles: seed.acquiredTitles,
    acquiredBadgeDates,
  });
  setPoints(seed.points);
  // 레벨에 맞춰 XP 시드 — 새 LEVEL_XP_REQUIRED 테이블 기준으로:
  //   "그 레벨에 막 들어선 직후 + 다음 레벨 요구치의 절반" 위치로 둔다.
  //   예) seed.level=1 → 0 + 15 = 15 XP (Lv 1 의 절반)
  //       seed.level=5 → 30+40+50+60 + 40 = 220 XP (Lv 5 의 절반)
  // 종전엔 옛 500/레벨 공식(setTotalXp((level-1)*500+340)) 을 그대로 써서 새 테이블과 어긋났다 —
  // 결과적으로 stats.level 이 1인데 totalXp 가 6레벨치라 화면 표시가 mod 30 으로 튀는 버그가 있었다.
  const base = cumulativeXpForLevel(seed.level);
  const halfNext = Math.floor(xpRequiredForLevel(seed.level) / 2);
  setTotalXp(Math.max(0, base + halfNext));

  // 접속일수 시드 — 가입일 ~ 오늘 사이 모든 날짜를 활동 일자로 기록.
  // joinedAt 이 오래된 계정(예: 5/8 가입 → 오늘이 5/16 이면 9일)일수록 큰 숫자가 나옴.
  const activeDates = datesBetween(joinedAt);
  setActivityState({
    signupDate: ymd(joinedAt),
    activeDates,
  });

  // 이번 주 출석 시드 — 월~어제 까지는 모두 출석한 것으로 가정.
  // 오늘은 시드하지 않아 사용자가 직접 "오늘 출석" 버튼으로 적립을 체험할 수 있게 한다.
  // (월요일이면 빈 배열이라 시드 없음 → 사용자가 오늘이 첫 출석)
  seedAttendanceDates(thisWeekUpToYesterday());

  // 좋아요 / 참여 / 최근 본 글
  setLikedIds(seed.likedPostIds);
  setJoinedIds(seed.joinedPostIds);
  setViewedIds(seed.viewedPostIds);

  // 댓글 — 닉네임은 현재 계정으로 채움
  setComments(
    seed.comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      parentId: c.parentId,
      nickname: account.nickname,
      content: c.content,
      timeAgo: c.timeAgo,
    })),
  );

  // 작성한 게시글 — 같은 id 가 이미 있으면 먼저 제거 (재로그인 시 중복 방지)
  // prependLocal/removeLocal 사용 → Supabase 에 저장하지 않음 (테스트 데이터 오염 방지)
  const seededIds = seed.authoredPosts.map((p) => p.id);
  postsStore.removeLocal(seededIds);
  for (const p of seed.authoredPosts) {
    const fullPost: Post = {
      id: p.id,
      category: p.category,
      status: p.status,
      title: p.title,
      description: p.description,
      distance: p.distance,
      duration: p.duration,
      likes: p.likes,
      comments: p.comments,
      timeAgo: p.timeAgo,
      authorNickname: account.nickname,
      authorLevel: p.authorLevel,
      meetupType: p.meetupType,
      peopleCount: p.peopleCount,
      place: p.place,
    };
    postsStore.prependLocal(fullPost);
  }

  // 테스트 계정 시드 시 mock 의 모임 채팅방(주말 등산 크루, 공구러 모임 등)은 제거하고
  // 사용자가 실제로 참여한 게시글의 채팅방만 보장한다.
  clearMeetupRooms();
  const allPosts = postsStore.getPosts();
  for (const postId of seed.joinedPostIds) {
    const post = allPosts.find((p) => p.id === postId);
    if (post) ensureMeetupRoom(post);
  }
}
