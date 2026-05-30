import { useEffect, useState } from "react";
import type { ChatRoom } from "@/shared/mock/data";
import { clearMessagesForRoom } from "./messages-store";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { pushChatMessage } from "@/shared/stores/notifications-store";
import { isDmRoomId, getOtherPhoneFromDmId } from "./dm-utils";
import { postsStore } from "@/features/board/posts-store";
import { calcJoined, deriveMeetupMembers } from "@/features/board/meetup-utils";

// 화면 간 이동·새로고침에 모두 유지되도록 localStorage 영속화.
// 가입 직후 resetRoomsStore() 로 빈 배열을 저장하면 새로고침해도 빈 상태가 유지된다.
// v2: 테스트 계정 잔여 채팅방 자동 초기화
const STORAGE_KEY = "holo:rooms:v2";
function defaultRooms(): ChatRoom[] {
  return [];
}

function loadInitial(): ChatRoom[] {
  if (typeof window === "undefined") return defaultRooms();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      // 빈 배열도 의도된 상태(가입 직후 리셋)이므로 그대로 반환.
      if (Array.isArray(parsed)) return parsed as ChatRoom[];
    }
  } catch {
    // ignore
  }
  return defaultRooms();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    // ignore
  }
}

// ─── 나간 방 추적 (계정별) ───────────────────────────────────
// leaveRoomById 는 로컬 목록에서만 제거하므로, syncRoomsFromSupabase 가 다음 로드 때
// 같은 방을 다시 복원해 "나간/차단한 방이 부활"하는 문제가 있었다.
// 계정(phone)별로 "나간 방 id" 를 영속화하고 복원에서 제외한다.
// (그룹방 id 는 계정 간 공유되므로 전역 set 이면 누설 — 반드시 phone 별로 분리)
const LEFT_KEY = "holo:left-rooms:v1"; // { [phone]: string[] }
function loadLeftMap(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LEFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Record<string, string[]>;
    }
  } catch {
    // ignore
  }
  return {};
}
let leftMap: Record<string, string[]> = loadLeftMap();
function persistLeftMap() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEFT_KEY, JSON.stringify(leftMap));
  } catch {
    // ignore
  }
}
function getLeftSet(phone: string): Set<string> {
  return new Set(leftMap[phone] ?? []);
}
function addLeftRoom(phone: string, id: string) {
  const set = new Set(leftMap[phone] ?? []);
  set.add(id);
  leftMap = { ...leftMap, [phone]: [...set] };
  persistLeftMap();
}
function removeLeftRoom(phone: string, id: string) {
  if (!leftMap[phone]) return;
  leftMap = { ...leftMap, [phone]: leftMap[phone].filter((x) => x !== id) };
  persistLeftMap();
}

let rooms: ChatRoom[] = loadInitial();
const listeners = new Set<() => void>();

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export function getRooms(): ChatRoom[] {
  return rooms;
}

export function setRooms(updater: (prev: ChatRoom[]) => ChatRoom[]) {
  rooms = updater(rooms);
  emit();
}

export function getRoom(id: string | undefined): ChatRoom | undefined {
  if (!id) return undefined;
  return rooms.find((r) => r.id === id);
}

export function markRoomRead(id: string) {
  setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, unread: 0 } : r)));
}

export function togglePinned(id: string) {
  setRooms((prev) =>
    prev.map((r) => (r.id === id ? { ...r, pinned: !r.pinned } : r)),
  );
}

export function toggleMuted(id: string) {
  setRooms((prev) =>
    prev.map((r) => (r.id === id ? { ...r, muted: !r.muted } : r)),
  );
}

export function leaveRoomById(id: string) {
  setRooms((prev) => prev.filter((r) => r.id !== id));
  clearMessagesForRoom(id);
  // 나간 방으로 기록 → 다음 Supabase 동기화에서 다시 복원되지 않도록(부활 방지).
  const phone = getCurrentAccount();
  if (phone) addLeftRoom(phone, id);
}

