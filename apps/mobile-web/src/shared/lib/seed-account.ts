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
import { BADGES, type Post } from "@/shared/mock/data";
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

  // 획득한 뱃지에 대해 날짜 시드 — mock 의 b.date 가 있으면 그것을 우선, 없으면
  // 시드 시점 기준으로 인덱스에 따라 적당한 과거 날짜를 생성한다 (데모용).
  const acquiredBadgeDates: Record<string, string> = {};
  seed.acquiredBadgeIds.forEach((id, i) => {
    const mockBadge = BADGES.find((b) => b.id === id);
    if (mockBadge?.date) {
      acquiredBadgeDates[id] = mockBadge.date;
    } else {
      const daysAgo = (seed.acquiredBadgeIds.length - i) * 30 + 5;
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      acquiredBadgeDates[id] = `${y}.${m}.${day}`;
    }
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
