import type { Meetup } from "./home-meetup-card";
import type { Persona } from "./home-faces";
import type { Post } from "@/shared/mock/data";
import { getAvatarUrl } from "@/features/chat/avatars";
import { calcJoined, deriveMeetupMembers } from "@/features/board/meetup-utils";
import { distanceMeters, type GeoPosition } from "@/shared/hooks/use-geolocation";

/** 미터 → "350m" / "1.2km" 표시 문자열 */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Post → Meetup 변환.
 * 멤버 얼굴/인원수는 맵·게시글 상세·채팅방과 동일한 단일 출처(calcJoined/deriveMeetupMembers)를 쓴다.
 * (이전엔 정원(peopleCount)을 인원수로, pickPersonas 로 게시글과 무관한 가짜 얼굴을 채워
 *  홈에서만 '+N 가짜 인원'·모르는 얼굴이 떠 다른 화면과 불일치했다.)
 */
export function postToMeetup(post: Post, userPos?: GeoPosition | null): Meetup {
  const { baseJoined } = calcJoined(post);
  // 작성자 얼굴 우선 + 실제 멤버 닉네임 얼굴만 (가짜 personas 제거)
  const memberNames = deriveMeetupMembers(post, baseJoined);
  const seedNames = [
    post.authorNickname,
    ...memberNames.filter((n) => n !== post.authorNickname),
  ];
  const members: Persona[] = seedNames.map((n) => ({
    name: n,
    face: getAvatarUrl(n),
  }));

  // 거리 — 내 위치(위치 공유 ON + 권한 허용)와 글 위치가 모두 있을 때만 실제 계산.
  // 계산 불가 시 빈 문자열 → 카드에서 거리 표기를 생략한다(가짜 "0m" 노출 방지).
  const distance =
    userPos && post.location
      ? formatDistance(distanceMeters(userPos, post.location))
      : "";

  return {
    id: post.id,
    title: post.title,
    distance,
    // 등록 후 경과시간 — created_at 기반으로 계산된 실제 값("방금 전" / "N분 전" 등).
    duration: post.timeAgo,
    description: post.description,
    members,
    // 정원이 아니라 실제 참여 인원(baseJoined) — 맵/상세/채팅과 동일. 가짜 +N 노출 방지.
    totalCount: baseJoined,
    dim: post.status === "모집완료",
  };
}

/**
 * Supabase 실게시글만 사용해 count개 반환. 부족하면 있는 만큼만 반환.
 * userPos 가 주어지면 각 카드의 거리를 실제 좌표 기반으로 계산한다.
 */
export function pickMeetupsFromPosts(
  posts: Post[],
  count: number,
  exclude?: Meetup[],
  userPos?: GeoPosition | null,
): Meetup[] {
  const excludeIds = new Set((exclude ?? []).map((m) => m.id));
  // 내 위치가 있으면 '근처'(5km) 모임만 — 빈상태 문구('아직 근처 모임이 없어요')·맵과 일치.
  // (이전엔 거리 무시하고 앞에서 N개만 뽑아 50km 떨어진 글도 '추천 모임'에 떴다.)
  const RADIUS_M = 5000;
  return posts
    .filter(
      (p) =>
        p.status !== "모집완료" &&
        !excludeIds.has(p.id) &&
        (!userPos || !p.location || distanceMeters(userPos, p.location) <= RADIUS_M),
    )
    .slice(0, count)
    .map((p) => postToMeetup(p, userPos));
}