export function addRoom(room: ChatRoom) {
  // 새 방은 항상 최신 활동으로 간주해 리스트 상단에 노출되도록 updatedAt 보장.
  const stamped: ChatRoom = {
    ...room,
    updatedAt: room.updatedAt ?? Date.now(),
  };
  setRooms((prev) => [stamped, ...prev]);

  // Supabase 저장 (best-effort)
  const userPhone = getCurrentAccount();
  // 재입장(다시 방 생성/합류) 시 '나간 방' 기록 해제 — 이후 동기화에서 다시 보이도록.
  if (userPhone) removeLeftRoom(userPhone, stamped.id);
  if (userPhone) {
    supabase.from("chat_rooms").insert({
      room_id: stamped.id,
      name: stamped.name,
      room_name: stamped.name,
      post_id: stamped.id.startsWith("meetup-") ? stamped.id.replace("meetup-", "") : null,
      creator_phone: userPhone,
    }).then(({ error }) => {
      if (error) console.warn("Supabase 채팅방 저장 실패:", error.message);
    });
  }
}

/**
 * "모임" 카테고리(group + meeting 정보 있는) 방을 전부 제거.
 * 테스트 계정 시드 시 mock CHATROOMS 의 모임 방을 비우고
 * 사용자가 실제로 참여한 게시글의 채팅방만 남기기 위해 사용.
 */
export function clearMeetupRooms() {
  setRooms((prev) => prev.filter((r) => !(r.isGroup && !!r.meeting)));
}

