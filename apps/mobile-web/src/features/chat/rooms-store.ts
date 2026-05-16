import { useEffect, useState } from "react";
import { CHATROOMS, type ChatRoom } from "@/shared/mock/data";
import { clearMessagesForRoom } from "./messages-store";

// 화면 간 이동·새로고침에 모두 유지되도록 localStorage 영속화.
// 가입 직후 resetRoomsStore() 로 빈 배열을 저장하면 새로고침해도 빈 상태가 유지된다.
const STORAGE_KEY = "holo:rooms:v1";
const SEED_BASE_TS = Date.now();

function defaultRooms(): ChatRoom[] {
  return CHATROOMS.map((r, i) => ({
    ...r,
    updatedAt: r.updatedAt ?? SEED_BASE_TS - i * 60_000, // 한 칸당 1분씩 과거
  }));
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
}

export function addRoom(room: ChatRoom) {
  // 새 방은 항상 최신 활동으로 간주해 리스트 상단에 노출되도록 updatedAt 보장.
  const stamped: ChatRoom = {
    ...room,
    updatedAt: room.updatedAt ?? Date.now(),
  };
  setRooms((prev) => [stamped, ...prev]);
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
