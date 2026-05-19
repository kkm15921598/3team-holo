// 게시글(모임) ↔ 채팅방 ↔ 홈/맵 카드 간 인원 계산과 멤버 도출을 단일 출처로 관리하는 헬퍼.
// 홈 카드, 맵 카드, 게시글 상세, 채팅방이 모두 동일한 결과를 쓰도록 여기로 모았다.

import { POST_COMMENTS, type ChatRoom, type Post } from "@/shared/mock/data";
import { MEETUP_POOL } from "@/features/home/home-meetups-data";
import { addRoom, getRoom, getRooms, setRooms } from "@/features/chat/rooms-store";
import { clearMessagesForRoom } from "@/features/chat/messages-store";
import { postsStore } from "./posts-store";
import { getProfile } from "@/shared/stores/profile-store";
import { getKickedCount } from "@/features/chat/kicked-members-store";

/** 모임 게시글에 대응되는 채팅방 id (게시글당 단일 채팅방). */
export function meetupRoomId(postId: string): string {
  return `meetup-${postId}`;
}

/** "모임 채팅방" 을 만들 수 없는 단순 게시글 카테고리 (자유 / 추천). */
const SIMPLE_CATEGORIES = new Set(["free", "recommend"]);

/**
 * 게시글이 모임 채팅방을 가질 수 있는지 판정.
 *  - 자유 / 추천 카테고리는 기본적으로 모임 채팅 대상이 아님.
 *  - 단, 그 카테고리라도 모임 메타데이터(meetupType / location / place /
 *    eventDate / peopleCount) 가 하나라도 있으면 모임 게시글로 본다.
 *  - 그 외 카테고리(맛집 / 공구 / 운동 / 게임 / 미디어 / 도움)는 항상 모임.
 * 이 판정은 게시글 상세 레이아웃 판정과 동일한 규칙 (board-detail-screen) 이며,
 * 채팅방 생성 / pruning 의 단일 출처로 쓰인다.
 */
export function isMeetupPost(post: Post): boolean {
  const hasMeta = !!(
    post.meetupType ||
    post.location ||
    post.place ||
    post.eventDate ||
    (post.peopleCount !== undefined && post.peopleCount !== null)
  );
  if (SIMPLE_CATEGORIES.has(post.category)) return hasMeta;
  return true;
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
  // 강퇴된 인원수만큼 baseJoined 를 차감 (음수 방지)
  const kicked = getKickedCount(post.id);
  if (post.status === "모집완료") {
    return { capacity, baseJoined: Math.max(0, capacity - kicked) };
  }
  const fromParticipants = post.participants?.length;
  const raw =
    fromParticipants !== undefined
      ? fromParticipants
      : Math.max(1, capacity - 2);
  const adjusted = Math.max(0, raw - kicked);
  return { capacity, baseJoined: Math.min(capacity, adjusted) };
}

/** MEETUP_POOL / POST_COMMENTS 로 채울 수 없을 때 쓰는 대체 닉네임 풀. */
export const MEMBER_FALLBACK_POOL = [
  "고소한 감자",
  "보송보송한 햄찌",
  "새콤한 망고",
  "매콤한 떡볶이",
  "포근한 두부",
  "달콤한 복숭아",
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
  // 현재 로그인 계정 닉네임을 멤버 목록에서 제외 (ME.nickname 은 데모용 고정값).
  const myNickname = getProfile().nickname;
  const add = (n: string | undefined) => {
    if (!n || n === myNickname || names.includes(n)) return;
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

/**
 * 게시글에 매핑되는 채팅방을 보장(없으면 생성)하고 id 를 반환.
 * 자유 / 추천 등 모임 메타데이터가 없는 게시글은 모임 채팅방 자체가 성립하지 않으므로
 * `null` 을 반환하고 방을 만들지 않는다.
 */
export function ensureMeetupRoom(post: Post): string | null {
  if (!isMeetupPost(post)) return null;
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
    // 모임방 방장은 게시글 작성자로 고정 — 채팅 멤버 리스트의 호스트 표시가
    // 항상 작성자와 일치하도록 보장.
    hostNickname: post.authorNickname,
    // 채팅방 화면(buildMessagesFor) 이 "(대화를 시작해보세요)" 를 새 방 플래그로
    // 사용한다. 이 값을 그대로 써야 더미 채팅이 안 깔리고 시스템 메시지만 보인다.
    lastMessage: "(대화를 시작해보세요)",
    lastTime: "방금",
    unread: 0,
    online: true,
    meeting: {
      // 앱 전체에서 yy.mm.dd 표기로 통일.
      date: "26.04.02",
      time: "19:00",
      place: post.place ?? post.location?.placeName ?? "",
    },
  };
  addRoom(room);
  return id;
}

/**
 * 채팅방 목록에서 게시글로 역추적되지 않는 "가짜 모임 채팅방" 을 모두 제거.
 *
 * 모임 채팅방의 정상 규약: id 가 `meetup-<postId>` 이며, postId 에 해당하는
 * 게시글이 존재하고 그 게시글이 모임 메타데이터를 갖고 있어야 한다.
 *
 * 다음 두 종류를 제거한다:
 *  (A) id 가 `meetup-*` 인데 — 게시글이 사라졌거나 / 자유·추천 단순 게시글로 바뀐 경우.
 *  (B) id 가 `meetup-*` 가 아닌데도 `meeting` 정보가 박혀있는 옛 mock 방
 *      (예: 옛 "다같이 러닝해요/주말 등산 크루/공구러 모임 🛒/동네 떡볶이 모임" 등).
 *      게시판과 연결되지 않는 모임 채팅방은 시스템 상 존재할 수 없으므로 청소.
 * 1:1 / 일반 그룹 방(meeting 없는)은 모두 보존된다.
 *
 * 시드 / localStorage 잔존 데이터 정리를 위해 앱 시작 시 한 번 호출.
 */
export function pruneNonMeetupRooms(): void {
  const posts = postsStore.getPosts();
  const byId = new Map(posts.map((p) => [p.id, p] as const));
  const toRemove: string[] = [];
  for (const r of getRooms()) {
    if (r.id.startsWith("meetup-")) {
      // (A) meetup-* 인데 게시글이 없거나 자유/추천 단순 글이면 제거
      const postId = r.id.slice("meetup-".length);
      const post = byId.get(postId);
      if (!post || !isMeetupPost(post)) {
        toRemove.push(r.id);
      }
      continue;
    }
    // (B) meetup-* 가 아닌데 meeting 만 박혀 있는 옛 방 — 게시글 역추적 불가능
    if (r.meeting) {
      toRemove.push(r.id);
    }
  }
  if (toRemove.length === 0) return;
  const removeSet = new Set(toRemove);
  setRooms((prev) => prev.filter((r) => !removeSet.has(r.id)));
  for (const id of toRemove) clearMessagesForRoom(id);
}
