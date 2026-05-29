import { pickPersonas } from "./home-faces";
import type { Meetup } from "./home-meetup-card";
import type { Persona } from "./home-faces";
import type { Post } from "@/shared/mock/data";
import { getAvatarUrl } from "@/features/chat/avatars";
import { distanceMeters, type GeoPosition } from "@/shared/hooks/use-geolocation";

/** 미터 → "350m" / "1.2km" 표시 문자열 */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Post → Meetup 변환.
 * 참여자 아바타는 post.id 기반으로 personas 풀에서 결정론적으로 선택.
 */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function postToMeetup(post: Post, userPos?: GeoPosition | null): Meetup {
  const seed = hashId(post.id);
  // 작성자 얼굴을 첫 번째 멤버로 — authorNickname 기반 아바타 URL을 Persona 형식으로 래핑
  const authorPersona: Persona = {
    name: post.authorNickname,
    face: getAvatarUrl(post.authorNickname),
  };
  const extraCount = Math.min(Math.max((post.participants?.length ?? 1) - 1, 0), 2);
  const extraPersonas = extraCount > 0 ? pickPersonas(seed, extraCount) : [];
  const members = [authorPersona, ...extraPersonas];

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
    totalCount: post.peopleCount ?? post.participants?.length ?? 1,
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
  return posts
    .filter((p) => p.status !== "모집완료" && !excludeIds.has(p.id))
    .slice(0, count)
    .map((p) => postToMeetup(p, userPos));
}