// 그룹방·1:1 방에 멤버 추가 (초대). 1:1 방에 초대되면 자동으로 그룹방으로 전환된다.
export function addMembersToRoom(id: string, nicknames: string[]) {
  setRooms((prev) =>
    prev.map((r) => {
      if (r.id !== id) return r;

      if (r.isGroup) {
        // 그룹방: memberNames 끝에 추가 (이미 있는 닉네임은 무시)
        const existing = new Set(r.memberNames ?? []);
        const trulyNew = nicknames.filter((n) => !existing.has(n));
        if (trulyNew.length === 0) return r;
        const nextMemberNames = [...(r.memberNames ?? []), ...trulyNew];
        return {
          ...r,
          memberCount: r.memberCount + trulyNew.length,
          memberNames: nextMemberNames,
        };
      }

      // 1:1 방 → 그룹방으로 전환. 기존 상대(room.name) 를 memberNames 첫 자리에 넣고
      // 새로 초대된 닉네임을 뒤에 붙인다. 이름 중복은 dedup.
      const otherPerson = r.name;
      const seen = new Set<string>([otherPerson]);
      const trulyNew = nicknames.filter((n) => {
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
      if (trulyNew.length === 0) return r;
      const nextMemberNames = [otherPerson, ...trulyNew];
      const total = 1 + nextMemberNames.length; // me + others
      const subtitleHead = nextMemberNames.slice(0, 2).join(", ");
      const subtitle =
        nextMemberNames.length > 2
          ? `${subtitleHead}, 외 ${nextMemberNames.length - 2}명`
          : subtitleHead || "단체";
      return {
        ...r,
        isGroup: true,
        memberCount: total,
        memberNames: nextMemberNames,
        subtitle,
      };
    }),
  );
}
/**
 * 신규 가입 시 채팅방을 완전히 빈 상태로 비움.
 * mock CHATROOMS 시드(러닝 크루 / 떡볶이 모임 / 1:1 등) 도 모두 제거 — 친구가 0명인
 * 새 사용자에게 미리 만들어진 채팅방이 보이는 건 어색하기 때문.
 */
export function resetRoomsStore(): void {
  rooms = [];
  emit();
}

export function useRooms() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return getRooms();
}

/**
 * Supabase chat_rooms 에서 현재 계정의 방 목록을 불러와
 * localStorage 에 없는 방만 보충한다.
 * 브라우저 캐시 삭제 / 다른 기기 접속 시 채팅방 복원용.
 *
 * - 내가 만든 방(creator_phone = me)
 * - 1:1 방(room_id = "dm-<A>-<B>") 중 내 phone 이 포함된 방 → 상대가 먼저 만든 방
 *   둘 다 가져온다.
 */
export async function syncRoomsFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;

  // 최근 30일 이내 생성된 방만 복원 (오래된 테스트 데이터 제외)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  // PostgREST OR — 내가 만든 방, 또는 내 phone 이 들어간 DM 방
  const orFilter = [
    `creator_phone.eq.${userPhone}`,
    `room_id.like.dm-${userPhone}-*`,
    `room_id.like.dm-*-${userPhone}`,
  ].join(",");
  const { data, error } = await supabase
    .from("chat_rooms")
    .select("*")
    .or(orFilter)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return;

  const existingIds = new Set(rooms.map((r) => r.id));
  const leftSet = getLeftSet(userPhone); // 내가 나간/차단해서 떠난 방은 복원하지 않음
  const toAddRaw = data.filter(
    (row) =>
      !existingIds.has(row.room_id as string) &&
      !leftSet.has(row.room_id as string),
  );

  // 상대가 만든 DM 방은 chat_rooms.name 에 "내 닉네임" 이 들어 있다.
  // 내 입장에선 상대 닉네임이 표시돼야 하므로 users 테이블에서 다시 조회.
  const toAdd: ChatRoom[] = [];
  for (const row of toAddRaw) {
    const roomId = row.room_id as string;

    // 모임 채팅방(meetup-<postId>) 복원 — 게시글에서 그룹/방장/인원수를 재구성한다.
    // chat_rooms 에 is_group 이 저장돼있지 않아 1:1 로 잘못 복원되면, buildMembersFor 가
    // room.name(=게시글 제목)을 상대 유저로 끼워넣어 "제목 유저" 가 멤버로 보이던 버그를 차단.
    // (게시글이 아직 로드 전이면 최소한 그룹으로만 복원 — 제목을 멤버로 쓰지 않음)
    if (roomId.startsWith("meetup-")) {
      const postId = roomId.slice("meetup-".length);
      const post = postsStore.getPosts().find((p) => p.id === postId);
      let memberNames: string[] = [];
      let memberCount = 2;
      let mName = (row.name ?? row.room_name ?? "모임") as string;
      let hostNickname: string | undefined;
      let meeting: ChatRoom["meeting"];
      if (post) {
        // 게시글 상세/카드와 동일한 calcJoined 단일 출처로 인원수를 맞춘다(연동).
        const { capacity, baseJoined } = calcJoined(post);
        const targetTotal = Math.min(capacity, baseJoined + 1);
        memberNames = deriveMeetupMembers(post, Math.max(0, targetTotal - 1));
        memberCount = 1 + memberNames.length;
        mName = post.title;
        hostNickname = post.authorNickname;
        // ensureMeetupRoom 과 동일하게 일정도 채운다 — 안 채우면 복원된 모임방에서
        // '모임' 배지/필터/상단 일정 배너가 모두 사라지고 일반 그룹방으로 오분류된다.
        meeting = {
          date: post.eventDate ?? "",
          time: post.eventTime ?? "",
          place: post.place ?? post.location?.placeName ?? "",
        };
      }
      const subHead = memberNames.slice(0, 2).join(", ");
      const subtitle =
        memberNames.length > 2
          ? `${subHead}, 외 ${memberNames.length - 2}명`
          : subHead || "단체";
      toAdd.push({
        id: roomId,
        name: mName,
        subtitle,
        isGroup: true,
        memberCount,
        memberNames,
        hostNickname,
        meeting,
        lastMessage: "(대화를 시작해보세요)",
        lastTime: "",
        unread: 0,
        updatedAt: new Date(row.created_at as string).getTime(),
      });
      continue;
    }

    const isDm = isDmRoomId(roomId);
    // g- 접두사 = NewChatSheet 그룹/1:1→그룹 전환 방. chat_rooms 에 is_group 이 저장돼있지
    // 않아도(컬럼 미적용) room_id 접두사로 그룹임을 판별 → 1:1 로 둔갑하던 문제 방지.
    // (meetup-/dm- 와 동일하게 접두사 규약을 단일 출처로 사용)
    const isGroupById = roomId.startsWith("g-");
    const isGroup = isDm ? false : isGroupById || ((row.is_group ?? false) as boolean);
    let name = (row.name ?? row.room_name ?? "") as string;
    if (isDm) {
      const otherPhone = getOtherPhoneFromDmId(roomId, userPhone);
      if (otherPhone) {
        const { data: u } = await supabase
          .from("users")
          .select("nickname")
          .eq("phone", otherPhone)
          .maybeSingle();
        if (u?.nickname) name = u.nickname as string;
      }
    }
    toAdd.push({
      id: roomId,
      name,
      subtitle: isDm ? "1:1" : isGroup ? "그룹" : "1:1",
      isGroup,
      memberCount: isDm ? 2 : isGroup ? 3 : 2,
      lastMessage: "(대화를 시작해보세요)",
      lastTime: "",
      unread: 0,
      updatedAt: new Date(row.created_at as string).getTime(),
    });
  }

  if (toAdd.length > 0) {
    rooms = [...toAdd, ...rooms];
    emit();
  }
}

