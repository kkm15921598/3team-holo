import type { ChatMessage } from "@/shared/mock/data";

// 방 id → 메시지 배열 (모듈 레벨 캐시)
const messagesByRoom = new Map<string, ChatMessage[]>();

export function getMessagesForRoom(id: string | undefined): ChatMessage[] | undefined {
  if (!id) return undefined;
  return messagesByRoom.get(id);
}

export function setMessagesForRoom(id: string, messages: ChatMessage[]) {
  messagesByRoom.set(id, messages);
}

export function clearMessagesForRoom(id: string) {
  messagesByRoom.delete(id);
}

// 안 읽음 구분선만 제거한 사본을 저장 (다음 입장 시 구분선 안 보이게)
export function persistWithoutUnreadDivider(id: string, messages: ChatMessage[]) {
  const dividerId = `${id}-unread-divider`;
  const stripped = messages.filter((m) => m.id !== dividerId);
  messagesByRoom.set(id, stripped);
}
