import { useEffect, useState } from "react";
import { CHATROOMS, type ChatRoom } from "@/shared/mock/data";
import { clearMessagesForRoom } from "./messages-store";

// 화면 간 이동에도 상태가 유지되도록 모듈 레벨 store
let rooms: ChatRoom[] = CHATROOMS.map((r) => ({ ...r }));
const listeners = new Set<() => void>();

function emit() {
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
  setRooms((prev) => [room, ...prev]);
}

// 그룹방에 멤버 추가 (초대)
export function addMembersToRoom(id: string, nicknames: string[]) {
  setRooms((prev) =>
    prev.map((r) => {
      if (r.id !== id || !r.isGroup) return r;
      const existing = new Set(r.members?.map((m) => m.nickname) ?? []);
      const newMembers = nicknames
        .filter((n) => !existing.has(n))
        .map((n) => ({ id: `m-${Date.now()}-${n}`, nickname: n, isMe: false, isHost: false }));
      return {
        ...r,
        memberCount: r.memberCount + newMembers.length,
        members: [...(r.members ?? []), ...newMembers],
      };
    }),
  );
}
export function useRooms() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return getRooms();
}