// 앱 시작 시 로그인 상태면 Supabase 방 목록 보충
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    // account 로드 시간을 위해 짧은 딜레이
    window.setTimeout(() => syncRoomsFromSupabase(), 500);
  });
}
// ─── 채팅 알림 글로벌 리스너 ──────────────────────────────────
/**
 * 내가 속한 모든 채팅방의 새 메시지를 Supabase Realtime으로 구독.
 * 조건: 내가 보낸 메시지가 아님 + 현재 그 방 화면에 있지 않음
 * → 위 조건 충족 시 알림 store에 채팅 알림 발행 (인앱 알림 패널 표시)
 */
function initChatNotificationListener() {
  supabase
    .channel("global-chat-messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        const userPhone = getCurrentAccount();
        if (!userPhone) return;

        // 내가 보낸 메시지면 무시
        if (row.sender_phone === userPhone) return;

        const roomId = row.room_id as string;
        // 내가 나간/차단한 방이면 실시간 메시지가 와도 방을 되살리거나 알림하지 않는다.
        // (동기화 경로뿐 아니라 이 알림 경로에서도 부활하던 문제 — 웬디 QA 지적)
        if (getLeftSet(userPhone).has(roomId)) return;
        let room = rooms.find((r) => r.id === roomId);

        // 1:1 방인데 아직 로컬에 없으면 — 상대가 먼저 보낸 첫 메시지.
        // 내 phone 이 room_id 에 포함돼 있으면 내가 속한 방이라 보고 자동 생성한다.
        if (!room && isDmRoomId(roomId)) {
          const otherPhone = getOtherPhoneFromDmId(roomId, userPhone);
          if (otherPhone) {
            const senderNickname =
              (row.sender_nickname as string | undefined) ?? "알 수 없음";
            const created: ChatRoom = {
              id: roomId,
              name: senderNickname,
              subtitle: "1:1",
              isGroup: false,
              memberCount: 2,
              lastMessage: "",
              lastTime: "방금",
              unread: 0,
              online: false,
              updatedAt: Date.now(),
            };
            rooms = [created, ...rooms];
            emit();
            room = created;
            // 상대가 chat_rooms insert 에 실패했을 수도 있으니, 내 쪽에서도 upsert.
            // room_id 가 PK 라 충돌해도 영향 없음.
            supabase
              .from("chat_rooms")
              .upsert(
                {
                  room_id: roomId,
                  name: senderNickname,
                  room_name: senderNickname,
                  post_id: null,
                  creator_phone: userPhone,
                },
                { onConflict: "room_id", ignoreDuplicates: true },
              )
              .then(({ error }) => {
                if (error)
                  console.warn(
                    "Supabase DM 방 upsert 실패:",
                    error.message,
                  );
              });
          }
        }

        // 그래도 못 찾으면 내 방이 아님 — 무시
        if (!room) return;

        // 현재 그 방 화면에 있으면 무시 (chat-room-screen에서 이미 실시간으로 보임)
        const currentPath = window.location.pathname;
        if (currentPath === `/chat/${roomId}`) return;

        // 채팅 알림 발행 — 단, 해당 방을 뮤트(알림 끄기)했으면 발행하지 않는다.
        // (이전엔 muted 가 UI(아이콘/토스트)에만 쓰이고 실제 알림 게이트엔 빠져 있었다.)
        if (!room.muted) {
          pushChatMessage(
            (row.sender_nickname as string) ?? "알 수 없음",
            room.name,
            roomId,
            (row.content as string) ?? "",
          );
        }

        // 채팅 목록 unread 카운트 +1 (뮤트여도 안 읽음 표시는 유지)
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId ? { ...r, unread: (r.unread ?? 0) + 1 } : r,
          ),
        );
      },
    )
    .subscribe();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => initChatNotificationListener(), 600);
  });
}
