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
      const existing = new Set(r.memberNames ?? []);
      const newMembers = nicknames.filter((n) => !existing.has(n));
      const updatedMemberNames = [...(r.memberNames ?? []), ...newMembers];
      // 이름은 "첫 멤버, 외 N명" 형식 (N = 첫 멤버 제외한 나머지 + 나)
      const totalOthersForLabel = updatedMemberNames.length; // = memberCount - 1
      const updatedName =
        updatedMemberNames.length > 0
          ? `${updatedMemberNames[0]}, 외 ${totalOthersForLabel}명`
          : r.name;
      return {
        ...r,
        memberNames: updatedMemberNames,
        memberCount: updatedMemberNames.length + 1, // +1 for self
        name: updatedName,
        subtitle: updatedMemberNames.join(", "),
      };
    }),
  );
}

// React 컴포넌트가 store 변경을 구독하기 위한 훅
export function useRooms(): ChatRoom[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return rooms;
}
