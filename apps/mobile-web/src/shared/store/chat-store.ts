// 채팅방 목록을 화면 간에 공유하기 위한 간단한 스토어.
// 별도 라이브러리 없이 useSyncExternalStore로 구독한다.
// (실제 백엔드 연동 전까지의 mock 상태)

import { useSyncExternalStore } from "react";
import type { ChatRoom } from "@/shared/mock/data";



let rooms: ChatRoom[] = [];
const subscribers = new Set<() => void>();

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function emit() {
  subscribers.forEach((cb) => cb());
}

export function useChatRooms(): ChatRoom[] {
  return useSyncExternalStore(
    subscribe,
    () => rooms,
    () => rooms,
  );
}

export function useChatRoom(id: string | undefined): ChatRoom | undefined {
  const all = useChatRooms();
  return all.find((r) => r.id === id);
}

export function leaveChatRoom(id: string) {
  const next = rooms.filter((r) => r.id !== id);
  if (next.length === rooms.length) return;
  rooms = next;
  emit();
}
