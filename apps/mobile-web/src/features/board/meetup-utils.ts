// 게시글(모임) ↔ 채팅방 ↔ 홈/맵 카드 간 인원 계산과 멤버 도출을 단일 출처로 관리하는 헬퍼.
// 홈 카드, 맵 카드, 게시글 상세, 채팅방이 모두 동일한 결과를 쓰도록 여기로 모았다.

import { type ChatRoom, type Post } from "@/shared/mock/data";
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
 * 모임이 이미 끝났는지 판정 — 홈 추천 / 게시글 상세 / 내 모임 화면이 모두
 * 동일한 규칙을 쓰도록 단일 출처로 모았다.
 *
 * 규칙:
 *  - 단기성 모임: eventDate(시작일)가 마지막 날.
 *  - 장기성 모임: endDate 가 있으면 그 날이 마지막 날(없으면 eventDate).
 *    → 한 달짜리 모임이 '시작 다음날' 종료로 잘못 표시되던 문제 방지.
 *  - 그 날의 끝(23:59:59 local)까지는 유효(진행중)로 본다.
 *  - 일정 미정(eventDate 없음)·형식 오류면 안전하게 "진행중"(false) 으로 폴백
 *    — 사용자가 멀쩡한 모임을 끝난 것으로 오인하지 않게.
 */
export function isMeetupEnded(post: Post): boolean {
  if (!post.eventDate) return false;
  const isLongTerm = post.meetupType === "장기성 모임";
  const lastDateStr = isLongTerm ? (post.endDate ?? post.eventDate) : post.eventDate;
  const last = new Date(`${lastDateStr}T23:59:59`);
  if (Number.isNaN(last.getTime())) return false;
  return Date.now() > last.getTime();
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
  // 참여자 데이터가 없으면 '작성자(방장) 1명'만 센다.
  // (이전엔 capacity-2 명이 참여한 것처럼 가짜로 채워서, 모임 글을 올리자마자
  //  "3/5" 같은 가짜 인원이 차 보이던 문제 — 실제 '함께하기' 누른 인원만 반영)
  const raw = fromParticipants !== undefined ? fromParticipants : 1;
  const adjusted = Math.max(0, raw - kicked);
  return { capacity, baseJoined: Math.min(capacity, adjusted) };
}

/**
 * 게시글에서 채팅방/카드 멤버 닉네임 N개를 도출.
 * - 1순위: 작성자 (첫 번째 → 방장)
 * 가짜 닉네임 풀 사용 없이, 실제 참여자 정보만 반환.
 * targetCount 보다 적을 수 있으며, 항상 나(ME) 는 제외한다.
 */
export function deriveMeetupMembers(post: Post, targetCount: number): string[] {
  const names: string[] = [];
  const myNickname = getProfile().nickname;
  const add = (n: string | undefined) => {
    if (!n || n === myNickname || names.includes(n)) return;
    names.push(n);
  };

  // 1) 작성자
  add(post.authorNickname);

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
  // memberCount 는 표시용 닉네임(작성자 1개뿐) 개수가 아니라 게시판과 동일한 실제 총원
  // (targetTotal=calcJoined 기반)으로 맞춘다. 참여자 닉네임 데이터가 없어 memberNames 가
  // 항상 0~1개라 1+memberNames.length 로는 채팅방 인원이 늘 2명에 고정되던 불일치 수정.
  const memberCount = targetTotal; // me + 실제 합류 인원 (게시판 카드와 동일)
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
      // 게시글의 실제 일정을 연결한다. (이전엔 "26.04.02"/"19:00" 을 하드코딩해
      //  어떤 날짜로 글을 써도 채팅방엔 항상 같은 더미 일정이 떴다.)
      // date 는 yyyy-mm-dd 원본을 그대로 저장 — 렌더 시 formatYyMmDd 가 yy.mm.dd 로 변환.
      // 장기성 모임은 eventTime 이 없어 time 이 "" → 배너에서 구분점 없이 표시.
      date: post.eventDate ?? "",
      time: post.eventTime ?? "",
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
