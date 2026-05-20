import { pickPersonas } from "./home-faces";
import type { Meetup } from "./home-meetup-card";
import type { Persona } from "./home-faces";
import type { Post } from "@/shared/mock/data";
import { getAvatarUrl } from "@/features/chat/avatars";

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

export function postToMeetup(post: Post): Meetup {
  const seed = hashId(post.id);
  // 작성자 얼굴을 첫 번째 멤버로 — authorNickname 기반 아바타 URL을 Persona 형식으로 래핑
  const authorPersona: Persona = {
    name: post.authorNickname,
    face: getAvatarUrl(post.authorNickname),
  };
  const extraCount = Math.min(Math.max((post.participants?.length ?? 1) - 1, 0), 2);
  const extraPersonas = extraCount > 0 ? pickPersonas(seed, extraCount) : [];
  const members = [authorPersona, ...extraPersonas];
  return {
    id: post.id,
    title: post.title,
    distance: post.distance,
    duration: post.duration,
    description: post.description,
    members,
    totalCount: post.peopleCount ?? post.participants?.length ?? 1,
    dim: post.status === "모집완료",
  };
}

/**
 * Supabase 실게시글만 사용해 count개 반환. 부족하면 있는 만큼만 반환.
 */
export function pickMeetupsFromPosts(
  posts: Post[],
  count: number,
  exclude?: Meetup[],
): Meetup[] {
  const excludeIds = new Set((exclude ?? []).map((m) => m.id));
  return posts
    .filter((p) => p.status !== "모집완료" && !excludeIds.has(p.id))
    .slice(0, count)
    .map(postToMeetup);
}
