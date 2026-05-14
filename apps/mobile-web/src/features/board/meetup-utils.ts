// 게시글(모임) ↔ 채팅방 ↔ 홈/맵 카드 간 인원 계산과 멤버 도출을 단일 출처로 관리하는 헬퍼.
// 홈 카드, 맵 카드, 게시글 상세, 채팅방이 모두 동일한 결과를 쓰도록 여기로 모았다.

import { ME, POST_COMMENTS, type ChatRoom, type Post } from "@/shared/mock/data";
import { MEETUP_POOL } from "@/features/home/home-meetups-data";
import { addRoom, getRoom } from "@/features/chat/rooms-store";

/** 모임 게시글에 대응되는 채팅방 id (게시글당 단일 채팅방). */
export function meetupRoomId(postId: string): string {
  return `meetup-${postId}`;
}

/**
 * 게시글의 정원/현재 참여 인원 계산 — 홈 카드 / 맵 카드 / 게시글 UI / 채팅방이
 * 동일한 인원수를 쓰도록 단일 출처로 사용된다.
 * - capacity: post.peopleCount, 없으면 5.
 * - baseJoined: 게시글이 모집완료면 capacity, 아니면 participants.length
 *   (없을 때만 옛 공식 capacity-2 으로 fallback). 항상 capacity 로 클램프.
 */
export function calcJoined(post: Post): { capacity: number; baseJoined: number } {
  const capacity = post.peopleCount ?? 5;
  if (post.status === "모집완료") return { capacity, baseJoined: capacity };
  const fromParticipants = post.participants?.length;
  const raw =
    fromParticipants !== undefined
      ? fromParticipants
      : Math.max(1, capacity - 2);
  return { capacity, baseJoined: Math.min(capacity, raw) };
}

/** MEETUP_POOL / POST_COMMENTS 로 채울 수 없을 때 쓰는 대체 닉네임 풀. */
export const MEMBER_FALLBACK_POOL = [
  "감자튀김",
  "껍질은 달걀껍질",
  "멜론은 키위를 좋아해",
  "감자 없는 카레",
  "두부의 단단함",
  "포도껍질",
];

/**
 * 게시글에서 채팅방/카드 멤버 닉네임 N개를 도출.
 * - 1순위: 작성자 (첫 번째 → 방장)
 * - 2순위: 홈 추천 모임 데이터(MEETUP_POOL) 의 멤버
 * - 3순위: 댓글 작성자
 * - 4순위: 일반 닉네임 fallback 풀
 * 정확히 targetCount 개를 반환하며, 부족하면 풀로 채우고 넘치면 잘라낸다.
 * 항상 나(ME) 는 제외한다.
 */
export function deriveMeetupMembers(post: Post, targetCount: number): string[] {
  const names: string[] = [];
  const add = (n: string | undefined) => {
    if (!n || n === ME.nickname || names.includes(n)) return;
    names.push(n);
  };

  // 1) 작성자
  add(post.authorNickname);
  // 2) 홈 MEETUP_POOL 멤버
  const home = MEETUP_POOL.find((m) => m.id === post.id);
  if (home) for (const m of home.members) add(m.name);
  // 3) 댓글 작성자
  const comments = POST_COMMENTS[post.id] ?? [];
  for (const c of comments) add(c.nickname);
  // 4) Fallback 풀로 부족분 채움
  for (const n of MEMBER_FALLBACK_POOL) {
    if (names.length >= targetCount) break;
    add(n);
  }

  return names.slice(0, Math.max(0, targetCount));
}

/** 게시글에 매핑되는 채팅방을 보장(없으면 생성)하고 id 를 반환. */
export function ensureMeetupRoom(post: Post): string {
  const id = meetupRoomId(post.id);
  if (getRoom(id)) return id;

  // 게시글 UI 의 joined/capacity 와 인원수를 맞춘다.
  // baseJoined = 게시글에 이미 합류해있는 인원 (작성자 포함).
  // 사용자가 합류했으므로 채팅방 총 인원 = baseJoined + 1, 나 제외 = baseJoined.
  const { capacity, baseJoined } = calcJoined(post);
  const targetTotal = Math.min(capacity, baseJoined + 1);
  const targetOthers = Math.max(0, targetTotal - 1);

  const memberNames = deriveMeetupMembers(post, targetOthers);
  const memberCount = 1 + memberNames.length; // me + others
  const subtitleHead = memberNames.slice(0, 2).join(", ");
  const subtitle =
    memberNames.length > 2
      ? `${subtitleHead}, 외 ${memberNames.length - 2}명`
      : subtitleHead || "단체";

  const room: ChatRoom = {
    id,
    name: post.title,
    subtitle,
    isGroup: true,
    memberCount,
    memberNames,
    // 채팅방 화면(buildMessagesFor) 이 "(대화를 시작해보세요)" 를 새 방 플래그로
    // 사용한다. 이 값을 그대로 써야 더미 채팅이 안 깔리고 시스템 메시지만 보인다.
    lastMessage: "(대화를 시작해보세요)",
    lastTime: "방금",
    unread: 0,
    online: true,
    meeting: {
      date: "26.4.2",
      time: "19:00",
      place: post.place ?? post.location?.placeName ?? "",
    },
  };
  addRoom(room);
  return id;
}
