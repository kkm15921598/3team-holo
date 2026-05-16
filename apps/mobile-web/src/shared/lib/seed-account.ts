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
import { setPoints } from "@/features/myroom/myroom-store";
import { postsStore } from "@/features/board/posts-store";
import { ensureMeetupRoom } from "@/features/board/meetup-utils";
import { clearMeetupRooms } from "@/features/chat/rooms-store";
import { resetXp, setTotalXp } from "@/shared/stores/xp-store";

/** "YYYY.MM.DD" 형식의 joinedAt 을 Date 로 파싱. 형식이 어긋나면 오늘로 폴백. */
function parseJoinedAt(s: string): Date {
  const m = s?.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function seedAccount(account: TestAccount): void {
  const seed = account.seedData;
  if (!seed) {
    // 시드 데이터 없는 계정 — 기본값으로 리셋만 한다.
    resetStats();
    setLikedIds([]);
    setJoinedIds([]);
    setViewedIds([]);
    setComments([]);
    resetXp();
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
  // 레벨에 맞춰 XP 시드 — (level-1) * 500 + 340 로 "다음 레벨까지 160 XP" 상태 재현
  setTotalXp(Math.max(0, (seed.level - 1) * 500 + 340));

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
  const seededIds = seed.authoredPosts.map((p) => p.id);
  postsStore.remove(seededIds);
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
    postsStore.prepend(fullPost);
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
